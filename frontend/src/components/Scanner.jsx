import { useLayoutEffect, useRef, useState } from 'react'
import { scannerErstellen } from '../scanner/steuerung.js'

export default function Scanner({ onBarcode, aktion }) {
  const video = useRef(null)
  const scanner = useRef(null)
  const rueckruf = useRef(onBarcode)
  const [eingabe, setEingabe] = useState('')
  const [status, setStatus] = useState({ modus: 'bereit', startet: false, hinweis: '', fotoUrl: '', kandidat: '' })
  useLayoutEffect(() => { rueckruf.current = onBarcode }, [onBarcode])
  useLayoutEffect(() => {
    const steuerung = scannerErstellen({
      video: video.current,
      aktualisieren: neu => setStatus(alt => ({ ...alt, ...neu })),
      barcodeErkannt: barcode => rueckruf.current(barcode),
      kamera: optionen => {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Die Kamera benötigt HTTPS oder localhost')
        return navigator.mediaDevices.getUserMedia(optionen)
      },
      leserLaden: async () => { const { BrowserMultiFormatOneDReader } = await import('@zxing/browser'); return new BrowserMultiFormatOneDReader() },
      fotoLesen: async (...args) => { const { fotoLesen } = await import('../scanner/foto.js'); return fotoLesen(...args) },
    })
    scanner.current = steuerung
    // Auch beim Menüwechsel oder Inventurabschluss wird die Kamera freigegeben.
    const unsichtbar = () => { if (document.hidden) steuerung.stoppen() }
    document.addEventListener('visibilitychange', unsichtbar)
    return () => { document.removeEventListener('visibilitychange', unsichtbar); steuerung.beenden() }
  }, [])

  return <section className="karte scanner" aria-label="Barcode erfassen">
    <h3>{aktion}</h3>
    <p>Ein Scan erfasst ein Stück. Für ein weiteres Stück den Scanner erneut starten.</p>
    <div className="aktionen">
      <button type="button" disabled={status.startet || status.modus !== 'bereit'} onClick={() => scanner.current?.starten()}>Kamera starten</button>
      {(status.modus !== 'bereit' || status.startet) && <button type="button" onClick={() => scanner.current?.stoppen()}>Scanner schließen</button>}
    </div>
    <video ref={video} muted playsInline hidden={status.modus !== 'kamera'} />
    <label>Barcode fotografieren oder Bild auswählen<input type="file" accept="image/*" capture="environment" onChange={event => {
      const datei = event.target.files[0]; event.target.value = ''; scanner.current?.foto(datei)
    }} /></label>
    {status.fotoUrl && <div className="barcode-foto"><img src={status.fotoUrl} alt="Aufgenommenes Barcode-Etikett" /><div className="scanrahmen" /></div>}
    {status.hinweis && <p role="status">{status.hinweis}</p>}
    {status.kandidat && <div className="hinweis"><p>Erkannte Ziffern: <strong>{status.kandidat}</strong></p><button type="button" onClick={() => scanner.current?.manuell(status.kandidat)}>Barcode bestätigen und buchen</button></div>}
    <form className="mengen-formular" onSubmit={event => {
      event.preventDefault()
      if (eingabe.trim()) { scanner.current?.manuell(eingabe); setEingabe('') }
    }}><label>Barcode manuell eingeben<input required value={eingabe} onChange={e => setEingabe(e.target.value)} autoComplete="off" /></label><button type="submit">{aktion}</button></form>
  </section>
}
