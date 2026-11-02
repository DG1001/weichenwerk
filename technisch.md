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

- **Maus:** Linke Taste zeichnet mit Schiene/Strasse, rechte Taste dreht, mittlere bzw. Umschalt + rechte Taste verschiebt, Mausrad zoomt. Linkes Ziehen verschiebt ebenfalls (Touchpads haben keine mittlere Taste): mit den uebrigen Werkzeugen immer, mit Schiene/Strasse nur mit Umschalt. `leftPan` merkt sich den Startpunkt; erst nach mehr als 5 px wird daraus `three.dragging`/`three.panning`, sodass ein einfacher Klick weiter auswaehlt bzw. baut und ein Ziehen keinen Klick ausloest.
- **Fuehrerhaus:** eigener Zweig; Ziehen (auch Touch) dreht den Blick.
- **Touch** (`pointerType === "touch"`, eigener Zweig): Aktive Finger stehen in einer Map. Nach jeder Aenderung wird der Bodenpunkt unter dem Finger bzw. unter dem Fingermittelpunkt per Raycast (`groundPointAt`) neu verankert, damit die Karte am Finger haftet. Pinch skaliert `distance` umgekehrt zum Fingerabstand, Verdrehen aendert `yaw`. Der Nachlauf (`three.inertia`, `applyMapInertia`) nutzt eine geglaettete Geschwindigkeit aus `event.timeStamp` und startet nur, wenn zwischen letzter Bewegung und Loslassen weniger als 80 ms liegen. Nach einer Geste blockiert `three.blockClickUntil` den nachfolgenden Klick fuer 400 ms.
- **Zeichnen per Touch:** Mit Schiene/Strasse wird zuerst nur `pendingPaint` gemerkt; gezeichnet wird erst nach 8 px Bewegung. Ein zweiter Finger davor macht eine Kamerageste daraus, eine offene Vorschau bleibt erhalten. Ein zweiter Finger waehrend des Zeichnens bricht das Zeichnen ab. Tippen ohne Bewegung entspricht einem Mausklick (Ein-Feld-Vorschau).
- **Bau-Lupe:** Solange ein Finger zeichnet (`three.touchDraw`), rendert `renderBuildLoupe` nach dem Hauptbild einen zweiten Durchgang mit `three.loupeCamera` (Abstand 6, gleiche Drehung/Neigung) in einen Scissor-Bereich ueber dem Finger. Rahmen und Fadenkreuz sind das CSS-Element `#buildLoupe`.
- **Rand-Scrollen:** `applyTouchDrawScroll` verschiebt die Karte, solange der zeichnende Finger im Randbereich (max. 48 px) steht, und verlaengert die Vorschau auf das Feld unter dem Finger.

## Layout auf schmalen Bildschirmen

Bis 980 px Breite (`styles.css`, letzter Block) gilt ein Handy-Layout ohne JavaScript:

