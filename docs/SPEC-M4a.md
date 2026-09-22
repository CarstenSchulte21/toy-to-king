# SPEC – TOY TO KING, Meilenstein M4a „Aufstieg"

**Stand 22.09.2026:** Entwurf, noch nicht umgesetzt. Die Werte in Abschnitt 3 sind Startwerte.

Bezug: `backlog.md` (E5: F5.1, F5.2, F5.4), `SPEC-M3.5.md` (gilt weiter), Tester-Feedback (Style-Leiter, Tempo-Bonus).

## 1. Ziel

**Spielbar am Ende:** Jedes Werk bringt XP. Aus den XP ergibt sich der Rang, von Toy bis King. Jeder neue Rang schaltet den nächsten Style frei: Straight Letter und Bubble, dann Bombing, dann Piece. Wildstyle bringt einem KRUX bei. Bombing, Piece und Wildstyle bekommen ihre eigene Form mit Arrows, 3D, Second Outline und Background. Das Ziel „erstes Piece an der Hall" ist von Anfang an sichtbar.

**Warum:** Die Style-Leiter ist die stärkste Motivation, die der Tester selbst genannt hat. Ohne Aufstieg fehlt der Antrieb, weiterzuspielen.

**Nicht Teil von M4a** (kommt mit M4b): Ruf, Heat, Wanted, Tag/Nacht, Buff und Crossen, erwischt werden. Ebenfalls nicht dabei: das King-Ende (M6) und Crew (M5).

## 2. Designentscheidungen

| Thema | Entscheidung | Begründung |
|-------|--------------|------------|
| Ränge | Toy → Tagger → Bomber → Piece-Writer → King | Wie im Backlog (F5.2). Toy und King sind Glossarbegriffe. |
| Freischaltung | Toy: Tag. Tagger: Straight Letter und Bubble. Bomber: Bombing. Piece-Writer: Piece (nur Hall). Wildstyle: Rang Piece-Writer, ein eigenes Werk an der Hall und ein Gespräch mit KRUX. King: nur Rang, das Ende kommt in M6. | Style-Leiter des Testers. Wildstyle als Belohnung aus einer Beziehung statt aus Punkten: Das passt zu „echte Insider-Infos" und macht den Rivalen wichtig. |
| Bestehende Spielstände | Wer schon Bubbles sprüht, fängt nicht wieder bei Toy an. Beim Laden gibt es XP für die vorhandenen Werke, nach denselben Regeln. | Tester und PO haben schon gespielt. |
| XP je Werk | Style-Wert × Qualitätsfaktor × Spot-Faktor × (1 + Tempo-Bonus) | Alle vier Hebel sind Entscheidungen, die man selbst trifft. |
| Tempo-Bonus | Ab Qualität 2: bis zu +30 %, anteilig nach übriger Zeit (Durchschnitt aller Ebenen) | Tester-Idee. Nur für saubere Werke, sonst lohnt Schmieren. |
| Wiederholen | Gezählt wird nur die Verbesserung gegenüber dem besten Werk an diesem Spot. Ist ein Werk nicht besser, gibt es 20 % als Übung. | Belohnt neue Spots und bessere Styles statt endlosem Wiederholen, und Üben lohnt sich trotzdem ein bisschen. |
| Anzeige | XP-Balken und Rang im HUD neben dem Namen. Nach dem Sprühen: „+42 XP". Bei neuem Rang ein eigener Bildschirm mit Rang, einem Satz und dem, was jetzt neu ist. | Fortschritt muss man sehen. |
| NPCs | Kalle reagiert einmal auf jeden neuen Rang (je 1 Zeile). KRUX bekommt den Wildstyle-Dialog. Gesperrte Styles nennen im Sketch den Rang, den man braucht. | Die Welt nimmt den Aufstieg wahr. |
| Bombing | Dicke, leicht schräge Buchstaben mit abgeschrägten Ecken. Background (Wolke), 3D-Block. | Style-Check: „echt". |
| Piece | Kantige Buchstaben mit Arrows, Splits im Fill-in, 3D, Second Outline, Background | Style-Check: „echt". |
| Wildstyle | Verschachtelt, Connections zwischen den Buchstaben, mehr Arrows und Spitzen | Style-Check: „echt". |
| Ebenen | Bleiben 2 (Fill-in, Outline). 3D, Second Outline und Background kommen automatisch dazu. Ihre Farben wählt man im Sketch aus der Tasche. | Mehr Ebenen machen es auf dem Handy zu lang. Die Extras sind Sketch-Entscheidungen. |
| Arrows und Spitzen | Gehören zur Führungslinie, man fährt sie mit nach | Sonst erreicht auch der Fat Cap die Pfeilspitzen nicht. |

