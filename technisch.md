# Technische Beschreibung

Aufbau und Umsetzung des Spiels. Spielregeln und Bedienung: [fachlich.md](fachlich.md). Aenderungsverlauf: [devlog.md](devlog.md).

## Grundprinzipien

- Kein Build-Schritt, kein `package.json`, kein Server: `index.html` laeuft direkt ueber `file://`.
- Zur Laufzeit keine Netzabrufe. Three.js, PathFinding.js, simplex-noise, Modelle und Icons liegen lokal unter `src/vendor/` und `src/assets/` (`tests/browser-startup.cjs` prueft das).
- Ausschliesslich 3D (WebGL). Ohne WebGL bleibt ein Fehlerhinweis sichtbar und die Simulation pausiert.
- Oberflaechentexte sind deutsch mit ASCII-Umschreibungen (ae, oe, ue, ss).

## Skripte und globaler Zustand

Alle Dateien sind klassische Skripte ohne Module und teilen einen globalen Gueltigkeitsbereich. Ladereihenfolge in `index.html`:

1. `src/vendor/*.min.js` (globale Namen `ThreeLibrary`, `PF`, `TerrainNoise`)
2. `landscape.js`: deterministische, seed-basierte Landschaft und Vorschau
3. `assets/models.js` (generiert) und `models.js`: quantisierte Modellgeometrie zu Three.js-Geometrien
4. `towns.js`: monatliches Stadtwachstum
5. `railway.js`: Zustand `traffic`, Signalbloecke, PBS-Reservierungen, explizite Gleisverbindungen (`links`-Bitmaske O=1, W=2, S=4, N=8; `undefined` = alte automatische Verbindung)
6. `construction.js`: Vorschau -> Bestaetigen; Bauen ist atomar und wird beim Bestaetigen komplett neu geprueft
7. `physics.js`: Beschleunigung, Bremsen, Kurvenlimits
8. `game.js`: Kern mit `config`, `game`, Karte, Routensuche, Fahrzeugen, Fracht, Monatsabrechnung, Renderer (`three`), UI, Eingabe und `frame`-Schleife; endet mit `init();`
9. `management.js`: Spielstaende, Import/Export, Welt-Dialog, Fahrzeugliste und Auftraege; endet mit `initManagement();`

Top-Level-Code darf keine Funktionen aus spaeter geladenen Dateien aufrufen.

## Spielstaende und Kompatibilitaet

`createSave` schreibt eine feste Liste von `game`-Feldern, `decodeSave` prueft jedes Feld streng, `restoreSave` stellt wieder her. localStorage-Schluessel: `libre-transport-save-v1` (Autosave alle 15 s und beim Verlassen) und `libre-transport-previous-world-v1` (eine Sicherung vor Neustart/Erweiterung).

Alte Spielstaende muessen weiter laden (ohne Groesse, Seed, Signale, PBS, `links`, Mehrfeld-Stationen, Wachstumsdaten, alte 2D-Staende). Neue Felder werden erst bei Bedarf ergaenzt, nicht beim Laden in alte Staende geschrieben. Neue Zustandsfelder brauchen Eintraege in `createSave` und Pruefungen in `decodeSave`. Gleicher Seed, gleiche Groesse und gleicher Typ muessen je Generatorversion dieselbe Welt ergeben.

## Kamera und Eingabe

Die Kamera ist eine Orbit-Kamera (`three.orbit`: `targetX/targetZ`, `yaw`, `pitch`, `distance`), gesetzt in `update3dCamera`. Kartenereignisse laufen ueber `bindMapTarget` in `game.js`:

- **Maus:** Linke Taste zeichnet mit Schiene/Strasse, rechte Taste dreht, mittlere bzw. Umschalt + rechte Taste verschiebt, Mausrad zoomt.
- **Fuehrerhaus:** eigener Zweig; Ziehen (auch Touch) dreht den Blick.
- **Touch** (`pointerType === "touch"`, eigener Zweig): Aktive Finger stehen in einer Map. Nach jeder Aenderung wird der Bodenpunkt unter dem Finger bzw. unter dem Fingermittelpunkt per Raycast (`groundPointAt`) neu verankert, damit die Karte am Finger haftet. Pinch skaliert `distance` umgekehrt zum Fingerabstand, Verdrehen aendert `yaw`. Der Nachlauf (`three.inertia`, `applyMapInertia`) nutzt eine geglaettete Geschwindigkeit aus `event.timeStamp` und startet nur, wenn zwischen letzter Bewegung und Loslassen weniger als 80 ms liegen. Nach einer Geste blockiert `three.blockClickUntil` den nachfolgenden Klick fuer 400 ms.
- **Zeichnen per Touch:** Mit Schiene/Strasse wird zuerst nur `pendingPaint` gemerkt; gezeichnet wird erst nach 8 px Bewegung. Ein zweiter Finger davor macht eine Kamerageste daraus, eine offene Vorschau bleibt erhalten. Ein zweiter Finger waehrend des Zeichnens bricht das Zeichnen ab. Tippen ohne Bewegung entspricht einem Mausklick (Ein-Feld-Vorschau).
- **Bau-Lupe:** Solange ein Finger zeichnet (`three.touchDraw`), rendert `renderBuildLoupe` nach dem Hauptbild einen zweiten Durchgang mit `three.loupeCamera` (Abstand 6, gleiche Drehung/Neigung) in einen Scissor-Bereich ueber dem Finger. Rahmen und Fadenkreuz sind das CSS-Element `#buildLoupe`.
- **Rand-Scrollen:** `applyTouchDrawScroll` verschiebt die Karte, solange der zeichnende Finger im Randbereich (max. 48 px) steht, und verlaengert die Vorschau auf das Feld unter dem Finger.