- `.topbar` ist eine feste Leiste (`--bar`, 48 px) mit Datum und seitlich scrollbaren Finanzwerten.
- `.map-wrap` ist `position: sticky` mit `100dvh` Hoehe und bleibt beim Scrollen stehen.
- `.tools` und `.inspector` haben `display: contents`; ihre Kinder werden direkt Elemente der Flex-Spalte `.workspace` und per `order` sortiert: Werkzeugleiste, Auswahl-Kopf, Werkzeugoptionen und Tempo, Inspektor-Inhalt, Finanzen und Spielstand.
- Die Werkzeugleiste zieht sich mit negativem Rand (`--dock`, 118 px) ueber den unteren Kartenrand. Das Panel ist damit ein Bottom-Sheet mit nativem Seiten-Scrollen; alle Elemente bleiben im Dokumentfluss sichtbar und anklickbar (wichtig fuer die Browser-Tests).
- `revealMap()` (`game.js`) schiebt das Panel per `scrollTo(0,0)` zurueck, wenn danach die Karte gebraucht wird: Werkzeugwahl, Fuehrerhaus, Koordinatensprung, Stadtfokus (`towns.js`). Auf breiten Bildschirmen scrollt es wie bisher nur die Karte ins Bild. Signaloptionen schieben bewusst nicht zurueck, damit man mehrfach umschalten kann.
- Hochformat: Die Kamera hat ein festes vertikales Sichtfeld von 45 Grad. Auf hohen, schmalen Karten ist der seitliche Ausschnitt daher kleiner; Tests mit festem Zoom brauchen dort mehr Abstand.
- In Browser-Tests verdeckt das hochgeschobene Panel nach Klicks auf Panel-Elemente die Karte. `canvas.scrollIntoViewIfNeeded()` hilft bei der sticky Karte nicht; Tests schieben dann mit `scrollTo(0,0)` zurueck.
- Ueberlagerungen auf der Karte (Kamera-Knoepfe, Meldungen, Fuehrerhaus) sind um `--bar` bzw. `--dock` versetzt. Die Bauvorschau `#buildPreview` steht im HTML ausserhalb von `.map-wrap` und ist auf allen Layouts `position: fixed` mit `z-index: 15`: Ein sticky Element bildet immer einen eigenen Stapelkontext, darin koennte sie nie ueber dem Panel liegen. Am Desktop entsprechen `left: 252px; right: 292px` den Seitenleisten (240/280 px).
- Querformat (`max-width: 980px` und `orientation: landscape` und `max-height: 600px`, letzter Block): `.map-wrap` ist `position: fixed` links unter der Leiste, die Panel-Elemente haben die Breite `--side` (max. 300 px) mit `margin-left: auto` und bilden so eine rechte Spalte, die mit der Seite scrollt. Die Werkzeugleiste ist dort `sticky` oben (3 x 2 Knoepfe). `revealMap()` scrollt im Querformat nicht.
- Werkzeugoptionen: `updateUi` haelt `body[data-active-tool]` mit `game.tool` synchron (bewusst nicht `data-tool`, das tragen die Werkzeugknoepfe) (auch wenn Code `game.tool` direkt setzt). Das Handy-CSS blendet `.route-options`, `.station-options` und `.signal-options` je nach Werkzeug aus; am Desktop bleiben alle sichtbar. Browser-Tests muessen deshalb erst das Werkzeug waehlen, dann dessen Option.
- Ausweichgleis-Werkzeug (`routeMode` = `loop`, `construction.js`): `planPassingLoop(a,b,preferSide)` prueft den Abschnitt und waehlt die freie Seite, liefert Pfad (Hauptgleis-Endpunkt, parallele Reihe, Endpunkt) und vier Signale. `passingLoopChanges` nutzt `constructionChanges` fuer Gleis und Weichen-Links und ergaenzt die Signal-Patches; `confirmConstruction` plant beim Bestaetigen auf der gewaehlten Seite neu und wendet alles atomar mit derselben Sicherheitspruefung an (belegte/reservierte Felder, `trafficStateValid`, Signale nur auf Feldern mit genau zwei Verbindungen). `#previewLoopSide` wechselt die Seite.
- Signal-Kurzwahl in der Bauvorschau: `#previewSignalDirection` und `#previewSignalType` (`construction.js`) aendern dieselben Panel-Eingaben (`#signalBothDirections`, `signalPlacement.reversed`, `#signalType`) und rufen `refreshSignalPlacement`; sichtbar nur bei `construction.action === "signal"`.
- Die fruehere Koordinaten-Box auf der Karte ist entfernt; der Dialog wird ueber `#openCoordinates` im Panel geoeffnet. `mapCoordinates` (letztes Feld, Sprungziel) bleibt fuer Vorbelegung und Markierung erhalten.

## Aufgaben-Modus

- `src/tasks.js` (nach `management.js` geladen, endet mit `initTasks();`): Liste `TASKS` mit `id`, Text, Praemie, Hilfe-Anker und `progress()` -> `{value, target}`.
- Zustand `game.tasks` = `null` (freies Bauen) oder `{index, done[], baseline}`; `baseline` haelt Lieferzahlen, Einnahmen und Einwohner je Stadt beim Start der aktuellen Aufgabe. `game.stats` zaehlt Lieferungen je Fracht und Einnahmen (in `deliverCargo`, beim ersten Liefern angelegt).
- `updateUi` ruft `updateTasks()` nur bei aktivem Modus; Pruefung hoechstens alle 500 ms. Bestandsziele nutzen `mapUiTotals()` (inkl. `bridges`) und `companyValue()`.
- Spielstand: `stats` und `tasks` stehen in `createSave`; `decodeSave` prueft sie streng (Frachtschluessel, Zahlenbereiche, Index, IDs, Einwohner je Stadt), fehlende Felder bleiben `null`. `startNewWorld` setzt beide zurueck.

