# MEILENSTEINE – M1 bis M3.5, Plan bis M6

## Rollen

| Rolle | Aufgabe |
|-------|---------|
| Product Owner | Priorisiert, nimmt ab, führt die Claude-Code-Sessions, macht aus Feedback Issues |
| Claude | Baut nach Prompt, schreibt die Spielinhalte nach Glossar und Leitfaden, überarbeitet sie nach Feedback |
| Tester | Spielt die Produktions-URL auf dem Handy, meldet, was nicht funktioniert und was unecht klingt |

## Arbeitsweise

Jede Aufgabe ist eine eigene Claude-Code-Session:

1. `git pull`, neuen Branch anlegen (z. B. `m1-3-content-pipeline`).
2. Prompt unverändert in Claude Code einfügen.
3. Abnahme prüfen, Preview-URL auf dem Handy testen.
4. Pull Request mergen. Erst dann ist es auf der Produktions-URL – und nur die bekommt der Tester.

Modell-Empfehlung: **Sonnet 5** für fast alles. **Opus 5** für M2-1 und M2-2 – Schema-Querprüfungen und Dialog-Engine sind die Stellen, an denen subtile Fehler später am meisten kosten.

## Feedback-Schleife

1. Der Tester spielt die Produktions-URL. Stößt er auf etwas, meldet er es – ab M2 über den Feedback-Button im Spiel, vorher per Screenshot und kurzer Nachricht.
2. Der Product Owner legt daraus ein GitHub-Issue an, wörtlich, mit Label: `text`, `cringe`, `bug`, `idee`.
3. `text`/`cringe`: Überarbeitung mit dem Prompt unten. `bug`: normale Korrektur. `idee`: kommt ins Backlog, nie direkt in die laufende Aufgabe.
4. Der Tester spielt die Stelle erneut. Erst sein Okay schließt ein `cringe`-Issue.

Prompt für Textüberarbeitung · Sonnet 5:

```
Lies CLAUDE.md, docs/GLOSSAR.md (inklusive Leitfaden) und Issue #[NR].
Überarbeite nur die im Issue genannten Stellen in content/. Das Feedback des Testers ist maßgeblich, auch wenn es vom Glossar abweicht – dann schlage zusätzlich eine Glossar-Änderung vor.
Zeig für jede Änderung vorher und nachher. Ändere keine anderen Zeilen.
content:check muss grün bleiben. Committe mit Verweis auf das Issue.
```

---

## M1 – Hinterhof

**Stand 21.09.2026:** M1 umgesetzt und auf GitHub. Offen: M1-7 (erster Test durch den Tester).

**Spielbar am Ende:** Mit eigenem Writer-Namen starten, den Hinterhof auf dem Handy erkunden, Spielstand bleibt erhalten.
**Tester-Fokus:** Ist die Schrift lesbar? Sind die Tap-Flächen treffbar? Klingen die Hinterhof-Texte echt?

### M1-0 · Einrichtung (manuell, Product Owner)

- [ ] GitHub-Repo `toy-to-king` anlegen (privat).
- [ ] `CLAUDE.md` ins Hauptverzeichnis, `SPEC.md`, `MEILENSTEINE.md`, `GLOSSAR.md`, `CONTENT.md` nach `docs/`.
- [ ] Node LTS und Claude Code lokal einsatzbereit.
- [ ] Vercel-Account mit GitHub verbunden (Import folgt in M1-2).

### M1-1 · Projektgerüst · Sonnet 5

