#!/usr/bin/env node
/**
 * Mochi Automation Tool
 *
 * Usage:
 *   node tools/mochi-automation.cjs --open
 *     Opens your Mochi automations page in a browser.
 *
 * Note: Mochi has no REST API for creating automations.
 * The ACADEMY keyword automation was set up manually via the Mochi UI on 2026-05-07.
 * To add more automations, go to: https://use.themochi.app/automations/41b4deeb-50a4-44ea-835e-9d0474e8d482/
 */

const { chromium } = require('playwright')

const MOCHI_AUTOMATIONS_URL = 'https://use.themochi.app/automations/41b4deeb-50a4-44ea-835e-9d0474e8d482/'

async function openMochiAutomations() {
  console.log('Opening Mochi automations page...')
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(MOCHI_AUTOMATIONS_URL)

  console.log('\nMochi automations page is open.')
  console.log('Press Enter to close the browser when done...')
  await new Promise(resolve => process.stdin.once('data', resolve))
  await browser.close()
}

const args = process.argv.slice(2)

if (args.includes('--open')) {
  openMochiAutomations().catch(err => { console.error(err); process.exit(1) })
} else {
  console.log(`
Mochi Automation Tool

Usage:
  node tools/mochi-automation.cjs --open
    Open the Mochi automations page in a browser.

Note: Automations must be created through the Mochi UI — no REST API exists.
Active automations:
  - "Comment ACADEMY - AI Designer Academy" (keyword: ACADEMY, any post or reel)
`)
}
