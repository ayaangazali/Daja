import { _electron as electron, expect, test } from '@playwright/test'
import { mkdirSync } from 'fs'
import { join } from 'path'

const ROOT = join(__dirname, '..')
const SCREEN_DIR = join(ROOT, 'e2e', 'screenshots', 'extended')
mkdirSync(SCREEN_DIR, { recursive: true })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function snap(page: any, name: string): Promise<void> {
  const path = join(SCREEN_DIR, `${name}.png`)
  try {
    await page.screenshot({ path, fullPage: false })
  } catch (e) {
    console.log('SCREENSHOT_FAIL', name, (e as Error).message)
  }
}

test.describe('Daja extended interactions', () => {
  test('stock detail tabs + portfolio trade + settings + cmdk + sports + pdf', async () => {
    const app = await electron.launch({
      args: [join(ROOT, 'out/main/index.js')],
      timeout: 30_000
    })

    const consoleErrors: string[] = []
    const consoleWarnings: string[] = []
    const page = await app.firstWindow({ timeout: 20_000 })
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(`[renderer] ${msg.text()}`)
      if (msg.type() === 'warning') consoleWarnings.push(`[warn] ${msg.text()}`)
    })
    page.on('pageerror', (err) => consoleErrors.push(`[pageerror] ${err.message}`))

    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    // ── 1. Navigate to AAPL detail ───────────────────────────────────────────
    await page.goto(page.url().replace(/#.*$/, '#/finance/AAPL'))
    await page.waitForTimeout(4000)
    await snap(page, '01-aapl-overview')

    // Check Overview tab canvas (lightweight-charts creates canvas elements)
    const canvasCount = await page.locator('canvas').count()
    console.log(`[CHART] Canvas elements on Overview: ${canvasCount}`)
    if (canvasCount > 0) {
      const firstCanvas = page.locator('canvas').first()
      const box = await firstCanvas.boundingBox()
      console.log(`[CHART] First canvas dimensions: ${box?.width}x${box?.height}`)
      if (box) {
        const isEmpty = box.width === 0 || box.height === 0
        console.log(`[CHART] Canvas zero-size: ${isEmpty}`)
      }
    } else {
      console.log(
        '[BUG] No canvas found on Overview tab — InteractiveChart may have failed to mount'
      )
    }

    // Check that overview does not show pure loading state
    const overviewLoading = await page
      .getByText('Loading chart…')
      .isVisible()
      .catch(() => false)
    console.log(`[STATE] Overview still showing "Loading chart…": ${overviewLoading}`)

    // ── 2. Cycle all 9 detail tabs and record data vs empty state ─────────────
    const TABS = [
      'Financials',
      'Technicals',
      'Earnings',
      'Options',
      'Ownership',
      'News',
      'Sentiment',
      'Simulation'
    ] as const

    for (const tab of TABS) {
      const btn = page.getByRole('button', { name: tab, exact: true }).first()
      await btn
        .click({ timeout: 5000 })
        .catch(() => console.log(`[WARN] Could not click tab: ${tab}`))
      await page.waitForTimeout(3500)

      const stillLoading = await page
        .getByText(/^Loading/)
        .first()
        .isVisible()
        .catch(() => false)
      const noData = await page
        .getByText(
          /No data|No recent|No options|No earnings|No transactions|coming soon|Wires in Phase/i
        )
        .first()
        .isVisible()
        .catch(() => false)
      const hasError = await page
        .getByText(/load failed|error/i)
        .first()
        .isVisible()
        .catch(() => false)

      console.log(`[TAB:${tab}] loading=${stillLoading} noData=${noData} error=${hasError}`)
      await snap(page, `02-tab-${tab.toLowerCase()}`)
    }

    // Simulation-specific: check SVG paths are rendered
    const simBtn = page.getByRole('button', { name: 'Simulation', exact: true }).first()
    await simBtn.click({ timeout: 5000 }).catch(() => null)
    await page.waitForTimeout(3500)
    const svgPaths = await page.locator('svg path').count()
    console.log(`[SIMULATION] SVG path count: ${svgPaths}`)
    if (svgPaths === 0) {
      console.log('[BUG] Monte Carlo SVG has zero paths — fan chart not painting')
    }
    await snap(page, '02-tab-simulation-svg-check')

    // Back to Overview to check canvas again after navigating away and back
    const overviewBtn = page.getByRole('button', { name: 'Overview', exact: true }).first()
    await overviewBtn.click({ timeout: 5000 }).catch(() => null)
    await page.waitForTimeout(2000)
    const canvasAfterNav = await page.locator('canvas').count()
    console.log(`[CHART] Canvas count after re-visit Overview: ${canvasAfterNav}`)
    await snap(page, '03-overview-chart-revisit')

    // ── 3. Portfolio: log a buy trade for AAPL ────────────────────────────────
    await page.goto(page.url().replace(/#.*$/, '#/finance/portfolio'))
    await page.waitForTimeout(1500)
    await snap(page, '04-portfolio-before-trade')

    // Check if "No positions yet" placeholder is showing
    const noPositions = await page
      .getByText('No positions yet')
      .isVisible()
      .catch(() => false)
    console.log(`[PORTFOLIO] Empty state before trade: ${noPositions}`)

    // Fill in the trade form using data-testids to target the exact inputs
    const tickerInput = page.locator('[data-testid="trade-ticker-input"]')
    const qtyInput = page.locator('[data-testid="trade-qty-input"]')
    const priceInput = page.locator('[data-testid="trade-price-input"]')

    await tickerInput.fill('AAPL')
    await qtyInput.fill('10')
    await priceInput.fill('200')

    // Date field — set to today
    const today = new Date().toISOString().slice(0, 10)
    const dateInput = page.locator('input[type="date"]').first()
    await dateInput.fill(today)

    await snap(page, '05-portfolio-form-filled')

    // Click Save via data-testid (unique)
    const saveBtn = page.locator('[data-testid="trade-save-btn"]')
    await page.waitForTimeout(300)
    const saveEnabled = await saveBtn.isEnabled()
    console.log(`[PORTFOLIO] Save button enabled: ${saveEnabled}`)
    if (saveEnabled) {
      await saveBtn.click()
    } else {
      // Button is disabled — log the bug and click anyway with force to proceed
      console.log(
        '[BUG] Save button still disabled despite form fields filled — clicking with force to proceed'
      )
      await saveBtn.click({ force: true })
    }
    await page.waitForTimeout(3000)

    await snap(page, '06-portfolio-after-trade')

    // Check positions table for AAPL row
    const aaplRow = page.locator('td').filter({ hasText: 'AAPL' }).first()
    const aaplVisible = await aaplRow.isVisible().catch(() => false)
    console.log(`[PORTFOLIO] AAPL position row visible: ${aaplVisible}`)

    // Check unrealized P&L column is not "—"
    if (aaplVisible) {
      // Find the row and get all cells
      const row = page
        .locator('tr')
        .filter({ has: page.locator('td', { hasText: /^AAPL$/ }) })
        .first()
      const cellTexts = await row.locator('td').allTextContents()
      console.log(`[PORTFOLIO] AAPL row cells: ${JSON.stringify(cellTexts)}`)
      const hasUnrealPnL = cellTexts.some((c) => c.match(/[+-]\$\d+/) || c.match(/[+-]\d+\.\d+%/))
      console.log(`[PORTFOLIO] Unrealized P&L value populated: ${hasUnrealPnL}`)
    }

    // ── 4. Settings page ──────────────────────────────────────────────────────
    await page.goto(page.url().replace(/#.*$/, '#/settings'))
    await page.waitForTimeout(1500)
    await snap(page, '07-settings')

    // Count API key provider rows — expect 9 (5 AI + 4 data)
    const keyRows = await page
      .locator('div')
      .filter({ hasText: /Paste .* API key|••••••••/ })
      .count()
    const providerNameEls = [
      'Anthropic Claude',
      'OpenAI',
      'Google Gemini',
      'xAI Grok',
      'Perplexity',
      'Financial Modeling Prep',
      'Alpha Vantage',
      'Polygon.io',
      'NewsAPI'
    ]
    let visibleProviders = 0
    for (const name of providerNameEls) {
      const el = page.getByText(name, { exact: true }).first()
      const vis = await el.isVisible().catch(() => false)
      if (!vis) console.log(`[SETTINGS] Provider row NOT visible: ${name}`)
      else visibleProviders++
    }
    console.log(`[SETTINGS] Visible provider rows: ${visibleProviders}/9`)

    // Theme toggle — check current theme and flip it
    const themeDisplay = await page
      .locator('span.font-mono')
      .filter({ hasText: /dark|light/ })
      .first()
      .textContent()
      .catch(() => null)
    console.log(`[SETTINGS] Current theme: ${themeDisplay}`)

    const toggleBtn = page.getByRole('button', { name: 'Toggle', exact: true })
    await toggleBtn.click()
    await page.waitForTimeout(500)

    const htmlClass = await page.evaluate(() => document.documentElement.className)
    console.log(`[SETTINGS] html classes after toggle: "${htmlClass}"`)
    const isDark = htmlClass.includes('dark')
    const themeAfter = await page
      .locator('span.font-mono')
      .filter({ hasText: /dark|light/ })
      .first()
      .textContent()
      .catch(() => null)
    console.log(
      `[SETTINGS] Theme display after toggle: ${themeAfter}, html.dark class present: ${isDark}`
    )

    await snap(page, '08-settings-after-theme-toggle')

    // Toggle back to restore state
    await page.getByRole('button', { name: 'Toggle', exact: true }).click()
    await page.waitForTimeout(300)

    // ── 5. Command Palette Cmd+K ───────────────────────────────────────────────
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k')
    await page.waitForTimeout(500)

    const paletteVisible = await page
      .locator('[placeholder="Ticker, command, or action…"]')
      .isVisible()
      .catch(() => false)
    console.log(`[CMDK] Palette opened: ${paletteVisible}`)
    await snap(page, '09-cmdk-open')

    if (paletteVisible) {
      // Type "Finance" and check that Finance item appears
      await page.keyboard.type('Finance')
      await page.waitForTimeout(400)
      await snap(page, '10-cmdk-filtered-finance')

      const financeItem = page.getByText('Finance', { exact: true }).first()
      const financeVisible = await financeItem.isVisible().catch(() => false)
      console.log(`[CMDK] Finance item visible after filter: ${financeVisible}`)

      // Select it via Enter to navigate
      await page.keyboard.press('Enter')
      await page.waitForTimeout(800)
      const urlAfterNav = page.url()
      console.log(`[CMDK] URL after Enter navigation: ${urlAfterNav}`)
      const navigatedToFinance = urlAfterNav.includes('/finance')
      console.log(`[CMDK] Navigated to finance route: ${navigatedToFinance}`)
      await snap(page, '11-cmdk-after-navigation')
    } else {
      console.log('[BUG] Command palette did not open on Cmd+K')
      await page.keyboard.press('Escape')
    }

    // ── 6. Sports — switch between NFL, NBA, EPL ──────────────────────────────
    await page.goto(page.url().replace(/#.*$/, '#/sports'))
    await page.waitForTimeout(2500)
    await snap(page, '12-sports-nfl-default')

    for (const league of ['NFL', 'NBA', 'EPL']) {
      const leagueBtn = page.getByRole('button', { name: league, exact: true }).first()
      await leagueBtn
        .click({ timeout: 5000 })
        .catch(() => console.log(`[SPORTS] Could not find league button: ${league}`))
      await page.waitForTimeout(2500)

      // Check for data vs empty state vs error
      const hasGames = await page
        .locator('[class*="GameCard"], div')
        .filter({ hasText: /HOME|AWAY/ })
        .first()
        .isVisible()
        .catch(() => false)
      const noGames = await page
        .getByText('No games scheduled')
        .isVisible()
        .catch(() => false)
      const loadingState = await page
        .getByText('Loading…')
        .isVisible()
        .catch(() => false)
      const errorState = await page
        .getByText(/Scoreboard failed/)
        .isVisible()
        .catch(() => false)
      console.log(
        `[SPORTS:${league}] games=${hasGames} noGames=${noGames} loading=${loadingState} error=${errorState}`
      )

      // Team logos: check naturalWidth > 0 for visible img elements
      const logoImgs = await page.locator('img').all()
      let loadedLogos = 0
      let brokenLogos = 0
      for (const img of logoImgs.slice(0, 20)) {
        const nat = await img
          .evaluate((el: HTMLImageElement) => ({
            naturalWidth: el.naturalWidth,
            src: el.src
          }))
          .catch(() => null)
        if (nat) {
          if (nat.naturalWidth > 0) loadedLogos++
          else {
            brokenLogos++
            console.log(`[SPORTS:${league}] Broken logo: ${nat.src}`)
          }
        }
      }
      console.log(`[SPORTS:${league}] Logos loaded: ${loadedLogos}, broken: ${brokenLogos}`)
      await snap(page, `13-sports-${league.toLowerCase()}`)
    }

    // ── 7. PDF: Merge tab, file picker button enabled ─────────────────────────
    await page.goto(page.url().replace(/#.*$/, '#/pdf'))
    await page.waitForTimeout(800)

    // Merge is default tab
    const addPdfsBtn = page.getByRole('button', { name: 'Add PDFs' })
    const addEnabled = await addPdfsBtn.isEnabled().catch(() => false)
    console.log(`[PDF] "Add PDFs" button enabled: ${addEnabled}`)
    await snap(page, '14-pdf-merge')

    // Click Split tab
    const splitTab = page.getByRole('button', { name: 'Split' }).first()
    await splitTab.click()
    await page.waitForTimeout(300)
    const pickPdfBtn = page.getByRole('button', { name: 'Pick PDF' }).first()
    const pickEnabled = await pickPdfBtn.isEnabled().catch(() => false)
    console.log(`[PDF] "Pick PDF" button enabled on Split tab: ${pickEnabled}`)
    await snap(page, '15-pdf-split')

    // Click Info tab
    const infoTab = page.getByRole('button', { name: 'Info' }).first()
    await infoTab.click()
    await page.waitForTimeout(300)
    await snap(page, '16-pdf-info')

    // ── 8. Final error summary ────────────────────────────────────────────────
    console.log('\n=== CONSOLE ERRORS ===')
    if (consoleErrors.length === 0) {
      console.log('CLEAN: no renderer errors')
    } else {
      for (const e of consoleErrors) console.log(e)
    }

    await app.close()

    // Fail on crash-level errors only
    const crashErrors = consoleErrors.filter(
      (e) =>
        !e.includes('Failed to load resource') &&
        !e.includes('404') &&
        !e.includes('Yahoo') &&
        !e.includes('net::ERR') &&
        !e.includes('favicon')
    )
    expect(crashErrors, crashErrors.join('\n')).toHaveLength(0)
  })
})
