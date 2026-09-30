import { useRef, useState } from 'react'
import { bestandAendern, produktSpeichern } from '../data/inventur.js'
import { FILIALEN, offeneMenge, umlagern } from '../data/filialen.js'
import Scanner from '../components/Scanner.jsx'

const leer = () => ({ artikelnummer: '', barcode: '', name: '', bestand: '0', mindestbestand: '0', zielbestand: '', einheit: 'Stück', packung: '1' })
export default function Lager({ daten, gesamtDaten, filiale, aendern, aendernGesamt, setMeldung }) {
  const [formular, setFormular] = useState(leer)
  const [original, setOriginal] = useState(null)
  const [suche, setSuche] = useState('')
  const [sortierung, setSortierung] = useState('name')
  const [nurKritisch, setNurKritisch] = useState(false)
  const artikelFeld = useRef(null)
  const bearbeitungsstand = useRef(null)
  function zuruecksetzen() { setFormular(leer()); setOriginal(null); bearbeitungsstand.current = null }
  function buchen(barcode) {
    const produkt = daten.produkte.find(p => p.barcode === barcode)
    if (produkt) {
      if (offeneMenge(gesamtDaten, produkt.id, filiale)) {
        setMeldung(`${produkt.name}: Es gibt eine offene Bestellung für ${FILIALEN[filiale]}. Bitte die Lieferung unter Nachbestellen buchen, damit die offene Menge abgeglichen wird.`)
        return
      }
      if (aendern(d => bestandAendern(d, produkt.artikelnummer, 1), `${produkt.name}: eine Zähleinheit zum Lager hinzugefügt.`)) {
        setSuche(barcode); setNurKritisch(false)
      }
    } else {
      setOriginal(null); setFormular({ ...leer(), barcode, bestand: '1' })
      setMeldung(`Neuer Barcode ${barcode}. Bitte Produktdaten ergänzen und speichern.`)
      artikelFeld.current?.focus()
    }
  }
  const suchtext = suche.trim().toLowerCase()
  const sichtbar = daten.produkte.filter(p => [p.name, p.artikelnummer, p.barcode].some(w => w.toLowerCase().includes(suchtext)) && (!nurKritisch || p.bestand <= p.mindestbestand)).sort((a, b) => {
    if (sortierung === 'bestand') return a.bestand - b.bestand || a.name.localeCompare(b.name, 'de')
    if (sortierung === 'nachbestellen') return Number(b.bestand <= b.mindestbestand) - Number(a.bestand <= a.mindestbestand) || a.name.localeCompare(b.name, 'de')
    return a.name.localeCompare(b.name, 'de')
  })
  return <>
    <h2>Lager · {FILIALEN[filiale]}</h2>
    <p>Produktname, Artikelnummer, Barcode, Zähleinheit und Bestellpackung gelten für beide Filialen. Bestand, Mindestbestand und Zielbestand gelten für {FILIALEN[filiale]}.</p>
    {daten.inventur.aktiv && <p className="hinweis">Inventur läuft: Bestandsbuchungen sind in {FILIALEN[filiale]} bis zum Abschluss oder Abbruch gesperrt.</p>}
    <p>Ein Scan bucht eine Zähleinheit. Lieferungen zu Bestellvermerken bitte unter „Nachbestellen“ erfassen.</p>
    <Scanner onBarcode={buchen} aktion="Wareneingang buchen" />
    <section className="karte" aria-labelledby="produkt-formular-titel">
      <h3 id="produkt-formular-titel">{original === null ? 'Produkt hinzufügen' : 'Produkt bearbeiten'}</h3>
      <form className="formular" onSubmit={event => {
        event.preventDefault()
        if (aendern(d => {
          if (original !== null && JSON.stringify(d.produkte.find(p => p.artikelnummer === original)) !== bearbeitungsstand.current) throw new Error('Das Produkt wurde während der Bearbeitung geändert. Bitte erneut auf Bearbeiten klicken.')
          return produktSpeichern(d, { ...formular, id: formular.id ?? crypto.randomUUID(), zielbestand: formular.zielbestand === '' ? formular.mindestbestand : formular.zielbestand }, original)
        }, 'Produkt gespeichert.')) zuruecksetzen()
      }}>
        <label>Artikelnummer<input ref={artikelFeld} required value={formular.artikelnummer} onChange={e => setFormular({ ...formular, artikelnummer: e.target.value })} /></label>
        <label>Barcode (optional)<input value={formular.barcode} onChange={e => setFormular({ ...formular, barcode: e.target.value })} /></label>
        <label>Produktname<input required value={formular.name} onChange={e => setFormular({ ...formular, name: e.target.value })} /></label>
        <label>Bestand<input required type="number" min="0" step="1" value={formular.bestand} onChange={e => setFormular({ ...formular, bestand: e.target.value })} /></label>
        <label>Mindestbestand<input required type="number" min="0" step="1" value={formular.mindestbestand} onChange={e => setFormular({ ...formular, mindestbestand: e.target.value })} /></label>
        <label>Zielbestand<input type="number" min={formular.mindestbestand || 0} step="1" placeholder="Wie Mindestbestand, falls leer" value={formular.zielbestand} onChange={e => setFormular({ ...formular, zielbestand: e.target.value })} /></label>
        <label>Zähleinheit<input required placeholder="z. B. Stück, Flasche, Schachtel" value={formular.einheit} onChange={e => setFormular({ ...formular, einheit: e.target.value })} /></label>
        <label>Zähleinheiten pro Bestellpackung<input required type="number" min="1" step="1" value={formular.packung} onChange={e => setFormular({ ...formular, packung: e.target.value })} /></label>
        <div className="aktionen"><button className="primaer" type="submit">Produkt speichern</button><button type="button" onClick={zuruecksetzen}>Abbrechen</button></div>
      </form>
    </section>
    <section aria-labelledby="produktliste-titel">
      <h3 id="produktliste-titel">Produktliste · {sichtbar.length} von {daten.produkte.length}</h3>
      <div className="formular">
        <label>Suche<input type="search" placeholder="Name, Artikelnummer oder Barcode" value={suche} onChange={e => setSuche(e.target.value)} /></label>
        <label>Sortierung<select value={sortierung} onChange={e => setSortierung(e.target.value)}><option value="name">Name</option><option value="bestand">Bestand aufsteigend</option><option value="nachbestellen">Nachbestellen zuerst</option></select></label>
      </div>
      <label className="auswahl"><input type="checkbox" checked={nurKritisch} onChange={e => setNurKritisch(e.target.checked)} />Nur nachzubestellende Produkte</label>
      <div className="produkt-raster">{sichtbar.map(p => <article className="karte" key={p.artikelnummer}>
        <h3>{p.name}</h3><p>Artikel: {p.artikelnummer}</p><p>Barcode: {p.barcode || 'Nicht hinterlegt'}</p>
        <p><strong>Bestand: {p.bestand}</strong>  {p.einheit} · Mindestbestand: {p.mindestbestand} · Zielbestand: {p.zielbestand}</p>
        <p>Eine Bestellpackung: {p.packung} {p.einheit}</p>
        {p.bestand <= p.mindestbestand && <p className="kritisch">Nachbestellen</p>}
        <div className="aktionen">
          <button aria-label={`${p.name}: Bestand erhöhen`} disabled={daten.inventur.aktiv} onClick={() => aendern(d => bestandAendern(d, p.artikelnummer, 1))}>+1</button>
          <button aria-label={`${p.name}: Bestand verringern`} disabled={p.bestand === 0 || daten.inventur.aktiv} onClick={() => aendern(d => bestandAendern(d, p.artikelnummer, -1))}>−1</button>
          <button onClick={() => { setOriginal(p.artikelnummer); setFormular({ ...p }); bearbeitungsstand.current = JSON.stringify(p); artikelFeld.current?.focus() }}>Bearbeiten</button>
          <button className="gefahr" onClick={() => {
            if (window.confirm(`„${p.name}“ aus dem gemeinsamen Produktkatalog beider Filialen löschen? Dies ist nur ohne Bestände, Bestellvermerke und laufende Inventuren möglich.`)) {
              if (aendern(d => ({ ...d, produkte: d.produkte.filter(q => q.artikelnummer !== p.artikelnummer) }), 'Produkt gelöscht.') && original === p.artikelnummer) zuruecksetzen()
            }
          }}>Löschen</button>
        </div>
        <details><summary>Ware in die andere Filiale umlagern</summary>
          <form className="mengen-formular" onSubmit={e => {
            e.preventDefault()
            const anzahl = new FormData(e.currentTarget).get('anzahl')
            const ziel = filiale === 'innsbruck' ? 'kematen' : 'innsbruck'
            if (window.confirm(`${anzahl} ${p.einheit} „${p.name}“ von ${FILIALEN[filiale]} nach ${FILIALEN[ziel]} umlagern?`)) aendernGesamt(d => umlagern(d, p.id, filiale, anzahl), 'Umlagerung in beiden Lagern gespeichert.')
          }}>
            <label>Umlagermenge ({p.einheit})<input name="anzahl" type="number" min="1" max={p.bestand} step="1" required defaultValue="1" /></label>
            <button type="submit" disabled={!p.bestand || Object.values(gesamtDaten.inventuren).some(i => i.aktiv)}>Nach {filiale === 'innsbruck' ? 'Kematen' : 'Innsbruck'} umlagern</button>
          </form>
        </details>
      </article>)}</div>
      {!sichtbar.length && <p className="leer">Keine Produkte gefunden. Lege ein Produkt an oder importiere deine bisherigen Daten unter Einstellungen.</p>}
    </section>
  </>
}
