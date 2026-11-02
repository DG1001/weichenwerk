# Devlog

Entwicklungsverlauf, neueste Eintraege zuerst. Spielregeln: [fachlich.md](fachlich.md), Technik: [technisch.md](technisch.md).

## 2026-11-01 - Aufgaben-Modus, Vorbereitung der Veroeffentlichung

- Optionaler Aufgaben-Modus (Standard bleibt freies Bauen): zehn aufeinander aufbauende Aufgaben mit Praemien, Fortschritt ab Start der jeweiligen Aufgabe, Aufgabenkarte auf der Karte, Ueberspringen und Beenden. Lieferstatistik und Aufgabenstand im Spielstand, streng geprueft; alte Spielstaende laden ohne Aufgaben.
- Tests: `tasks`, `passing-loop` und alle uebrigen Tests ohne Browser bestehen; Browser-Tests `tasks`, `pwa`, `help`, `layout` bestehen.
- Veroeffentlichung vorbereitet: README fuer GitHub (Spiel-Link, Bilder, Entstehung mit XaresAICoder, GPT 6.1 Sol und Claude Opus 5.5, Lizenztabelle), Workflow fuer Tests und GitHub Pages, Skript fuer Screenshots und Demo-GIF.
- Pruefung vor der Veroeffentlichung: keine Workspace-Adressen, persoenlichen E-Mail-Adressen, Zugangsdaten oder lokalen Pfade in Dateien oder Historie. Workspace-Vorlagen (`AGENTS.md`, `README_coder.md`, `.vscode/`) nicht mehr versioniert. Lizenzen: alle Fremdbestandteile mit MIT vereinbar, Lizenztexte liegen bei; Versionsangabe Nature Kit korrigiert (2.1).

## 2026-11-01 - Umbenennung in Weichenwerk, MIT-Lizenz

- "Transport Tycoon" ist eine geschuetzte Marke; das Spiel heisst jetzt **Weichenwerk** (Titel, Leiste, Hilfe, Manifest, README, neues App-Icon mit "W").
- Interne Schluessel (`libre-transport-save-v1`, `libre-transport-previous-world-v1`, `libre-transport-graphics`, Cache `libre-transport-v1`) bleiben bewusst, damit vorhandene Spielstaende weiter laden.
- Eigener Code unter MIT (`LICENSE`, Rechteinhaber dg1001). Abhaengigkeiten: Three.js MIT, PathFinding.js MIT, heap PSF, simplex-noise MIT, Kenney-Modelle CC0, Lucide-Icons ISC; vollstaendige Pruefung folgt vor der Veroeffentlichung.

## 2026-11-01 - Ausweichgleis-Werkzeug

- Neuer Modus **Ausweichgleis mit Signalen** unter Streckenplanung: Ziehen entlang einer geraden Strecke plant paralleles Gleis, beide Weichen und vier Einweg-Blocksignale; **Seite wechseln**; **Bauen** baut alles atomar.
- Gleiche Anordnung wie das von Hand gebaute Rezept der Hilfe. `tests/passing-loop.cjs` prueft jetzt beide Wege (je 59 Wendungen pro Zug, kein Stillstand) sowie Kosten, Seitenwahl und Fehlermeldungen (zu kurz, nicht gerade, Signal im Abschnitt, keine freie Seite).
- Hilfe und fachliche Doku ergaenzt.

## 2026-11-01 - Leistung: Anzeige-Werte gecacht, Grafikstufen

- Messung: `updateUi` zaehlte jedes Frame alle Felder (Signale, Bloecke, Infrastrukturwert); auf 128 x 96 waren das 3,27 ms pro Frame, auf einem Mittelklasse-Handy vermutlich ein Mehrfaches. Jetzt nur nach Umbau neu berechnet: 0,10 ms.
- Neu: Einstellung **Grafik** (Hoch / Ausgewogen / Akku sparen) begrenzt Pixeldichte (2 / 1,5 / 1) und bei Akku sparen die Bildrate auf 30. Auf Touch-Geraeten ist Ausgewogen voreingestellt.
- Test `tests/browser-graphics.cjs` besteht. Auf echten Handys nicht gemessen (hier keine GPU); die Wirkung von Pixeldichte und Bildrate auf GPU-Last und Akku ist aber direkt proportional zur Pixel- bzw. Bildzahl.

