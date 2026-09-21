# SPEC – TOY TO KING, Meilenstein M3

Bezug: `backlog.md` (E3, E4, E8, F1.4), `SPEC.md` (M1/M2, gilt weiter), `CONTENT.md`.

## 1. Ziel

**Spielbar am Ende:** Man öffnet die Bezirkskarte, geht zu einem Spot und sprüht dort. Style, Cap und Dose bestimmen, wie gut das Werk wird. Das Werk bleibt am Spot sichtbar und steht auf der Karte.

Nicht Teil von M3: Heat, Wanted, XP, Ränge, Tag/Nacht, Geld, Materialverbrauch, Sprüh-Minigame.

## 2. Designentscheidungen

| Thema | Entscheidung | Begründung |
|-------|--------------|------------|
| Spots | Die fünf Spots hängen an den Infos aus M2: Rolltore (immer), Hall hinterm Jugendzentrum (`hall`), linke Wand der Unterführung (`krux_frage`), Eisenbahnbrücke (`bruecke`), Abstellgleis (`zaun`) | „Wissen als Schlüssel" läuft weiter: Wer zuhört, findet die Spots. |
| Karte | Übersicht über den Bezirk und Schnellreise. Ein Ort steht auf der Karte, wenn man dort war oder die passende Info kennt. | Die Karte ist die spätere Territoriums-Ansicht (M4: Heat, gecrosst, gebufft). |
| Neue Orte | Jugendzentrum, Eisenbahnbrücke, Abstellgleis – erreichbar über die Karte, das Abstellgleis auch durch den Zaun | Jeder Spot braucht einen Ort, an dem man steht. |
| Sprühen | Menü mit drei Entscheidungen: Style (Tag, Throw-up, Hollow, Piece), Cap, Dose (Low/High Pressure). Kein Minigame. | Backlog: „Ergebnis + Risiko", Minigame kommt als eigenes Konzept. |
| Qualität | 0–3 Punkte: +1 passender Cap, +1 passender Druck, +1 Style passt zum Spot. Piece braucht zusätzlich einen Skinny Cap für die Outline. | Transparent und lernbar. Die Infos von Sibel (`caps`, `druck`) werden direkt nützlich. |
| Rückmeldung | Nach dem Sprühen: Ergebnis und bis zu zwei konkrete Hinweise, was nicht gepasst hat | Man lernt aus jedem Versuch, statt zu raten. |
| Material | Caps und Dosen sind Gegenstände in der Tasche. Start: Standard-Cap und Low Pressure. Weitere bekommt man über Gespräche (Sibel, Kalle, KRUX). | Beziehungen bringen Material – das ist die Aufbau-Ebene im Kleinen. Verbrauch und Geld erst in M5. |
| Risiko | Jeder Spot hat eine Risikostufe, die angezeigt wird. Wirkung erst mit Heat in M4. | Ehrlich: Bis M4 ist Risiko nur ein Hinweis. |
| Werk | Pro Spot ein Werk (Style, Qualität, Material). Neues Sprühen ersetzt das eigene alte Werk. Das Werk zeigt den Writer-Namen am Spot. | Der eigene Name an der Wand ist der eigentliche Moment. |

## 3. Datenmodell (Ergänzungen)

**Spielstand, schemaVersion 2**

```ts
items: Record<ItemId, number>;          // Inhalt der Tasche
works: Record<SpotId, {
  style: StyleId; cap: ItemId; dose: ItemId; quality: 0 | 1 | 2 | 3; at: string;
}>;
```

Migration v1 → v2: `items` = Startausrüstung aus `config.yaml`, `works` = leer. Alte Spielstände laufen weiter.

**Neue Inhaltsdateien**

| Datei | Inhalt |
|-------|--------|
| `content/items.yaml` | Gegenstände: `id`, `name`, `kind` (`cap` / `dose`), `text` |
| `content/spray.yaml` | Styles (`ideal_caps`, `ideal_dose`, `requires`, Hinweistexte), Qualitätsstufen, Ergebnissatz |
| `content/spots.yaml` | Spots: `room`, `hotspot`, `type`, `fits` (passende Styles), `risk`, `fit_hint`, Kartenposition, Sichtbarkeit |
| `content/map.yaml` | Orte auf der Karte mit Position und Bedingung |

**Neu in Hotspots:** `sprühen: <spot-id>`.
**Neue Bedingungen:** `has: <item>`, `sprayed: <spot>`.
**Neuer Effekt:** `give: <item>`.
**Neue Aktionen:** `TRAVEL`, `SPRAY`. Sprühen öffnen über `INTERACT` mit Verb `sprühen` (Ereignis `SPRAY_OPEN`).

## 4. Akzeptanzkriterien M3

- [ ] **F3.1** Karte über das HUD erreichbar; zeigt alle bekannten Orte; Tippen reist dorthin; unbekannte Orte sind nicht wählbar.
- [ ] **F3.2** Fünf Spots mit Typ, passenden Styles und Risiko; jeder erscheint erst mit der passenden Info.
- [ ] **F4.1** Sprühen mit Style, Cap und Dose; Qualität nach Regel aus 2; Piece ohne Skinny Cap nicht wählbar, mit Begründung.
- [ ] **F4.2** Das Werk ist danach am Spot sichtbar (Writer-Name, Qualität) und auf der Karte markiert; es bleibt nach dem Neuladen.
- [ ] **F4.3** Alle Bezeichnungen wie im Glossar.
- [ ] **F8.1 / F1.4** Tasche zeigt Caps und Dosen; Gespräche geben Material; Sprühen bietet nur, was man hat.
- [ ] Alte Spielstände (v1) laden ohne Verlust.
- [ ] Automatischer Durchlauf: Alles Material ist erreichbar, an jedem Spot ist Qualität 3 möglich.
