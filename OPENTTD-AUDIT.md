# OpenTTD-Abgleich

Geprueft am 31.10.2026. Referenz: OpenTTD-Dokumentation und die unten verlinkten Funktionen im offiziellen `master`-Quellcode. Dies ist ein gezielter Vergleich der in dieser Browser-Version vorhandenen Systeme, kein Audit des gesamten OpenTTD-Projekts und kein Nachweis vollstaendiger Kompatibilitaet.

## Wichtigste Korrektur: Zugwende

`ReverseTrainDirection` unterscheidet inzwischen zwischen Rueckwaertsfahrt (abhaengig von Einstellungen und fuehrungsfaehigem letzten Fahrzeug) und dem Umdrehen des gesamten Zuges. `ReverseTrainSwapVehicles` tauscht dabei Fahrzeugpositionen und dreht deren Ausrichtung.

Die Browser-Version hatte zuvor ausschliesslich eine schiebende Rueckfahrt implementiert. Jetzt gilt fuer die vorhandene Dampflok das klassische Wenden: Ankunft, sichtbarer Halt, Ent-/Beladen, Umkehren des Verbandes innerhalb derselben belegten Streckenlaenge, Abfahrt mit Lok voraus. Das ist ein bewusster diskreter Spielvorgang, keine reale Umsetzfahrt, Drehscheibe oder Wendeschleife. Kurven und Wagenabstand bleiben an den Pfad gebunden. Die Darstellung verwendet einen einzigen 3D-Renderer; Fahrzeugpositionen und Richtungen werden gemeinsam aus dem Fahrweg abgeleitet.

## Vergleich

