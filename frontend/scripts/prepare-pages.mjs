import { mkdir, readFile, writeFile } from 'node:fs/promises'

// Nur die fertige Website wird hochgeladen. Quellcode, Tests und private Dateien
// gehören nicht in das Pages-Artefakt. Die alte HTML-App dient weiter als Exportweg.
const ziel = new URL('../dist/', import.meta.url)
const quelle = new URL('../../index.html', import.meta.url)
const html = await readFile(quelle, 'utf8')
if (!html.includes('datenFuerReactExportieren')) throw new Error('Der Exportknopf fehlt in der bisherigen App.')
const hinweis = `<aside style="padding:16px;background:#fff4d8;color:#463300">
  <strong>Bisherige App – Datenübernahme</strong>
  <p>Unter Start kannst du deine alten Daten für die React-App exportieren.
  Beide Versionen speichern getrennt; spätere Änderungen werden nicht automatisch übertragen.</p>
  <a href="../">Zur React-App</a>
</aside>`
await mkdir(new URL('alt/', ziel), { recursive: true })
// Scanner-CDNs dürfen den Export nicht blockieren, wenn sie langsam/offline sind.
const altHtml = html.replaceAll('<script src=', '<script defer src=')
await writeFile(new URL('alt/index.html', ziel), altHtml.replace('<body>', `<body>\n${hinweis}`))
await writeFile(new URL('.nojekyll', ziel), '')
console.log('GitHub Pages vorbereitet: React unter /Paarfuss-Inventur/, bisherige App unter /Paarfuss-Inventur/alt/.')
