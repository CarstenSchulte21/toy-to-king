# SPEC – TOY TO KING, Meilensteine M1 & M2

Bezug: `backlog.md` (Feature-IDs), `grobidee-spielkonzept.md`, `GLOSSAR.md`, `CONTENT.md`.
Status: Entwurf zur Abnahme durch den Product Owner.

## 1. Ziel

| MS | Spielbar am Ende |
|----|------------------|
| M1 | Der Hinterhof läuft auf dem Handy im Querformat. Man tippt Dinge an, untersucht sie, der Spielstand bleibt nach dem Neuladen erhalten. Läuft auf Vercel. Beim neuen Spiel wählt der Spieler seinen Writer-Namen. |
| M2 | Vier Rooms, vier NPCs. Gespräche mit Auswahl, Vertrauen, das man sich erarbeitet, Infos landen im Blackbook – und Infos öffnen neue Stellen im Spiel. Der Tester kann Feedback mit Kontext direkt aus dem Spiel schicken. |

Nicht Teil von M1/M2: Karte, Sprühen, Inventar, XP, Ränge, Heat, Wanted, Crew, Geld, echte Grafik.

## 2. Technische Entscheidungen

| Thema | Entscheidung | Begründung |
|-------|--------------|------------|
| Framework | Next.js (App Router), TypeScript strict | Gleicher Stack wie beim Aufstellungsassistenten. v2 braucht Server und Login, dann ist beides schon da. Für v1 eigentlich überdimensioniert – Vite wäre schlanker –, bewusst in Kauf genommen. |
| Darstellung | React + CSS, keine Game-Engine (kein Phaser, kein Canvas) | Ein Room- und Dialogspiel braucht keine Physik und keinen Game-Loop. Der Code bleibt auch für Einsteiger lesbar. |
| Spiellogik | Reine TypeScript-Engine in `src/engine`, ohne React | Testbar, und in v2 auch auf dem Server nutzbar. |
| Auflösung | 320×180 logische Pixel, ganzzahlig skaliert, `image-rendering: pixelated` | 16:9 quer, echter Retro-Look, Koordinaten in ganzen Pixeln – passt zu Karopapier-Skizzen. |
| Inhalte | YAML-Dateien in `content/`, beim Build mit Zod geprüft, erzeugen `src/generated/content.json` | Lesbar und kommentierbar, auch ohne Programmierkenntnisse. Fehler stoppen den Build mit einer verständlichen deutschen Meldung. |
| Speichern | `SaveStore`-Interface, in v1 ein LocalStorage-Adapter | F9.1 – Umstieg auf Server-Spielstände in v2 ohne Umbau. |
| Tests | Vitest für Engine und Content-Prüfung | Spiellogik muss belegt funktionieren, nicht nur „sieht gut aus". |
| Hosting | GitHub, Vercel, Preview-URL je Branch, GitHub Action für lint/test/content:check | Der Tester spielt immer die stabile Produktions-URL; Previews dienen der Abnahme durch den Product Owner. |
| Handy | Querformat mit Dreh-Hinweis, PWA-Manifest (standalone, landscape) | iPhone-Safari kann kein echtes Vollbild, die Browserleisten fressen im Querformat viel Platz. Als App auf dem Homescreen ist das gelöst. |

## 3. Repo-Struktur

```
toy-to-king/
├─ CLAUDE.md
├─ docs/                 SPEC.md, MEILENSTEINE.md, GLOSSAR.md, CONTENT.md
├─ content/              ← Content-Bereich: alle Spielinhalte als YAML
│  ├─ config.yaml        Start-Room, Vertrauensstufen, Kategorienamen
│  ├─ facts.yaml         alle Insider-Infos
│  ├─ rooms/*.yaml
│  └─ npcs/*.yaml
├─ public/art/           Grafiken (in M1/M2 Platzhalter)
├─ scripts/build-content.ts
├─ src/
│  ├─ engine/            Spiellogik, reines TypeScript
│  ├─ save/              SaveStore-Interface und Adapter
│  ├─ ui/                React-Komponenten
│  ├─ generated/         aus content/ erzeugt – nie von Hand ändern
│  └─ app/               Next.js-Seiten
└─ tests/
```