| Bereich | Befund und Ergebnis | Verbleibende Abweichung |
| --- | --- | --- |
| Wenden | Klassisches Wenden oder schiebende Rueckfahrt pro Fahrzeug waehlbar. | Kein eigener Steuerwagentyp. |
| Bahnhofshalt | Graduelles Ent-/Beladen, sichtbarer Fuellstand der Wagen in 3D, Vollbeladung und Mindesthalt. Einnahmen je entladener Einheit ohne Doppelzahlung. Zusammenhaengende gerade Bahnsteige bis 8 Felder; zu kurze Plattformen bremsen den Umschlag. | Vereinfachte Laderate je Wagen; keine individuellen Fracht-/Wagentypen mit unterschiedlichen Ladezeiten. |
| Fahrtempo | Reisegeschwindigkeit 1,64 Kacheln/s fuer Zug, 1,16 fuer Truck bei 1x. Beschleunigung nach Wagenzahl/Ladung, Bremsweg vor Stationen/roten Signalen, Kurvenlimit und sanfter manueller Stopp. | Vereinfachte Physik ohne Motorleistung, Luft-/Rollwiderstand oder Steigungen; Tempoanzeige angenaehert. |
| Wagen | Wagenzahl beim Kauf waehlbar; am Bahnhof angehalten und leer umruestbar. Passende Kapazitaet, Farbe und Fenster. | Kein physisches Depot, keine individuellen Wagentypen oder Lokauswahl. |
| Kapazitaet | Zugkapazitaet orientiert sich an der sichtbaren Wagenzahl. | Sehr kurze Strecken nutzen ein vereinfachtes einzelnes Fahrzeug mit kleiner Kapazitaet. |
| Frachtkette | Kohle/Getreide -> Fabrik -> Waren -> Staedte. Fabrik braucht angelieferte Rohstoffe. Passagiere zwischen Staedten. | Stark vereinfachte Produktionskette; keine weiteren Industrien, saisonalen Schwankungen oder Industriewachstum. |
| Produktion | Monatsausstoss auf 30 Spieltage normiert. Mehrere Stationen teilen dieselbe Quelle statt sie zu vervielfachen. | Gleichmaessige Verteilung ohne OpenTTD-Stationsbewertung oder Cargodist. |
| Entladen | Nur bei passender Annahme; keine erneute Bezahlung leerer Fahrzeuge; Restfracht bleibt erhalten. | Keine Transfer-/Feeder-Auftraege, Frachtalterung oder Entfernungs-/Zeit-Tariftabellen. |
| Routenwahl | Manuelle Ziele, Zweistationenauftraege, Ladeoptionen, gerichtete Routensuche mit Einwegsignalen und alternative Rueckfahrt beim Wenden. | Keine Mehrstopp-Fahrplaene, YAPF-Gewichtung oder Wegpunkte. |
| Streckenunterbrechung | Unterbrechung voraus stoppt; Abriss bereits geraeumter Gleise verhindert eine freie Vorwaertsfahrt nicht. Am Ziel wird bei Bedarf eine andere Rueckroute gesucht. | Keine laufende Umleitung waehrend der Fahrt. |
| Mehrere Zuege | Ein-/Zweiweg-Block- und Pfadsignale, tilebasierte Fahrstrassen bis zu sicheren Haltepunkten, gemischte Netze, Freigabe hinter dem letzten Wagen und gleichzeitige getrennte Fahrwege. | Keine getrennten Gleisrichtungen innerhalb derselben Kachel. Keine vollstaendige YAPF-Fahrstrassensuche oder allgemeine Deadlock-Aufloesung. |
| Abriss | Belegte Gleise/Stationen geschuetzt; leere, angehaltene Fahrzeuge am Bahnhof verkaufbar; Auftraege aenderbar. | Kein separates Depot fuer Verkauf und Umruestung. |
| Finanzen | Infrastruktur im Firmenwert beruecksichtigt; Rueckzahlung maximal bis zur verbleibenden Schuld. | Keine Inflation, Bankenlimits, Abschreibung, Insolvenz oder vollstaendige Bilanz. |
| Zeit | Kalender und Fahrzeugbewegung getrennt; Pause/2x/4x fuer beide. 1 Tag = 12 s, 1 Monat = 6 min bei 1x. | Bewusst langsamerer Kalender als OpenTTD; Monate immer 30 Tage. |
| Darstellung | 30 lokale CC0-Modelle von Kenney, mehrere Haus-/Baumtypen, differenzierte Industrie/Fahrzeuge und getrennte Ladung. Gerundete Strassen-/Gleisboegen mit passenden Schienen, Schwellen, Markierungen und Bauvorschau. Ausschliesslich 3D mit lokalem Three.js; instanzierte Modelle und gebuendelte Verkehrsweg-Geometrien. | Flache Karte mit erhoehten Wasserbruecken, keine Tunnel und kein Terrainbau. Modelle stilisiert und nicht streng bauzeitbezogen. Kurven innerhalb des Kachelrasters, keine frei waehlbaren Radien. WebGL erforderlich; Bibliotheken und Modelldaten sind lokal. Alte 2D-Spielstaende oeffnen in 3D. |
| Speichern | Autosave alle 15 Sekunden und beim Verlassen, manuelles Speichern/Laden, JSON-Export/-Import, gepruefte Wiederherstellung. | Browser-Speicher an denselben Browser/Dateipfad gebunden. Die alte bereits offene Version kann nicht nachtraeglich automatisch gerettet werden. |
| Streckenbau | Ziehen mit Bestaetigungsvorschau, A*-Umfahrung, atomarer Bau und explizite Verbindungen fuer getrennte Parallelstrecken in 3D. | Vierfaches Raster ohne getrennte sich kreuzende Gleise innerhalb einer Kachel; Altstrecken behalten ihre bisherigen Verbindungen. |
| Bruecken | Gerade Bahn-/Strassenbruecken ueber 1 bis 32 Wasserfelder, erhoehte Decks, Rampen/Pfeiler, passende Fahrzeugneigung, Ziehvorschau/Bestaetigung, Kosten/Wartung, PBS-Schutz, kompatible Speicherstaende und Gesamtabriss. | Ein fester Brueckentyp; keine Land-Ueberfuehrungen, Stationen/Signale/Abzweige auf Rampen oder mehrere Ebenen pro Kachel. |
| Weltverwaltung | Neustart, Sicherung der vorherigen Welt, Erweiterung bestehender Welten und Karten bis 128 x 96. Instanziertes Terrain, Baeume und Felder in 3D. | Keine freie Hoehen-/Groessenwahl oder Karteneditor. Browser-Speicher bleibt begrenzt. |
| Landschaft | Reproduzierbare flache Zufallswelten mit Seed, vier Typen, Vorschau, Noise-basierten Wald-/Feldgebieten, Seen, Kuesten, Fluessen, Ufern und verteilter Besiedlung. Bebaubarkeit der grundlegenden Industriekette wird vor dem Neustart geprueft. | Eigenstaendiger Generator, kein OpenTTD-TerraGenesis; keine Hoehen, Klimazonen oder Tunnel. |
| Bergung | Manuelles Bergen mit Ladung ins abstrakte Depot, Freigabe von Belegung/Reservierungen, erneute Streckensuche und sicherer Depotstart. Abfahrt beendet Ladestopps vorzeitig. | Keine automatische Deadlock-Aufloesung. Keine Umgehung von Signalen/Kollisionsschutz. |
| Stadtentwicklung | Monatliches verkehrs-/warenabhaengiges Wachstum, neue Haeuser, steigende Bevoelkerung/Produktion, geteilte Einzugsbereiche, eindeutige Halte, Bauplatzschutz, Stadtliste und Versorgungshistorie. | Eigenes vereinfachtes Modell ohne staedtischen Strassenbau, Behoerden, Post oder Klimabedingungen. Warenbonus und Wachstum ausschliesslich durch Verkehr sind bewusste Abweichungen. |

