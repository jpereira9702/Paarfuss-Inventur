import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { prepareZXingModule, writeBarcode } from 'zxing-wasm/writer'

const key = 'paarfuss.react.v1'
const inv = { aktiv: false, gestartetAm: null, positionen: [], unbekannteBarcodes: [] }
const daten = { produkte: [
  { artikelnummer: 'FC-1', barcode: '4006381333931', name: 'Creme', bestand: 5, mindestbestand: 2 },
  { artikelnummer: 'HS-1', barcode: '', name: 'Handschuhe', bestand: 2, mindestbestand: 4 },
], inventur: inv }
async function start(page, quelle = 'produkte', inhalt = daten) {
  await page.goto('/')
  await page.evaluate(({ quelle, inhalt }) => localStorage.setItem(quelle, JSON.stringify(inhalt)), { quelle, inhalt })
  await page.reload()
  if (inhalt.version !== 2) {
    await page.getByLabel('Filiale des bisherigen Bestands').selectOption('innsbruck')
    page.once('dialog', d => d.accept())
    await page.getByRole('button', { name: 'Bestand zuordnen', exact: true }).click()
  }
}
const nav = (page, name) => page.getByRole('navigation').getByRole('button', { name, exact: true })
const browserFehler = new WeakMap()
test.beforeEach(async ({ page }) => {
  browserFehler.set(page, [])
  page.on('pageerror', error => browserFehler.get(page).push(error.message))
})
test.afterEach(async ({ page }) => { expect(browserFehler.get(page)).toEqual([]) })

test('Lager: Anlegen, Suche, Bearbeiten, Bestandsänderung, Nachbestellen und Löschen', async ({ page }) => {
  await page.goto('/')
  await nav(page, 'Lager').click()
  await page.getByLabel('Artikelnummer', { exact: true }).fill('FC-1')
  await page.getByLabel('Produktname', { exact: true }).fill('Creme')
  await page.getByLabel('Bestand', { exact: true }).fill('2')
  await page.getByLabel('Mindestbestand', { exact: true }).fill('2')
  await page.getByRole('button', { name: 'Produkt speichern' }).click()
  await expect(page.getByRole('article')).toHaveCount(1)
  await page.getByRole('button', { name: 'Creme: Bestand erhöhen' }).click()
  await expect(page.getByRole('article')).toContainText('Bestand: 3')
  await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click()
  await page.getByLabel('Produktname', { exact: true }).fill('Fußcreme')
  await page.getByRole('button', { name: 'Produkt speichern' }).click()
  await page.getByLabel('Suche', { exact: true }).fill('unbekannt')
  await expect(page.getByRole('article')).toHaveCount(0)
  await page.getByLabel('Suche', { exact: true }).fill('FC-1')
  await expect(page.getByRole('article')).toContainText('Fußcreme')
  await page.getByRole('button', { name: 'Fußcreme: Bestand verringern' }).click()
  await nav(page, 'Nachbestellen').click()
  await expect(page.getByRole('article').first()).toContainText('Fußcreme')
  await nav(page, 'Lager').click()
  await page.getByRole('button', { name: 'Fußcreme: Bestand verringern' }).click()
  await page.getByRole('button', { name: 'Fußcreme: Bestand verringern' }).click()
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Löschen', exact: true }).click()
  await page.reload()
  await nav(page, 'Lager').click()
  await expect(page.getByRole('article')).toHaveCount(0)
})

test('Inventur: manueller Scan, Mengen ohne Barcode, Neustart und Abschluss', async ({ page }) => {
  await start(page)
  await nav(page, 'Inventur').click()
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Inventur starten', exact: true }).click()
  await page.getByLabel('Barcode manuell eingeben').fill('4006381333931')
  await page.getByRole('button', { name: 'Für Inventur zählen', exact: true }).click()
  const handschuhe = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Handschuhe', exact: true }) })
  await handschuhe.getByLabel('Gesamtmenge').fill('7')
  await handschuhe.getByRole('button', { name: 'Menge übernehmen' }).click()
  await page.getByLabel('Barcode manuell eingeben').fill('unbekannt')
  await page.getByRole('button', { name: 'Für Inventur zählen', exact: true }).click()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Inventur · Innsbruck', exact: true })).toBeVisible()
  await expect(page.getByRole('article').first()).toContainText('Gezählt: 1')
  await expect(handschuhe).toContainText('Gezählt: 7')
  await expect(page.getByText('unbekannt: 1 Stück')).toBeVisible()
  page.once('dialog', async dialog => { expect(dialog.message()).toContain('1 unbekannte'); await dialog.accept() })
  await page.getByRole('button', { name: 'Inventur abschließen' }).click()
  await nav(page, 'Lager').click()
  await expect(page.getByRole('article').first()).toContainText('Bestand: 1')
  await expect(page.getByRole('article').last()).toContainText('Bestand: 7')
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('produkte')).produkte[0].bestand)).toBe(5)
})

test('laufende Inventur sperrt Bestandsbuchungen in ihrer Filiale', async ({ page }) => {
  await start(page)
  await nav(page, 'Inventur').click()
  page.once('dialog', d => d.accept())
  await page.getByRole('button', { name: 'Inventur starten', exact: true }).click()
  await nav(page, 'Lager').click()
  await expect(page.getByRole('button', { name: 'Creme: Bestand erhöhen' })).toBeDisabled()
  await page.getByLabel('Barcode manuell eingeben').fill('4006381333931')
  await page.getByRole('button', { name: 'Wareneingang buchen', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('gesperrt')
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).inventuren.innsbruck.aktiv, key)).toBe(true)
})

