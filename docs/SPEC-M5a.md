# SPEC – TOY TO KING, Meilenstein M5a „Material und Geld"

**Stand 23.09.2026:** umgesetzt auf Branch `m5a` (175 Tests grün, Build grün). Offen ist der Test auf echten Handys. Bezug: `backlog.md` (F8.1–F8.3, F8.5, F8.6, F1.4), `SPEC-M4b.md`
(gilt weiter), Tester-Feedback („zu Beginn die Tags mit Markern").

## 1. Ziel

**Spielbar am Ende:** Farbe ist endlich. Jedes Werk kostet Dosen, und Dosen kosten Geld. Geld gibt es
einmal die Woche und sonst nur, wenn man sich eins verdient. Tags macht man mit dem **Marker**, nicht
mit der Dose – und weil ein Marker auf rauem Backstein nichts wird, erschließt er dafür neue kleine
Flächen: Laternenmast, Stromkasten, Waggontür, Zaun.

**Warum:** Nach M4b kostet Sprühen Zeit und Risiko, aber nichts Materielles. Man kann unbegrenzt
malen. Damit fehlt die Entscheidung, die den Aufbau-Teil des Spiels überhaupt erst ausmacht: *Wofür
gebe ich das Wenige aus, das ich habe?* Und der Einstieg ist falsch herum – ein Toy fängt mit einem
Marker an, nicht mit einer Dose.

## 2. Zuschnitt: was in M5a ist und was nicht

M5 im Backlog ist größer als M4a und M4b zusammen. Geteilt wird an der Naht der Sache selbst:
**M5a sind die Dinge, M5b sind die Leute.**

| In M5a | In M5b |
|--------|--------|
| Geld, Taschengeld, Preise | Crew gründen, rekrutieren, anleiten |
| Kaufen bei KINGSIZE | Der Jam an der Hall (F3.8) |
| Farbe wird verbraucht | YARE, TEAR und CRES (F6.6) |
| Marker (F8.5) und Marker-Spots (F8.6) | Dönerladen und Hakan (F3.7, F2.9) |
| Sibel verkauft dir ab Wanted 2 nicht mehr alles | Fluchtszene (F7.5) |

**Der Dönerladen wandert bewusst nach M5b.** Sein Wert ist, dass man dort Leute trifft – und die Leute
kommen erst in M5b. In M5a wäre er ein neues Bild mit einem NPC ohne Funktion. Stattdessen gilt, was
im Backlog steht: erst die sieben vorhandenen Räume dichter machen. M5a kommt **ohne ein einziges neues
Raumbild** aus; die Marker-Spots sitzen auf Dingen, die längst gemalt sind.

## 3. Designentscheidungen

| Thema | Entscheidung | Begründung |
|-------|--------------|------------|
| Was kostet | Nur **Farbe** wird verbraucht: ein Werk kostet je benutzter Farbe eine Dose. Caps, Marker und Druckstufen sind Werkzeug und bleiben. | Legt man ein Werk vor sich hin, kann man abzählen, was es gekostet hat. Werkzeug, das sich verbraucht, wäre nur Buchhaltung. |
| Geld | Taschengeld: **samstags**, fester Betrag. Dazu ein einmaliger Schein von Kalle ab Vertrauen 3. | Nutzt den Wochentag aus M4b. Und es ist die ehrliche Antwort darauf, woher ein Jugendlicher Geld hat. |
| Preise | Stehen am Gegenstand (`price` in `items.yaml`). Schwarz und Chrom sind billig, die bunten Farben teuer. | Das ist auch in echt so – und es erklärt, warum die halbe Stadt in Schwarz und Chrom gemalt ist. |
| Kaufen | Eigener Bildschirm bei Sibel, erreichbar über „Sprechen". Kein Feilschen, keine Mengenrabatte. | Am Handy muss das in drei Fingertipps gehen. |
| Wanted | Ab Wanted 2 verkauft Sibel nur noch Schwarz, Chrom und Caps – nichts, womit man auffällt. | Schließt F7.2 („Material schwerer zu bekommen") ab und macht das Wanted-Level endlich teuer statt nur unangenehm. |
| Marker als Werkzeug | Ein Marker ist **Dose und Cap in einem**: Er hat eine Breite wie ein Cap und einen Fluss wie eine Dose. Im Sketch wählt man statt Dose und Cap einfach den Marker. | Ändert nichts an der Sprüh-Mechanik und an den gespeicherten Werken – nur an der Auswahl. |
| Die drei Marker | **T-Tip** (Keilspitze, schmal, sauber, tropft nicht), **Dripper** (breit, nass, tropft stark), **Wachsmarker** (dick, trocken, tropft nie, hält den Buff aus) | Vom Tester genannt. Jeder hat einen echten Vor- und Nachteil, keiner ist nur „besser". |
| Tag nur mit Marker | Der Tag-Style braucht einen Marker. Kalle gibt einem gleich im ersten Gespräch einen T-Tip. | Der Wunsch des Testers. Und der Einstieg wird leichter: kein Overspray, keine Reichweite, keine Tropfen. |
| Marker-Spots | Vier neue kleine Spots auf glatten Flächen, auf denen **nur** der Marker geht: Laternenmast, Stromkasten, Waggontür, Zaun. Wenig XP, wenig Risiko, kostet keine Farbe. | Macht die vorhandenen Räume dichter, ohne ein neues Bild. Und gibt dem frühen Spiel etwas zu tun, das nichts kostet. |
| Buff | Auf glatten Flächen hält ein Marker-Tag kürzer als ein Piece – außer beim Wachsmarker. | Gibt dem teuersten Marker einen Grund. |

## 4. Werte (Startwerte, in `content/economy.yaml` und `items.yaml`)

**Geld:** Start 8 €. Taschengeld samstags 10 €. Kalle ab Vertrauen 3 einmalig 15 €.

**Preise:** Schwarz 2 €, Chrom 2 €, Weiß 3 €, Rot/Gelb/Hellblau je 4 €. Skinny Cap 1 €, Fat Cap 1 €,
NY Fat 2 €. Low Pressure 3 €, High Pressure 3 €. T-Tip 4 €, Dripper 6 €, Wachsmarker 9 €.

**Marker:** T-Tip Breite 1, Fluss 5. Dripper Breite 3, Fluss 12. Wachsmarker Breite 4, Fluss 7.

**Marker-Spots:** Style-Wert wie ein Tag (10 XP), Spot-Faktor 0,8, Risiko-Grundwert 10 %.

## 5. Technik

- **Spielstand v6:** `money`. Migration v5 → v6 setzt das Startgeld und legt einen T-Tip in die Tasche,
  damit niemand nach dem Update ohne Marker dasteht.
- **Neue Bedingung:** `money_min`. **Neuer Effekt:** `money: ±n`.
- **Neue Aktion:** `BUY {item}`. **Neue Ereignisse:** `BOUGHT`, `MONEY_CHANGED`, `ALLOWANCE`.
- **Gegenstände:** neues `kind: marker` mit `width`, `flow`. `price` an allen käuflichen Gegenständen.
- **Spots:** neues Feld `tool: can | marker` (Standard `can`). Styles bekommen dasselbe Feld.
- **Verbrauch:** beim Sprühen wird je benutzter Farbe eine abgezogen. Wer eine Farbe nicht mehr hat,
  kann sie im Sketch nicht wählen.

## 6. Akzeptanzkriterien

- [x] Im HUD steht das Geld. In der Tasche stehen Preise und Bestände.
- [x] Bei Sibel kann man kaufen; ab Wanted 2 nur noch das Unauffällige.
- [x] Ein Werk zieht je benutzter Farbe eine Dose ab. Ohne Farbe kein Werk.
- [x] Samstags gibt es Taschengeld, sichtbar als Meldung.
- [x] Tags gehen nur mit Marker. Kalle gibt den ersten, alte Spielstände bekommen ihn bei der Migration.
- [x] Die drei Marker verhalten sich unterschiedlich (Breite und Fluss wirken auf die Qualität).
- [x] Vier Marker-Spots sind da und gehen nur mit Marker.
- [x] Der Durchlauf-Test belegt: Mit dem verdienten Geld bleibt King erreichbar, und man kann sich
      nicht festspielen (ohne Farbe geht immer noch der Marker).

## 7. Offene Fragen an den Tester

- Stimmen die Preise, oder ist Farbe zu billig?
- Reicht Taschengeld einmal die Woche, oder ist das zu zäh?
- Fehlt ein Weg, sich Geld zu verdienen?

## 8. Abweichungen bei der Umsetzung

| Thema | Umsetzung | Grund |
|-------|-----------|-------|
| Marker als Farbe | Ein Marker hat eine eigene Farbe (T-Tip und Dripper schwarz, Wachsmarker weiß). Im Sketch wählt man **nur** den Marker – keine Farbe, keine Dose, kein Cap. | Ein Marker ist in echt auch alles in einem. Und es macht den Einstieg auf drei Fingertipps kurz. |
| Werkzeug wird nie einkassiert | Wer erwischt wird, verliert nur Farbe. Marker, Caps und Druckstufen bleiben. | Sonst stünde ein Toy ohne Marker da und könnte gar nicht mehr malen, bis Samstag Taschengeld kommt. Das wäre kein Risiko, das wäre eine Sackgasse. |
| Kaufen | Eigenes Verb „Kaufen" am Hotspot, wie „Sprechen". Kein Dialog-Umweg. | Zwei Fingertipps statt vier. |
| Marker-Spots | Vier Stück, alle an vorhandenen Hotspots: Laternenmast, Stromkasten, Waggontür, Zaunschild. Der Zaun-Hotspot kann jetzt beides – durchgehen und antaggen. | Kein einziges neues Raumbild, wie im Backlog festgehalten. |
| Toy-Text | „Du hast eine Dose und einen Namen" heißt jetzt „Du hast einen Marker und einen Namen". | Stimmte sonst nicht mehr. |

## 9. Was der Tester wissen muss

Farbe ist jetzt endlich. Ein Werk kostet je benutzter Farbe eine Dose – ein Piece mit vier Farben kostet
also vier. Nachschub gibt es nur bei KINGSIZE, und Geld gibt es samstags. Die vier Marker-Spots kosten
nichts und sind fast ohne Risiko: Wer pleite ist, taggt sich zurück ins Spiel.