## Ausbaustufen

Die Signalbedienung erkennt die Gleisachse automatisch. Gelbe Vorschaupfeile und ein Umkehren-Symbol ersetzen das Himmelsrichtungsmenue; **Beide Richtungen** ist unabhaengig vom Signaltyp. Bestehende Signale und alte gespeicherte Richtungen werden unveraendert uebernommen. Das veraendert weder die Block-/PBS-Regeln noch die noch fehlende belegungsabhaengige Alternativroutensuche.

- [x] Stufe 1: Spielstandformat, automatische Wiederaufnahme, Import/Export, Fahrzeugliste, Start/Stopp/Verkauf, Ziel-/Frachtwahl, Wagenzahl, Zweistationenauftraege, Vollbeladung und Wendewahl.
- [x] Stufe 2a: Signalbloecke, Ein-/Zweiwegsignale, mehrere Zuege, Kreuzungsausschluss, Blockansicht und gerichtete Rueckrouten.
- [x] Stufe 2b: Tilebasierte PBS-Fahrstrassen, sichere Haltepunkte fuer ganze Zuege, Reservierung kompletter Ausfahrten, gemeinsame PBS-Bereiche, Speichern und Reservierungsanzeige.
- [x] Stufe 3: Beschleunigen/Bremsen, Kurvenlimits, graduelles Laden und Bahnsteiglaengen.
- [ ] Stufe 4: Mehrstopp-Auftraege, Transferfracht, Frachtalter, Verguetung und automatische Umleitungen.
- [ ] Stufe 5: Stationsbewertung, mehr Industrien, Stadtentwicklung und differenzierte Finanzen.
- [x] Stufe 5a (vorgezogen): Verkehrsbasiertes Stadtwachstum, sichtbarer Hausbau, Versorgung, Stadtansicht/-liste, Infrastruktur-/Bauplatzschutz und kompatible Speicherstaende.
- [x] Stufe 6a (vorgezogen): Gerade Wasserbruecken fuer Bahn und Strasse mit Rampen, Kosten, Schutz und Speicherung.
- [ ] Stufe 6: Hoehenkarte, Terrainbau, weitere Brueckentypen und Tunnel.

Stufen 1, 2a, die vereinfachte PBS-Stufe 2b, Stufe 3 sowie die vorgezogenen Stufen 5a (Stadtwachstum) und 6a (Wasserbruecken) sind abgeschlossen. Der Rest der Stufen 4, 5 und 6 bleibt offener Arbeitsumfang. PBS reduziert Kreuzungsblockaden, garantiert aber keine selbststaendige Aufloesung beliebiger falsch geplanter eingleisiger Netze. Rueckstau durch manuell angehaltene Zuege bleibt ebenfalls moeglich.

PBS reserviert die im aktuellen Auftrag bereits bestimmte Route bis zum ersten geeigneten Haltepunkt. Weichenfelder duerfen nicht innerhalb des dort stehenden Zuges liegen. Freie parallele Fahrwege teilen einen Bereich; kreuzende Fahrwege beanspruchen mindestens ein gemeinsames Gleisfeld und schliessen sich aus. Einfahrt ueber ein klassisches Blocksignal behaelt die exklusive Sperre auch in einem gemischten PBS-Netz. Reservierungen schrumpfen mit dem Wagenende und bleiben bei Pause, Stopp und Speichern erhalten. Umbau reservierter Gleise wird abgelehnt. Alternative Fahrstrassen bei aktuell belegter Route werden noch nicht gesucht.