```
Lies CLAUDE.md und docs/SPEC.md (Abschnitte 2 und 3).

Aufgabe: Projektgerüst für TOY TO KING anlegen.
- Next.js (App Router), TypeScript strict, ESLint, Prettier, Vitest.
- Ordnerstruktur exakt wie in SPEC Abschnitt 3. In content/, src/engine/ und src/ui/ je eine kurze README.md auf Deutsch (2–3 Sätze: was gehört hierher, was nicht).
- ESLint-Regel: src/engine/ darf nichts aus react, next oder src/ui importieren.
- npm-Skripte: dev, build, test, lint, content:check (content:check vorerst als Platzhalter, der "ok" ausgibt).
- GitHub Action: bei jedem Push und Pull Request lint, test und content:check ausführen.
- Startseite: "TOY TO KING" zentriert auf schwarzem Grund. Sonst nichts.

Keine Features vorwegnehmen. Keine weiteren Abhängigkeiten ohne Begründung.
Fertig, wenn npm run build, npm test und npm run lint grün sind. Committe, pushe und erkläre in fünf Sätzen einfacher Sprache, was du angelegt hast und wozu.
```

**Abnahme:** Build, Tests, Lint grün; Action läuft auf GitHub grün; Struktur wie SPEC 3.

### M1-2 · Vercel (manuell, Product Owner)

- [ ] Repo in Vercel importieren, Standardeinstellungen, deployen.
- [ ] Produktions-URL auf dem Handy öffnen – das ist die URL für den Tester.
- [ ] Testbranch pushen → Preview-URL erscheint im Pull Request. Preview-URLs können je nach Vercel-Einstellung einen Login verlangen; für den Product Owner passt das, der Tester braucht sie nicht.

### M1-3 · Content-Pipeline · Sonnet 5

```
Lies CLAUDE.md und docs/SPEC.md (Abschnitte 3, 4.2, 4.3 und 4.4).

Aufgabe: Content-Pipeline.
- scripts/build-content.ts liest content/config.yaml und content/rooms/*.yaml, validiert mit Zod und schreibt src/generated/content.json. Die TypeScript-Typen werden aus den Zod-Schemas abgeleitet.
- Für M1 nur Schemas für config und Room/Hotspot (Verben untersuchen und gehen, Textvarianten nach SPEC 4.3, Bedingungen flag, not_flag, visited). NPCs, Dialoge und Infos kommen in M2 – lege die Schema-Datei so an, dass sie später ergänzt wird.
- Querprüfungen (Fehler): IDs eindeutig, jedes gehen-Ziel existiert, Start-Room existiert, rect liegt innerhalb 320×180, in Texten nur die Platzhalter {name} und {crew}.
- Warnungen (stoppen den Build nicht): Text länger als 120 Zeichen; {crew} vor M5.
- Fehlermeldungen auf Deutsch, für Einsteiger ohne Programmierkenntnisse verständlich: Datei, Stelle, was falsch ist, wie es richtig aussähe. Bei unbekannten IDs ein Tippfehler-Vorschlag. Beispiel:
  content/rooms/hinterhof.yaml, Hotspot "tor": "gehen" zeigt auf "strase" – diesen Room gibt es nicht. Meintest du "strasse"?
- Das Skript läuft automatisch vor dev und build; npm run content:check führt es einzeln aus.
- Übernimm content/config.yaml und content/rooms/hinterhof.yaml wörtlich aus docs/CONTENT.md (Abschnitte 1 und 2.1).
- Tests: gültiger Inhalt geht durch; je ein Test pro Fehlerart.

Fertig, wenn content:check und alle Tests grün sind. Committe und erkläre kurz, warum Inhalte und Code getrennt sind.
```

**Abnahme:** Ein absichtlicher Tippfehler in `hinterhof.yaml` erzeugt eine Meldung, die man ohne Hilfe versteht.

### M1-4 · Engine-Kern · Sonnet 5