## 4. Datenmodell

### 4.1 Spielstand

```ts
type GameState = {
  schemaVersion: 1;
  player: { name: string; crew: string | null };   // frei gewählt, crew ab M5
  room: RoomId;
  visited: RoomId[];
  flags: Record<string, true>;
  facts: Record<FactId, { new: boolean }>;   // gelernte Infos, new = ungelesen im Blackbook
  trust: Record<NpcId, number>;              // 0–5
  usedOnce: string[];                        // "npc.node.optionId"
  newlyVisible: HotspotId[];                 // neu freigeschaltete Hotspots (Glitzer-Hinweis)
  meta: { createdAt: string; updatedAt: string; playSeconds: number };
};
```

Offene Textboxen und laufende Gespräche sind UI-Zustand und werden **nicht** gespeichert. Nach dem Neuladen steht man im Room, ohne offenes Gespräch.

### 4.2 Inhalte

```ts
type Room = {
  id: RoomId; name: string;
  description?: TextVariants;
  background?: string;                       // Datei in public/art, sonst Platzhalter
  hotspots: Hotspot[];
};

type Hotspot = {
  id: HotspotId; label: string;
  rect: [x: number, y: number, w: number, h: number];   // in Pixeln, innerhalb 320×180
  if?: Condition[];                          // nur sichtbar, wenn erfüllt
  untersuchen?: TextVariants;
  gehen?: RoomId;
  sprechen?: NpcId;
};

type TextVariants =
  | string                                   // eine Textbox
  | string[]                                 // mehrere Textboxen nacheinander
  | { if?: Condition[]; text: string | string[]; effects?: Effect[] }[];  // erste passende gewinnt

type Npc = {
  id: NpcId; name: string; role: string;
  room: RoomId; hotspot: HotspotId;
  trust: { start: number } | false;          // false = kein Vertrauenswert (z. B. Streife)
  dialogue: {
    start: NodeId | { if?: Condition[]; node: NodeId }[];
    nodes: Record<NodeId, DialogueNode>;
  };
};

type DialogueNode = {
  text: string | string[];
  effects?: Effect[];                        // beim Betreten des Knotens
  options?: Option[];                        // genau eines von options / next / end
  next?: NodeId;
  end?: true;
};

type Option = {
  text: string;
  id?: string;                               // Pflicht bei once
  if?: Condition[];
  show_locked?: string;                      // Bedingung nicht erfüllt → ausgegraut mit diesem Hinweis
  effects?: Effect[];
  once?: true;
  next?: NodeId;
  end?: true;
};

type Fact = {
  id: FactId;
  category: "spot" | "risiko" | "crews" | "material" | "szene";
  title: string; text: string;
  source: NpcId | "welt";
};
```

**Bedingungen** (alle Einträge einer Liste müssen erfüllt sein, leere Liste = erfüllt):

| YAML | Bedeutung |
|------|-----------|
| `fact: zaun` | Info ist bekannt |
| `not_fact: zaun` | Info ist noch nicht bekannt |
| `flag: x` / `not_flag: x` | Merker gesetzt / nicht gesetzt |
| `trust_min: 2` | Vertrauen des NPC im laufenden Gespräch ≥ 2 |
| `trust_min: { npc: mentor, value: 2 }` | Vertrauen eines bestimmten NPC ≥ 2 (außerhalb von Gesprächen) |
| `visited: strasse` | Room wurde schon betreten |

**Effekte** (werden in Reihenfolge ausgeführt):

| YAML | Bedeutung |
|------|-----------|
| `learn: zaun` | Info ins Blackbook |
| `trust: 1` / `trust: -1` | Vertrauen des NPC im laufenden Gespräch ändern |
| `set_flag: x` / `clear_flag: x` | Merker setzen / löschen |

Alle Inhalte im echten Format: `CONTENT.md`.

### 4.4 Spieler- und Crew-Name