## Verifikation

`node tests/simulation.cjs` prueft Wenden an beiden Enden, Bahnhofshalt, Fuehrung der Lok, unveraenderte belegte Flaeche beim Wenden, kurze und lange Routen, Fahrtempo beider Fahrzeugtypen, Kalender/Pause/4x, Monatswechsel, Kartenraender, Frachtbindung, Produktionsmengen, Quellenaufteilung, Rohstoffverarbeitung, Einmalzahlung, Netztyp, Abrissschutz, Unterbrechung/Reparatur und Zeitschrittunabhaengigkeit.

`tests/browser.cjs` prueft echte WebGL-Ausgabe bei 1440x900 und 390x844, Bewegung, Lok-voraus-Position und Ausrichtung nach dem Wenden, nichtleere Canvas-Pixel, Overflow und Geometriespeicher. Screenshots liegen unter `artifacts/`. `tests/browser-startup.cjs` prueft Offline-Start, entfernte 2D-Bedienelemente und einen dauerhaften Fehlerzustand bei fehlendem WebGL. Alte 2D-Spielstaende werden in `tests/browser.cjs` und `tests/management.cjs` geprueft. Die Tests laufen in separaten Spielinstanzen und veraendern keinen offenen Spielstand.

`node tests/management.cjs` prueft Wiederherstellung waehrend Fahrt, Beladung und Wende, Ablehnung ungueltiger Dateien ohne Zustandsaenderung, Anhalten, Auftragsaenderungen, Umruestung, Vollbeladung, Rueckwaertsmodus und Verkauf. Der Browsercheck prueft zudem Auftragsbedienung, Neuladen mit unveraendertem Spielstand und gespeicherter Ansicht sowie JSON-Export.

`node tests/railway.cjs` prueft sichere Folgefahrt, Freigabe erst nach dem Wagenende, Gegenverkehr, Kreuzungen, Umbauverweigerung beim Verbinden belegter Bloecke, Mehrzug-Spielstaende, Einwegrouten und zwei Zuege ueber mehrere Umlaeufe. `tests/browser-railway.cjs` prueft dies mit gerenderten Signallichtern und Blockfarben, alter/neuer Spielstandlogik und Desktop-/Mobile-Screenshots. Bei 160 simulierten Sekunden absolvierten beide Zuege im Test je sieben Richtungswechsel ohne gemeinsame Blockbelegung.

`node tests/pbs.cjs` prueft gemeinsame PBS-Bereiche mit getrennten Fahrwegen, blockierte Ausfahrten, sich kreuzende Reservierungen, ganze Zuglaengen am Haltepunkt, Freigabe hinter dem Wagenende, gemischte Signaltypen, reservierte Gleise, Abriss hinter dem Zug, Vor-/Rueckfahrt und fehlerhafte gespeicherte Reservierungen. `tests/browser-pbs.cjs` prueft 3D auf Desktop/Mobile: zwei gleichzeitig reservierte Fahrwege im selben Bereich, Signallichter, gelbe Reservierungsmarkierung, Wiederherstellung und mehrere Vor-/Rueckfahrten ohne Konflikt.

`node tests/physics.cjs` prueft Anfahren, Ladungsgewicht, Bremsen vor Bahnhofsenden in beiden Richtungen, rote/gruene Signale, Kurvenlimit und erneutes Beschleunigen, manuellen Stopp, graduelle Ladung, laengere Bahnsteige, Wiederaufnahme waehrend des Umschlags, exakte Teilzahlungen und Zeitschrittunabhaengigkeit. `tests/browser-physics.cjs` prueft WebGL-Pixel, Wagenfuellstand, Beladen/Entladen, Tempoanzeige, Bremszustand, Plattform-Spielstaende und Layout auf Desktop/Mobile.