## Leistung

- `updateUi` laeuft jedes Frame. Kartenweite Werte (Signale, Bloecke, Infrastrukturwert) liefert `mapUiTotals()`, neu berechnet nur wenn `traffic.revision` (erhoeht durch `mark3dDirty`) oder das Kartenobjekt wechselt. Jeder Code, der Felder aendert, muss `mark3dDirty()` aufrufen. Gemessen auf 128 x 96: 3,27 ms -> 0,10 ms pro Frame. `setText` schreibt DOM-Texte nur bei Aenderung.
- Grafikstufen `graphicsModes` (`game.js`): Pixeldichte-Obergrenze 2 / 1,5 / 1 und optional `frameMs: 30` (die `frame`-Schleife ueberspringt Frames, `delta` waechst entsprechend, die Simulation bleibt zeitgleich). Gespeichert in localStorage `libre-transport-graphics`; Vorgabe per `(pointer: coarse)`.
- Keine Schattenberechnung: Schatten sind instanzierte Kreisflaechen; Gelaende, Baeume und Felder sind gebuendelt bzw. instanziert.

## Installierbare App (PWA)

- `manifest.webmanifest` (Name, `standalone`, Farben, Icons 192/512 inkl. `maskable`); eingebunden in `index.html` mit `theme-color` und Apple-Touch-Icon.
- `sw.js` im Wurzelverzeichnis (Scope `./`): Beim Installieren werden alle Dateien aus `FILES` vorab gespeichert. Abrufe laufen **zuerst ueber das Netz** und aktualisieren dabei den Cache; nur ohne Netz wird aus dem Cache geliefert (Navigationen fallen auf `index.html` zurueck). So kann ein vergessener Versionswechsel online nie alte Dateien ausliefern.
- Registrierung am Ende von `init()` nur bei `window.isSecureContext` und nicht unter `file://`. Ueber `http://` (z. B. die Workspace-Proxy-URL) gibt es daher keinen Service Worker und keine Installation.
- **Neue Datei, die eine Seite laedt (Skript, Stylesheet, Icon), muss in `sw.js` `FILES` eingetragen und `VERSION` erhoeht werden.** `tests/browser-pwa.cjs` vergleicht alle `src`/`href` in `index.html` und `help.html` mit der Liste.
- Icons erzeugt `node scripts/build-icons.cjs` (Playwright) aus einem Inline-SVG nach `src/assets/icons/app-*.png`.

## Veroeffentlichung

- Oeffentliches Repository `dg1001/weichenwerk`, Spiel unter `https://dg1001.github.io/weichenwerk/`.
- `.github/workflows/pages.yml`: bei jedem Push auf `main` zuerst alle Tests ohne Browser (Node 22), danach Upload der Spieldateien (`index.html`, `help.html`, `styles.css`, `manifest.webmanifest`, `sw.js`, `LICENSE`, `src/`) nach GitHub Pages. Pull Requests laufen nur durch die Tests. Ueber HTTPS funktioniert dort auch die App-Installation.
- README-Bilder in `docs/media/` erzeugt `node scripts/capture-media.cjs` (Screenshots) bzw. mit `--gif` zusaetzlich einen Zeitraffer `demo.gif` (braucht ffmpeg; ohne GPU dauert die Aufnahme ueber eine Stunde). Das `demo.gif` der README ist dagegen eine echte Bildschirmaufnahme, verkleinert mit `ffmpeg -i aufnahme.gif -vf "fps=10,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" docs/media/demo.gif` (82 MB auf 2,3 MB). Das Skript baut auf einer generierten Welt per Spielfunktionen eine Demo-Anlage (Personenstrecke mit Ausweichgleis und zwei Zuegen, Kohlestrecke).
- Nicht im Repository: `node_modules/`, `artifacts/` sowie die Workspace-Dateien `AGENTS.md`, `README_coder.md` und `.vscode/` (siehe `.gitignore`).

## Spielhilfe

`help.html` ist eine eigenstaendige Seite ohne Skripte und ohne externe Dateien. Alle Bilder sind Inline-SVG-Schemata (`<figure><svg viewBox ...>`), die Farben kommen aus CSS-Variablen der Seite. Verlinkt wird sie aus `.topbar .help-link` und aus `.help-inline`-Links in `.route-options` und `.signal-options` (jeweils `target="_blank"`).