test('Import wird geprüft, bestätigt und kann wieder exportiert werden', async ({ page }) => {
  await page.goto('/')
  await nav(page, 'Einstellungen').click()
  await page.getByLabel('JSON-Sicherung importieren').setInputFiles({ name: 'daten.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(daten)) })
  await expect(page.getByText('Geprüft: 2 Produkte', { exact: false })).toBeVisible()
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBeNull()
  await page.getByLabel('Filiale des importierten Bestands').selectOption('innsbruck')
  page.once('dialog', d => d.accept())
  await page.getByRole('button', { name: 'Daten ersetzen', exact: true }).click()
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).produkte.length, key)).toBe(2)
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Daten exportieren', exact: true }).click()
  expect((await download).suggestedFilename()).toMatch(/paarfuss-sicherung/)
  await page.getByLabel('JSON-Sicherung importieren').setInputFiles({ name: 'kaputt.json', mimeType: 'application/json', buffer: Buffer.from('{') })
  await expect(page.getByRole('status')).toContainText('Import nicht möglich')
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).produkte.length, key)).toBe(2)
})

test('zweiter Tab blockiert veraltete Anzeige bis zum Neuladen', async ({ page, context }) => {
  await start(page, key)
  const zweite = await context.newPage()
  await zweite.goto('/')
  await nav(page, 'Lager').click()
  await page.getByRole('button', { name: 'Creme: Bestand erhöhen' }).click()
  await expect(zweite.getByRole('alert')).toContainText('anderen Tab')
  await zweite.getByRole('button', { name: 'Aktuellen Stand laden' }).click()
  await nav(zweite, 'Lager').click()
  await expect(zweite.getByRole('article').first()).toContainText('Bestand: 6')
})

test('Speicherfehler zeigt keine ungesicherte Bestandserhöhung', async ({ page }) => {
  await start(page, key)
  await nav(page, 'Lager').click()
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('Speicher voll') } })
  await page.getByRole('button', { name: 'Creme: Bestand erhöhen' }).click()
  await expect(page.getByRole('status')).toContainText('Speicher voll')
  await expect(page.getByRole('article').first()).toContainText('Bestand: 5')
})

test('beschädigte gespeicherte Daten bleiben geschützt', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(key => localStorage.setItem(key, 'kaputt'), key)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Daten konnten nicht geladen werden' })).toBeVisible()
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe('kaputt')
})

test('mobiles Lager passt ohne horizontalen Überlauf', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await start(page)
  await nav(page, 'Lager').click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/lager-mobil.png', fullPage: true })
})

test('manueller Wareneingang und unbekannter Barcode', async ({ page }) => {
  await start(page)
  await nav(page, 'Lager').click()
  await page.getByLabel('Barcode manuell eingeben').fill('4006381333931')
  await page.getByRole('button', { name: 'Wareneingang buchen', exact: true }).click()
  await expect(page.getByRole('article').first()).toContainText('Bestand: 6')
  await page.getByLabel('Barcode manuell eingeben').fill('NEU123')
  await page.getByRole('button', { name: 'Wareneingang buchen', exact: true }).click()
  await expect(page.getByLabel('Barcode (optional)', { exact: true })).toHaveValue('NEU123')
  await expect(page.getByLabel('Bestand', { exact: true })).toHaveValue('1')
})

test('echter WASM-Fotodecoder erkennt ein Barcodebild und bucht genau einmal', async ({ page }) => {
  const wasmBinary = await readFile(new URL('../../node_modules/zxing-wasm/dist/writer/zxing_writer.wasm', import.meta.url))
  prepareZXingModule({ overrides: { wasmBinary } })
  const ergebnis = await writeBarcode('4006381333931', { format: 'EAN13', scale: 4 })
  expect(ergebnis.error).toBe('')
  expect(ergebnis.image).not.toBeNull()
  await start(page)
  await nav(page, 'Lager').click()
  await page.getByLabel('Barcode fotografieren oder Bild auswählen').setInputFiles({ name: 'barcode.png', mimeType: 'image/png', buffer: Buffer.from(await ergebnis.image.arrayBuffer()) })
  await expect(page.getByRole('article').first()).toContainText('Bestand: 6', { timeout: 15000 })
  await expect(page.getByAltText('Aufgenommenes Barcode-Etikett')).toHaveCount(0)
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).produkte[0].lager.innsbruck.bestand, key)).toBe(6)
})

test('Kameraablehnung erlaubt weiterhin die manuelle Erfassung', async ({ page }) => {
  await start(page)
  await page.evaluate(() => { navigator.mediaDevices.getUserMedia = async () => { throw new Error('Test: Zugriff verweigert') } })
  await nav(page, 'Lager').click()
  await page.getByRole('button', { name: 'Kamera starten' }).click()
  await expect(page.getByText(/Kamera nicht verfügbar/)).toBeVisible()
  await page.getByLabel('Barcode manuell eingeben').fill('4006381333931')
  await page.getByRole('button', { name: 'Wareneingang buchen', exact: true }).click()
  await expect(page.getByRole('article').first()).toContainText('Bestand: 6')
})
