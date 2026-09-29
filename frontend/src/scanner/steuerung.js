// Jeder Start bekommt eine Kennung. Nach Stoppen oder Menüwechsel sind alte Ergebnisse ungültig.
export function scannerErstellen({ video, aktualisieren, barcodeErkannt, kamera, leserLaden, fotoLesen }) {
  let auftrag = 0
  let beendet = false
  let startLaeuft = false
  let steuerung = null
  let stream = null
  let fotoAdresse = null
  let ocrAbbrechen = null
  const aktuell = id => !beendet && id === auftrag
  const melden = status => { if (!beendet) aktualisieren(status) }

  function stoppen() {
    auftrag++
    steuerung?.stop()
    steuerung = null
    stream?.getTracks().forEach(spur => spur.stop())
    stream = null
    if (video.srcObject) video.srcObject = null
    ocrAbbrechen?.()
    ocrAbbrechen = null
    if (fotoAdresse) URL.revokeObjectURL(fotoAdresse)
    fotoAdresse = null
    melden({ modus: 'bereit', hinweis: '', fotoUrl: '', kandidat: '', startet: startLaeuft })
  }

  function buchen(id, barcode) {
    if (!aktuell(id) || !barcode?.trim()) return
    stoppen()
    barcodeErkannt(barcode.trim())
  }

  async function starten() {
    if (beendet || startLaeuft || steuerung) return
    stoppen()
    const id = auftrag
    startLaeuft = true
    melden({ modus: 'kamera', startet: true, hinweis: 'Kamera wird gestartet …' })
    try {
      const leser = await leserLaden()
      if (!aktuell(id)) return
      const neu = await kamera({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } })
      if (!aktuell(id)) { neu.getTracks().forEach(spur => spur.stop()); return }
      stream = neu
      const kontrolle = await leser.decodeFromStream(neu, video, (ergebnis, _fehler, kontrolle) => {
        if (!aktuell(id)) { kontrolle?.stop(); return }
        if (ergebnis?.getText()?.trim()) {
          steuerung = kontrolle
          buchen(id, ergebnis.getText())
        }
      })
      if (!aktuell(id)) { kontrolle.stop(); return }
      steuerung = kontrolle
      const spur = neu.getVideoTracks()[0]
      if (spur?.getCapabilities?.().focusMode?.includes('continuous')) {
        try { await spur.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }) }
        catch { /* Nicht jede Kamera unterstützt kontinuierlichen Fokus. */ }
      }
      if (aktuell(id)) melden({ hinweis: 'Barcode vor die Kamera halten. Jeder Start bucht höchstens eine Einheit.' })
    } catch (error) {
      if (aktuell(id)) {
        stoppen()
        melden({ hinweis: `Kamera nicht verfügbar: ${error.message}. Bitte Foto oder manuelle Eingabe verwenden.` })
      }
    } finally { startLaeuft = false; melden({ startet: false }) }
  }

  async function foto(datei) {
    if (beendet || !datei) return
    stoppen()
    const id = auftrag
    try {
      if (datei.size > 20 * 1024 * 1024) throw new Error('Bitte ein Foto mit höchstens 20 MB wählen')
      fotoAdresse = URL.createObjectURL(datei)
      melden({ modus: 'foto', fotoUrl: fotoAdresse, hinweis: 'Barcode im Foto wird gesucht …' })
      const ergebnis = await fotoLesen(datei, fotoAdresse, {
        aktuell: () => aktuell(id),
        melden: hinweis => { if (aktuell(id)) melden({ hinweis }) },
        abbrechenRegistrieren: funktion => { if (aktuell(id)) ocrAbbrechen = funktion; else funktion() },
      })
      if (!aktuell(id)) return
      if (!ergebnis) { stoppen(); melden({ hinweis: 'Kein Barcode erkannt. Bitte erneut fotografieren oder manuell eingeben.' }); return }
      if (ergebnis.ocr) {
        melden({ kandidat: ergebnis.barcode, hinweis: 'Ziffern erkannt. Bitte mit dem Etikett vergleichen und bestätigen.' })
      } else buchen(id, ergebnis.barcode)
    } catch (error) {
      if (aktuell(id)) { stoppen(); melden({ hinweis: `Foto konnte nicht gelesen werden: ${error.message}. Bitte manuell eingeben.` }) }
    }
  }

  return {
    starten, stoppen, foto,
    manuell(barcode) { if (!beendet && barcode.trim()) { stoppen(); barcodeErkannt(barcode.trim()) } },
    beenden() { beendet = true; stoppen() },
  }
}