Inhalte, die Spielmechanik beschreiben, muessen zu `fachlich.md` und zum Code passen. Das Ausweichgleis-Rezept (von Hand und per Werkzeug) ist durch `tests/passing-loop.cjs` abgesichert; bei Aenderungen an Signalen, Bloecken oder Routensuche diesen Test und die Hilfe gemeinsam pruefen.

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

`node tests/coordinates.cjs` prueft grosse Karten, Grenzen/ungueltige Werte, Sprung/Kamera, Abbruch offener Entwuerfe und unveraenderte Simulation.
`node tests/browser-coordinates.cjs` prueft echte Mauskoordinaten, Dialog und Tastatur, Sprungmarkierung per Pixelcheck, grosse Karten, Speicher/Kamera und kollisionsfreies Layout auf Desktop sowie bei 390 und 320 Pixel Breite.
`node tests/passing-loop.cjs` baut ein Ausweichgleis von Hand (wie in der Hilfe) und mit dem Werkzeug und laesst jeweils zwei Zuege gegeneinander pendeln: beide kreuzen sich wiederholt ohne Blockade, jede Richtung auf ihrem Gleis. Dazu Kosten, Seitenwahl und Ablehnung ungeeigneter Abschnitte.
`node tests/tasks.cjs` prueft den Aufgaben-Modus: standardmaessig aus, Fortschritt erst ab Aufgabenstart, Praemie einmalig, Ueberspringen und Beenden, Stadtwachstum je Stadt, gemeinsame Strecke zweier Zuege, Spielstaende mit und ohne Aufgaben, Abweisung fehlerhafter Daten.
`node tests/browser-tasks.cjs` prueft die Aufgaben-Oberflaeche hoch, quer und am Desktop.
`node tests/browser-graphics.cjs` prueft die Grafikstufen bei dreifacher Geraete-Pixeldichte: Vorgabe Handy/Desktop, Pixeldichte je Stufe, hoechstens 30 Bilder/s bei Akku sparen, Wahl bleibt nach Neuladen.
`node tests/browser-pwa.cjs` startet einen lokalen Server auf `127.0.0.1` und prueft Manifest und Icons, dass jede von den Seiten geladene Datei vorab gespeichert wird, dass der Service Worker die Seite uebernimmt, Spiel und Hilfe offline laden und der Start als Datei unberuehrt bleibt.
`node tests/browser-help.cjs` prueft die Spielhilfe: offline, Inhaltsverzeichnis und Abschnitte, gezeichnete Schemabilder, kein Ueberlauf auf Handy/Desktop, Hilfe-Knopf in der Leiste (hoch, quer, Desktop) und Links bei den Werkzeugoptionen.
`node tests/browser-layout.cjs` prueft das Handy-Layout hochkant (390, 320) und quer (844 x 390, 667 x 375): kein seitlicher Ueberlauf, Werkzeuge ohne Scrollen sichtbar, Karte bleibt beim Scrollen stehen, Bauvorschau nicht vom Panel verdeckt, Karte nach Werkzeugwahl und Koordinatensprung frei, keine Koordinaten-Box, Optionen je Werkzeug und Signal-Einstellung allein ueber die Vorschau-Knoepfe.

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
`node tests/browser-mouse-pan.cjs` prueft Verschieben per Linksziehen (Info-Werkzeug; Schiene nur mit Umschalt), dass ein Klick weiter auswaehlt, ein Ziehen nicht als Klick zaehlt und normales Ziehen mit der Schiene weiter zeichnet.

`node tests/browser-touch.cjs` prueft echte Mehrfinger-Gesten: Verschieben mit Nachlauf, Tippen, Pinch-Zoom, Drehen, Zwei-Finger-Verschieben, Zeichnen vs. Kamerageste mit dem Schienenwerkzeug, erhaltene Vorschau beim Zoomen, Bau-Lupe, Scrollen am Kartenrand und unveraendertes Mauszeichnen auf Desktop/Mobile.

Der detaillierte Vergleich mit OpenTTD und die noch offenen Unterschiede stehen in [OPENTTD-AUDIT.md](OPENTTD-AUDIT.md).
