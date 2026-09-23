# CLAUDE.md – TOY TO KING

## Projekt

Retro-Adventure mit Aufbau-Elementen über Graffiti-Kultur, als Webapp für das Handy im Querformat. Der Spieler wählt seinen Writer-Namen und später seinen Crew-Namen selbst.

Rollen: **Product Owner** (Priorisierung, Abnahme, Issues), **Claude** (Code und Spielinhalte), **Tester** (spielt die Produktions-URL, meldet Bugs und alles, was unecht klingt). Die Beteiligten sind nicht alle Entwickler – Erklärungen müssen auch ohne Programmierkenntnisse verständlich sein.

## Maßgebliche Dokumente

- `docs/SPEC.md` – technische Spezifikation M1/M2, `docs/SPEC-M3.md` – Ergänzungen für M3, `docs/SPEC-M3.5.md` – Sprühen 2.0, `docs/SPEC-M4a.md` – Aufstieg, `docs/SPEC-GRAFIK.md` – Raumbilder. Bei Widersprüchen gilt die jeweils neuere SPEC.
- `docs/MEILENSTEINE.md` – aktueller Meilenstein und Aufgaben.
- `docs/GLOSSAR.md` – verbindliche Begriffe und Tonalität.
- `docs/CONTENT.md` – die Spielinhalte, Quelle für `content/`.

## Regeln

1. **Nur den aktuellen Meilenstein bauen.** Keine Features vorwegnehmen – kein XP, Heat, Karte oder Sprühen, bevor der Meilenstein es verlangt.
2. **Inhalte nur im Auftrag.** Spielinhalte werden ausschließlich in Aufgaben geschrieben oder geändert, die das ausdrücklich verlangen – nach Glossar und Leitfaden. Beim Übertragen aus `docs/CONTENT.md` wörtlich bleiben. Tester-Feedback ist die Referenz für Authentizität: Widerspricht es dem Glossar, gilt das Feedback, und das Glossar wird angepasst.
3. **Das Glossar ist verbindlich.** Begriffe, die dort stehen, nie „korrigieren".
4. **Keine festen Spielernamen.** Der Spieler wird in Texten nur über `{name}` (Writer-Name) und `{crew}` (Crew-Name) angesprochen.
5. `src/engine/` ist reines TypeScript ohne React, Next oder Browser-APIs. Jede Engine-Änderung braucht Tests.
6. `localStorage` nur in `src/save/`.
7. Inhalte nur über `content/*.yaml`. `src/generated/` nie von Hand ändern.
8. Keine neuen Abhängigkeiten ohne kurze Begründung im Commit.
9. Mobile first: Querformat, Bühne 320×180.
10. Code und Bezeichner auf Englisch. Kommentare, UI-Texte und Fehlermeldungen auf Deutsch.
11. Kleine Commits (Conventional Commits), ein Branch pro Aufgabe.
12. **Nach jeder Aufgabe** eine kurze Zusammenfassung in einfacher Sprache: was gemacht wurde, warum, und wie man es ausprobiert.

## Befehle

```
npm run dev            # lokal starten
npm run art            # Raumbilder neu erzeugen
npm run build          # Produktionsbuild (prüft vorher den Content)
npm test               # Tests
npm run lint           # Code-Regeln
npm run content:check  # nur die Inhalte prüfen
```