```
Lies CLAUDE.md und docs/SPEC.md (Abschnitte 4.1, 4.4 und 5).

Aufgabe: Engine-Kern in src/engine/.
- Typ GameState exakt nach SPEC 4.1 mit schemaVersion 1.
- createNewGame(content, playerName) liefert den Startzustand (Start-Room aus config, player.name gesetzt, player.crew = null).
- validatePlayerName(name) nach SPEC 4.4, mit deutscher Fehlermeldung für die UI.
- renderText(text, state) ersetzt {name} und {crew}.
- reduce(state, action, content) als reine Funktion, Rückgabe { state, events }. Aktionen für M1: ENTER_ROOM, INTERACT (untersuchen, gehen), CLOSE_TEXT, NEW_GAME.
- Textvarianten nach SPEC 4.3: erste passende gewinnt, ihre Effekte werden ausgeführt.
- Bedingungen für M1: flag, not_flag, visited. Effekte für M1: set_flag, clear_flag. Baue evaluateCondition und applyEffect als switch über den Typ, damit M2 weitere Typen ohne Umbau ergänzt.
- migrate(saved) für künftige schemaVersion-Wechsel: vorerst Prüfung plus Durchreichen, unbekannte Version → Fehler.
- Unbekannte IDs: Zustand unverändert, WARNING-Event, kein Absturz.
- Tests für jede Aktion, Bedingung und jeden Effekt, inklusive Randfälle.

Kein React, kein localStorage in src/engine/.
Fertig, wenn alle Tests grün sind. Committe und erkläre in einfacher Sprache, was ein Reducer ist und warum das Spiel so gebaut ist.
```

**Abnahme:** Tests grün; Engine importiert nichts aus React/Next (Lint grün).

### M1-5 · Speichern · Sonnet 5

```
Lies CLAUDE.md und docs/SPEC.md (Abschnitte 4.1 und 5, Punkt 10).

Aufgabe: Speichern.
- src/save/SaveStore.ts: Interface mit load(slot), save(slot, state), clear(slot), alle asynchron – damit später ein Server-Adapter passt.
- LocalStorageSaveStore und MemorySaveStore (für Tests).
- Beim Laden migrate() aus der Engine anwenden. Kaputter oder unlesbarer Spielstand: neues Spiel, Warnung in der Konsole, kein Absturz.
- Hilfsfunktion für Autosave nach zustandsändernden Aktionen, entprellt auf höchstens einmal pro Sekunde.
- ESLint-Regel: localStorage darf nur in src/save/ vorkommen.
- Tests: speichern und laden, kaputter Spielstand, unbekannte schemaVersion.

Fertig, wenn alle Tests grün sind. Committe und erkläre kurz, warum das Speichern hinter einem Interface versteckt ist (Stichwort: später online spielen).
```

**Abnahme:** Tests grün; Lint schlägt fehl, wenn man testweise `localStorage` in `src/ui` benutzt.

### M1-6 · Room-Darstellung und Bedienung · Sonnet 5

```
Lies CLAUDE.md und docs/SPEC.md (Abschnitte 4.4, 5 und 6).

Aufgabe: Room-Darstellung und Bedienung.
- Bühne 320×180, ganzzahlig auf die größtmögliche Größe skaliert, schwarzer Rand, image-rendering: pixelated.
- Hintergrund aus public/art/, falls vorhanden; sonst Platzhalter: einfarbige Fläche mit dem Room-Namen in der Ecke.
- Hotspots als unsichtbare Tap-Flächen. Tippen öffnet ein Verbmenü nahe dem Tap-Punkt mit genau den Verben des Hotspots. Tippen daneben schließt es.
- Textbox unten, höchstens drei Zeilen, lesbare Pixelschrift unter OFL-Lizenz, lokal eingebunden (kein externes CDN). Tippen zeigt die nächste Box bzw. schließt. Alle Texte laufen durch renderText.
- Hauptmenü: "Weiterspielen" (wenn Spielstand vorhanden), "Neues Spiel". Neues Spiel öffnet zuerst die Eingabe "Dein Writer-Name" mit Prüfung über validatePlayerName; erst danach startet das Spiel.
- Hochkant: Vollbild-Hinweis "Dreh dein Handy".
- PWA-Manifest: display standalone, orientation landscape, Name, Platzhalter-Icon.
- Debug-Panel bei ?debug=1: Spielstand als JSON, Hotspot-Umrisse mit Label an/aus, Spielstand löschen.
- Autosave über den SaveStore aus M1-5.

Keine Spiellogik in Komponenten – die UI schickt Aktionen an die Engine und zeigt Zustand und Events.
Fertig, wenn es über die Preview-URL auf einem Handy im Querformat bedienbar ist. Committe und schreib eine kurze Anleitung für den Tester: Link öffnen, Spiel als App auf den Homescreen legen, spielen.
```

