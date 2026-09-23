# SPEC – TOY TO KING, Meilenstein M4b „Risiko"

**Stand 23.09.2026:** umgesetzt auf Branch `m4b` (157 Tests grün, Build grün). Offen ist der Test auf echten Handys. Bezug: `backlog.md` (E7 komplett, F3.3, F3.4, F3.9, F7.6), `SPEC-M4a.md`
(gilt weiter), Grobidee („knapp und spannend, keine Moralpredigt").

## 1. Ziel

**Spielbar am Ende:** Sprühen kostet jetzt etwas. Jeder Spot hat Heat, der steigt, wenn man dort malt.
Man selbst hat ein Wanted-Level, das nicht von allein verschwindet. Es wird dunkel und wieder hell, und
nachts ist mehr drin – und mehr dran. Werke verschwinden wieder: montags kommt der Buff, und wer
schlecht malt, wird gecrosst. Wer erwischt wird, wacht auf der Wache auf, ist sein Material los und
einen halben Tag dazu.

**Warum:** Bis M4a kann man ohne jedes Risiko malen, bis der Rang stimmt. Das ist der Grund, warum sich
das Spiel nach zwanzig Minuten flach anfühlt: Es gibt keine Entscheidung, nur eine Reihenfolge. Mit
Heat, Zeit und Wanted wird aus „wo male ich als Nächstes" eine echte Abwägung.

## 2. Was bewusst NICHT in M4b kommt

| Weggelassen | Warum |
|-------------|-------|
| **Ruf als eigener Wert** | XP und Rang sind schon der Ruf. Ein zweiter Fortschrittsbalken daneben erklärt sich nicht und verwässert beide. Sichtbar wird der Ruf in M5 beim Jam: Dort hängt an deinem Rang, wie die Leute mit dir reden. |
| Fluchtszene (F7.5) | Steht im Backlog auf M5. In M4b ist „knapp entkommen" ein Ergebnis mit zwei Sätzen, kein Minispiel. |
| Rivalen-Crews mit eigenem Verhalten (F6.5) | v1.1. In M4b crosst NOX nach einer festen Regel, nicht als handelnder Gegner. |
| Wetter (F3.6) | v2. |

## 3. Designentscheidungen

| Thema | Entscheidung | Begründung |
|-------|--------------|------------|
| Zeit | Ein Tag hat drei Abschnitte: **Tag, Abend, Nacht**. Sprühen kostet einen Abschnitt, alles andere ist frei. Nach der Nacht kommt der nächste Tag. | Zeitdruck ohne Uhr im Nacken. Wer nur redet und guckt, verliert nichts – die Dialogebene soll nicht bestraft werden. |
| Wochentag | Der Tageszähler kennt Wochentage. Montag ist Buff-Tag. | Kalles Info „die Stadt bufft hier jeden Montag" steht seit M2 im Spiel und war bisher folgenlos. Jetzt stimmt sie. |
| Heat je Spot | 0–3 („ruhig, beobachtet, heiß, verbrannt"). Steigt um 1 pro Werk, um 2, wenn man dort erwischt wurde. Fällt pro Tag um 1. | Der Spot kühlt ab, man selbst nicht (siehe Wanted). Das zwingt dazu, zu wechseln, statt denselben Spot zu farmen. |
| Wanted | 0–3. Steigt bei „knapp entkommen" und bei „erwischt" um 1. **Fällt nie von allein.** | Steht so in der Grobidee. |
| Wanted senken | Zwei Wege: ein Werk an der Hall (legal, kostet einen Abschnitt, bringt keine XP-Verbesserung) oder bei Kalle abtauchen (kostet einen ganzen Tag). | Aktives Handeln statt Warten, wie gefordert. Beides kostet das, was in M4b knapp ist: Zeit. |
| Risiko-Wurf | Die Chance steht **vor** dem Sprühen im Sketch. Gewürfelt wird nach dem letzten Strich, deterministisch aus der Saat. | Nichts ist ärgerlicher als eine Strafe, die man nicht kommen sah. Und die Engine bleibt testbar. |
| Drei Ausgänge | **Sauber** (nichts passiert), **knapp entkommen** (Wanted +1, Werk bleibt), **erwischt** (Wanted +1, Farben weg, Rest des Tages weg, Heat am Spot auf 3). | „Knapp" ist der interessanteste Ausgang und deshalb der häufigste. Erwischt werden soll selten und teuer sein. |
| Das Werk bleibt | Auch wer erwischt wird, hat fertig gemalt. Das Werk bleibt an der Wand. | Sonst ist die ganze Session weg, und das ist am Handy unfair. Wer erwischt wird, verliert Material und Zeit – nicht seinen Namen an der Wand. |
| Nacht | Nachts ist das Risiko am selben Spot deutlich kleiner, aber die Zeit knapper (die Nacht ist der letzte Abschnitt). Der Zug am Abstellgleis geht nur nachts. | Gibt der Tageszeit eine Entscheidung statt nur einer Farbe. |
| Buff | Montags sind die Rolltore leer. An allen anderen Spots hat jedes Werk pro Tag eine kleine Chance, gebufft zu werden – abhängig vom Spot-Typ, an der legalen Wand nie. | F3.3. Macht Werke vergänglich, ohne dass es willkürlich wirkt. |
| Crossen | Werke mit Qualität 0 oder 1 können von NOX gecrosst werden, gute nie. | Lehrt ohne Text, dass Qualität zählt. Und es ist die Regel der Szene: Man crosst, was schlechter ist. |
| Polizeistation | Kein Hotspot führt hin. Man wacht dort auf. Drei Sätze von Brandt, ein Knopf „Raus hier". | Die harte Regel aus dem Backlog. Wird der Raum länger als ein Bildschirm, ist er falsch gebaut. |
| Öffnungszeiten | Der Graffitistore hat nachts zu – weder über die Straße noch über die Karte kommt man rein. Tagsüber und abends offen. | Ein Laden, der um drei Uhr nachts offen hat, macht die ganze Tageszeit unglaubwürdig. Und es erzwingt eine Entscheidung: Material besorgt man, solange es hell ist. |
| Nowak | Steht montags an den Rolltoren und macht sie sauber. Man kann mit ihm reden. Er ist nicht der Feind, er hat einen Job. | Gibt dem Buff ein Gesicht, statt ihn als Systemmeldung abzutun. |

## 4. Werte (Startwerte, in `content/risk.yaml`)

**Grundrisiko je Spot-Typ** (Chance, dass überhaupt etwas passiert)

| legale Wand | Rolltor | Hauswand | Heaven Spot | Zug |
|-------------|---------|----------|-------------|-----|
| 0 % | 25 % | 15 % | 40 % | 45 % |

**Aufschläge:** +12 % je Heat-Stufe am Spot, +10 % je Wanted-Stufe, +15 % am Tag, 0 % am Abend,
−15 % nachts. Lange an der Wand stehen kostet zusätzlich: bis zu +15 %, je nachdem wie viel Zeit man
beim Nachfahren gebraucht hat. Gedeckelt bei 85 %.

**Wenn etwas passiert:** in zwei von drei Fällen kommt man knapp weg, in einem von drei wird man
erwischt.

**Abschnitte je Tag:** 3. **Heat-Abbau:** 1 pro Tag. **Buff-Chance je Tag:** Rolltor montags 100 %,
sonst Rolltor 20 %, Hauswand 10 %, Heaven Spot 5 %, Zug 15 %, legale Wand 0 %.
**Cross-Chance je Tag** (nur bei Qualität ≤ 1): 20 %.

## 5. Technik

- **Spielstand v5:** `day` (Zähler ab 1), `phase` (0–2), `heat` (je Spot), `wanted`, `caught`
  (Zähler). Migration v4 → v5 setzt Tag 1, Abschnitt 0, alles Übrige auf 0.
- **Neue Bedingungen:** `wanted_min`, `wanted_max`, `phase`, `not_phase`, `weekday`, `heat_min`.
- **Neue Effekte:** `wanted: ±n`, `advance_day`.
- **Neue Ereignisse:** `CAUGHT`, `ESCAPED`, `DAY_STARTED {day, weekday, buffed, crossed}`,
  `PHASE_CHANGED`.
- **Nachtbilder:** kein zweiter Satz gezeichneter Szenen. `npm run art` schreibt zu jedem Raum
  zusätzlich `<room>-night.png`, erzeugt durch eine feste Umfärbetabelle über die Palette: alles wird
  dunkler und zieht ins Blaue, Gelb, Orange und Rot bleiben, damit Lampen und Lichter brennen. Das ist eine Tabelle,
  keine sieben neuen Bilder. Wo die Nacht mehr als eine Farbe ändert, malt eine Handvoll Zeilen in
  `NIGHT_OVERLAYS` darüber – zum Beispiel der heruntergelassene Rollladen am Graffitistore.
- **Content:** `risk.yaml` (Werte), `rooms/wache.yaml`, `npcs/buff.yaml` (Nowak), Texte für
  Erwischen, Entkommen, Buff, Cross, Tageswechsel.

## 6. Akzeptanzkriterien

- [x] Im HUD stehen Tag, Abschnitt und – sobald größer 0 – Wanted.
- [x] Der Sketch zeigt das Risiko in Worten, bevor man anfängt.
- [x] Sprühen schiebt die Zeit um einen Abschnitt weiter, nach der Nacht beginnt ein neuer Tag.
- [x] Erwischtwerden führt auf die Wache, kostet die benutzten Farben und den Rest des Tages.
- [x] Wanted sinkt nur durch ein Werk an der Hall oder durch Abtauchen bei Kalle.
- [x] Montags sind die Rolltore leer, und Nowak steht davor.
- [x] Ein Werk mit Qualität 0 oder 1 kann gecrosst werden, ein gutes nie.
- [x] Nachts sehen alle sieben Räume dunkel aus, die Lampen brennen weiter.
- [x] Nachts ist der Graffitistore zu, sichtbar am heruntergelassenen Rollladen.
- [x] Der Durchlauf-Test belegt: King bleibt erreichbar, auch wenn man zwischendurch erwischt wird.

## 7. Offene Fragen an den Tester

- Ist „drei Abschnitte pro Tag" genug, oder will man mehr pro Sitzung schaffen?
- Soll das Werk nach dem Erwischtwerden wirklich hängen bleiben?
- Fehlt ein dritter Weg, Wanted zu senken?

## 8. Abweichungen bei der Umsetzung

| Thema | Umsetzung | Grund |
|-------|-----------|-------|
| Untertauchen | Kein eigener Knopf, sondern eine Antwort bei Kalle („Ich muss ein paar Tage weg vom Fenster"), die `wanted: -1` und `advance_day` als Effekte hat | Braucht keine neue Mechanik. Und es ist schöner, wenn man jemanden fragen muss, statt einen Knopf zu drücken. |
| Wache verlassen | Ein ganz normaler Hotspot „Raus hier" mit `gehen: hinterhof` | Dasselbe Ergebnis ohne Sonderfall im Code. |
| Nachtbilder | Eine Umfärbetabelle über die Palette (`toNight` in `scripts/lib/art.ts`), die `npm run art` zusätzlich als `<room>-night.png` schreibt | Sieben gezeichnete Nachtszenen wären nochmal ein Grafik-Schritt gewesen. Gelb, Orange und Rot bleiben unverändert, deshalb brennen Lampen, erleuchtete Fenster und Rücklichter weiter. |
| Zug nur nachts | Über die normale Spot-Bedingung `{phase: nacht}` in `spots.yaml` | Keine Extrawurst in der Engine. |
| Ruf | Wie in Abschnitt 2 angekündigt weggelassen | Siehe dort. |

## 9. Was der Tester wissen muss

Das Wanted-Level geht **nicht** von allein weg. Wer es loswerden will, malt an der Hall (legal, kostet
einen Abschnitt) oder fragt Kalle, ob er einen Tag unterkommen kann. Beides kostet Zeit – und Zeit ist
in M4b das, was knapp ist.