## 3D-Modelle

Die 3D-Ansicht verwendet 30 lokal eingebundene CC0-Modelle von Kenney statt der bisherigen einfachen Platzhalter: sechs Haustypen mit unterschiedlichen Fassaden und Daechern, vier Baumtypen, Fabrik-/Lagergebaeude, Tanks, Schornsteine, Farmdetails, Dampflok, Personen-/Gueterwagen, Truck, Traktor und Ladung. Die Auswahl ist stilisiert und nicht streng auf ein historisches Baujahr beschraenkt.

Kohle und Getreide sind vom Wagen getrennt; Kisten erscheinen schrittweise beim Laden. Leere Wagen zeigen keine Ladung. Personenwagen haben eine kleine Belegungsmarkierung. Gleise besitzen Schwellen und Schotterbett. Wiederholte Modelle werden per Instancing dargestellt; Geometrien werden gemeinsam genutzt und bei Weltumbauten nicht staendig neu geladen. Beleuchtung und Kontakt-Schatten sind auf die Modelle abgestimmt.

Die aufbereiteten Modelldaten benoetigen ca. 0,9 MB und werden als lokale JavaScript-Datei geladen. Es gibt keine zusaetzlichen Modell-/Texturabrufe beim Spielen; der direkte Start ueber `index.html` bleibt moeglich. Bestehende Spielstaende, Fahrzeugparameter und Streckenregeln bleiben erhalten. Alte 2D-Spielstaende werden beim Laden in 3D geoeffnet; neue Exporte enthalten keine 2D-Kamera mehr. [Quellen, originale CC0-Lizenzen und Aufbereitung](src/assets/README.md) sowie die [Modellliste](src/assets/manifest.json) liegen im Projekt. Es wurden echte 3D-Modelle eingebunden, keine KI-Bilder als 3D-Ersatz.

## Lokale Abhaengigkeiten neu bauen

Nur noetig, wenn sich Bibliotheken oder Modelle aendern. Beide Skripte brauchen Werkzeuge in `artifacts/routing-vendor/node_modules` (three 0.164.1, esbuild 0.25.0):

- `node scripts/build-three.cjs` erzeugt `src/vendor/three-0.164.1.min.js` (IIFE, global `ThreeLibrary`).
- `node scripts/build-assets.mjs` erzeugt `src/assets/models.js` und `manifest.json` aus den Kenney-Paketen in `artifacts/kenney/`. `models.js` nicht von Hand bearbeiten.

Details: `src/vendor/README.md`, `src/assets/README.md`.

## Tests

Jeder Test ist ein eigenstaendiges Node-Skript ohne Testframework (Exit-Code 0 = bestanden, `node:assert/strict`). Aus dem Projektverzeichnis starten, da Browser-Tests `index.html` und `artifacts/` relativ dazu aufloesen.

```bash
node tests/railway.cjs
for t in tests/*.cjs; do case $t in tests/browser*) continue;; esac; node "$t" || echo "FAIL $t"; done
```

**Tests ohne Browser** laden einen Teil von `src/*.js` per `readFileSync`, entfernen das abschliessende `init();`/`initManagement();` per Regex und fuehren den Code mit DOM-Attrappen in `vm.runInNewContext` aus. Deshalb muessen diese Aufrufe die letzte Zeile ihrer Datei bleiben, und Simulationslogik muss ohne echtes DOM/WebGL lauffaehig sein.

**Browser-Tests** brauchen `playwright` und `pngjs` (ohne `package.json`, untracked in `node_modules/`):

```bash
npm install --no-save --no-package-lock playwright pngjs
npx playwright install chromium
sudo env PATH="$PATH" npx playwright install-deps chromium
```