**Abnahme:** siehe SPEC 7, M1.

### M1-7 · Erster Test · Tester

- [ ] Produktions-URL auf dem Handy, als App auf den Homescreen legen.
- [ ] Neues Spiel mit eigenem Writer-Namen, alle Hotspots im Hinterhof untersuchen.
- [ ] Feedback: Welche Zeile klingt nicht echt? Was ist schlecht lesbar oder schwer zu treffen?
- [ ] Product Owner legt Issues an, Überarbeitung über die Feedback-Schleife.

### M1 – Abnahme

- [ ] Alle Kriterien aus SPEC 7, M1 erfüllt.
- [ ] Tester hat den Hinterhof gespielt, `cringe`-Issues sind geschlossen.

---

## M2 – NPCs, Vertrauen, Blackbook

**Stand 21.09.2026:** M2-1 bis M2-7 umgesetzt auf Branch `m2` (93 Tests grün, Build grün). Offen: Preview prüfen und mergen (Product Owner), M2-8 (Playtest).

**Spielbar am Ende:** Vier Rooms, vier NPCs, Infos erarbeiten, Infos öffnen neue Stellen.
**Tester-Fokus:** Machen die Gespräche Spaß? Fühlen sich die Infos nützlich an? Klingt jede Figur echt – vor allem KRUX?

### M2-1 · Schemas für NPCs, Dialoge, Infos · Opus 5

```
Lies CLAUDE.md, docs/SPEC.md (Abschnitte 4.2–4.4 und 7 M2) und docs/CONTENT.md – nur als Beispiel für das Format.

Aufgabe: Content-Schemas für NPCs, Dialoge und Infos ergänzen.
- Zod-Schemas für content/facts.yaml und content/npcs/*.yaml exakt nach SPEC 4.2, mit allen Bedingungs- und Effekttypen aus den Tabellen.
- Hotspots bekommen sprechen (NPC-ID) und if (Sichtbarkeit).
- Querprüfungen (Fehler): jedes next-, start- und gehen-Ziel existiert; jede Info-ID in Bedingungen und Effekten ist in facts.yaml definiert; NPC-room und NPC-hotspot existieren; jede Info hat eine existierende Quelle; jeder Knoten hat genau eines von options / next / end; jede Option hat next oder end; nur die Platzhalter {name} und {crew}.
- Warnungen: vom Start aus unerreichbare Knoten; Infos, die nirgends gelernt werden; once ohne id; Texte über 120 Zeichen; trust-Effekte bei NPCs mit trust: false.
- Fehlermeldungen im Stil von M1 (Deutsch, Datei, Stelle, Vorschlag).
- Tests je Fehler- und Warnungsart.

Übertrage noch keine Inhalte aus CONTENT.md nach content/ – das ist Aufgabe M2-7.
Fertig, wenn alle Tests grün sind. Committe und erkläre kurz, was eine Querprüfung ist.
```

### M2-2 · Dialog-Engine · Opus 5