Die Spielfigur hat keinen festen Namen. Beim neuen Spiel gibt der Spieler seinen **Writer-Namen** ein, in M5 bei der Crew-Gründung den **Crew-Namen**.

- Regeln für beide: 2–16 Zeichen, Buchstaben, Ziffern, `-` und `_`. Groß-/Kleinschreibung bleibt, wie eingegeben.
- In allen Texten stehen Platzhalter statt Namen: `{name}` für den Writer-Namen, `{crew}` für den Crew-Namen. `renderText(text, state)` in der Engine ersetzt sie.
- Der Content-Check meldet unbekannte Platzhalter als Fehler und `{crew}` vor M5 als Warnung.
- In v2 (andere Spieler sehen Namen) kommen Eindeutigkeit und Moderation dazu – in v1 lokal nicht nötig.

## 5. Engine-Regeln

1. `reduce(state, action, content)` ist eine reine Funktion und liefert `{ state, events }`. Die Engine zeigt nichts an; die UI reagiert auf Events.
2. Aktionen M1: `ENTER_ROOM`, `INTERACT` (untersuchen, gehen), `NEW_GAME` (mit Writer-Name), `TICK` (Spielzeit). Textboxen schließt die Oberfläche selbst. M2: Gespräch starten über `INTERACT` mit Verb `sprechen`, `CHOOSE_OPTION`, `CONTINUE_DIALOGUE`, `MARK_FACTS_SEEN`, `SEEN_HOTSPOTS`. Zeilen weiterblättern und Gespräch verlassen macht die Oberfläche, weil die Gesprächsposition laut 4.1 kein Spielstand ist.
3. Unbekannte IDs lassen den Zustand unverändert und erzeugen ein `WARNING`-Event. Kein Absturz.
4. Textvarianten: die erste Variante, deren Bedingungen erfüllt sind, gewinnt. Ihre Effekte werden ausgeführt.
5. Knoten betreten: erst Knoten-Effekte, dann Textzeilen, dann Optionen, `next` oder Ende.
6. Option wählen: Bedingungen erneut prüfen, Effekte ausführen, bei `once` als benutzt merken, dann `next` oder Ende.
7. `learn` ist idempotent. Nur beim ersten Lernen `new: true` und Event `FACT_LEARNED`.
8. Vertrauen wird auf 0–5 begrenzt. Event `TRUST_CHANGED` mit altem und neuem Wert. NPCs mit `trust: false` ignorieren Vertrauenseffekte.
9. Sichtbarkeit von Hotspots wird berechnet, nicht gespeichert. Wechselt ein Hotspot durch eine Aktion von unsichtbar auf sichtbar, landet er in `newlyVisible`; die UI leert den Eintrag, sobald sie ihn einmal hervorgehoben hat.
10. Autosave nach jeder zustandsändernden Aktion übernimmt die UI-Schicht über den `SaveStore`, entprellt auf höchstens einmal pro Sekunde.

## 6. UI-Regeln

- Bühne 320×180, ganzzahlig skaliert, schwarzer Rand. Hochkant: Vollbild-Hinweis „Dreh dein Handy".
- Hotspots sind unsichtbare Tap-Flächen, mindestens 16×16 logische Pixel. Tippen öffnet ein Verbmenü mit genau den Verben, die der Hotspot hat. In M1/M2: Untersuchen, Gehen, Sprechen.
- Textbox unten, höchstens drei Zeilen. Ein Text über 120 Zeichen erzeugt eine Warnung im Content-Check – längere Texte werden als Liste mehrerer Boxen geschrieben.
- Pixelschrift unter OFL-Lizenz, lokal eingebunden. Vorschläge: VT323 oder Pixelify Sans. Entscheidung fällt im Playtest nach Lesbarkeit auf dem Handy.
- Blackbook-Button oben rechts, mit Markierung bei ungelesenen Infos.
- Hauptmenü: „Weiterspielen" (wenn Spielstand vorhanden), „Neues Spiel". Neues Spiel fragt zuerst nach dem Writer-Namen, mit Eingabeprüfung nach 4.4.
- Feedback-Button (ab M2) im Pausenmenü und im Gespräch: Freitext plus automatischer Kontext (Room, NPC, Knoten, sichtbare Zeile, Build-Version), versendet über das Teilen-Menü des Handys.
- Debug-Panel mit `?debug=1`: Spielstand als JSON, Hotspot-Umrisse mit Label, Vertrauen setzen, Spielstand löschen.
- Keine Spiellogik in Komponenten. Die UI schickt Aktionen und zeigt Zustand und Events.