`node tests/construction.cjs` prueft Bauvorschau, Umfahrung, atomaren Kauf, geschuetzte Anschluesse, getrennte Parallelstrecken in Routensuche/Signalbloecken, gewollte Verbindungen, Bergung, sicheren Neustart, Kartenerweiterung ohne Aenderung bestehender Felder und alte Spielstaende. `tests/browser-construction.cjs` prueft echte Ziehgesten in 3D, Bergung/Depotstart, Abfahrt, Neustartabbruch, Wiederherstellung und Pixel der 128-x-96-Karte auf Desktop/Mobile.

`node tests/landscape.cjs` prueft 64 Kombinationen aus Seed und Landschaftstyp, erreichbare Baufelder der Grundversorgung, Reproduzierbarkeit, Vorschau-Isolation, Metadatenvalidierung, unveraenderte Altwelten und Erweiterungen. `tests/browser-landscape.cjs` prueft Seed-Eingabe, alle vier Landschaftstypen, exakte Vorschau/Neustart-Uebereinstimmung, 3D, Speicherstaende und fahrende Zuege auf generierten Strecken bei Desktop-/Mobile-Groessen.

`node tests/towns.cjs` prueft Versorgung, Halte-Deduplizierung, gemeinsame Einzugsbereiche, Wachstum/Produktion, Bauplatzschutz, alte/neue Spielstaende und Monatsgrenzen. `tests/browser-towns.cjs` prueft echte Zugbewegung als Wachstumsquelle, Warenbonus, neue Haeuser in 3D, Stadtansicht/-liste, Infrastruktur und Wiederherstellung auf Desktop/Mobile.

## Primaerquellen

Die Herkunft der 3D-Modelle und die erhaltenen Original-Lizenzen stehen in [src/assets/README.md](src/assets/README.md). Es handelt sich um Kenney City Kit (Suburban/Industrial), Nature Kit, Train Kit und Car Kit unter CC0; Materialfarben wurden in Geometriefarben uebernommen und die Modelle fuer das Spielraster angepasst.

Das eigene Stadtwachstum ist bewusst nicht identisch mit OpenTTD: Die [OpenTTD-Stadtregeln](https://wiki.openttd.org/en/Manual/Towns) behandeln Stationsaktivitaet und staedtischen Strassen-/Hausbau; der hier gewaehlte zusaetzliche Warenbonus ist eine vereinfachte Spielregel dieser Browser-Version.

- [Train::ReverseTrainDirection und ReverseTrainSwapVehicles](https://github.com/OpenTTD/OpenTTD/blob/master/src/train_cmd.cpp#L1865): klassische Wende und Rueckwaertsfahrt.
- [LoadUnloadVehicle / UpdateLoadUnloadTicks](https://github.com/OpenTTD/OpenTTD/blob/master/src/economy.cpp#L1464): Laden, Wartezeit, Frachtarten und Bahnsteiglaenge.
- [YAPF rail pathfinder](https://github.com/OpenTTD/OpenTTD/blob/master/src/pathfinder/yapf/yapf_rail.cpp): sichere Wartepositionen und Pfadreservierung.
- [OpenTTD: Orders](https://wiki.openttd.org/en/Manual/Orders): Halte-, Lade-, Umruest- und Transferauftraege.
- [OpenTTD: Signals](https://wiki.openttd.org/en/Manual/Signals): Pfad- und Blocksignale; die Seite weist selbst auf teilweise veraltete Abschnitte hin.
- [OpenTTD: Game Mechanics](https://wiki.openttd.org/en/Manual/Game%20Mechanics/): Geschwindigkeit, Produktion, Stationsbewertung und Verguetung.

Es wurde kein OpenTTD-Code in das Spiel uebernommen. Die Regeln sind eigenstaendig und vereinfacht in JavaScript umgesetzt.

`node tests/bridges.cjs` prueft beide Brueckenarten/Achsen, Kosten/Wartung, Rampen, Vorschau/Abbruch, Reservierungs-/Belegungsschutz, sichere Anschluesse, Rueckfahrt, Gesamtabriss, Speicherpruefung und Kartenerweiterung. `tests/browser-bridges.cjs` prueft Ziehgesten, Vorschau, 3D-Geometrie, Fahrzeugneigung/Verkehr, Auswahl auf dem Deck, Speichern und geschuetzten Abriss auf Desktop/Mobile.
