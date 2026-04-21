import { _electron as electron, expect, test } from '@playwright/test'
import { mkdirSync } from 'fs'
import { dirname, join } from 'path'

const ROOT = join(__dirname, '..')
const SCREEN_DIR = join(ROOT, 'e2e', 'screenshots')
mkdirSync(SCREEN_DIR, { recursive: true })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function snap(page: any, name: string): Promise<void> {
  const path = join(SCREEN_DIR, `${name}.png`)
  mkdirSync(dirname(path), { recursive: true })
  try {
    await page.screenshot({ path, fullPage: false })
  } catch (e) {
    console.log('SCREENSHOT_FAIL', name, (e as Error).message)
  }
}

test.describe('NexusHub end-to-end', () => {
  test('every route + finance detail tabs + assistant meeting notes', async () => {
    const app = await electron.launch({
      args: [join(ROOT, 'out/main/index.js')],
      timeout: 30_000
    })

    const mainErrors: string[] = []
    app.process().stderr?.on('data', (buf: Buffer) => mainErrors.push(buf.toString()))

    const consoleErrors: string[] = []
    const page = await app.firstWindow({ timeout: 20_000 })
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(`[renderer] ${msg.text()}`)
    })
    page.on('pageerror', (err) => consoleErrors.push(`[pageerror] ${err.message}`))

    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    // 1. Finance home
    await snap(page, '01-finance-home')
    const nexus = page.getByText('NexusHub').first()
    await expect(nexus).toBeVisible({ timeout: 10_000 })

    // 2. Sidebar module icons (by title attribute)
    for (const label of ['Sports', 'PDF Tools', 'Health', 'Assistant']) {
      const target = page.getByTitle(label).first()
      await target.click({ timeout: 5000 })
      await page.waitForTimeout(900)
      await snap(page, `02-module-${label.toLowerCase().replace(/\W+/g, '-')}`)
    }

    // 3. Back to Finance + add watchlist ticker + visit detail
    await page.getByTitle('Finance').click({ timeout: 5000 })
    await page.waitForTimeout(500)
    await snap(page, '03-finance-return')

    const addInput = page.getByPlaceholder('AAPL').first()
    await addInput.click()
    await addInput.fill('AAPL')
    await addInput.press('Enter')
    await page.waitForTimeout(1500)
    await snap(page, '04-watchlist-added')

    await page.goto(page.url().replace(/#.*$/, '#/finance/AAPL'))
    await page.waitForTimeout(3500)
    await snap(page, '05-detail-overview')

    // 4. Detail tabs — click each
    const tabs = [
      'Financials',
      'Technicals',
      'Earnings',
      'Options',
      'Ownership',
      'News',
      'Sentiment',
      'Simulation'
    ]
    for (const tab of tabs) {
      const btn = page.getByRole('button', { name: tab, exact: true })
      await btn
        .first()
        .click({ timeout: 5000 })
        .catch(() => null)
      await page.waitForTimeout(2200)
      await snap(page, `06-tab-${tab.toLowerCase()}`)
    }

    // 5. Portfolio page
    await page.goto(page.url().replace(/#.*$/, '#/finance/portfolio'))
    await page.waitForTimeout(1500)
    await snap(page, '07-portfolio')

    // 6. Assistant module + meeting notes
    await page.goto(page.url().replace(/#.*$/, '#/assistant'))
    await page.waitForTimeout(1200)
    await snap(page, '08-assistant-chat')
    await page.goto(page.url().replace(/#.*$/, '#/assistant/meeting'))
    await page.waitForTimeout(1000)
    await snap(page, '09-assistant-meeting')

    // 7. Settings
    await page.goto(page.url().replace(/#.*$/, '#/settings'))
    await page.waitForTimeout(1200)
    await snap(page, '10-settings')

    // 8. Sports detail
    await page.goto(page.url().replace(/#.*$/, '#/sports'))
    await page.waitForTimeout(2000)
    await snap(page, '11-sports')

    // 9. PDF
    await page.goto(page.url().replace(/#.*$/, '#/pdf'))
    await page.waitForTimeout(800)
    await snap(page, '12-pdf')

    // 10. Health
    await page.goto(page.url().replace(/#.*$/, '#/health'))
    await page.waitForTimeout(800)
    await snap(page, '13-health')

    // 11. Command palette (Cmd+K)
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k')
    await page.waitForTimeout(500)
    await snap(page, '14-cmdk')
    await page.keyboard.press('Escape')

    if (consoleErrors.length > 0) {
      console.log('\n=== RENDERER ERRORS ===')
      for (const l of consoleErrors) console.log(l)
    } else {
      console.log('CLEAN: no renderer errors across all routes')
    }
    if (mainErrors.length > 0) {
      console.log('\n=== MAIN STDERR ===')
      for (const l of mainErrors) console.log(l)
    }

    await app.close()

    // Assert clean run
    const crashErrors = consoleErrors.filter(
      (e) => !e.includes('Failed to load resource') && !e.includes('404') && !e.includes('Yahoo')
    )
    expect(crashErrors, crashErrors.join('\n')).toHaveLength(0)
  })
})
