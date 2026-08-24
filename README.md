# Paarfuss Inventur

Mobile Web-App zur Verwaltung des Lagers, zur barcodegestuetzten Inventur und zur Anzeige nachzubestellender Produkte fuer ein Fusspflegeunternehmen.

**Projektstatus:** Entwicklung  
**Stand:** 24. August 2026  
**Geplante Kundenuebergabe:** spaetestens 31. Oktober 2026  
**Live-Version:** [GitHub Pages](https://jpereira9702.github.io/Paarfuss-Inventur/)

> Die Anwendung wird als echte Kundenversion entwickelt, ist im aktuellen Stand aber noch nicht fuer die finale Uebergabe bereit. Insbesondere fehlen noch der vollstaendige Inventurabschluss, eine zentrale Datenbank, Benutzerkonten und die finale Oberflaeche.

## Ziel der Anwendung

Paarfuss Inventur soll die wichtigsten Lagerablaeufe auf Handy, Tablet und Desktop abdecken:

- Produkte und Lagerbestaende verwalten
- Barcodes live oder ueber ein Foto erkennen
- Produkte beim Wareneingang schnell erfassen
- eine Inventur durch Scannen oder manuelle Eingabe durchfuehren
- Soll- und Istbestaende vergleichen
- Produkte unter ihrem Mindestbestand anzeigen
- spaeter mehrere Geraete mit gemeinsamen Daten verwenden

## Aktueller Funktionsumfang

### Navigation

Die Anwendung besteht aus vier Hauptbereichen:

| Bereich | Aufgabe |
| --- | --- |
| Start | Begruessung und spaeter Firmenlogo sowie wichtige Kennzahlen |
| Lager | Produkte anlegen, suchen, bearbeiten, loeschen und Bestaende verwalten |
| Inventur | Eine getrennte Inventur starten und Produkte zaehlen |
| Nachbestellen | Produkte auf oder unter dem Mindestbestand anzeigen |

### Lagerverwaltung

Ein Produkt besitzt momentan folgende Daten:

```js
{
    artikelnummer: "FC-001",
    barcode: "",
    name: "Fusscreme",
    bestand: 5,
    mindestbestand: 2
}
```

Bereits umgesetzt:

- Produkte hinzufuegen und bearbeiten
- Produkte nach Bestaetigung loeschen
- Bestand mit `+` und `-` anpassen
- negative Bestaende verhindern
- eindeutige Artikelnummern pruefen
- optionale, aber bei Eingabe eindeutige Barcodes pruefen
- Suche nach Name, Artikelnummer oder Barcode
- Sortierung nach Name, Bestand oder Nachbestellstatus
- Filter fuer nachzubestellende Produkte
- Gesamtzahl der Produkte und Nachbestellungen anzeigen
- vorhandene alte Browserdaten um fehlende Felder ergaenzen

### Barcodeerkennung

Die Anwendung verwendet mehrere kostenlose Erkennungswege:

1. **Live-Scanner:** Liest flache 1D-Barcodes direkt aus dem Kamerabild.
2. **Foto-Scanner:** Analysiert ein aufgenommenes Bild und ist fuer schwierigere oder gekruemmte Etiketten vorgesehen.
3. **OCR-Fallback:** Versucht die aufgedruckten Ziffern unter dem Barcode zu lesen.
4. **Manuelle Eingabe:** Bleibt als Rueckfalloption, wenn Kamera oder Erkennung scheitern.

Verwendete Bibliotheken:

| Bibliothek | Verwendung |
| --- | --- |
| `@zxing/browser 0.2.0` | Live-Erkennung aus dem Videobild |
| `zxing-wasm 3.1.2` | Barcodeerkennung in aufgenommenen Fotos |
| `Tesseract.js 7.0.0` | OCR der gedruckten Barcodeziffern |

Die Bibliotheken werden derzeit ueber externe CDNs geladen. Fuer die Erkennung ist deshalb eine Internetverbindung erforderlich, solange sie nicht lokal in das Projekt aufgenommen werden.

Scannerverhalten im Lager:

- Ein bekannter Barcode erhoeht den Bestand des passenden Produktes um eins.
- Ein unbekannter Barcode wird in das Formular uebernommen.
- Der Benutzer ergaenzt danach Artikelnummer, Produktname und weitere Angaben.

### Inventur

Eine laufende Inventur wird bewusst getrennt vom echten Lagerbestand gehalten:

```js
{
    aktiv: false,
    gestartetAm: null,
    positionen: [],
    unbekannteBarcodes: []
}
```

Beim Start wird fuer jedes Produkt eine Momentaufnahme angelegt:

- `erwartet`: Lagerbestand beim Start der Inventur
- `gezaehlt`: waehrend der Inventur erfasste Menge

Bereits umgesetzt:

- Inventur starten und abbrechen
- Sollbestand als unveraenderte Momentaufnahme halten
- Einheiten manuell per Barcode zaehlen
- gemeinsamen Kamera- und Foto-Scanner in den Inventurbereich verschieben
- Inventurzaehlung vom echten Lagerbestand trennen
- Anzahl der gezaehlten Einheiten anzeigen

Noch offen:

- aktuelle Kameraanbindung auf dem Handy abschliessend testen
- unbekannte Barcodes sichtbar sammeln
- Soll-Ist-Vergleich anzeigen
- Inventur abschliessen
- gezaehlte Bestaende erst nach ausdruecklicher Bestaetigung uebernehmen
- laufende Inventur dauerhaft speichern und nach einem Neustart fortsetzen

### Nachbestellungen

Der Bereich zeigt automatisch alle Produkte, fuer die gilt:

```js
produkt.bestand <= produkt.mindestbestand
```

Die Berechnung der konkret fehlenden Menge sowie ein Bestellstatus sind fuer einen spaeteren Schritt vorgesehen.

## Datenspeicherung

Produktdaten werden momentan als JSON im `localStorage` des Browsers gespeichert:

```js
localStorage.setItem("produkte", JSON.stringify(produkte));
```

Das bedeutet aktuell:

- Daten bleiben nach dem Neuladen im selben Browser erhalten.
- Jeder Browser und jedes Geraet besitzt eigene Daten.
- Handy, Tablet und Computer sind noch nicht synchronisiert.
- Das Loeschen der Browserdaten entfernt auch die gespeicherten Produkte.
- Eine laufende Inventur wird noch nicht dauerhaft gespeichert.
- Es gibt noch keine Benutzerkonten, Rollen oder serverseitigen Backups.

Vor der Kundenuebergabe wird eine zentrale Datenbank benoetigt, damit alle berechtigten Geraete denselben Datenstand verwenden.

## Technischer Aufbau

Das Projekt besteht aktuell aus einer einzigen Datei:

```text
Paarfuss Inventur/
|-- index.html
`-- README.md
```

`index.html` enthaelt:

- semantische HTML-Bereiche fuer Navigation und Ansichten
- grundlegendes CSS fuer Fotovorschau und Scanrahmen
- Produkt-, Scanner- und Inventurlogik in JavaScript
- Einbindung der externen Scanner- und OCR-Bibliotheken

Diese Struktur ist waehrend des Lernens gut nachvollziehbar. Vor der finalen Version soll sie mindestens in HTML, CSS und JavaScript aufgeteilt werden, damit Wartung und Tests leichter werden.

## Wichtige Funktionen

| Funktion | Aufgabe |
| --- | --- |
| `ansichtWechseln()` | Wechselt das sichtbare Menue und verschiebt den gemeinsamen Scanner |
| `standardProdukte()` | Liefert Testprodukte, wenn keine Browserdaten existieren |
| `produkteLaden()` | Laedt und migriert gespeicherte Produktdaten |
| `produkteSpeichern()` | Speichert Produkte im aktuellen Browser |
| `produkteAnzeigen()` | Filtert, sortiert und zeichnet die Lagerliste |
| `produkthinzufuegen()` | Validiert und speichert neue oder bearbeitete Produkte |
| `scannerStarten()` | Startet den Live-Kamerascanner |
| `scannerStoppen()` | Stoppt Decoder und Kameraspuren |
| `barcodeFotoVerarbeiten()` | Erkennt einen Barcode aus einem Foto |
| `barcodeZiffernLesen()` | Liest Barcodeziffern als OCR-Fallback |
| `scanVerarbeiten()` | Leitet einen Scan an Lager oder Inventur weiter |
| `inventurStarten()` | Erstellt eine neue Inventur-Momentaufnahme |
| `inventurProduktZaehlen()` | Erhoeht nur die gezaehlte Inventurmenge |
| `inventurAnzeigeAktualisieren()` | Aktualisiert Status und Zaehler der Inventur |
| `nachbestellungenAnzeigen()` | Erzeugt die Liste der kritischen Bestaende |

Die echten Funktionsnamen im Code enthalten teilweise deutsche Sonderzeichen, beispielsweise `produkthinzufuegen` als `produkthinzufügen` und `inventurProduktZaehlen` als `inventurProduktZählen`.

## Anwendung starten

### Veroeffentlichte Version

Die aktuelle GitHub-Pages-Version ist erreichbar unter:

<https://jpereira9702.github.io/Paarfuss-Inventur/>

Auf iPhone und iPad kann Safari eine alte Version zwischenspeichern. Nach einer neuen Veroeffentlichung deshalb die Seite neu laden. Falls noetig, Safari vollstaendig schliessen oder die Websitedaten entfernen.

### Lokal

`index.html` kann direkt im Browser geoeffnet werden. Kamerafunktionen sind lokal ueber eine `file://`-Adresse jedoch je nach Browser eingeschraenkt. Fuer verlaessliche Kameratests sollte die HTTPS-Version auf GitHub Pages verwendet werden.

## Entwicklung und Veroeffentlichung

Aktueller Entwicklungsbranch:

```text
Barcodesearch
```

Typischer Ablauf nach einer getesteten Aenderung:

```bash
git status
git add index.html README.md
git commit -m "Kurze Beschreibung der Aenderung"
git push origin Barcodesearch
```

GitHub Pages aktualisiert die Live-Version nur aus dem in den Repository-Einstellungen konfigurierten Branch und Ordner. Die URL bleibt bei neuen Deployments gleich.

## Testcheckliste

### Lager

- Produkt mit und ohne Barcode anlegen
- doppelte Artikelnummer ablehnen
- doppelten, nicht leeren Barcode ablehnen
- Produkt bearbeiten und loeschen
- Bestand erhoehen und verringern
- negativen Bestand verhindern
- nach Name, Artikelnummer und Barcode suchen
- alle Sortierungen und den Nachbestellfilter pruefen
- Seite neu laden und gespeicherte Daten kontrollieren

### Scanner

- Live-Scanner auf Handy und Tablet starten und stoppen
- bekannten Barcode scannen und genau eine Buchung pruefen
- unbekannten Barcode scannen und Formular pruefen
- flaches Produkt testen
- runde Flasche beziehungsweise gekruemmtes Etikett fotografieren
- Foto mit schlechtem Licht und groesserem Abstand testen
- manuellen Fallback nach einem Erkennungsfehler pruefen
- Kamera beim Menuewechsel und nach einem Treffer kontrollieren

### Inventur

- Inventur mit vorhandenen Produkten starten
- bekannten Barcode manuell erfassen
- bekannten Barcode mit Live- und Foto-Scanner erfassen
- denselben Artikel mehrfach zaehlen
- unbekannten Barcode testen
- sicherstellen, dass der echte Lagerbestand waehrend der Zaehlung unveraendert bleibt
- Inventur abbrechen und Zustand kontrollieren

Die juengsten Aenderungen an der Scannerweiterleitung und am manuellen Inventur-Fallback sind am 24. August 2026 noch nicht auf dem Handy getestet.

## Bekannte Grenzen

- Daten liegen nur lokal im jeweiligen Browser.
- Eine laufende Inventur geht beim Neuladen verloren.
- Es gibt noch keinen Inventurabschluss und keine Differenzliste.
- Es gibt noch keine Anmeldung oder Benutzerrollen.
- Es gibt noch keinen serverseitigen Aenderungsverlauf und kein Backup.
- Die Oberflaeche verwendet noch weitgehend Browser-Standarddesign.
- Scannerbibliotheken werden extern geladen.
- Barcodeerkennung auf stark gekruemmten Oberflaechen bleibt von Licht, Fokus, Abstand und sichtbarem Barcodebereich abhaengig.
- Der aktuelle Code liegt noch vollstaendig in einer einzelnen HTML-Datei.

## Roadmap bis zur Kundenuebergabe

### Phase 1: Inventur abschliessen

- [x] Inventur getrennt vom Lagerbestand starten
- [x] Produkte manuell zaehlen
- [x] gemeinsamen Scanner in den Inventurbereich integrieren
- [ ] Scannerweiterleitung auf dem Handy testen
- [ ] unbekannte Barcodes erfassen und anzeigen
- [ ] Soll-Ist-Differenzen je Produkt anzeigen
- [ ] Inventurabschluss mit Bestaetigung bauen
- [ ] gezaehlte Werte kontrolliert in das Lager uebernehmen
- [ ] laufende Inventur zwischenspeichern

### Phase 2: Scanner stabilisieren

- [ ] Live-, Foto- und manuellen Ablauf gemeinsam testen
- [ ] Mehrfachscans und doppelte Buchungen verhindern
- [ ] klare Erfolgs-, Warte- und Fehlermeldungen erstellen
- [ ] Kamera beim Menuewechsel verlaesslich stoppen
- [ ] Tests mit echten flachen und runden Produkten durchfuehren

### Phase 3: Arbeitsablaeufe vervollstaendigen

- [ ] Startseite mit Firmenlogo und Kennzahlen ausbauen
- [ ] aktiven Navigationspunkt markieren
- [ ] Nachbestellmenge berechnen
- [ ] Bestellstatus vorsehen
- [ ] sichere Abbrechen- und Bestaetigungsablaeufe ergaenzen

### Phase 4: Zentrale Daten und Sicherheit

- [ ] geeignete gemeinsame Datenbank auswaehlen
- [ ] Produkt-, Bestands- und Inventurdaten zentral speichern
- [ ] Synchronisierung zwischen Handy, Tablet und Computer umsetzen
- [ ] Benutzeranmeldung und Rollen einfuehren
- [ ] kritische Aktionen schuetzen
- [ ] Aenderungsverlauf und Backup-Konzept erstellen

### Phase 5: Unternehmensgerechte UI und PWA

- [ ] Firmenlogo, Farben und Typografie einbauen
- [ ] mobile Navigation und grosse Scanbedienelemente gestalten
- [ ] Lade-, Leer-, Erfolgs- und Fehlerzustaende gestalten
- [ ] Darstellung auf Handy, Tablet und Desktop optimieren
- [ ] App installierbar machen
- [ ] App-Symbol und PWA-Manifest hinzufuegen
- [ ] Verhalten bei fehlender Internetverbindung definieren

### Phase 6: Qualitaet und Uebergabe

- [ ] Code in wartbare Dateien beziehungsweise Module aufteilen
- [ ] Syntax-, Funktions- und Geraetetests abschliessen
- [ ] Testinventur mit echten Produkten durchfuehren
- [ ] Kundenfeedback einarbeiten
- [ ] Testdaten entfernen und echte Kundendaten vorbereiten
- [ ] Bedienungsanleitung und Einweisung erstellen
- [ ] Produktionsversion sichern und veroeffentlichen
- [ ] finale Kundenuebergabe durchfuehren

## Zeitplan bis Ende Oktober 2026

Bei etwa zwei bis drei Stunden Arbeit pro Tag an vier bis fuenf Tagen pro Woche ist eine klar begrenzte Version 1 bis Ende Oktober realistisch.

| Zeitraum | Ziel |
| --- | --- |
| Bis Anfang September | Inventur und Scannerablaeufe fertigstellen |
| September, Woche 2-3 | Code strukturieren und zentrale Datenbank anbinden |
| September, Woche 4 | Anmeldung, Rollen und grundlegende Sicherheit |
| Anfang Oktober | Unternehmensgerechte UI, mobile Optimierung und PWA |
| Mitte Oktober | Nachbestellungen, Fehlerfaelle und echte Produkttests |
| Letzte zwei Oktoberwochen | Kundenfeedback, Fehlerkorrekturen, Anleitung und Uebergabe |

Angestrebte Meilensteine:

- **15. Oktober 2026:** testfaehige Kundenversion
- **31. Oktober 2026:** finale Version-1-Uebergabe

Komfortfunktionen wie mehrere Filialen, umfangreiche Statistiken, automatische Bestellungen oder eine vollstaendige Offline-Synchronisierung gehoeren bei Zeitdruck in eine spaetere Version 2.

## Datenschutz und Sicherheit

Vor dem Einsatz mit echten Unternehmensdaten muessen mindestens folgende Punkte geklaert und umgesetzt werden:

- Welche personenbezogenen Daten werden gespeichert?
- Wer darf Produkte und Bestaende sehen oder aendern?
- Wie werden Benutzer authentifiziert?
- Wie werden Daten gesichert und wiederhergestellt?
- Wie lange werden Aenderungs- und Inventurprotokolle aufbewahrt?
- Wo wird die zentrale Datenbank betrieben?
- Welche Datenschutzinformationen benoetigt der Kunde?

Die aktuelle GitHub-Pages-Version ist eine statische Web-App und ersetzt diese Sicherheits- und Datenschutzmassnahmen noch nicht.

## Projektgrundsaetze

- Funktionen werden schrittweise entwickelt und nach jedem Abschnitt getestet.
- Aenderungen werden mit Vorher-/Nachher-Beispielen erklaert.
- Barcodeerkennung muss immer eine manuelle Rueckfalloption besitzen.
- Eine Inventur darf den echten Lagerbestand erst nach ausdruecklicher Bestaetigung veraendern.
- Mobile Bedienung und echte Arbeitsablaeufe haben Vorrang vor dekorativen Funktionen.
- Neue Abhaengigkeiten sollen moeglichst kostenlos, nachvollziehbar und langfristig wartbar sein.