## 3. Werte (Startwerte, in `content/progress.yaml`)

**Ränge**

| Rang | ab XP | Neu |
|------|-------|-----|
| Toy | 0 | Tag |
| Tagger | 50 | Straight Letter, Bubble |
| Bomber | 250 | Bombing |
| Piece-Writer | 450 | Piece (Hall), Weg zu Wildstyle |
| King | 700 | – (Ende in M6) |

**Style-Werte:**

| Tag | Straight Letter | Bubble | Bombing | Piece | Wildstyle |
|-----|-----------------|--------|---------|-------|-----------|
| 10 | 20 | 30 | 50 | 120 | 200 |

**Qualitätsfaktor:**

| wackelig | geht so | sauber | sitzt / Burner |
|----------|---------|--------|----------------|
| 0 | 0,5 | 1 | 1,5 |

**Spot-Faktor:**

| Rolltor | Hall (legale Wand) | Hauswand | Heaven Spot | Zug |
|---------|--------------------|----------|-------------|-----|
| 1,0 | 1,0 | 1,2 | 1,6 | 1,6 |

Beispiel: Bubble, „sitzt", an der Brücke, mit halber Restzeit → 30 × 1,5 × 1,6 × 1,15 = 83 XP.

Ein automatischer Test rechnet den kürzesten Weg durch: Jeder Rang muss mit den bis dahin freigeschalteten Styles erreichbar sein, kein Rang darf übersprungen werden können, und King muss erreichbar sein.

## 4. Technik

- **Spielstand v4:** `xp`, `best` (bestes XP je Spot). Der Rang wird aus `xp` berechnet und nicht gespeichert. Migration v3 → v4 berechnet die XP aus den vorhandenen Werken.
- **Neue Bedingung:** `rank_min: <rang>`. Styles werden damit gesperrt, statt mit den Platzhalter-Flags `rang_*` aus M3.5.
- **Neue Ereignisse:** `XP_GAINED {amount, total}`, `RANK_UP {rank}`. `SPRAYED` bekommt `xp`.
- **Engine:** Formen für bombing, piece und wildstyle in `lettering/` (aus dem Style-Check übertragen), Background, 3D, Second Outline und Splits in der Komposition.
- **Content:** `progress.yaml` (Ränge, Faktoren), `xp` je Style in `spray.yaml`, Kalle-Zeilen je Rang, KRUX-Dialog „Wildstyle", neue Sketch-Texte.

## 5. Akzeptanzkriterien

- [ ] Nach jedem Werk werden XP angezeigt, im HUD stehen Rang und Fortschritt.
- [ ] Neuer Rang: eigener Bildschirm, neue Styles sind danach im Sketch wählbar. Gesperrte Styles nennen den nötigen Rang.
- [ ] Wiederholen am selben Spot bringt nur die Verbesserung oder 20 %.
- [ ] Tempo-Bonus nur ab Qualität 2.
- [ ] Bombing, Piece und Wildstyle mit eigener Form. Ideales Nachfahren ergibt Qualität 3 (automatischer Test).
- [ ] Wildstyle nur nach dem KRUX-Gespräch, das erst ab Piece-Writer und mit eigenem Werk an der Hall erscheint.
- [ ] Alte Spielstände bekommen XP für vorhandene Werke und behalten ihre Styles.
- [ ] Der Durchlauf-Test belegt: Alle Ränge der Reihe nach erreichbar, keiner überspringbar.

## 6. Offene Fragen an den Tester

- Stimmen die Rangnamen (Tagger, Bomber, Piece-Writer)? Oder sagt man anders?
- Passt es, dass man Wildstyle von einem anderen Writer lernt?
- Welche Spots sollten am meisten bringen?