```
Lies CLAUDE.md und docs/SPEC.md (Abschnitte 4 und 5).

Aufgabe: Dialog-Engine in src/engine/.
- Aktionen START_DIALOGUE (über Hotspot mit sprechen), ADVANCE_LINE, CHOOSE_OPTION, END_DIALOGUE, MARK_FACTS_SEEN.
- Start-Knoten: start als String oder Liste von {if, node}, erste passende gewinnt.
- Optionen: alle Bedingungen prüfen. Nicht erfüllt → ausgeblendet, außer show_locked ist gesetzt → sichtbar, nicht wählbar, mit Hinweis.
- Effekte in Reihenfolge. learn ist idempotent und markiert neu. trust auf 0–5 begrenzt, bezieht sich auf den NPC im Gespräch. once blendet die Option danach dauerhaft aus.
- trust_min ohne npc bezieht sich auf den NPC im Gespräch, mit npc auf den genannten.
- Events FACT_LEARNED und TRUST_CHANGED im Rückgabewert, damit die UI Hinweise zeigen kann.
- Hotspot-Sichtbarkeit nach SPEC 5, Punkt 9, inklusive newlyVisible.
- evaluateCondition um fact, not_fact, trust_min erweitern; applyEffect um learn und trust.
- Tests: jede Bedingung, jeder Effekt, once, show_locked, Vertrauensgrenzen, Start-Knoten-Auswahl. Dazu ein Integrationstest mit eigenem Test-Content: Gespräch → Info → Hotspot wird sichtbar und landet in newlyVisible.

Fertig, wenn alle Tests grün sind. Committe und erkläre in einfacher Sprache, wie eine Bedingung ausgewertet wird – mit einem Beispiel aus dem Spiel.
```

### M2-3 · Dialog-Oberfläche · Sonnet 5

```
Lies CLAUDE.md und docs/SPEC.md (Abschnitt 6).

Aufgabe: Dialog-Oberfläche.
- Gesprächsansicht über dem Room: Porträt-Platzhalter links (Rahmen mit Initialen), Name und Vertrauensstufe (Stufenname aus config.yaml; bei NPCs mit trust: false ausgeblendet).
- NPC-Text in Boxen, Tippen zeigt die nächste Zeile. Schreibmaschinen-Effekt, Tippen zeigt sofort alles. Alle Texte laufen durch renderText.
- Antwortoptionen als Liste über die ganze Breite, gut antippbar. Gesperrte Optionen ausgegraut mit Hinweis.
- Kurze Einblendung bei neuer Info ("Neu im Blackbook: …") und bei Vertrauensänderung.
- Gespräch jederzeit per "Gehen" beendbar.

Keine Spiellogik in Komponenten.
Fertig, wenn ein Test-Dialog auf dem Handy im Querformat flüssig bedienbar ist. Committe.
```

### M2-4 · Blackbook · Sonnet 5

```
Lies CLAUDE.md und docs/SPEC.md (Abschnitt 6).

Aufgabe: Blackbook.
- Button oben rechts, außerhalb von Gesprächen immer sichtbar, Markierung bei ungelesenen Infos.
- Overlay im Skizzenbuch-Look (Platzhalter: dunkles Papier, Pixelschrift). Reiter nach Kategorien aus config.yaml.
- Einträge mit Titel, Text und Quelle (NPC-Name). Neue Einträge markiert; beim Ansehen MARK_FACTS_SEEN.
- Leere Kategorie: Hinweistext aus config.yaml.

Committe und erkläre kurz, wie das Blackbook an die Engine angebunden ist.
```

### M2-5 · Wissen als Schlüssel · Sonnet 5

```
Lies CLAUDE.md und docs/SPEC.md (Abschnitte 4.3 und 5, Punkt 9).

Aufgabe: Wissen als Schlüssel (F2.8) in der Oberfläche.
- Hotspots und Ausgänge mit if werden nur angezeigt und sind nur antippbar, wenn die Bedingung erfüllt ist.
- Hotspots aus newlyVisible glitzern beim nächsten Anzeigen des Rooms einmal kurz auf; danach wird der Eintrag geleert.
- Untersuchen-Texte mit Varianten nach Info-Stand funktionieren in allen Rooms.
- Komponententest: Die Kette Gespräch → Info → neuer Hotspot kommt in der Oberfläche an.

Committe.
```

### M2-6 · Feedback-Button · Sonnet 5

