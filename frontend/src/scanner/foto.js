import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader'
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url'
import { pruefzifferGueltig } from './gtin.js'

// Vite liefert die WASM-Datei mit aus; die Fotoerkennung benötigt dafür kein CDN.
prepareZXingModule({ overrides: { locateFile: (pfad, basis) => pfad.endsWith('.wasm') ? wasmUrl : basis + pfad } })
const optionen = { formats: ['EAN13', 'EAN8', 'UPCA', 'UPCE', 'Code128'], tryHarder: true, tryRotate: true, tryInvert: true, tryDownscale: true, maxNumberOfSymbols: 1 }

function bildLaden(url) {
  return new Promise((resolve, reject) => {
    const bild = new Image()
    bild.onload = () => resolve(bild)
    bild.onerror = () => reject(new Error('Bildformat wird nicht unterstützt'))
    bild.src = url
  })
}

function ausschnitt(bild) {
  const canvas = document.createElement('canvas')
  const breite = bild.naturalWidth * 0.9
  const hoehe = bild.naturalHeight * 0.2
  const faktor = Math.min(2, 3000 / breite)
  canvas.width = Math.max(1, Math.round(breite * faktor))
  canvas.height = Math.max(1, Math.round(hoehe * faktor))
  canvas.getContext('2d').drawImage(bild, bild.naturalWidth * 0.05, bild.naturalHeight * 0.4, breite, hoehe, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Bildausschnitt fehlgeschlagen')), 'image/jpeg', 0.95))
}

export async function fotoLesen(datei, url, { aktuell, melden, abbrechenRegistrieren }) {
  const bild = await bildLaden(url)
  if (!aktuell()) return null
  const teil = await ausschnitt(bild)
  if (!aktuell()) return null
  let ergebnisse = await readBarcodes(teil, optionen)
  if (!aktuell()) return null
  if (!ergebnisse.length) {
    melden('Barcode wird im vollständigen Foto gesucht …')
    ergebnisse = await readBarcodes(datei, optionen)
  }
  if (!aktuell()) return null
  if (ergebnisse[0]?.text?.trim()) return { barcode: ergebnisse[0].text.trim(), ocr: false }

  melden('Ziffernerkennung wird geladen. Beim ersten Mal ist eine Internetverbindung erforderlich …')
  const { createWorker, PSM } = await import('tesseract.js')
  if (!aktuell()) return null
  // Ein Worker je Foto; innerhalb eines Fotos werden die Streifen nacheinander gelesen.
  const worker = await createWorker('eng')
  let beendet = false
  const beenden = () => {
    if (!beendet) { beendet = true; return worker.terminate().catch(() => {}) }
  }
  abbrechenRegistrieren(beenden)
  try {
    if (!aktuell()) return null
    await worker.setParameters({ tessedit_char_whitelist: '0123456789', tessedit_pageseg_mode: PSM.SINGLE_LINE })
    for (const [index, position] of [0.1, 0.25, 0.4, 0.55, 0.7].entries()) {
      if (!aktuell()) return null
      melden(`Ziffern in Bildbereich ${index + 1} von 5 werden gelesen …`)
      const ergebnis = await worker.recognize(bild, { rectangle: { left: 0, top: Math.round(bild.naturalHeight * position), width: bild.naturalWidth, height: Math.round(bild.naturalHeight * 0.2) } })
      if (!aktuell()) return null
      const barcode = ergebnis.data.text.replace(/\D/g, '')
      if (pruefzifferGueltig(barcode)) return { barcode, ocr: true }
    }
    return null
  } finally { await beenden() }
}
