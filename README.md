# TOY TO KING

Retro-Adventure mit Aufbau-Elementen über Graffiti-Kultur – als Webapp fürs Handy im Querformat.

Konzept, Spezifikation und Aufgaben stehen in `docs/`, die Regeln für die Arbeit mit Claude Code in `CLAUDE.md`.

## Loslegen

```
npm install
npm run dev          # http://localhost:3000 – prüft vorher die Inhalte
npm test             # Tests
npm run lint         # Code-Regeln
npm run typecheck    # Typprüfung
npm run content:check
```

Debug-Ansicht: `?debug=1` an die Adresse hängen (Spielstand, Hotspot-Umrisse, Schriftwahl, Spielstand löschen).

## Aufbau

| Ordner        | Inhalt                                                    |
| ------------- | --------------------------------------------------------- |
| `content/`    | Spielinhalte als YAML – Quelle ist `docs/CONTENT.md`      |
| `scripts/`    | Prüfung der Inhalte, erzeugt `src/generated/content.json` |
| `src/engine/` | Spiellogik, reines TypeScript, vollständig getestet       |
| `src/save/`   | Speichern (heute Browser, später Server)                  |
| `src/ui/`     | Oberfläche                                                |
| `tests/`      | Tests                                                     |

## Deployment

GitHub-Repo mit Vercel verbunden: jeder Push auf `main` geht in Produktion, jeder andere Branch bekommt eine Preview-URL. Der Tester bekommt nur die Produktions-URL.
