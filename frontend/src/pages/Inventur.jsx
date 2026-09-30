import { inventurAbschliessen, inventurMengeSetzen, inventurStarten, inventurZaehlen, leereInventur } from '../data/inventur.js'
import { FILIALEN } from '../data/filialen.js'
import Scanner from '../components/Scanner.jsx'

export default function Inventur({ daten, aendern, filiale }) {
  const inv = daten.inventur
  const unbekannt = inv.unbekannteBarcodes.reduce((summe, p) => summe + p.anzahl, 0)
  return <>
    <h2>Inventur · {FILIALEN[filiale]}</h2>
    {!inv.aktiv ? <>
      <p>Eine Inventur zählt getrennt vom Lager. Erst beim Abschluss werden die Lagerbestände ersetzt.</p>
      <button className="primaer" disabled={!daten.produkte.length} onClick={() => {
        if (window.confirm(`Inventur für ${FILIALEN[filiale]} starten? Alle Zählmengen beginnen bei 0. Bestandsbuchungen in dieser Filiale bleiben bis zum Abschluss oder Abbruch gesperrt.`)) aendern(inventurStarten, 'Inventur gestartet.')
      }}>Inventur starten</button>
      {!daten.produkte.length && <p>Bitte zuerst Produkte im Lager anlegen oder importieren.</p>}
    </> : <>
      <p>Begonnen: {new Date(inv.gestartetAm).toLocaleString('de-AT')}</p>
      <p>{inv.positionen.length} Produkte · {inv.positionen.reduce((summe, p) => summe + p.gezählt, 0)} bekannte Einheiten · {unbekannt} unbekannte Einheiten</p>
      <Scanner onBarcode={barcode => aendern(d => inventurZaehlen(d, barcode), `Barcode ${barcode}: eine Einheit gezählt.`)} aktion="Für Inventur zählen" />
      <h3>Soll-Ist-Vergleich</h3>
      <div className="produkt-raster">{inv.positionen.map(p => <article className="karte" key={p.artikelnummer}>
        <h3>{p.name}</h3><p>{p.artikelnummer} · {p.barcode || 'Ohne Barcode'}</p>
        <p>Soll: {p.erwartet} · Gezählt: {p.gezählt} {daten.produkte.find(q => q.artikelnummer === p.artikelnummer)?.einheit} · Differenz: {p.gezählt - p.erwartet}</p>
        <form key={p.gezählt} className="mengen-formular" onSubmit={event => {
          event.preventDefault()
          const anzahl = new FormData(event.currentTarget).get('menge')
          aendern(d => inventurMengeSetzen(d, p.artikelnummer, anzahl), `${p.name}: Zählmenge gespeichert.`)
        }}>
          <label>Gesamtmenge<input name="menge" type="number" min="0" step="1" required defaultValue={p.gezählt} /></label>
          <button type="submit">Menge übernehmen</button>
        </form>
      </article>)}</div>
      {unbekannt > 0 && <section className="karte"><h3>Unbekannte Barcodes</h3><p>Diese Einheiten werden beim Abschluss nicht ins Lager übernommen.</p><ul>{inv.unbekannteBarcodes.map(p => <li key={p.barcode}>{p.barcode}: {p.anzahl} Stück</li>)}</ul></section>}
      <div className="aktionen">
        <button className="primaer" onClick={() => {
          if (window.confirm(`Inventur für ${FILIALEN[filiale]} abschließen? Die gezählten Mengen ersetzen die Lagerbestände. Nicht gezählte Artikel werden auf 0 gesetzt.${unbekannt ? ` ${unbekannt} unbekannte Einheiten werden verworfen. Exportiere vorher bei Bedarf eine Sicherung unter Einstellungen.` : ''}`)) aendern(inventurAbschliessen, 'Inventur abgeschlossen. Lagerbestände gespeichert.')
        }}>Inventur abschließen</button>
        <button className="gefahr" onClick={() => {
          if (window.confirm('Inventur wirklich abbrechen und alle Zählungen verwerfen? Das Lager bleibt unverändert.')) aendern(d => ({ ...d, inventur: leereInventur() }), 'Inventur abgebrochen.')
        }}>Inventur abbrechen</button>
      </div>
    </>}
  </>
}