## 2026-11-01 - Installierbare App (PWA)

- Manifest, App-Icons (192/512, maskable, erzeugt mit `scripts/build-icons.cjs`) und Service Worker `sw.js`.
- Strategie: zuerst Netz, Cache nur offline. Damit liefert ein vergessener Versionswechsel online nie veraltete Dateien; offline startet die zuletzt geladene Version.
- Grenze: Browser erlauben Service Worker nur ueber HTTPS oder localhost. Ueber die http-Workspace-URL und als Datei laeuft das Spiel wie bisher, ohne Installation.
- Test `tests/browser-pwa.cjs` (lokaler Server): alle geladenen Dateien vorab gespeichert, Service Worker aktiv, Spiel und Hilfe offline, Dateistart ohne Fehler. Besteht.

## 2026-11-01 - Spielhilfe mit Bildern

- Wunsch: eine Anleitung mit Bildern, z. B. Block- vs. Pfadsignal, Ausweichgleise, Bruecken. Das geplante Ausweichgleis-Werkzeug ist dafuer zurueckgestellt.
- Neu: `help.html`, offline, mit Inline-SVG-Schemata: erste Schritte, Bedienung (Handy/PC), Strecken und gewollte Verbindungen, Bruecken, Signale (Bloecke, Einweg/Beide), Block- vs. Pfadsignal mit Vergleich, Ausweichgleis in drei Schritten mit typischen Fehlern, Fahrzeuge/Probleme, Staedte. Im Spiel ueber **?** oben rechts und Links bei den Werkzeugoptionen.
- Ausweichgleise lassen sich bereits ohne eigenes Werkzeug bauen: Mit "Hindernisse umfahren" von einem Gleisfeld zu einem anderen auf derselben Strecke ziehen; die Wegsuche fuehrt um die Strecke herum. Dazu vier Einwegsignale (Strecke eine Richtung, Ausweichgleis die andere, je ein Feld hinter den Weichen).
- Abgesichert mit `tests/passing-loop.cjs`: zwei Zuege, je ca. 59 Wendungen, kein Stillstand. Gegenproben: ohne Signale startet der zweite Zug gar nicht; mit nur einem Signal je Gleis blockieren sich beide dauerhaft. Faustregel "Wagenzahl plus 4 Felder Abstand" mit 1, 4 und 8 Wagen geprueft (funktioniert auch kuerzer).
- Beim Pruefen der Texte gefunden: Darlehen kosten 0,4 % Zinsen pro Monat; die Hilfe sagt das korrekt.
- Screenshot-Pruefung am Handy: Die Beschriftungen in den Bildern schrumpften auf ca. 6-7 px. Ueberarbeitet: lange Saetze stehen jetzt in den Bildunterschriften, in den Bildern nur kurze, grosse Beschriftungen; der Block/Pfad-Vergleich besteht aus zwei Bildern, die am Handy untereinander stehen.
- Tests: `browser-help`, `browser-layout` und alle Tests ohne Browser (inkl. `passing-loop`) bestehen. Im Hilfe-Test war zunaechst die Annahme "Leiste max. 60 px hoch" falsch (Desktop-Leiste 88 px); geprueft wird jetzt, ob der Knopf innerhalb der Leiste liegt.

## 2026-11-01 - Optionen je Werkzeug, Signale aus der Bauvorschau