## 7. Akzeptanzkriterien

### M1

- [ ] **F11.1** Repo angelegt; `build`, `lint`, `test`, `content:check` grün; GitHub Action prüft bei jedem Push.
- [ ] **F11.2** Push auf `main` → Produktion unter einer `vercel.app`-Adresse.
- [ ] **F11.3** Jeder Branch bekommt eine eigene Preview-URL.
- [ ] **F1.1** Hinterhof mit mindestens fünf Hotspots aus `content/rooms/hinterhof.yaml`.
- [ ] **F1.2** Handy quer: Bühne füllt den Bildschirm ohne Scrollen. Hochkant: Dreh-Hinweis.
- [ ] **F1.3** Antippen öffnet das Verbmenü, nur mit vorhandenen Verben. Untersuchen zeigt den Text, Tippen schließt ihn.
- [ ] **F9.1** `localStorage` kommt ausschließlich in `src/save/` vor (per ESLint erzwungen).
- [ ] **F9.2** Nach dem Neuladen: gleicher Room, gleiche Merker. „Neues Spiel" setzt zurück. Ein kaputter Spielstand führt zu einem neuen Spiel statt zu einem Absturz.
- [ ] **F10.1** (Grundgerüst) Ein Fehler in einer YAML-Datei stoppt den Build mit deutscher Meldung: Datei, Stelle, Problem, Vorschlag.
- [ ] **F1.7** Als App zum Homescreen hinzugefügt startet das Spiel quer und ohne Browserleisten.
- [ ] **F11.5** `?debug=1` zeigt Spielstand, Hotspot-Umrisse und Reset.
- [ ] **F1.8** Neues Spiel fragt nach dem Writer-Namen; ungültige Eingaben werden verständlich abgelehnt; der Name bleibt nach dem Neuladen erhalten und erscheint über `{name}` in Texten.
- [ ] Der Tester hat den Hinterhof über die Produktions-URL gespielt, sein Feedback ist als Issues erfasst.

### M2

- [ ] **F2.1** Gespräche mit Auswahl; mehrzeilige Texte per Tippen weiter; Gespräch jederzeit beendbar.
- [ ] **F2.2** Jeder der vier NPCs hat mindestens zwei Infos; Infos hängen an Bedingungen.
- [ ] **F2.3** Blackbook: neue Info → Einblendung und Markierung; sortiert nach Kategorie; Quelle sichtbar; bleibt nach dem Neuladen erhalten.
- [ ] **F2.4** Vertrauen 0–5 je NPC, Stufenname im Gespräch sichtbar. Mentor, Farbenladen und Rivale haben je mindestens eine Info, die erst ab Vertrauen 2 zu haben ist.
- [ ] **F2.5** Vier NPCs in vier Rooms (Hinterhof, Straße, Farbenladen, Unterführung) erreichbar.
- [ ] **F2.8** Mindestens zwei Stellen, an denen eine Info einen Hotspot oder eine Dialogoption freischaltet. Neu sichtbare Hotspots werden einmal hervorgehoben.
- [ ] **F10.1** Content-Check meldet als Fehler: fehlende `next`/`gehen`-Ziele, unbekannte Info-IDs, doppelte IDs, Knoten ohne Fortsetzung. Als Warnung: Texte über 120 Zeichen, unerreichbare Knoten, Infos ohne Lernquelle, `once` ohne `id`.
- [ ] **F10.2/F10.3** `GLOSSAR.md` im Repo; alle Dialoge gegen den Leitfaden geprüft; `cringe`-Issues vom Tester geschlossen.
- [ ] **F11.4** Feedback-Button schickt Freitext mit Kontext über das Teilen-Menü.
- [ ] Kein fester Spielername in Inhalten – nur `{name}`.
- [ ] Automatisierter Test spielt die Kette Mentor → Info „zaun" → Hotspot in der Unterführung sichtbar durch.
- [ ] Playtest durchgeführt, Ergebnisse als GitHub-Issues erfasst.
- [ ] Automatisierter Durchlauf: jede Info erreichbar, Vertrauen 2 bei Kalle, Sibel und KRUX erreichbar.

