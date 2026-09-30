import { test, expect } from '@playwright/test'
import { readFile, readdir } from 'node:fs/promises'

test('fertige Website funktioniert im GitHub-Unterpfad und erhält den Altbestand', async ({ page }) => {
  const fehler = []
  // Die Datenübernahme muss auch ohne externe Scanner-CDNs funktionieren.
  await page.route('https://**/*', route => route.abort())
  page.on('pageerror', error => fehler.push(error.message))
  page.on('response', response => { if (response.url().startsWith('http://127.0.0.1:4180/') && response.status() >= 400) fehler.push(response.url()) })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Paarfuss Inventur', exact: true })).toBeVisible()
  await page.evaluate(() => localStorage.setItem('produkte', JSON.stringify({
    produkte: [{ artikelnummer: 'ALT-1', barcode: '4006381333931', name: 'Altbestand', bestand: 5, mindestbestand: 2 }],
    inventur: { aktiv: false, gestartetAm: null, positionen: [], unbekannteBarcodes: [] },
  })))
  await page.reload()
  await page.getByLabel('Filiale des bisherigen Bestands').selectOption('innsbruck')
  page.once('dialog', d => d.accept())
  await page.getByRole('button', { name: 'Bestand zuordnen', exact: true }).click()
  await page.getByRole('navigation').getByRole('button', { name: 'Lager', exact: true }).click()
  await expect(page.getByRole('article')).toContainText('Bestand: 5')
  await page.getByRole('button', { name: 'Altbestand: Bestand erhöhen' }).click()
  await expect(page.getByRole('article')).toContainText('Bestand: 6')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('navigation').getByRole('button', { name: 'Einstellungen', exact: true }).click()
  await page.getByRole('link', { name: 'Bisherige App zum Datenexport öffnen' }).click()
  await expect(page).toHaveURL(/\/Paarfuss-Inventur\/alt\/$/)
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Daten für React exportieren' }).click()
  const datei = await download
  const exportiert = JSON.parse(await readFile(await datei.path(), 'utf8'))
  expect(exportiert.produkte[0].bestand).toBe(5)
  await page.getByRole('link', { name: 'Zur React-App', exact: true }).click()
  await page.getByRole('navigation').getByRole('button', { name: 'Lager', exact: true }).click()
  await expect(page.getByRole('article')).toContainText('Bestand: 6')
  expect(fehler).toEqual([])
})

test('Veröffentlichungsordner enthält nur Website und Alt-App', async () => {
  const dist = new URL('../../dist/', import.meta.url)
  const dateien = await readdir(dist, { recursive: true })
  for (const datei of dateien) {
    expect(datei).not.toMatch(/(^|\/)(node_modules|tests|\.git|\.env|ZEITERFASSUNG\.md)(\/|$)/)
  }
  const html = await readFile(new URL('index.html', dist), 'utf8')
  expect(html).toContain('/Paarfuss-Inventur/assets/')
  expect(await readFile(new URL('alt/index.html', dist), 'utf8')).toContain('datenFuerReactExportieren')
  expect(dateien).toContain('.nojekyll')
})