- Handy-Layout: Im Panel stehen nur noch die Optionen des aktiven Werkzeugs (Streckenplanung bei Schiene/Strasse, Stationstyp bei Station, Signaloptionen bei Signal). Desktop unveraendert.
- Signal-Vorschau mit Knoepfen **Richtung** (Beide -> Einweg -> Einweg umgekehrt) und **Typ** (Block/PBS), auf allen Layouts. Ablauf am Handy: Gleis antippen, Richtung/Typ, Bauen; das Panel wird nicht gebraucht.
- `browser-bridges` und `browser-pbs` stellten Optionen vor der Werkzeugwahl ein; jetzt erst Werkzeug, dann Option (wie ein Nutzer). `browser-layout` prueft beides neu.
- Testlauf: siehe naechste Aktualisierung.

## 2026-11-01 - Querformat, Koordinaten-Box entfernt, Bauvorschau immer erreichbar

- Querformat (Handy quer bis 980 x 600 px): Karte fest links, rechte Spalte mit oben angehefteten Werkzeugen (3 x 2), darunter Auswahl, Optionen, Inspektor und Spielstand.
- Koordinaten-Box auf der Karte entfernt (Wunsch). Sprung zu Koordinaten bleibt als Knopf **Zu Koordinaten** im Panel; Anzeige des Feldes unter dem Zeiger entfaellt.
- Folgen des Hochformat-Layouts aus den Browser-Tests: Nach Klicks im hochgeschobenen Panel blieb die Karte verdeckt (bridges, cab, signal-controls, towns). `revealMap()` schiebt bei Werkzeugwahl, Fuehrerhaus, Koordinatensprung und Stadtfokus zurueck. Die Bauvorschau liegt jetzt fest ueber dem Panel, damit **Bauen** auch nach Aenderungen an Signaloptionen erreichbar ist.
- Hochformat-Karte ist hoeher (844 statt ca. 520 px), bei festem vertikalem Sichtfeld also seitlich schmaler. `browser-bridges` nutzt deshalb auf schmalen Bildschirmen mehr Kameraabstand.
- Ueberlauf behoben: Der laengere Knopftext liess die vierspaltigen Spielstand-Knoepfe ueberlaufen; im Querformat-Panel jetzt zweispaltig.
- Neuer Test `tests/browser-layout.cjs` fuer Hoch- und Querformat.
- Erster Lauf deckte auf: Die Bauvorschau lag trotz `z-index` unter dem Panel, weil die sticky Karte immer einen eigenen Stapelkontext bildet. Die Vorschau steht jetzt im HTML ausserhalb der Karte und ist ueberall `position: fixed` (Desktop an derselben Stelle wie vorher).
- Ergebnis danach: layout, signal-controls, bridges, startup, touch, cab bestehen; alle Tests ohne Browser bestehen. Vorher schon nach dem Hochformat-Umbau bestanden: assets, browser, curves, depot-returns, pbs, physics, railway, towns. Nicht aussagekraeftig hier (Software-WebGL, grosse Karten): construction, coordinates, landscape.

## 2026-11-01 - Handy-Layout: Karte im Vollbild mit Bottom-Sheet

- Vorher standen im Hochformat alle Bedienfelder ueber der Karte; man musste zur Karte scrollen.
- Neu (bis 980 px Breite): Karte im Vollbild, schmale feste Leiste oben (Datum, Finanzen), unten ein Panel mit Werkzeugleiste und Auswahl-Kopf. Nach oben wischen zeigt alle uebrigen Bedienelemente. Reines CSS: `display: contents` plus `order`, Karte `sticky`.
- Bewusst kein ausklappbares Panel mit versteckten Inhalten: Alle Elemente bleiben im Dokumentfluss, damit Bedienung per Scrollen und die bestehenden Browser-Tests weiter funktionieren.
- Geprueft per Screenshot bei 390 und 320 px: kein horizontales Ueberlaufen, keine Luecken im Panel (eine Luecke durch den Aussenabstand von `#selectionText` behoben).
- Offen: Querformat (erledigt im naechsten Eintrag), Werkzeugoptionen nur passend zum gewaehlten Werkzeug zeigen.

## 2026-11-01 - Dokumentation aufgeteilt

