# Devlog

Entwicklungsverlauf, neueste Eintraege zuerst. Spielregeln: [fachlich.md](fachlich.md), Technik: [technisch.md](technisch.md).

## 2026-11-01 - Spielhilfe mit Bildern

- Wunsch: eine Anleitung mit Bildern, z. B. Block- vs. Pfadsignal, Ausweichgleise, Bruecken. Das geplante Ausweichgleis-Werkzeug ist dafuer zurueckgestellt.
- Neu: `help.html`, offline, mit Inline-SVG-Schemata: erste Schritte, Bedienung (Handy/PC), Strecken und gewollte Verbindungen, Bruecken, Signale (Bloecke, Einweg/Beide), Block- vs. Pfadsignal mit Vergleich, Ausweichgleis in drei Schritten mit typischen Fehlern, Fahrzeuge/Probleme, Staedte. Im Spiel ueber **?** oben rechts und Links bei den Werkzeugoptionen.
- Ausweichgleise lassen sich bereits ohne eigenes Werkzeug bauen: Mit "Hindernisse umfahren" von einem Gleisfeld zu einem anderen auf derselben Strecke ziehen; die Wegsuche fuehrt um die Strecke herum. Dazu vier Einwegsignale (Strecke eine Richtung, Ausweichgleis die andere, je ein Feld hinter den Weichen).
- Abgesichert mit `tests/passing-loop.cjs`: zwei Zuege, je ca. 59 Wendungen, kein Stillstand. Gegenproben: ohne Signale startet der zweite Zug gar nicht; mit nur einem Signal je Gleis blockieren sich beide dauerhaft. Faustregel "Wagenzahl plus 4 Felder Abstand" mit 1, 4 und 8 Wagen geprueft (funktioniert auch kuerzer).
- Beim Pruefen der Texte gefunden: Darlehen kosten 0,4 % Zinsen pro Monat; die Hilfe sagt das korrekt.
- Testergebnisse: siehe Commit-Verlauf und naechsten Eintrag.

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

- Werkzeug fuer Ausweichgleise (zurueckgestellt; Bau von Hand ist in der Hilfe beschrieben und getestet). Entwurf: Modus "Ausweichgleis" in der Streckenplanung, plant Gleis, Weichen und vier Einwegsignale atomar.
- Neigen per Geste: bewusst nicht geplant (Wunsch, funktioniert ohne gut).
- PWA (Manifest, Service Worker) fuer Homescreen und Offline-Start.
- Leistung auf Mittelklasse-Handys pruefen (Pixeldichte, Detailstufen, 30-fps-Modus).