```
Lies CLAUDE.md und docs/SPEC.md (Abschnitt 6).

Aufgabe: Feedback-Button für den Tester (F11.4).
- Kleiner Button im Pausenmenü und im Gespräch: "Feedback".
- Öffnet ein Textfeld. Automatisch angehängt wird der Kontext: Room, bei Gespräch NPC, Knoten und die gerade sichtbare Textzeile, Build-Version (Commit-Kürzel aus der Vercel-Umgebungsvariable), Datum.
- "Senden" nutzt das Teilen-Menü des Handys (Web Share API), damit der Tester die Nachricht per Messenger schicken kann. Fallback: Text in die Zwischenablage kopieren und Hinweis anzeigen.
- Kein Server, kein Login, nichts wird gespeichert.

Fertig, wenn Feedback aus einem laufenden Gespräch auf dem Handy mit Kontext geteilt werden kann. Committe.
```

### M2-7 · Inhalte übertragen · Sonnet 5

```
Lies CLAUDE.md, docs/GLOSSAR.md und docs/CONTENT.md.

Aufgabe: Die Inhalte aus CONTENT.md nach content/ übertragen:
content/facts.yaml, content/npcs/{mentor,laden,rivale,streife}.yaml, content/rooms/{strasse,farbenladen,unterfuehrung}.yaml, und die M2-Ergänzungen für hinterhof.yaml aus Abschnitt 4.5.
- Wörtlich übertragen. Nichts dazuerfinden, nichts "verbessern".
- content:check muss ohne Fehler durchlaufen; Warnungen auflisten.
- Einmal alle Dialoge automatisiert durchspielen: Ist jede Info erreichbar? Kommt man bei Kalle, Sibel und KRUX auf Vertrauen 2? Ergebnis als Tabelle.

Fertig, wenn alles spielbar ist. Committe.
```

### M2-8 · Playtest · Tester

- [ ] Neues Spiel mit eigenem Writer-Namen, ohne Debug. Findet er alle vier NPCs ohne Hilfe?
- [ ] Wirkt es gut, vom NPC mit dem eigenen Namen angesprochen zu werden?
- [ ] Fühlen sich die Infos nützlich an – oder nur wie Text?
- [ ] Welche Zeilen klingen cringe? Welche Figur am meisten?
- [ ] Ist der Weg zu Vertrauen 2 nachvollziehbar, ohne zu leicht zu sein?
- [ ] Fällt das Glitzern am Zaun auf?
- [ ] Welche Schrift ist auf dem Handy besser lesbar?
- [ ] Wie lange dauert ein Durchgang? Wollte er danach weiterspielen?

Jede Beobachtung über den Feedback-Button, daraus Issues.

### M2 – Abnahme und Entscheidungspunkt

- [ ] Alle Kriterien aus SPEC 7, M2 erfüllt.
- [ ] Alle `cringe`-Issues vom Tester geschlossen.
- [ ] **Go/No-Go für M3:** Macht das Reden mit NPCs Spaß? Wenn nicht, wird vor M3 umgesteuert, nicht weitergebaut.

---

## M3 – Karte, Spots, Sprühen

**Stand 21.09.2026:** umgesetzt auf Branch `m3`, Details in `SPEC-M3.md`. Offen: Preview prüfen, mergen, Playtest.

**Spielbar am Ende:** Karte öffnen, zu einem Spot gehen, mit Style, Cap und Dose sprühen, das eigene Werk an der Wand und auf der Karte sehen.
**Tester-Fokus:** Fühlt sich die Wahl von Style, Cap und Dose echt an – oder wie ein Quiz? Stimmen die Hinweise nach dem Sprühen? Stimmen die Spots (Heaven Spot, Zug, Hall) mit dem, was man aus der Szene kennt?

### M3 – Playtest