- README auf Einstieg, Spielkern und Links gekuerzt. Spielregeln und Bedienung wortgleich nach `fachlich.md` verschoben, Testliste und 3D-Modell-Details nach `technisch.md`.
- Neu: `technisch.md` (Aufbau, Spielstaende, Kamera/Eingabe, Tests, Testumgebung) und dieses Devlog.
- Arbeitsweise in `CLAUDE.md` festgehalten: kleine lokale Commits, Doku bei jeder Aenderung mitziehen.

## 2026-11-01 - Bau-Lupe und Rand-Scrollen (Touch)

- Beim Zeichnen von Schiene/Strasse mit dem Finger zeigt eine Lupe ueber dem Finger das Zielfeld vergroessert mit Fadenkreuz. Zweiter Render-Durchgang mit eigener Kamera in einen Scissor-Bereich, keine zusaetzlichen Dateien.
- Haelt der zeichnende Finger am Kartenrand, scrollt die Karte mit und die Vorschau waechst weiter.
- Grund: Der Finger verdeckt beim Zeichnen genau das Zielfeld, und lange Strecken endeten am Bildrand.
- Test: `tests/browser-touch.cjs` um Lupe und Rand-Scrollen erweitert; Lauf bestanden (390 und 1440 px).
- Korrektur nach Screenshot-Pruefung: Die Lupe lag teilweise unter dem Koordinatenfeld, weil HTML-Bedienelemente ueber der 3D-Flaeche liegen. Sie bleibt jetzt unterhalb von Kamera-Knoepfen und Koordinatenfeld; der Test prueft das. Erneuter Lauf bestanden, Screenshot geprueft.

## 2026-11-01 - Touch-Gesten fuer die Karte

- Ausgangslage: Am Handy war die Kamera kaum bedienbar. Verschieben/Drehen hingen an mittlerer/rechter Maustaste, Pinch-Zoom fehlte, ein Finger mit Bauwerkzeug zeichnete sofort.
- Neu: 1 Finger verschiebt (Boden haftet am Finger, Nachlauf nach schnellem Wischen), 2 Finger verschieben/zoomen/drehen, Tippen waehlt aus. Mit Schiene/Strasse wird erst nach Bewegung gezeichnet; ein zweiter Finger macht eine Kamerageste daraus, eine offene Vorschau bleibt erhalten.
- Maus- und Fuehrerhaus-Steuerung unveraendert (eigener Zweig nur fuer `pointerType === "touch"`).
- Tests: neuer `tests/browser-touch.cjs` besteht (390 und 1440 px). `browser-cab.cjs` (nutzt Touch im Fuehrerhaus) und alle Tests ohne Browser bestehen weiterhin.
- Bekannte Grenze: Neigen per Finger fehlt noch. Beim Drehen bleiben die Finger wegen der Perspektive nur ungefaehr (ca. 20 px) auf ihrem Punkt, der Mittelpunkt exakt.

## 2026-11-01 - Testumgebung eingerichtet

- Playwright 1.64.1, pngjs und Chromium installiert (untracked, ohne `package.json`). Browser-Tests nutzen jetzt `$CHROME_PATH` oder Playwrights Chromium statt nur des festen Windows-Pfads.
- Ergebnis: 15 Tests ohne Browser bestehen. Von 15 Browser-Tests bestehen 12. `browser-construction`, `browser-coordinates` und `browser-landscape` laufen in Timeouts, auch mit 120 s.
- Ursache: Der Container hat keine GPU, WebGL rendert in Software auf ausgelasteter CPU. Gemessen ca. 2 s pro Frame auf der Standardkarte, ca. 23 s auf 128 x 96. Umgebungsproblem, kein Spielfehler.
- Statischer Testserver fuer das Handy: `python3 -m http.server 8000 --bind 0.0.0.0` im Projektverzeichnis.

## Offene Punkte

- Neigen per Geste: bewusst nicht geplant (Wunsch, funktioniert ohne gut).
- Leistung auf echten Mittelklasse-Handys messen (Grafikstufen sind eingebaut, hier ohne GPU nicht messbar).
