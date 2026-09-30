export default function Start({ daten, wechseln, filialeName }) {
  return <>
    <h2>Start</h2><p>Willkommen bei Paarfuss Inventur · {filialeName}</p>
    <div className="kennzahlen">
      <div className="karte"><strong>{daten.produkte.length}</strong><span>Produkte</span></div>
      <div className="karte"><strong>{daten.produkte.filter(p => p.bestand <= p.mindestbestand).length}</strong><span>Am Mindestbestand oder darunter</span></div>
      <div className="karte"><strong>{daten.inventur.aktiv ? 'Läuft' : 'Keine'}</strong><span>Aktive Inventur</span></div>
    </div>
    <div className="aktionen"><button onClick={() => wechseln('lager')}>Zum Lager</button><button onClick={() => wechseln('nachbestellen')}>Nachbestellungen beider Filialen</button>{daten.inventur.aktiv && <button onClick={() => wechseln('inventur')}>Inventur fortsetzen</button>}</div>
  </>
}
