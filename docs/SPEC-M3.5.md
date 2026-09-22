# SPEC – TOY TO KING, Meilenstein M3.5 „Sprühen 2.0"

**Stand 22.09.2026:** umgesetzt auf Branch `m3-5` (130 Tests grün, Build grün). Offen ist der Test auf echten Handys.

Bezug: `backlog.md` (F4.1, F4.2, F4.5), `SPEC-M3.md` (gilt weiter, wo hier nichts anderes steht), Style-Check-Prototyp (Artifact „Style-Check Wand"), Tester-Feedback aus drei Runden.

## 1. Ziel

**Spielbar am Ende:** Man entwirft an der Wand einen Sketch mit Style, Farben aus der Tasche und Dose. Dann fährt man ihn Ebene für Ebene mit dem Finger nach. Was man sprüht, sieht man sofort. Fehler bleiben sichtbar: Lücken, eine zu fette Outline, Overspray und Drips. Das Werk bleibt als echtes Bild am Spot.

**Warum:** M3 fühlte sich wie ein Quiz an, und alle Werke sahen gleich aus (Tester, PO).

Nicht Teil von M3.5: Bombing, Piece und Wildstyle als spielbare Styles. Sie stehen gesperrt im Menü und kommen mit den Rängen in M4. Ebenfalls nicht dabei: Second Outline, Background, Character, Heat und Materialverbrauch.

## 2. Designentscheidungen

| Thema | Entscheidung | Begründung |
|-------|--------------|------------|
| Richtung | Hybrid: Sketch wählen, dann nachfahren | PO-Entscheidung. Freihand ist nicht bewertbar, ein reiner Baukasten bleibt ein Quiz. |
| Styles | Tag, Straight Letter und Bubble sind spielbar. Bombing, Piece und Wildstyle sind sichtbar, aber gesperrt. Piece und Wildstyle gehen nur an der Hall. Hollow fällt weg. | Tester: Die Hollows sind unrealistisch, Piece und Wildstyle sind „das Beste vom Besten" und gehören an die Hall. |
| Style-Leiter | Tag → Straight Letter → Bubble → Bombing → Piece → Wildstyle | Die Leiter wird in M4 an die Ränge gekoppelt. |
| Schriftzug | Wird aus dem Writer-Namen erzeugt: eigene Buchstabenformen je Style, Pixelgrafik 320×180 | Im Style-Check 11× „echt". |
| Farben | Neue Gegenstände der Art `color` mit Farbe aus der C64-Palette. Start: Schwarz und Chrom. Weitere gibt es bei Sibel. | Die Dosen sind die Palette. Das bereitet den Einkauf in M5 vor. |
| Sketch | Style, Fill-in (1–2 Farben, bei zwei gibt es einen Fade), Outline-Farbe, Dose. Mit Live-Vorschau. Der letzte Sketch wird gemerkt. | Man sieht vorher, was man sprüht. |
| Ebenen | Tag: 1 Ebene (Linie). Throw-ups: Fill-in, dann Outline. Shadow und Highlights kommen automatisch dazu. | Echte Reihenfolge beim Malen. Zwei Durchgänge sind genug. |
| Nachfahren | Pro Ebene wählt man einen Cap. Dann fährt man die Führungslinie (Skelett der Buchstaben) mit dem Finger nach, innerhalb einer Zeitgrenze. Jeder Punkt der Linie sammelt „Farbe", solange der Finger in der Nähe ist (Toleranz 7 px). | Auf dem Handy machbar, und die Bewertung ergibt sich aus dem, was man tut. |
| Cap | Bestimmt die Breite: Beim Fill-in erreicht ein zu dünner Cap die Ränder nicht (Lücken). Bei Outline und Tag wird ein zu breiter Cap fett und erzeugt Overspray. | Die Regel aus dem Glossar wird sichtbar statt abgefragt. |
| Dose | High Pressure deckt schnell, tropft aber, wenn man stehen bleibt (Drips). Low Pressure deckt langsam, bei schnellem Tempo bleiben Lücken, dafür tropft sie kaum. | Echtes Verhalten, und Sibels Info zu `druck` wird nützlich. |
| Qualität | 0–3 wie bisher. Grundlage ist die Deckung je Ebene, abzüglich Strafen für den falschen Cap (0,15 je Ebene) und für Drips (0,04 je Drip, höchstens 0,2). Schwellen: ≥ 0,88 → 3, ≥ 0,72 → 2, ≥ 0,5 → 1. Passt der Style nicht zum Spot, gibt es höchstens 2. | Die Stufen und Labels aus M3 bleiben, das Label „Burner" bleibt dem Piece vorbehalten. |
| Rückmeldung | Ergebnisbild und Label, dazu bis zu 2 Hinweise aus `spray.yaml` (Lücken, Reichweite, fette Outline, Drips, Spot). | Man lernt aus jedem Versuch. |
| Werk speichern | Gespeichert werden die Parameter und die Fingerbahnen, nicht das Bild. Das Bild wird daraus deterministisch neu berechnet. | Klein im Speicher, und es sieht immer gleich aus. |
| Werk anzeigen | Am Spot als verkleinertes Bild im Hotspot. Auf der Karte bleibt die Qualitätsanzeige. | Echte Raumgrafik kommt später. |

## 3. Technik

- **Engine (`src/engine/lettering/`, reines TypeScript):**
  - Buchstaben-Skelette A–Z und 0–9.
  - Layouts je Style (Tag, Straight, Bubble).
  - Eigene Rasterung: Kapseln und Kreise, keine Canvas-API.
  - Masken, Führungslinie mit Knoten alle 2 px und Zuordnung jedes Pixels zum nächsten Knoten.
  - Simulation der Fingerbahnen: Farbmenge je Knoten, Drips aus dem Verweilen innerhalb eines Strichs.
  - Komposition zu einem Bild mit Palettenindex (320×180, 255 = durchsichtig).
  - Bewertung.
- **UI:** Die Sprüh-Szene (Sketch → Ebenen → Ergebnis) zeichnet die Wand je Spot-Typ und das Engine-Bild auf einem Canvas. Die Live-Vorschau nutzt dieselbe Simulation.
- **Aktion `SPRAY`:**
  - Neue Felder: `spot`, `style`, `colors {line?, fill?, outline?}`, `dose`, `passes [{kind, cap, strokes}]`, `seed`.
  - `strokes` ist eine Liste von Strichen, jeder Strich eine flache Liste `x, y, t` (t in ms seit Start der Ebene).
  - Die Engine prüft alles und bewertet selbst. Die UI liefert nur die Eingaben.
- **Spielstand schemaVersion 3:**
  - `works[spot]` = `{style, colors, dose, passes, seed, quality, at, ideal?}`, dazu `lastSketch`.
  - Migration v2 → v3:
    - Alte Werke werden als fehlerfreie Werke übernommen (`ideal: true`). Aus throwup und hollow wird bubble.
    - Die Start-Farben kommen in die Tasche.

**Inhaltsdateien:**

| Datei | Änderung |
|-------|----------|
| `items.yaml` | Caps bekommen `width` (1 Skinny, 2 Standard, 3 Fat, 4 NY Fat). Neue Art `color` mit `color` (Palettenname). |
| `spray.yaml` | Styles mit `look` (tag, straight, bubble, bombing, piece, wildstyle), `caps` je Ebene (ideale Caps), `if` und `locked_hint`, `only_at` und `only_at_hint`. Neue `hints`. `ideal_caps`/`ideal_dose` und das alte Hinweisformat entfallen. |
| `spots.yaml` | `fits` mit den neuen Style-IDs. |
| `npcs/laden.yaml` | Sibel gibt Farben: Rot und Weiß ab dem ersten Gespräch über Farben, Gelb und Hellblau ab Vertrauen 2. |
| `config.yaml` | Start-Farben Schwarz und Chrom. |

## 4. Akzeptanzkriterien

- [x] Sketch mit Vorschau: Style (gesperrte mit Grund), Farben nur aus der Tasche, Dose. Der letzte Sketch ist vorbelegt.
- [x] Nachfahren je Ebene: Cap-Wahl, Führungslinie, Zeitbalken, Farbe erscheint sofort beim Nachfahren. Die Ebene endet mit Ablauf der Zeit oder mit „Fertig".
- [x] Deckung, Lücken, fette Outline, Overspray und Drips sind im Bild sichtbar und entstehen nach den Regeln aus Abschnitt 2.
- [x] Ideales Nachfahren (richtige Caps, gleichmäßiges Tempo) ergibt Qualität 3 an jedem Spot (automatischer Test).
- [x] Das Werk bleibt nach dem Neuladen identisch und ist im Raum als Bild zu sehen.
- [x] Spielstände aus M3 laufen weiter.
- [x] Piece und Wildstyle nur an der Hall, Bombing, Piece und Wildstyle gesperrt bis M4. Keine Hollows mehr.
- [ ] Bedienbar auf dem Handy im Querformat (Tester auf echtem Gerät).

## 5. Offene Punkte

- Die Toleranz, das Tempo und die Zeitgrenzen sind Startwerte. Erste Rückmeldung vom Handy: schwerer als am Rechner, das ist gewollt. Die Zeit wurde an die Zahl der Buchstaben angepasst.
- Für M4 vorgemerkt: Wer schnell und sauber sprüht, bekommt einen Tempo-Bonus auf XP. Später verkürzt Tempo auch die Zeit an der Wand (Heat). Die Daten dafür sind schon da, die Zeitstempel der Fingerbahnen werden gespeichert.
- Der Tag ist bisher nur „geht so". Die Skizzen des Testers sollen hier helfen.
- Die Werkgrafik im Raum ist eine Übergangslösung, bis es echte Raumgrafik gibt.

## 6. Abweichungen und Präzisierungen bei der Umsetzung

| Thema | Umsetzung | Grund |
|-------|-----------|-------|
| Drips | Entstehen durch Verweilen: Der Finger bleibt innerhalb von 4 px, bei High Pressure 350 ms, bei Low Pressure knapp 900 ms. Nicht durch die Farbmenge. | Mit der Farbmenge tropften spitze Buchstaben (M, W) auch bei sauberem Tempo. Das wäre unfair. |
| Deckung | Jeder Pixel braucht eine leicht zufällige Farbmenge (0,5–1,0). Wenig Farbe ergibt ein fleckiges Bild statt gar keins. | Man sieht, dass etwas fehlt, statt dass die Stelle leer bleibt. |
| Zeit je Ebene | Länge der Führungslinie geteilt durch das angenehme Tempo (7 × Flow px/s), mal 1,5, plus 3 s, plus 1,2 s je Buchstabe, zwischen 8 und 60 s. Die Restzeit steht in Sekunden daneben. | Low Pressure muss langsamer gefahren werden und soll trotzdem schaffbar sein. Tester (Handy): Bei langen Namen wurde es zu knapp, weil jeder Buchstabe neu ansetzen heißt und lange Namen klein werden. |
| Bombing, Piece, Wildstyle | Im Menü sichtbar und gesperrt (Flags `rang_bomber`, `rang_piece`, `rang_king`, die M4 setzt). Bis dahin würden sie wie Straight Letter gezeichnet. | Die eigenen Formen kommen mit M4. |
| Bubble-Buchstaben | Eigene Skelette für S, 5, E, B, R, P | Sonst sind sie bei dickem Strich nicht lesbar (S wird zu 8, R zu A). |
| Werk im Raum | Wird aus den gespeicherten Fingerbahnen neu berechnet und verkleinert in den Hotspot gesetzt. | Wie geplant. Echte Raumgrafik folgt später. |