## 8. Abweichungen vom Backlog

| Änderung | Grund |
|----------|-------|
| F10.1 Content-Pipeline: Grundgerüst nach M1 vorgezogen | Rooms sind schon Inhalt. Ohne Pipeline müsste der Hinterhof im Code stehen und später umgezogen werden. |
| Neu F2.8 „Wissen als Schlüssel" (Must, M2) | Sonst haben Infos in M2 keinen Spielwert – erst ab M3/M4. Ein Blackbook voller Infos ohne Wirkung fühlt sich leer an. |
| Neu F1.7 PWA-Manifest (Should, M1) | iPhone-Querformat ist im Browser sonst stark eingeschränkt. |
| Neu F11.5 Debug-Panel (Should, M1) | Inhalte müssen testbar sein, ohne jedes Mal bis zur Stelle zu spielen. |
| Neu F1.8 Writer-Name bei Spielstart (Must, M1) | Die Spielfigur hat keinen festen Namen; NPCs sprechen den Spieler mit seinem gewählten Namen an. |
| F11.4 Feedback-Weg von Could/M6 auf Should/M2 | Der Tester soll Feedback genau an der Stelle geben können, an der es entsteht – sonst bleibt nur „irgendwas bei KRUX klang komisch". |
| Textboxen ohne Engine-Aktion (`CLOSE_TEXT` entfällt) | Textboxen sind laut 4.1 kein Spielstand. Die Engine liefert `TEXT`-Ereignisse, die Oberfläche blättert sie durch. |
| Neue Aktion `TICK` | Zählt `meta.playSeconds`, alle 15 Sekunden, solange gespielt wird. |
| Sichtbare Platzhalter-Hotspots ohne Hintergrundbild | Unsichtbare Tap-Flächen auf leerem Grund sind unspielbar. Mit echter Grafik werden Hotspots wieder unsichtbar. |
| Schriftwahl VT323 / Pixelify Sans im Debug-Panel | Grundlage für die Schriftentscheidung im Playtest. |
| `fitToContent` | Steht ein Spielstand in einem Room, den es nicht mehr gibt, geht es im Start-Room weiter – Inhalte ändern sich während der Entwicklung. |
| Gesprächsaktionen anders geschnitten (siehe 5, Punkt 2) | Die Engine bekommt nur Aktionen, die den Spielstand ändern. Wo man im Gespräch steht, hält die Oberfläche. |
| Hinweise zu neuen Infos und Vertrauen erscheinen im Gespräch unter dem Text | Als Einblendung oben verdeckten sie im Handy-Querformat den NPC-Text. |
| Automatischer Durchlauf probiert alle Gesprächsverläufe je NPC und gibt Wissen zwischen NPCs weiter | Ein Durchlauf über alle NPCs gleichzeitig ist kombinatorisch zu groß. |
| M2 mit vier Rooms statt drei | Die Straße als Knotenpunkt gibt der Streife einen natürlichen Ort und verbindet die anderen Rooms. |

## 9. Festlegungen (gelten, bis der Tester widerspricht)

- **Begriff:** „Writer" als Standard.
- **Dosenmarken:** keine Markennamen, nur echte Kategorien (Low/High Pressure, Cap-Typen) – kein Markenrecht-Risiko, sobald andere spielen.
- **Polizei:** heißt „Streife".
- **Vertrauensstufen:** Fremder, Gesehen, Bekannt, Respekt, Vertraut, Family.
- **Schrift:** Entscheidung im Playtest nach Lesbarkeit.
- **Grafik:** M1/M2 nur Platzhalter, echte Pixel-Art im separaten Design-Schritt.