Browser: unter Windows der feste Chrome-Pfad, sonst `$CHROME_PATH` oder Playwrights Chromium. Die Tests blockieren alle http(s)-Abrufe, pruefen Desktop- und Mobilbreiten mit Pixelchecks und schreiben Screenshots nach `artifacts/` (gitignored). Touch wird ueber CDP `Input.dispatchTouchEvent` mit mehreren Fingern simuliert.

**Testumgebung XaresAICoder-Container:** Ohne GPU rendert Chromium WebGL in Software auf einer geteilten CPU. Gemessen: ca. 2 s pro Frame auf der Standardkarte, ca. 23 s auf 128 x 96. Browser-Tests dauern daher Minuten; `browser-construction`, `browser-coordinates` und `browser-landscape` (grosse Karten) laufen in Playwright-Timeouts. Das ist ein Umgebungsproblem, kein Spielfehler. Zeitabhaengige Testlogik muss unabhaengig von der Bildrate sein (z. B. CDP-`timestamp`).

### Testliste

`node tests/depot-returns.cjs` prueft komplette Rueckgaben an volle/nicht annehmende Quellen, Fracht-/Geld-Erhaltung, mehrere Fahrzeuge, Nachruecken/Beladen, Speichern/Validierung und Abrissschutz.

`node tests/cab.cjs` prueft Fuehrerhausposition/-richtung, Rueckfahrt, Schiebebetrieb, Kurven und Bruecken, Blickwinkel, unveraenderte Simulation, Kamerarueckkehr und Depot-/Welt-/Speicherwechsel.
`node tests/browser-cab.cjs` prueft Zug/Lkw, Mitfahrt/Umsehen, UI-Ausstieg/Escape, Fahrzeugwechsel/Bergung, lokale Icons, Save/Reload und echte WebGL-Screenshots mit Pixelchecks auf Desktop sowie bei 390 und 320 Pixel Breite.
`node tests/browser-depot-returns.cjs` prueft Rueckgabe, Umruesten, Anzeige, Save/Reload und erneutes Beladen ueber die echte Depotoberflaeche auf Desktop/Mobile.

`node tests/coordinates.cjs` prueft Koordinatenanzeige, grosse Karten, Grenzen/ungueltige Werte, Sprung/Kamera, Abbruch offener Entwuerfe und unveraenderte Simulation.
`node tests/browser-coordinates.cjs` prueft echte Mauskoordinaten, Dialog und Tastatur, Sprungmarkierung per Pixelcheck, grosse Karten, Speicher/Kamera und kollisionsfreies Layout auf Desktop sowie bei 390 und 320 Pixel Breite.

`node tests/signal-controls.cjs` prueft automatische Gleisachsen, die zwei Gegenrichtungen, explizite Verbindungen, Vorschau/Abbruch, bestehende Signalwerte, Einweg/Beide Richtungen, alte Speicherstaende und ungueltige Standorte.
`node tests/browser-signal-controls.cjs` prueft Hover-/Klickvorschau, Umkehren, Farb-Pixel des sichtbaren Pfeils bei gedrehter Kamera, beide Gleisachsen, bestehende Signale, Save/Reload, Geometriespeicher, lokale Icons und Desktop/Mobile.

`node tests/browser-startup.cjs` prueft den rein lokalen 3D-Start ohne Netzabrufe, entfernte Ansichtssteuerung, Zoom/Kamera, Desktop/Mobile und die dauerhafte Fehlermeldung bei fehlendem WebGL samt Simulationspause und verfuegbarem Speichern.
`node tests/bridges.cjs` prueft Brueckenplanung/Kosten, beide Verkehrsarten/Achsen, Hoehen, Vorschau/Abbruch, Anschluesse, Verkehr/Rueckfahrt, Reservierungen, sicheren Gesamtabriss, Speicherstaende, defekte Metadaten und Kartenerweiterung.
`node tests/browser-bridges.cjs` prueft echte Ziehgesten fuer Bahn-/Strassenbruecken, erhoehte Vorschau, Rampenneigung, Fahrzeugueberfahrten, Brueckenauswahl, Speicher, geschuetzten Abriss und Screenshots auf Desktop/Mobile.

`node tests/curves.cjs` prueft Kurvenradius, alle Drehrichtungen, tangentiale Uebergaenge, Wagenpositionen beim Wenden und explizite Verbindungen/Weichen.
`node tests/browser-curves.cjs` prueft gerundete Schienen/Strassen, passende Fahrzeugpositionen, Drehbewegung, Speicher und echte 3D-Screenshots auf Desktop/Mobile.

