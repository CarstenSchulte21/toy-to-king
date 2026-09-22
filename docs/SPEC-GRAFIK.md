# SPEC – TOY TO KING, Grafik-Schritt „Räume"

**Stand 22.09.2026:** umgesetzt auf Branch `grafik` (136 Tests grün, Build grün). Vor dem Einbauen bewertet der Tester den Bilder-Prototyp (Artifact „Raum-Check").

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
| Fremde Werke | Die Pieces und Tags an den Wänden entstehen aus denselben Buchstaben-Skeletten wie die eigenen Werke, nur klein: KRUX in der Unterführung, SEB, ZINK, MOA und ARO an der Hall, ein verblasstes TOY daneben. | Die Wände zeigen echte Namen statt bunter Kästen. |
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

- Die Figuren sind einfache Silhouetten. Reicht das, oder brauchen Kalle, Sibel, KRUX und Frau Brandt mehr Eigenheiten?
- Die Brücke ist bewusst leer, damit das eigene Werk wirkt. Vielleicht wirkt sie dadurch zu leer.
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
