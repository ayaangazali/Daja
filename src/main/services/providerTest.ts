import type { ProviderId, TestResult } from '../../shared/ipc'

async function timedFetch(url: string, init: RequestInit = {}, ms = 8000): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function testOpenAI(key: string): Promise<TestResult> {
  const res = await timedFetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${key}` }
  })
  return res.ok
    ? { ok: true, message: 'OpenAI key valid' }
    : { ok: false, message: `OpenAI ${res.status}: ${await res.text().catch(() => '')}` }
}

async function testAnthropic(key: string): Promise<TestResult> {
  const res = await timedFetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'hi' }]
    })
  })
  if (res.ok) return { ok: true, message: 'Anthropic key valid' }
  const body = await res.text().catch(() => '')
  return { ok: false, message: `Anthropic ${res.status}: ${body.slice(0, 200)}` }
}

async function testGemini(key: string): Promise<TestResult> {
  const res = await timedFetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`
  )
  return res.ok
    ? { ok: true, message: 'Gemini key valid' }
    : { ok: false, message: `Gemini ${res.status}` }
}

async function testGrok(key: string): Promise<TestResult> {
  const res = await timedFetch('https://api.x.ai/v1/models', {
    headers: { Authorization: `Bearer ${key}` }
  })
  return res.ok
    ? { ok: true, message: 'Grok key valid' }
    : { ok: false, message: `Grok ${res.status}` }
}

async function testPerplexity(key: string): Promise<TestResult> {
  const res = await timedFetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [{ role: 'user', content: 'hi' }],
      max_tokens: 1
    })
  })
  return res.ok
    ? { ok: true, message: 'Perplexity key valid' }
    : { ok: false, message: `Perplexity ${res.status}` }
}

async function testFMP(key: string): Promise<TestResult> {
  const res = await timedFetch(
    `https://financialmodelingprep.com/api/v3/profile/AAPL?apikey=${encodeURIComponent(key)}`
  )
  if (!res.ok) return { ok: false, message: `FMP ${res.status}` }
  const data = (await res.json().catch(() => null)) as unknown
  if (Array.isArray(data) && data.length > 0) return { ok: true, message: 'FMP key valid' }
  return { ok: false, message: 'FMP returned empty — likely invalid key' }
}

async function testAlphaVantage(key: string): Promise<TestResult> {
  const res = await timedFetch(
    `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${encodeURIComponent(key)}`
  )
  if (!res.ok) return { ok: false, message: `AV ${res.status}` }
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null
  if (data && (data['Global Quote'] || data['Note'])) return { ok: true, message: 'AV reachable' }
  return { ok: false, message: 'AV unexpected response' }
}

async function testPolygon(key: string): Promise<TestResult> {
  const res = await timedFetch(
    `https://api.polygon.io/v2/aggs/ticker/AAPL/prev?apiKey=${encodeURIComponent(key)}`
  )
  return res.ok
    ? { ok: true, message: 'Polygon key valid' }
    : { ok: false, message: `Polygon ${res.status}` }
}

async function testNewsAPI(key: string): Promise<TestResult> {
  const res = await timedFetch(
    `https://newsapi.org/v2/top-headlines?country=us&pageSize=1&apiKey=${encodeURIComponent(key)}`
  )
  return res.ok
    ? { ok: true, message: 'NewsAPI key valid' }
    : { ok: false, message: `NewsAPI ${res.status}` }
}

export async function testProviderKey(
  provider: ProviderId,
  key: string
): Promise<TestResult> {
  try {
    switch (provider) {
      case 'openai':
        return await testOpenAI(key)
      case 'anthropic':
        return await testAnthropic(key)
      case 'gemini':
        return await testGemini(key)
      case 'grok':
        return await testGrok(key)
      case 'perplexity':
        return await testPerplexity(key)
      case 'fmp':
        return await testFMP(key)
      case 'alpha_vantage':
        return await testAlphaVantage(key)
      case 'polygon':
        return await testPolygon(key)
      case 'news_api':
        return await testNewsAPI(key)
    }
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Unknown error'
    }
  }
}
