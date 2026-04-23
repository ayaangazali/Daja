let cachedCrumb: { crumb: string; cookie: string; fetchedAt: number } | null = null
const CRUMB_TTL = 30 * 60_000 // 30 minutes

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

export interface YahooAuth {
  crumb: string
  cookie: string
}

export async function getYahooAuth(force = false): Promise<YahooAuth> {
  const now = Date.now()
  if (!force && cachedCrumb && now - cachedCrumb.fetchedAt < CRUMB_TTL) {
    return { crumb: cachedCrumb.crumb, cookie: cachedCrumb.cookie }
  }

  // Step 1: hit the Yahoo consent-less cookie endpoint to obtain A3/B cookies.
  const cookieRes = await fetch('https://fc.yahoo.com/', {
    method: 'GET',
    redirect: 'manual',
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml'
    }
  })
  const setCookie = cookieRes.headers.get('set-cookie') ?? ''
  const cookie = setCookie
    .split(/,(?=\s*[a-zA-Z0-9_-]+=)/)
    .map((c) => c.split(';')[0].trim())
    .filter(Boolean)
    .join('; ')

  if (!cookie) {
    throw new Error('Yahoo cookie fetch failed (no Set-Cookie)')
  }

  // Step 2: fetch crumb using that cookie.
  const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
    headers: {
      'User-Agent': UA,
      Accept: 'text/plain',
      Cookie: cookie
    }
  })
  if (!crumbRes.ok) {
    throw new Error(`Yahoo crumb fetch failed: ${crumbRes.status}`)
  }
  const crumb = (await crumbRes.text()).trim()
  if (!crumb) throw new Error('Yahoo crumb empty')

  cachedCrumb = { crumb, cookie, fetchedAt: now }
  return { crumb, cookie }
}

export async function yahooFetch(
  url: string,
  extraHeaders: Record<string, string> = {}
): Promise<Response> {
  let auth: YahooAuth | null = null
  try {
    auth = await getYahooAuth()
  } catch {
    // continue without auth — some endpoints work without it
  }
  const u = new URL(url)
  if (auth) {
    if (!u.searchParams.has('crumb')) u.searchParams.set('crumb', auth.crumb)
  }
  const res = await fetch(u.toString(), {
    headers: {
      'User-Agent': UA,
      Accept: 'application/json',
      ...(auth ? { Cookie: auth.cookie } : {}),
      ...extraHeaders
    }
  })
  if (res.status === 401 || res.status === 403) {
    // Invalidate cache + retry once with fresh crumb
    cachedCrumb = null
    auth = await getYahooAuth(true).catch(() => null)
    if (auth) {
      u.searchParams.set('crumb', auth.crumb)
      const retry = await fetch(u.toString(), {
        headers: {
          'User-Agent': UA,
          Accept: 'application/json',
          Cookie: auth.cookie,
          ...extraHeaders
        }
      })
      // If still unauthorized after a fresh auth round-trip, surface a
      // diagnostic that's friendly for the renderer to show to the user.
      if (retry.status === 401 || retry.status === 403) {
        throw new YahooAuthError(
          `Yahoo Finance session expired and could not be renewed (status ${retry.status}). Check your network or try again in a moment.`,
          retry.status
        )
      }
      return retry
    }
    throw new YahooAuthError(
      `Yahoo Finance authentication failed (status ${res.status}). The session could not be refreshed.`,
      res.status
    )
  }
  return res
}

export class YahooAuthError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'YahooAuthError'
    this.status = status
  }
}
