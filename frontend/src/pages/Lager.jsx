import { useRef, useState } from 'react'
import { bestandAendern, produktSpeichern } from '../data/inventur.js'
import Scanner from '../components/Scanner.jsx'

const leer = () => ({ artikelnummer: '', barcode: '', name: '', bestand: '0', mindestbestand: '0' })
export default function Lager({ daten, aendern, setMeldung }) {
  const [formular, setFormular] = useState(leer)
  const [original, setOriginal] = useState(null)
  const [suche, setSuche] = useState('')
  const [sortierung, setSortierung] = useState('name')
  const [nurKritisch, setNurKritisch] = useState(false)
  const artikelFeld = useRef(null)
  function zuruecksetzen() { setFormular(leer()); setOriginal(null) }
  function buchen(barcode) {
    const produkt = daten.produkte.find(p => p.barcode === barcode)
    if (produkt) {
      if (aendern(d => bestandAendern(d, produkt.artikelnummer, 1), `${produkt.name}: ein Stück zum Lager hinzugefügt.`)) {
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
    <h2>Lager</h2>
    <Scanner onBarcode={buchen} aktion="Wareneingang buchen" />
    <section className="karte" aria-labelledby="produkt-formular-titel">
      <h3 id="produkt-formular-titel">{original === null ? 'Produkt hinzufügen' : 'Produkt bearbeiten'}</h3>
      <form className="formular" onSubmit={event => {
        event.preventDefault()
        if (aendern(d => produktSpeichern(d, formular, original), 'Produkt gespeichert.')) zuruecksetzen()
      }}>
        <label>Artikelnummer<input ref={artikelFeld} required value={formular.artikelnummer} onChange={e => setFormular({ ...formular, artikelnummer: e.target.value })} /></label>
        <label>Barcode (optional)<input value={formular.barcode} onChange={e => setFormular({ ...formular, barcode: e.target.value })} /></label>
        <label>Produktname<input required value={formular.name} onChange={e => setFormular({ ...formular, name: e.target.value })} /></label>
        <label>Bestand<input required type="number" min="0" step="1" value={formular.bestand} onChange={e => setFormular({ ...formular, bestand: e.target.value })} /></label>
        <label>Mindestbestand<input required type="number" min="0" step="1" value={formular.mindestbestand} onChange={e => setFormular({ ...formular, mindestbestand: e.target.value })} /></label>
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
        <p><strong>Bestand: {p.bestand}</strong> · Mindestbestand: {p.mindestbestand}</p>
        {p.bestand <= p.mindestbestand && <p className="kritisch">Nachbestellen</p>}
        <div className="aktionen">
          <button aria-label={`${p.name}: Bestand erhöhen`} onClick={() => aendern(d => bestandAendern(d, p.artikelnummer, 1))}>+1</button>
          <button aria-label={`${p.name}: Bestand verringern`} disabled={p.bestand === 0} onClick={() => aendern(d => bestandAendern(d, p.artikelnummer, -1))}>−1</button>
          <button onClick={() => { setOriginal(p.artikelnummer); setFormular({ ...p }); artikelFeld.current?.focus() }}>Bearbeiten</button>
          <button className="gefahr" onClick={() => {
            if (window.confirm(`„${p.name}“ wirklich löschen?${daten.inventur.aktiv ? ' Eine laufende Inventur kann dadurch nicht mehr abgeschlossen werden.' : ''}`)) {
              if (aendern(d => ({ ...d, produkte: d.produkte.filter(q => q.artikelnummer !== p.artikelnummer) }), 'Produkt gelöscht.') && original === p.artikelnummer) zuruecksetzen()
            }
          }}>Löschen</button>
        </div>
      </article>)}</div>
      {!sichtbar.length && <p className="leer">Keine Produkte gefunden. Lege ein Produkt an oder importiere deine bisherigen Daten unter Start.</p>}
    </section>
  </>
}