- [ ] Alle fünf Spots finden – ohne Hilfe?
- [ ] Ist klar, woher man Skinny Cap, Fat Cap, NY Fat und High Pressure bekommt?
- [ ] Welche Kombinationen fühlen sich falsch bewertet an? (z. B. „Das würde in echt anders laufen")
- [ ] Wirkt der eigene Name an der Wand gut – oder zu klein, zu gleich?
- [ ] Fehlt etwas, das beim Sprühen unbedingt dazugehört?

### M3 – Abnahme und Entscheidungspunkt

- [ ] Kriterien aus SPEC-M3 auf dem Handy bestätigt.
- [ ] Playtest-Feedback als Issues erfasst.
- [x] **Vor M4:** Heat, Wanted, XP und Ränge bauen auf dieser Sprüh-Regel auf. Wenn sie sich unecht anfühlt, jetzt ändern – später wird es teuer. → Entscheidung: Sie fühlte sich wie ein Quiz an, deshalb kommt M3.5.

## M3.5 – Sprühen 2.0

**Stand 22.09.2026:** umgesetzt auf Branch `m3-5`, Details in `SPEC-M3.5.md`. Grundlage sind 3 Runden Style-Check mit dem Tester (Artifact „Style-Check Wand").

**Spielbar am Ende:** Sketch mit Vorschau wählen (Style, Farben aus der Tasche, Dose). Dann Fill-in und Outline mit dem Finger nachfahren, jeweils mit eigenem Cap. Fehler sieht man im Bild: Lücken, fette Outline, Overspray, Drips. Das Werk bleibt als Bild am Spot.

**Tester-Fokus:** Fühlt sich das Nachfahren wie Sprühen an? Sind Zeit und Tempo machbar? Sind die Fehler fair?

### M3.5 – Playtest (auf dem Handy)

- [ ] Ist das Nachfahren mit dem Finger machbar, oder zu fummelig? Reicht die Zeit?
- [ ] Merkt man den Unterschied zwischen Low und High Pressure?
- [ ] Merkt man, dass Skinny fürs Fill-in und NY Fat für die Outline falsch sind? Ohne dass es einem jemand sagt?
- [ ] Sehen Drips und Overspray echt aus?
- [ ] Sieht das eigene Werk im Raum gut aus, oder ist es zu klein?
- [ ] Welche Farben fehlen am meisten?

### M3.5 – Abnahme

- [ ] Kriterien aus SPEC-M3.5 auf dem Handy bestätigt.
- [ ] Toleranz, Tempo und Zeit nach dem Playtest nachgestellt.
- [ ] Danach: M4 mit Rängen. Die Ränge schalten die Style-Leiter frei (Bombing → Piece → Wildstyle).
- [ ] M4 vorgemerkt (Tester-Idee): Tempo-Bonus auf XP für schnelles, sauberes Sprühen. Später wirkt die Zeit an der Wand auch auf Heat.


## Plan ab M4 (Stand 22.09.2026, vom Product Owner bestätigt)

| MS | Inhalt | Spielbar am Ende |
|----|--------|------------------|
| **M4a – Aufstieg** | XP (Style × Qualität × Spot × Tempo), Ränge Toy → King, Style-Leiter freischalten, Wildstyle von KRUX lernen, eigene Formen für Bombing, Piece, Wildstyle. Details: `SPEC-M4a.md`. | Man steigt auf und arbeitet sich zum ersten Piece an der Hall hoch. |
| **G – Grafik** | Umgesetzt auf Branch `grafik` (22.09.2026), Details in `SPEC-GRAFIK.md`. Bilder für alle sieben Räume, neuer Knopf „Blick“. Offen: Bewertung durch den Tester (Artifact „Raum-Check“). | Das Spiel sieht überall wie ein Spiel aus. |
| **M4b – Risiko** | Umgesetzt auf Branch `m4b` (23.09.2026), Details in `SPEC-M4b.md`. Heat je Spot, Wanted, drei Tagesabschnitte mit Nachtbildern, Buff und Crossen, Erwischtwerden mit Wache, Nowak vom Buff-Trupp. Ruf bewusst weggelassen. | Die Kernschleife ist komplett. |
| **M5a – Material und Geld** | Umgesetzt auf Branch `m5a` (23.09.2026), Details in `SPEC-M5a.md`. Geld und Taschengeld, Kaufen bei KINGSIZE, Farbverbrauch, die drei Marker und vier Marker-Spots. Ohne neues Raumbild. | Material ist knapp, und man entscheidet, wofür man es ausgibt. |
| **M5b – Crew** | Crew gründen, rekrutieren, anleiten, Sidequests, Fluchtszene. Neue Orte: **Dönerladen** (F3.7) und der **Jam** an der Hall (F3.8). Neue Leute: **YARE, TEAR, CRES** als Crew-Kandidaten (F6.6) und **Hakan** vom Döner (F2.9) | Die Aufbau-Ebene steht. |
| **M6 – Rund machen** | King-Ende, Content-Ausbau, echte Handstyles (Skizzen des Testers), Hilfen, Polish | Rundes Spiel von Toy bis King |

**Warum M4 geteilt ist:** Aufstieg und Risiko auf einmal wäre schwer zu testen. Und wenn es sich falsch anfühlt, weiß niemand, woran es liegt.

**Warum der Grafik-Schritt kommt:** Beim Sprühen sieht das Spiel inzwischen gut aus, die Räume sind aber noch Platzhalter. Mit jedem Meilenstein wird der Unterschied auffälliger.

**Risiko Grafik:** Die Hintergründe entstehen per Code als Pixelgrafik. Ob das echt genug aussieht, klärt ein Bilder-Prototyp vorab, genau wie beim Style-Check.

## Welt ab M4b: Räume und Leute (Stand 23.09.2026, vom Product Owner bestätigt)

Bis einschließlich des Grafik-Schritts hat das Spiel sieben Räume und vier Leute. Für M4b und M5 kommen
drei Räume und fünf Leute dazu. Die Reihenfolge ist bewusst: erst die bestehenden Räume dichter machen,
dann neue bauen.

| Neu | Wo | Wofür | MS |
|-----|-----|-------|-----|
| Polizeistation | eigener Raum | Man wacht dort auf, nachdem man erwischt wurde. Material weg, Zeit weg, drei Sätze, raus. Nie länger als ein Bildschirm. | M4b |
| Nowak | an den Rolltoren, montags | Der Buff bekommt ein Gesicht. Macht nur seine Arbeit, ist nicht der Feind. | M4b |
| Dönerladen | eigener Raum | Treffpunkt. Sicherer Raum ohne Heat, kostet Geld und Zeit. Marker-Spots auf Klotür und Kühlschrank. | M5 |
| Hakan | Dönerladen | Sieht alles, redet gern, Graffiti ist ihm egal. Günstigste Quelle für Insider-Infos. | M5 |
| Jam | die Hall, an einem Abend | Kein neuer Raum, sondern ein Zustand: Die Hall ist voll. Wie man behandelt wird, hängt am Rang – bei Toy redet keiner mit dir. Hier trifft man die Crew-Kandidaten. | M5 |
| YARE | Jam, später Dönerladen | Zeichnet ständig, volles Blackbook, traut sich nicht an die Wand. Bringt die Skizzenphase (F4.4). | M5 |
| TEAR | Abstellgleis | Schnell, nervös, kennt jeden Fluchtweg und jeden Zaun. Steht Schmiere, senkt das Risiko. | M5 |
| CRES | Dönerladen | Der Älteste, war schon da, bevor es die Hall gab. Kommt an Material (F8.4). | M5 |

**Die Namen an den Wänden sind die Leute.** RUBIX, TEAR, REMS, YARE und CRES stehen seit dem
Grafik-Schritt in allen Räumen. Drei davon lernt man in M5 persönlich kennen – man kennt den Namen
also längst, bevor man das Gesicht sieht. Genau so läuft es in echt. RUBIX und REMS bleiben
unerreichbar: Sie gehören zu NOX, der Crew an den Wänden, und werden in v1.1 die Rivalen-Crew (F6.5).
