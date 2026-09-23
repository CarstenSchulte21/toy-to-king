# SPEC – TOY TO KING, Grafik-Schritt „Räume"

**Stand 23.09.2026:** umgesetzt auf Branch `grafik` (136 Tests grün, Build grün), Runde 4 und 5 eingearbeitet. Vor dem Einbauen bewertet der Tester den Bilder-Prototyp (Artifact „Raum-Check").

Bezug: `backlog.md` (F1.5, E10), `MEILENSTEINE.md` (Schritt G zwischen M4a und M4b).

## 1. Ziel

**Spielbar am Ende:** Jeder Room hat einen Pixel-Hintergrund statt gestrichelter Platzhalter-Kästen. Was man antippen kann, sieht man auch: Mülltonnen, Rolltor, Regale, Zaun, Waggon, die Leute. Ein neuer Knopf „Blick" zeigt kurz, wo die Hotspots sind.

**Warum:** Beim Sprühen sieht das Spiel gut aus, drumherum nicht. Mit jedem Meilenstein fällt der Unterschied mehr auf.

## 2. Designentscheidungen

| Thema | Entscheidung | Begründung |
|-------|--------------|------------|
| Bilder aus Code | Die Szenen stehen als Zeichen-Code in `scripts/lib/rooms-art.ts`, `npm run art` erzeugt daraus die PNGs in `public/art/`. | Änderungen sind nachvollziehbar, und ein Test prüft, dass Bild und Code zusammenpassen. Später kann jedes PNG durch ein gemaltes Bild ersetzt werden. |
| Palette | 32 Farben: die 16 C64-Farben plus 16 Zwischentöne für Haut, Mauerwerk, Metall und Nacht. Die ersten 16 bleiben unverändert, gespeicherte Werke sehen genauso aus wie vorher. | 16 Farben reichten für Gesichter und Schattierungen nicht (Tester). Der Retro-Look bleibt. |
| Größe | 320×180, genau die Bühne | Keine Skalierung, keine unscharfen Kanten. |
| Motive | Jede Szene richtet sich nach den Hotspot-Rechtecken der Room-Datei | Wer etwas sieht, kann es auch antippen – und umgekehrt. |
| Fremde Werke | Die Werke an den Wänden entstehen aus denselben Buchstaben-Skeletten wie die eigenen. Es sind immer dieselben Namen (Abschnitt 10): klein als Handstyle, groß als Throw-up oder Wildstyle. Dazu KRUX als Wildstyle in der Unterführung. | Der Tester will wiedererkennbare Namen statt erfundener Kürzel: wenige Namen, die überall auftauchen, machen aus den Räumen eine Stadt. |
| Freie Flächen | Wo man selbst malen darf (Rolltore, linke Wand, Hall, Brückenblech, Waggon), ist die Fläche leer und ruhig. | Das eigene Werk soll wirken. |
| Hotspots finden | Neuer HUD-Knopf „Blick": zeigt 2,5 Sekunden lang die Umrisse mit Namen. | Gegen Pixel-Sucherei (Backlog F1.5), ohne die Bilder mit Markierungen zu verschandeln. |

## 3. Technik

- `scripts/lib/art.ts` – Zeichen-Werkzeuge: Rechtecke, Linien, Verläufe mit Dithering, Ziegel, Rolltor-Lamellen, Körnung, Figuren, Schriftzüge, Tags.
- `scripts/lib/rooms-art.ts` – die sieben Szenen.
- `scripts/lib/png.ts` – kleiner PNG-Encoder (nutzt `node:zlib`, keine neue Abhängigkeit).
- `npm run art` – schreibt `public/art/*.png`.
- Content: jeder Room bekommt `background: <room>.png`. Die Oberfläche zeichnet das Bild, die Platzhalter-Kästen entfallen automatisch.

## 4. Akzeptanzkriterien

- [x] Alle sieben Rooms haben ein Bild, das zur Beschreibung und zu den Hotspots passt.
- [x] Die Bilder sind reproduzierbar: Ein Test zeichnet sie neu und vergleicht sie mit den Dateien.
- [x] „Blick" zeigt kurz alle Hotspots mit Namen.
- [x] Die eigenen Werke bleiben an ihrem Spot sichtbar.
- [ ] Der Tester findet die Räume echt (Raum-Check).
- [ ] Auf dem Handy geprüft.

## 5. Offene Punkte

- Das Brückenblech ist bewusst leer, damit das eigene Werk wirkt. Vielleicht wirkt es dadurch zu leer.
- Später: Tag und Nacht (M4b) braucht je Szene eine dunkle Fassung.

## 6. Runde 2 nach Tester-Feedback

Der Tester hat Runde 1 klar abgelehnt: zu wenig Details, die Leute waren Strichmännchen. Vorbild sind die
Adventures der späten 80er (Zak McKracken). Geändert:

| Thema | Vorher | Jetzt |
|-------|--------|-------|
| Figuren | Kopf, Rechteck, zwei Beine | Eigene Sprites in `scripts/lib/figures.ts`: Gesicht mit Augen und Mund, Frisur, Kappe oder Kapuze, Jacke mit Licht- und Schattenkante, Gürtel, Hände, Schuhe, schwarze Kontur. Kalle sitzt mit Dose, Sibel steht mit Schürze hinter der Theke, KRUX hat Kapuze und Rucksack, Frau Brandt Uniform mit Reflexstreifen. |
| Flächen | Einfarbig mit etwas Körnung | Verläufe und Dithering, oben und unten abgedunkelt, Risse, Flecken |
| Objekte | Rechtecke | Körper mit Lichtkante, Schattenkante und Kontur (`box`), dazu Kleinkram: Fallrohr, Kabel, Plakate, Pfützen, Unkraut, Müllsack, Gully, Fahrwerk, Nieten |
| Licht | Keins | Lichtkegel unter Laterne, Deckenlampen, Flutlicht |
| Fremde Werke | Farbige Kästen | Schriftzüge aus den Buchstaben der Engine, Tags als kleine Handstyles statt Kritzelwürmer |
| Boden | Flach | Fluchtlinien im Laden, Schotter mit Streuung, Bordstein, Fahrbahnmarkierung |

## 7. Runde 3 nach Tester-Feedback

Der Tester fand Runde 2 „schon viel besser", die Gesichter aber weiter zu kindlich: runder Kopf, zwei
Punkte als Augen, ein Strich als Mund. Dazu der Wunsch nach 32 Farben. Geändert:

| Thema | Vorher | Jetzt |
|-------|--------|-------|
| Palette | 16 Farben | 32 Farben (`src/engine/lettering/palette.ts`), die neuen 16 sind Zwischentöne: vier Hauttöne, vier Graustufen, Navy, Stahlblau, Himmelblau, Moos, Tannengrün, Sandbraun, Dunkelbraun, Rost |
| Kopfform | Kreis | Schädel oben rund, zum Kinn schmaler, mit Ohren |
| Gesicht | Zwei Punkte, ein Strich | Lidschatten, Augenweiß mit Pupille, Brauen, Nase mit Schattenkante, Mund mit Unterlippe, Falten bei Kalle |
| Proportion | Kopf etwa ein Viertel der Höhe (kindlich) | Kopf gut ein Sechstel, längere Beine |
| Kleidung | Zwei Töne | Drei Töne, Kragen, Ärmelbund, Gürtel mit Schnalle, Reißverschluss |
| Kopfbedeckung | Ein Klotz | Kalle: Strickmütze mit Umschlag. Brandt: Schirmmütze mit Abzeichen. KRUX: Kapuze mit Öffnung, Schatten im Gesicht und Kordeln |
| Bart | Graue Fläche | Zwei Töne im Wechsel, Schnurrbart, Mund bleibt frei |
| Räume | 16 Farben | Wärmere Ziegel (Rost, Sandbraun), Betonflächen in vier Graustufen, Himmel von Stahlblau nach Himmelblau, Nacht in Navy |

Offen für später: Die neuen Farben stehen auch dem Spiel zur Verfügung. Damit könnte es in M5 mehr
Dosenfarben im Laden geben.

## 8. Runde 4 nach Tester-Feedback

Der Tester wollte echte Namen an allen Wänden, den Kölner Laden und eine Kölner Brücke. Geändert:

| Thema | Vorher | Jetzt |
|-------|--------|-------|
| Namen an den Wänden | SEB, ZINK, MOA, ARO, ein verblasstes TOY | Nur noch eine kleine, feste Liste (siehe Abschnitt 10). Klein als Handstyle, groß als Throw-up oder Wildstyle. Kein TOY mehr als Graffiti. |
| Graffiti-Zeichner | `piece()` – eckige Kästen mit Schriftzug | Neuer `graffiti()` in `scripts/lib/art.ts` mit drei Formen: `tag` (dünne Cap, Schräge, Schwung), `throwup` (runde Bubble-Formen, Verlauf, Highlight), `wildstyle` (Arrows, Widerhaken, Connections, Second Outline, 3D-Schatten, Background) |
| Unterführung | KRUX als Kasten-Piece | KRUX als Wildstyle mit Arrows, weißer Second Outline und 3D |
| Hall of Fame | Vier gleich aussehende Pieces | Drei Styles nebeneinander: ein Wildstyle, zwei Throw-ups, dazu ein altes, verblasstes Werk darunter |
| Laden | „FARBEN" | Heißt **KINGSIZE** (siehe Abschnitt 11). Ladenfront wie im echten Leben: Schaufenster und Eingangstür nebeneinander, die Tür in Menschenhöhe. Keine Sprühdosen mehr im Schaufenster, stattdessen Shirts auf der Stange, Schuhkartons auf einem Brett und ein Deck. Sockel voller Aufkleber. Innen ein Schild an der Wand und eine zugeklebte Theke. |
| Raumname | Farbenladen | **Graffitistore** (`content/rooms/farbenladen.yaml`, `content/npcs/laden.yaml`, `content/facts.yaml`, `content/rooms/strasse.yaml`) |
| Eisenbahnbrücke | Graue Wand vor Skyline | Grüner Stahlbogen mit zwei Gurtungen und Diagonalen wie an den Kölner Rheinbrücken, Hänger zum Fahrbahnträger, dahinter der Dom mit zwei Türmen, unten die Straße, vorn Gleis und Laufsteg |

**Fremde Logos:** Der Ladenname steht als Schriftzug in unserem eigenen Pixel-Alphabet. Fremde
Firmenlogos werden nicht nachgezeichnet – auch nicht in Pixeln.

## 9. Runde 5: Kölner Vorbilder

Der Tester wollte zwei echte Kölner Orte im Bild haben.

| Raum | Änderung |
|------|----------|
| Abstellgleis | Der Fernsehturm steht am Nachthimmel: schlanker Schaft, der nach unten breiter wird, die Kanzel mit beleuchtetem Aussichtsdeck, darüber ein zweiter, schmalerer Ring und der Antennenmast mit rotem Blinklicht. Er steht hinter der Böschung, halb verdeckt. |
| Jugendzentrum | Jetzt der Hof einer alten Feuerwache: dunkelroter Backstein mit gelben Ziegelbändern und Zahnschnitt unter der Traufe, eine Rundbogendurchfahrt nach links, der Steigeturm mit Spitzdach und Rundbogenfenstern über der Mauer, in der Mitte das **rote Hallentor** mit Oberlicht und Bandbeschlägen, davor Hofpflaster. Gemalt wird – wie beim Vorbild – **links und rechts vom Tor**. |

**Neue Hilfsfunktionen:** `arch()` (Rechteck mit halbrundem Abschluss) und `archWindow()` (Rundbogenfenster
mit Ziegelgewände) in `scripts/lib/rooms-art.ts`.

**Hotspots verschoben (`content/rooms/jugendzentrum.yaml`):** Die freie Fläche zum Sprühen liegt jetzt
rechts vom Tor (`hall_wand` [204,58,104,72]), die fremden Werke links (`altes_piece` [26,50,112,92]).
Neu ist der Hotspot `hallentor`.

**Keine echten Vereinsnamen im Spiel.** Kurz stand ein Schild „MITTWOCHS" über dem Tor und am Tor ein
Zettel, der ein echtes Kölner Graffiti-Projekt nannte. Beides ist wieder raus: Es sah aus wie ein Aushang
im Bürgerzentrum und passte nicht zum Ton („Hier wird gemalt, nicht geredet"), und ein real existierender
Jugendhilfeträger gehört nicht ungefragt in eine Welt, in der es später um Heat und Erwischtwerden geht.
Über dem Tor hängt jetzt eine Hoflaterne. Gebäude und Orte dürfen echten Kölner Vorbildern nachempfunden
sein, Namen von Personen, Vereinen und Projekten nicht.

## 10. Die Namen an den Wänden

Der Tester hat die Liste vorgegeben. Sie steht in `scripts/lib/art.ts` und gilt für alle Räume:

**RUBIX · TEAR · REMS · YARE · CRES**

In Handstyles hängt manchmal ein „ONE" oder eine „1" hinten dran (TEAR1, YARE1, CRES1) – so wie im
echten Leben. `tags()` zieht die Namen zufällig, aber deterministisch aus dieser Liste und wiederholt
nie denselben Namen direkt hintereinander.

**Crew: NOX.** Das Kürzel steht klein neben manchen Werken, so wie Writer ihre Crew neben den Namen
setzen. Es ist frei erfunden und hat mit keiner echten Crew zu tun. `crewTag()` zeichnet es; in
`tags()` taucht es außerdem gelegentlich als eigener Handstyle auf.

**KRUX** bleibt davon unberührt: Das ist der Rivale aus der Geschichte, kein Wandname.

Wo die Namen stehen:

| Raum | Groß | Klein |
|------|------|-------|
| Hinterhof | REMS (Throw-up) an der Wand, TEAR (Throw-up) auf dem Garagentor | Handstyles, NOX |
| Straße | – (die Rolltore bleiben frei) | Handstyles über dem Rolltor und an der Hauswand |
| Graffitistore | – | – (innen bleibt sauber) |
| Unterführung | KRUX (Wildstyle) | Handstyles, NOX unter dem Piece |
| Jugendzentrum | RUBIX (Wildstyle), YARE (Throw-up), CRES (Throw-up, verblasst) | Handstyles, NOX |
| Eisenbahnbrücke | – (das Blech bleibt frei) | Handstyles auf dem Fahrbahnträger |
| Abstellgleis | – (die Waggonseite bleibt frei) | zwei Handstyles neben der Tür |

## 11. Der Laden heißt KINGSIZE

Zwischendurch hieß der Laden **DEDICATED**, nach dem echten Geschäft in Köln. Das ist wieder raus – aus
demselben Grund wie in Abschnitt 9: Namen echter Firmen, Vereine und Projekte kommen nicht ins Spiel,
Orte und Gebäude dürfen echten Vorbildern nachempfunden sein. Ein Zwischenstand hieß DRUCK, der PO hat
ihn verworfen.

Der Laden heißt jetzt **KINGSIZE**. Er erzählt damit als einziger Name etwas über das Spiel und nicht
nur über sich selbst: Das Schild sagt bei jedem Vorbeigehen leise das Ziel, und wenn der Spieler King
ist, zahlt sich der Witz aus. Geprüft: Es gibt keinen bekannten Graffiti-Laden dieses Namens.

Der Name steht nur in der Grafik (Fassadenschild an der Straße, Schild an der Wand im Laden). In den
Texten heißt der Ort weiterhin neutral **Graffitistore** – wer den Namen ändern will, ändert zwei
Zeilen in `scripts/lib/rooms-art.ts`.