`node tests/simulation.cjs` prueft Bewegungs- und Simulationsfehler ohne Abhaengigkeiten.
`node tests/management.cjs` prueft Spielstaende und Fahrzeug-/Auftragsverwaltung ohne Abhaengigkeiten.
`node tests/railway.cjs` prueft Folgefahrt, Gegenverkehr, Kreuzungen, Wagenende, Signalumbau, Einwege und Rueckrouten.
`node tests/pbs.cjs` prueft parallele und kreuzende Fahrstrassen, blockierte Ausfahrten, ganze Zuglaengen, gemischte Signaltypen, Reservierungsfreigabe, Speichern und Umbau-/Kaufschutz.
`node tests/physics.cjs` prueft Beschleunigung, Bremswege, Kurven, Ladungseinfluss, graduelles Laden, Plattformlaenge, Teilzahlungen und Speichern mitten im Umschlag.
`node tests/construction.cjs` prueft Vorschau/Abbruch, Hindernisrouting, atomaren Bau, Parallelstrecken, gewollte Anschluesse, Bergung, Depotstart, Abfahrt, Neustart/Backup und Kartenerweiterung ohne Aenderungen am Altbestand.
`node tests/landscape.cjs` prueft 64 Seed-/Typ-Kombinationen, flache Landschaften, Industrieketten und erreichbare Baufelder, Reproduzierbarkeit, Vorschau-Isolation, Seed-Spielstaende, unveraenderte Altwelten und Erweiterungen.
`node tests/towns.cjs` prueft Personenverkehr/Waren, eindeutige Halte, geteilte Einzugsbereiche, monatliches Wachstum, hoehere Produktion, geschuetzte Flaechen, fehlenden Bauplatz, Wiederaufnahme, Spielstaende, alte Welten, Pause und monatsuebergreifende Zeitschritte.
`node tests/assets.cjs` prueft die 30 lokalen Modelle, kompakte Geometriedaten, Normalisierung, Indizes/Farben, getrennte Ladung und vorhandene Quell-/Lizenznachweise.
`node tests/browser.cjs` benoetigt Playwright, pngjs und eine lokale Chrome-Installation;
es prueft Desktop/Mobile, WebGL, Fahrzeugbewegung und Geometriespeicher und schreibt Screenshots nach `artifacts/`.
`node tests/browser-railway.cjs` prueft zwei Zuege ueber mehrere Umlaeufe, 3D-Signale, Rot/Gruen und Laden des Mehrzug-Spielstands auf Desktop/Mobile.
`node tests/browser-pbs.cjs` prueft gemeinsame PBS-Bereiche, gruene reservierte Einfahrten, gelbe Fahrwegmarkierung, Rueckfahrt und gespeicherte Reservierungen auf Desktop/Mobile.
`node tests/browser-physics.cjs` prueft sichtbare Wagenladung, Plattform-Spielstaende, Tempoanzeige, Beschleunigen/Bremsen, Entladen und Desktop-/Mobile-Layout.
`node tests/browser-construction.cjs` prueft echte Ziehgesten in 3D, Bestaetigen/Abbrechen, parallele Wege, UI-Bergung, Neustartabbruch, Erweiterung, Sicherungswiederherstellung und grosse Karten mit WebGL-Pixelchecks auf Desktop/Mobile.
`node tests/browser-landscape.cjs` prueft die vier Typen mit echter Seed-Eingabe, Vorschau/Neustart-Uebereinstimmung, 3D-Pixeln, Neuladen, Zufallswerten und einer gebauten Strecke mit fahrendem Zug auf Desktop/Mobile.
`node tests/browser-towns.cjs` prueft fahrende Zuege als Wachstumsquelle, Warenbonus, sichtbare neue Haeuser in 3D, Stadtliste/-ansicht, geschuetzte Infrastruktur und Neuladen auf Desktop/Mobile.
`node tests/browser-assets.cjs` prueft Modellgruppen in Nahansichten, verschiedene Haeuser/Baeume, Industrie, Fahrzeuge/Ladung, Bewegung und gemeinsame Geometrien ohne Speicherzuwachs bei wiederholtem Umbau auf Desktop/Mobile.
`node tests/browser-touch.cjs` prueft echte Mehrfinger-Gesten: Verschieben mit Nachlauf, Tippen, Pinch-Zoom, Drehen, Zwei-Finger-Verschieben, Zeichnen vs. Kamerageste mit dem Schienenwerkzeug, erhaltene Vorschau beim Zoomen, Bau-Lupe, Scrollen am Kartenrand und unveraendertes Mauszeichnen auf Desktop/Mobile.

Der detaillierte Vergleich mit OpenTTD und die noch offenen Unterschiede stehen in [OPENTTD-AUDIT.md](OPENTTD-AUDIT.md).
