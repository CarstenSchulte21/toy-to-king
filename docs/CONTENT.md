# CONTENT – Spielinhalte M1 bis M4a

**Status:** Inhalte von Claude geschrieben, nach `GLOSSAR.md` und Tonalitäts-Leitfaden. Sie gelten als Entwurf, bis der Tester sie gespielt hat. Überarbeitet wird ausschließlich auf Basis von Tester-Feedback (siehe `MEILENSTEINE.md`, Feedback-Schleife).

**Der Spieler hat keinen festen Namen.** Er wählt beim Start seinen Writer-Namen, in M5 seinen Crew-Namen. In Texten steht dafür `{name}` bzw. `{crew}` – sparsam eingesetzt.

**Festgelegt, bis der Tester widerspricht:** Standardbegriff „Writer". Keine Markennamen, nur echte Kategorien (Low/High Pressure, Cap-Typen). Polizei heißt „Streife". Vertrauensstufen siehe `config.yaml` unten.

Alle Koordinaten (`rect`) sind Platzhalter, bis es echte Grafik gibt.

---

## 1. config.yaml

```yaml
start_room: hinterhof

trust_labels:
  - Fremder
  - Gesehen
  - Bekannt
  - Respekt
  - Vertraut
  - Family

categories:
  spot: Spots
  risiko: Risiko
  crews: Crews
  material: Material
  szene: Szene

empty_category_text: "Noch nichts. Rede mit Leuten."

start_items:
  standard_cap: 1
  low_pressure: 1
  farbe_schwarz: 1
  farbe_chrom: 1
```

---

## 2. Rooms

### 2.1 Hinterhof (M1)

In M1 ohne Gespräch, ohne Ausgang und ohne Info-Bedingungen – die kennt die Engine erst ab M2. Die Ergänzungen für M2 stehen in Abschnitt 4.5.

```yaml
id: hinterhof
name: Hinterhof
background: hinterhof.png
description: "Hinterhof. Hier hat alles angefangen: drei Mülltonnen und ein Edding."
hotspots:
  - id: muelltonnen
    label: Mülltonnen
    rect: [20, 110, 70, 50]
    untersuchen:
      - "Drei Tonnen, alle mit deinem Tag drauf."
      - "Von links nach rechts wird der Handstyle besser. Die erste Tonne will keiner mehr sehen."

  - id: rolltor
    label: Garagentor
    rect: [110, 60, 90, 90]
    untersuchen:
      - if: [{fact: buff_montag}]
        text: "Grau. Wie alles hier nach einem Montag."
      - text:
          - "Garagentor. Früher war hier ein Piece, jetzt ist da ein grauer Fleck."
          - "Durch den Buff sieht man noch die Umrisse der Buchstaben. Das war mal ein Burner."

  - id: feuerleiter
    label: Feuerleiter
    rect: [215, 20, 30, 120]
    untersuchen:
      - "Die Feuerleiter endet zwei Meter über dem Boden."
      - "Oben, direkt unterm Dach, ist die Wand komplett frei. Noch."

  - id: stromkasten
    label: Stromkasten
    rect: [255, 100, 30, 45]
    untersuchen:
      - "Stromkasten voller Sticker. Ein paar Namen kennst du. Die meisten nicht."
      - "Einer taucht überall auf: KRUX. Sauberer Handstyle, das muss man ihm lassen."

  - id: kalle
    label: Mann auf der Kiste
    rect: [150, 105, 30, 55]
    untersuchen:
      - "Ein älterer Typ auf einer Getränkekiste. Blackbook auf dem Knie, Kaffee daneben."
      - "Er zeichnet, ohne aufzusehen."
    sprechen: mentor

  - id: durchgang
    label: Durchgang
    rect: [295, 60, 25, 100]
    untersuchen: "Der Durchgang zur Straße."
    gehen: strasse
```

### 2.2 Straße (M2)

```yaml
id: strasse
name: Straße
background: strasse.png
description: "Die Ladenzeile. Kiosk, Handyladen, der Graffitistore. Und eine Streife, die hier öfter steht als der Bus."
hotspots:
  - id: rolltore
    label: Rolltore
    rect: [40, 60, 90, 80]
    sprühen: rolltore
    untersuchen:
      - if: [{sprayed: rolltore}]
        text: "Zwischen all den Tags: deiner. Mal sehen, wie lange er hält."
      - if: [{fact: buff_montag}]
        text: "Alle drei Rolltore frisch grau. Montag war Buff-Tag."
      - text:
          - "Drei Rolltore, alle voll mit Tags."
          - "Dazwischen graue Flecken. Irgendwer räumt hier regelmäßig auf."

  - id: laterne
    label: Laternenmast
    rect: [140, 20, 16, 130]
    untersuchen: "Sticker über Sticker. KRUX klebt ganz oben. Wie ist er da hochgekommen?"

  - id: kamera
    label: Kamera
    rect: [200, 28, 20, 16]
    if: [{fact: kamera}]
    untersuchen: "Die neue Kamera über dem Graffitistore. Sie zeigt genau auf die Rolltore."

  - id: brandt
    label: Polizistin
    rect: [240, 90, 30, 70]
    untersuchen: "Eine Polizistin lehnt am Streifenwagen und trinkt Kaffee aus einem Pappbecher."
    sprechen: streife

  - id: zum_hinterhof
    label: Hinterhof
    rect: [0, 60, 20, 100]
    gehen: hinterhof

  - id: zum_laden
    label: Graffitistore
    rect: [180, 50, 50, 90]
    gehen: farbenladen

  - id: zur_unterfuehrung
    label: Unterführung
    rect: [290, 70, 30, 90]
    gehen: unterfuehrung
```

### 2.3 Graffitistore (M2)

```yaml
id: farbenladen
name: Graffitistore
background: farbenladen.png
description: "Regale bis unter die Decke, Dosen nach Farben sortiert. Riecht nach Lack."
hotspots:
  - id: regal_low
    label: Regal Low Pressure
    rect: [10, 20, 80, 120]
    untersuchen: "Low Pressure. Dutzende Farbtöne, jeder mit eigenem Namen."

  - id: regal_high
    label: Regal High Pressure
    rect: [95, 20, 60, 120]
    untersuchen: "High Pressure. Weniger Farben, mehr Druck. Das Regal fürs Bombing."

  - id: capkiste
    label: Cap-Kiste
    rect: [170, 110, 40, 25]
    untersuchen:
      - "Eine Kiste voller Caps, sortiert in kleine Fächer: Skinny, Soft, Fat, NY Fat."
      - "Daneben ein Zettel: Nicht einfach mitnehmen. Fragen."

  - id: pinnwand
    label: Pinnwand
    rect: [220, 25, 50, 50]
    untersuchen:
      - "Ein Flyer für eine Jam im Jugendzentrum. Das Datum ist schon vorbei."
      - "Darunter, halb verdeckt: Legale Wand – Anmeldung im Jugendzentrum."

  - id: sibel
    label: Frau an der Theke
    rect: [240, 85, 35, 70]
    untersuchen: "Hinter der Theke sortiert eine Frau Caps. Sie sieht kurz hoch und nickt."
    sprechen: laden

  - id: raus
    label: Zur Straße
    rect: [290, 60, 30, 100]
    gehen: strasse
```

### 2.4 Unterführung (M2)

```yaml
id: unterfuehrung
name: Unterführung
background: unterfuehrung.png
description: "Jeder Zentimeter bemalt, bis unter die Decke. Das Licht flackert."
hotspots:
  - id: tagwand
    label: Wand voller Tags
    rect: [20, 30, 65, 110]
    untersuchen:
      - "Tags über Tags über Tags. Einige kennst du von den Stickern."
      - "Hier malt nur, wer was kann."

  - id: krux_piece
    label: Großes Piece
    rect: [90, 30, 120, 90]
    untersuchen:
      - "Ein Piece über die halbe Wand. Wildstyle, sauberes Fill-in, harte Outline."
      - "Unten rechts: KRUX. Da malt keiner drüber."

  - id: linke_wand
    label: Linke Wand
    rect: [0, 40, 16, 100]
    sprühen: linke_wand
    untersuchen:
      - if: [{sprayed: linke_wand}]
        text: "Dein Werk, direkt neben KRUX. Jetzt muss es sich halten."
      - if: [{fact: krux_frage}]
        text: "Die linke Wand. Mit KRUX' Okay. Jetzt fehlt nur noch Farbe."
      - text: "Die linke Wand ist fast leer. Seltsam, bei so viel Platz."

  - id: krux
    label: Typ mit Kapuze
    rect: [215, 85, 30, 75]
    untersuchen: "Ein Typ mit Kapuze lehnt an der Wand und scrollt auf dem Handy. Er hat dich längst gesehen."
    sprechen: rivale

  - id: zaunloch
    label: Aufgebogener Zaun
    rect: [266, 90, 35, 60]
    if: [{fact: zaun}]
    untersuchen:
      - "Der Zaun ist unten aufgebogen, gerade breit genug."
      - "Dahinter Schotter, Gleise, abgestellte Waggons."
    gehen: abstellgleis

  - id: raus
    label: Zur Straße
    rect: [304, 50, 16, 110]
    gehen: strasse
```

---

## 3. facts.yaml

```yaml
- id: hall
  category: spot
  title: Hall hinterm Jugendzentrum
  text: "Legale Wand. Man hat Zeit und keinen Stress."
  source: mentor

- id: buff_montag
  category: risiko
  title: Buff-Tag Montag
  text: "Die Stadt bufft die Rolltore in der Ladenzeile jeden Montag."
  source: mentor

- id: krux
  category: crews
  title: KRUX' Unterführung
  text: "Die Unterführung ist KRUX' Spot. Wer ohne zu fragen malt, wird gecrosst."
  source: mentor

- id: zaun
  category: spot
  title: Loch im Zaun
  text: "Hinten rechts in der Unterführung ist der Zaun aufgebogen. Dahinter: das Abstellgleis."
  source: mentor

- id: caps
  category: material
  title: Welcher Cap wofür
  text: "Skinny für Outlines, Fat für Fill-ins, NY Fat, wenn's schnell gehen muss."
  source: laden

- id: druck
  category: material
  title: Low oder High Pressure
  text: "Low Pressure verzeiht mehr. High Pressure deckt schneller, tropft aber leichter."
  source: laden

- id: kamera
  category: risiko
  title: Kamera am Laden
  text: "Über dem Graffitistore hängt seit letzter Woche eine Kamera. Sie zeigt auf die Rolltore."
  source: laden

- id: krux_kauft_nicht
  category: crews
  title: KRUX kauft woanders
  text: "KRUX kauft seit Monaten nicht mehr bei Sibel. Keiner weiß, woher er seine Farbe hat."
  source: laden

- id: krux_frage
  category: spot
  title: Linke Wand
  text: "KRUX lässt dich an die linke Wand der Unterführung. Wenn's schlecht aussieht, malt er drüber."
  source: rivale

- id: bruecke
  category: spot
  title: Die Eisenbahnbrücke
  text: "Auf der Eisenbahnbrücke war seit Jahren keiner. Heaven Spot."
  source: rivale

- id: streife_zwei
  category: risiko
  title: Streife um zwei
  text: "Die Streife fährt nachts gegen zwei durch die Unterführung."
  source: streife
```

**Wissen als Schlüssel (F2.8):**

| Info | Schaltet frei |
|------|---------------|
| `zaun` (Kalle) | Hotspot „Aufgebogener Zaun" in der Unterführung |
| `kamera` (Sibel) | Hotspot „Kamera" auf der Straße |
| `krux` (Kalle) | Bei KRUX die Option, vorher zu fragen → Vertrauen, `krux_frage` |
| `streife_zwei` (Brandt) | Bei KRUX eine zweite Option → Vertrauen |
| `krux_kauft_nicht` (Sibel) | Bei KRUX eine Nachfrage (ohne Vertrauenseffekt) |
| `buff_montag`, `krux_frage` | Andere Untersuchen-Texte |

Die Infos greifen ineinander: Um bei KRUX auf Vertrauen 2 zu kommen, braucht man Wissen von Kalle und entweder von Frau Brandt oder ein Auge fürs Handwerk.

---

## 4. Dialoge

### 4.1 Kalle – Mentor

Um die vierzig, hat früher die Line gemalt, malt heute legal an der Hall. Ruhig, knapp, trocken.
Vertrauen: +1 für Ehrlichkeit über die eigenen Tags (beim ersten Treffen oder später per Frage), +1 fürs Zeigen des Blackbooks. Ab 2 verrät er den Zaun.

```yaml
id: mentor
name: Kalle
role: Mentor
room: hinterhof
hotspot: kalle
trust:
  start: 0

dialogue:
  start:
    - if: [{flag: kalle_kennt_dich}]
      node: wieder_da
    - node: erstes_mal

  nodes:
    erstes_mal:
      text:
        - "{name}. Du bist das also mit den Tags an den Mülltonnen."
        - "Handstyle wackelt noch. Aber du bleibst dran, das seh ich."
      effects:
        - set_flag: kalle_kennt_dich
      options:
        - text: "Und wer bist du?"
          next: wer_bist_du
        - text: "Ich weiß, dass die noch nicht gut sind."
          if: [{not_flag: kalle_ehrlich}]
          effects:
            - trust: 1
          next: ehrlich
        - text: "Muss los."
          end: true

    ehrlich:
      text: "Gut. Wer das weiß, wird besser. Wer's nicht weiß, bleibt Toy."
      effects:
        - set_flag: kalle_ehrlich
      next: hub

    besser_machen:
      text:
        - "Erst mal: weniger Tonnen, mehr Blackbook."
        - "Hundert Mal auf Papier, bevor du einmal an die Wand gehst."
      effects:
        - set_flag: kalle_ehrlich
      next: hub

    wer_bist_du:
      text:
        - "Hab früher die Line hier gemalt. Lange her."
        - "Heute male ich an der Hall hinterm Jugendzentrum. Legal, in Ruhe, mit Kaffee."
      effects:
        - learn: hall
      options:
        - text: "Warum nicht mehr an der Line?"
          next: warum_nicht_mehr
        - text: "Kann ich dich was fragen?"
          next: hub

    warum_nicht_mehr:
      text:
        - "Irgendwann kennst du jede Streife beim Vornamen."
        - "Und die kennen deinen Tag."
      next: hub

    wieder_da:
      text: "Na. Wieder da."
      next: hub

    hub:
      text: "Was willst du wissen?"
      options:
        - text: "Wo kann ich hier malen?"
          next: spots
        - text: "Was ist mit der Unterführung?"
          if: [{not_fact: krux}]
          next: unterfuehrung
        - text: "Was muss ich an meinen Tags besser machen?"
          if: [{not_flag: kalle_ehrlich}]
          effects:
            - trust: 1
          next: besser_machen
        - text: "Guck mal in mein Blackbook."
          id: blackbook_zeigen
          once: true
          effects:
            - trust: 1
          next: blackbook
        - text: "Wie komm ich an bessere Spots?"
          if: [{trust_min: 2}]
          show_locked: "Dafür kennt Kalle dich noch nicht gut genug."
          next: zaun
        - text: "Guck mal, wie weit ich bin."
          id: rang_tagger
          once: true
          if: [{rank_min: tagger}]
          next: rang_tagger
        - text: "Hast du gesehen, was im Bezirk hängt?"
          id: rang_bomber
          once: true
          if: [{rank_min: bomber}]
          next: rang_bomber
        - text: "Ich war an der Hall."
          id: rang_piece
          once: true
          if: [{rank_min: piece_writer}]
          next: rang_piece
        - text: "Ich bin raus."
          end: true

    spots:
      text:
        - "Die Rolltore in der Ladenzeile gehen. Aber die Stadt bufft da jeden Montag."
        - "Was du am Wochenende machst, ist am Dienstag weg."
      effects:
        - learn: buff_montag
      next: hub

    unterfuehrung:
      text:
        - "Die Unterführung ist KRUX' Spot."
        - "Wer da ohne zu fragen malt, wird gecrosst. Ohne Ausnahme."
      effects:
        - learn: krux
      next: hub

    blackbook:
      text:
        - "Zeig her."
        - "Deine Buchstaben stehen zu eng. Gib ihnen Luft, dann liest man das auch von drüben."
        - "Die Connection hier ist gut. Bleib dabei."
        - "Und nimm den Fat Cap. Deine Fill-ins brauchen das."
      effects:
        - give: fat_cap
      next: hub

    zaun:
      text:
        - "Hinten in der Unterführung, rechts, ist der Zaun aufgebogen."
        - "Dahinter stehen nachts die Züge. Da gehst du erst hin, wenn du weißt, was du tust."
      effects:
        - learn: zaun
      next: hub

    rang_tagger:
      text:
        - "Hab dein Tag an den Rolltoren gesehen. Sitzt sauber."
        - "Jetzt mach es größer. Ein Tag ist eine Unterschrift, kein Bild."
      effects:
        - trust: 1
      next: hub

    rang_bomber:
      text:
        - "Halbe Straße voll, ja. Dein Name steht öfter da als meiner."
        - "Pass trotzdem auf, wo du malst. Nicht jede Wand verzeiht das."
      next: hub

    rang_piece:
      text:
        - "Ich weiß. Steht gut da."
        - "An der Hall hast du Zeit. Nutz sie für die Details, nicht für mehr Fläche."
      effects:
        - trust: 1
      next: hub
```

### 4.2 Sibel – Graffitistore

Führt den Graffitistore. Sachlich-freundlich, Materialnerd, kennt die Kaufgewohnheiten jedes Writers in der Gegend.
Vertrauen: +1 für die erste echte Materialfrage, +1, wenn man sich mit ihr über die Kamera ärgert. −1 für die Frage nach Klauen. Ab 2 redet sie über Kunden.

```yaml
id: laden
name: Sibel
role: Graffitistore
room: farbenladen
hotspot: sibel
trust:
  start: 0

dialogue:
  start:
    - if: [{flag: sibel_kennt_dich}]
      node: wieder_da
    - node: erstes_mal

  nodes:
    erstes_mal:
      text: "Hi. Suchst du was Bestimmtes, oder guckst du nur?"
      effects:
        - set_flag: sibel_kennt_dich
      options:
        - text: "Ich brauch was für saubere Outlines."
          effects:
            - trust: 1
          next: caps
        - text: "Was ist das Billigste, was du hast?"
          next: billig
        - text: "Nur gucken."
          next: nur_gucken

    nur_gucken:
      text: "Klar. Wenn du Fragen hast, ich bin hier."
      end: true

    billig:
      text:
        - "Billig ist hier gar nichts."
        - "Aber Low Pressure ist für den Anfang eh besser. Verzeiht mehr."
      effects:
        - learn: druck
      next: hub

    wieder_da:
      text: "Na, {name}. Was brauchst du?"
      next: hub

    hub:
      text: "Sonst noch was?"
      options:
        - text: "Welcher Cap wofür?"
          if: [{not_fact: caps}]
          effects:
            - trust: 1
          next: caps
        - text: "Low oder High Pressure – was ist der Unterschied?"
          if: [{not_fact: druck}]
          next: druck
        - text: "Viel Ärger hier in letzter Zeit?"
          id: aerger
          once: true
          next: kamera_thema
        - text: "Kann ich hier was mitgehen lassen?"
          id: klauen
          once: true
          next: klauen
        - text: "Wer kauft hier eigentlich so?"
          if: [{trust_min: 2}]
          show_locked: "Über Kunden redet Sibel nicht mit jedem."
          next: kunden
        - text: "Hast du Farben für mich?"
          id: farben
          once: true
          next: farben
        - text: "Ich brauch noch mehr Farben."
          id: mehr_farben
          once: true
          if: [{trust_min: 2}]
          show_locked: "Mehr Farben rückt Sibel nicht einfach so raus."
          next: mehr_farben
        - text: "Danke, bis dann."
          end: true

    caps:
      text:
        - "Für saubere Outlines Skinny Cap. Für Fill-ins Fat Cap."
        - "NY Fat nur, wenn's schnell gehen muss. Damit malst du keine Details."
        - "Hier, nimm einen Skinny mit. Geht aufs Haus."
      effects:
        - learn: caps
        - give: skinny_cap
      next: hub

    druck:
      text:
        - "Low Pressure ist langsamer und kontrollierter. Gut für Details und für den Anfang."
        - "High Pressure deckt schneller, tropft aber auch schneller. Das ist was fürs Bombing."
      effects:
        - learn: druck
      next: hub

    kamera_thema:
      text:
        - "Seit letzter Woche hängt eine Kamera über der Tür. Hat der Vermieter angebracht."
        - "Die zeigt nicht auf meinen Laden. Die zeigt auf die Rolltore."
      effects:
        - learn: kamera
      options:
        - text: "Nervt bestimmt."
          next: kamera_nervt
        - text: "Nimmt die auch nachts auf?"
          next: kamera_frage

    kamera_nervt:
      text:
        - "Und wie. Die Hälfte meiner Kunden kommt jetzt lieber hinten rum."
        - "Hier, die High Pressure ist verbeult. Verkaufen kann ich die eh nicht mehr."
      effects:
        - trust: 1
        - give: high_pressure
      next: hub

    kamera_frage:
      text: "Frag ich mich auch. Aber das willst du nicht ausgerechnet von mir wissen, oder?"
      next: hub

    klauen:
      text:
        - "Nein."
        - "Und frag das hier besser nicht noch mal."
      effects:
        - trust: -1
      next: hub

    kunden:
      text:
        - "Die meisten kommen einmal die Woche. Manche jeden Tag."
        - "KRUX kam früher auch. Seit Monaten nicht mehr. Keiner weiß, woher er seine Farbe hat."
      effects:
        - learn: krux_kauft_nicht
      next: hub

    farben:
      text:
        - "Rot und Weiß. Die sind aus der Restekiste, aber voll."
        - "Mit Chrom und Schwarz hast du dann schon was zum Arbeiten."
      effects:
        - give: farbe_rot
        - give: farbe_weiss
      next: hub

    mehr_farben:
      text:
        - "Gelb und Hellblau. Beim Gelb klemmt das Ventil, den Cap also fest draufdrücken."
      effects:
        - give: farbe_gelb
        - give: farbe_hellblau
      next: hub
```

### 4.3 KRUX – Rivale

Um die siebzehn, die Unterführung ist sein Spot. Spöttisch, kurz, testet jeden Neuen. Lob lässt ihn kalt, Wissen und Respekt nicht.
Vertrauen: +1 fürs Fragen vor dem Malen (braucht `krux`), +1 für einen genauen Blick auf sein Handwerk oder für Wissen über die Streife (braucht `streife_zwei`). −1 für Angeberei. Ab 2 verrät er die Brücke.
**Höchstes Cringe-Risiko im ganzen Spiel** – beim Playtest besonders auf ihn achten.

```yaml
id: rivale
name: KRUX
role: Rivale
room: unterfuehrung
hotspot: krux
trust:
  start: 0

dialogue:
  start:
    - if: [{flag: krux_kennt_dich}]
      node: wieder_da
    - node: erstes_mal

  nodes:
    erstes_mal:
      text:
        - "Hm."
        - "Der mit den Mülltonnen. Süß."
      effects:
        - set_flag: krux_kennt_dich
      next: hub

    wieder_da:
      text: "{name}. Schon wieder."
      next: hub

    hub:
      text: "Was?"
      options:
        - text: "Ich wollte fragen, bevor ich hier male."
          if: [{fact: krux}, {not_fact: krux_frage}]
          effects:
            - trust: 1
          next: fragen
        - text: "Die Outline an deinem Piece – in einem Zug gezogen?"
          id: outline
          once: true
          effects:
            - trust: 1
          next: outline
        - text: "Du weißt, dass die Streife um zwei hier durchfährt?"
          if: [{fact: streife_zwei}]
          id: streife
          once: true
          effects:
            - trust: 1
          next: streife
        - text: "Warum kaufst du nicht mehr bei Sibel?"
          if: [{fact: krux_kauft_nicht}]
          id: sibel
          once: true
          next: sibel
        - text: "Dein Piece ist stark."
          id: lob
          once: true
          next: lob
        - text: "Ich mal hier, wo ich will."
          id: angeben
          once: true
          effects:
            - trust: -1
          next: angeben
        - text: "Kennst du gute Spots?"
          id: spots
          once: true
          if: [{trust_min: 2}]
          show_locked: "KRUX erzählt dir sowas nicht. Noch nicht."
          next: bruecke
        - text: "Dein Wildstyle. Wie kriegt man die Buchstaben so ineinander?"
          id: wildstyle
          once: true
          if: [{rank_min: piece_writer}, {sprayed: hall}]
          show_locked: "Danach fragst du ihn besser erst, wenn du selbst was an der Hall stehen hast."
          next: wildstyle
        - text: "Bin weg."
          end: true

    fragen:
      text:
        - "Guck an. Einer, der fragt."
        - "Die linke Wand kannst du haben. Wenn's schlecht aussieht, mal ich drüber."
      effects:
        - learn: krux_frage
      next: hub

    outline:
      text:
        - "Hast du also doch Augen im Kopf."
        - "Ja. Skinny Cap, ein Zug. Übung."
      next: hub

    streife:
      text:
        - "Weiß ich."
        - "Aber gut, dass du's auch weißt. Die meisten lernen das auf die harte Tour."
      next: hub

    sibel:
      text:
        - "Wer erzählt so was?"
        - "Ich hab meine Quellen. Geht dich nichts an."
      next: hub

    lob:
      text:
        - "Weiß ich."
      next: hub

    angeben:
      text:
        - "Klar. Mach mal."
        - "Und dann guck, wie lange es da steht."
      end: true

    bruecke:
      text:
        - "Die Eisenbahnbrücke. Da war seit Jahren keiner oben."
        - "Wer da oben steht, ist kein Toy mehr. Runterfallen solltest du halt nicht."
        - "Nimm den NY Fat. Da oben musst du schnell sein."
      effects:
        - learn: bruecke
        - give: ny_fat
      next: hub

    wildstyle:
      text:
        - "Dein Piece an der Hall. Hab ich gesehen."
        - "Wildstyle ist kein Trick. Du verschränkst die Buchstaben, bis nur noch Writer sie lesen."
        - "Arrows an die Enden, Connections dazwischen. Skizzier das zehnmal, bevor du an eine Wand gehst."
      effects:
        - set_flag: wildstyle_gelernt
        - trust: 1
      next: hub
```

### 4.4 Frau Brandt – Streife

Polizistin, sachlich, müde von der Nachtschicht. Kein Feindbild, keine Karikatur, keine Vorträge. Kein Vertrauenswert.
Wer ruhig bleibt, bekommt beim Smalltalk nebenbei eine Info. Wer nervös reagiert, fällt ihr auf – der Merker `brandt_misstrauisch` ist der Anknüpfungspunkt für das Wanted-System in M4.

```yaml
id: streife
name: Frau Brandt
role: Streife
room: strasse
hotspot: brandt
trust: false

dialogue:
  start:
    - if: [{flag: brandt_misstrauisch}]
      node: misstrauisch
    - if: [{flag: brandt_kennt_dich}]
      node: wieder_da
    - node: erstes_mal

  nodes:
    erstes_mal:
      text: "Na. Alles gut bei dir?"
      effects:
        - set_flag: brandt_kennt_dich
      options:
        - text: "Ja, alles gut. Lange Schicht?"
          next: schicht
        - text: "Ich hab nichts gemacht!"
          next: nervoes
        - text: "Muss weiter."
          end: true

    schicht:
      text:
        - "Nachtschicht. Die dritte diese Woche."
        - "Um zwei bin ich wieder unten in der Unterführung. Da ist nachts immer was los."
      effects:
        - learn: streife_zwei
      options:
        - text: "Klingt anstrengend."
          next: anstrengend
        - text: "Was ist denn da unten los?"
          next: nachfragen

    anstrengend:
      text: "Man gewöhnt sich dran. Na dann."
      end: true

    nachfragen:
      text:
        - "Das Übliche. Frische Farbe an den Wänden."
        - "Aber das interessiert dich ja bestimmt nicht."
      end: true

    nervoes:
      text:
        - "Hab ich auch nicht behauptet."
        - "Aber jetzt merk ich mir dein Gesicht."
      effects:
        - set_flag: brandt_misstrauisch
      end: true

    misstrauisch:
      text: "Du schon wieder. Ich hab dich im Blick."
      end: true

    wieder_da:
      text: "Na. Alles ruhig?"
      options:
        - text: "Alles ruhig. Wieder Nachtschicht?"
          if: [{not_fact: streife_zwei}]
          next: schicht
        - text: "Alles ruhig."
          end: true
```

### 4.5 Ergänzungen im Hinterhof für M2

```yaml
  - id: kalle
    # zusätzlich zu M1:
    sprechen: mentor

  - id: durchgang
    # zusätzlich zu M1:
    gehen: strasse

  - id: rolltor
    # untersuchen in M2 ersetzen durch Varianten:
    untersuchen:
      - if: [{fact: buff_montag}]
        text: "Grau. Wie alles hier nach einem Montag."
      - text:
          - "Garagentor. Früher war hier ein Piece, jetzt ist da ein grauer Fleck."
          - "Durch den Buff sieht man noch die Umrisse der Buchstaben. Das war mal ein Burner."
```

---

## 5. M3 – Material, Spots, Karte (Stand M3.5: Farben, Sprühen 2.0)

**Wer gibt was:** Start mit Standard-Cap und Low Pressure. Sibel gibt den Skinny Cap zu ihren Cap-Tipps und eine verbeulte High Pressure, wenn man sich mit ihr über die Kamera ärgert. Kalle gibt einen Fat Cap, wenn man ihm das Blackbook zeigt. KRUX gibt den NY Fat zusammen mit der Brücke. Die Änderungen stehen direkt in den Dialogen oben.

**Qualitätsregel:** +1 passender Cap, +1 passende Dose, +1 Style passt zum Spot → 0 bis 3 („wackelig", „geht so", „sauber", „sitzt"; beim Piece heißt die beste Stufe „Burner").

### 5.1 items.yaml

```yaml
# Caps: width = Strahlbreite (1 Skinny … 4 NY Fat). Dosen: flow = Farbe pro Sekunde.
# Farben: color = Palettenname (C64-Palette).
- id: standard_cap
  name: Standard-Cap
  kind: cap
  width: 2
  text: "Der Cap, der auf der Dose steckt. Geht für alles, ist für nichts richtig gut."

- id: skinny_cap
  name: Skinny Cap
  kind: cap
  width: 1
  text: "Dünner, präziser Strahl. Für Tags und Outlines."

- id: fat_cap
  name: Fat Cap
  kind: cap
  width: 3
  text: "Breiter Strahl. Für Fill-ins."

- id: ny_fat
  name: NY Fat
  kind: cap
  width: 4
  text: "Sehr breit. Füllt schnell, verzeiht nichts."

- id: low_pressure
  name: Low Pressure
  kind: dose
  flow: 4
  text: "Wenig Druck, viel Kontrolle. Gut für Details und Fades."

- id: high_pressure
  name: High Pressure
  kind: dose
  flow: 10
  text: "Viel Druck, deckt schnell. Tropft aber leichter."

- id: farbe_schwarz
  name: Schwarz
  kind: color
  color: black
  text: "Für Outlines und Tags. Hat jeder dabei."

- id: farbe_chrom
  name: Chrom
  kind: color
  color: light_grey
  text: "Silber. Der Klassiker fürs Fill-in bei Throw-ups."

- id: farbe_weiss
  name: Weiß
  kind: color
  color: white
  text: "Für Highlights, Second Outlines und alles, was knallen soll."

- id: farbe_rot
  name: Rot
  kind: color
  color: red
  text: "Dunkles Rot. Deckt gut."

- id: farbe_gelb
  name: Gelb
  kind: color
  color: yellow
  text: "Hell und laut. Mit schwarzer Outline sieht man das von weit weg."

- id: farbe_hellblau
  name: Hellblau
  kind: color
  color: cyan
  text: "Kühl. Gut für Fades nach Weiß."
```

### 5.2 spray.yaml

```yaml
# Sprühen 2.0 (M3.5): Sketch wählen, dann Ebene für Ebene nachfahren.
# look bestimmt die Form und die Ebenen: tag → line; alle anderen → fill, outline.
# caps: ideale Caps je Ebene. Die Qualität ergibt sich aus Deckung, Cap, Drips und Spot.
quality_labels:
  - wackelig
  - geht so
  - sauber
  - sitzt

result: "{style} an {spot}: {quality}."

hints:
  gaps: "Da sind Lücken. Näher an der Linie bleiben."
  gaps_low: "Low Pressure braucht Zeit. Langsamer fahren, dann deckt das."
  reach: "Mit dem Cap kommst du nicht bis an den Rand. Fürs Fill-in Fat Cap oder NY Fat."
  fat_line: "Die Linie ist zu fett. Dafür Skinny oder Standard-Cap."
  drips: "Das läuft. Mit High Pressure nicht stehen bleiben."

styles:
  - id: tag
    name: Tag
    look: tag
    xp: 10
    caps:
      line: [skinny_cap, standard_cap]

  - id: straight
    name: Straight Letter
    look: straight
    xp: 20
    caps:
      fill: [fat_cap, ny_fat]
      outline: [skinny_cap, standard_cap]
    if: [{rank_min: tagger}]
    locked_hint: "Erst der Handstyle. Straight Letter gibt's ab Tagger."

  - id: bubble
    name: Bubble
    look: bubble
    xp: 30
    caps:
      fill: [fat_cap, ny_fat]
      outline: [skinny_cap, standard_cap]
    if: [{rank_min: tagger}]
    locked_hint: "Bubbles gibt's ab Tagger. Tag erst mal weiter."

  - id: bombing
    name: Bombing
    look: bombing
    caps:
      fill: [ny_fat, fat_cap]
      outline: [standard_cap, skinny_cap]
    xp: 50
    if: [{rank_min: bomber}]
    locked_hint: "Bombing kommt, wenn dein Name im Bezirk was zählt. Ab Bomber."

  - id: piece
    name: Piece
    look: piece
    caps:
      fill: [fat_cap]
      outline: [skinny_cap]
    xp: 120
    if: [{rank_min: piece_writer}]
    locked_hint: "Für ein Piece bist du noch nicht so weit. Ab Piece-Writer."
    only_at: [hall]
    only_at_hint: "Ein Piece malst du nicht zwischen Tür und Angel. Dafür gibt's die Hall."
    top_label: Burner

  - id: wildstyle
    name: Wildstyle
    look: wildstyle
    caps:
      fill: [fat_cap]
      outline: [skinny_cap]
    xp: 200
    if: [{rank_min: piece_writer}, {flag: wildstyle_gelernt}]
    locked_hint: "Wildstyle zeigt dir keiner umsonst. Frag jemanden, der ihn kann."
    only_at: [hall]
    only_at_hint: "Wildstyle nur an der Hall. Da hast du die Zeit dafür."
    top_label: Burner
```

### 5.3 spots.yaml

```yaml
- id: rolltore
  name: den Rolltoren
  type: rolltor
  room: strasse
  hotspot: rolltore
  fits: [tag, straight, bubble]
  fit_hint: "Die Rolltore sind für schnelle Sachen. Für mehr hast du hier keine Ruhe."
  risk: mittel

- id: hall
  name: der Hall
  type: legale_wand
  room: jugendzentrum
  hotspot: hall_wand
  fits: [straight, bubble, bombing, piece, wildstyle]
  fit_hint: "An der Hall taggt man nicht. Da zählt, was Style hat."
  risk: kein
  if: [{fact: hall}]

- id: linke_wand
  name: der linken Wand
  type: hauswand
  room: unterfuehrung
  hotspot: linke_wand
  fits: [straight, bubble, bombing]
  fit_hint: "Neben KRUX' Piece wirkt das zu klein."
  risk: niedrig
  if: [{fact: krux_frage}]

- id: bruecke
  name: der Brücke
  type: heaven_spot
  room: bruecke
  hotspot: brueckenwand
  fits: [straight, bubble, bombing]
  fit_hint: "Da oben zählt, was man von unten lesen kann. Groß und schnell."
  risk: hoch
  if: [{fact: bruecke}]

- id: abstellgleis
  name: einem Waggon
  type: zug
  room: abstellgleis
  hotspot: waggon
  fits: [straight, bubble, bombing]
  fit_hint: "Auf dem Waggon muss es aus der Ferne wirken. Das geht hier unter."
  risk: hoch
  if: [{fact: zaun}]
```

### 5.4 map.yaml

```yaml
# Ein Ort steht auf der Karte, sobald man dort war – oder die Bedingung erfüllt ist.
title: Dein Bezirk
places:
  - room: hinterhof
    pos: [60, 125]
  - room: strasse
    pos: [140, 110]
  - room: farbenladen
    pos: [150, 70]
  - room: unterfuehrung
    pos: [220, 125]
  - room: jugendzentrum
    pos: [80, 55]
    if: [{fact: hall}]
  - room: bruecke
    pos: [235, 55]
    if: [{fact: bruecke}]
  - room: abstellgleis
    pos: [285, 145]
    if: [{fact: zaun}]
```

### 5.5 Neue Orte

```yaml
id: jugendzentrum
name: Jugendzentrum
background: jugendzentrum.png
description: "Der Hof der alten Feuerwache. Backstein, Rundbögen, in der Mitte das rote Hallentor. Rechts davon ist die Wand frei."
hotspots:
  - id: hall_wand
    label: Die Hall
    rect: [204, 58, 104, 72]
    sprühen: hall
    untersuchen:
      - if: [{sprayed: hall}]
        text: "Dein Werk hängt zwischen den anderen. Hier sieht jeder, was du kannst."
      - text:
          - "Rechts vom Tor ist die Wand fast leer. Nur unten ein paar alte Schichten."
          - "Hier stört dich keiner. Nimm dir Zeit."

  - id: altes_piece
    label: Altes Piece
    rect: [26, 50, 112, 92]
    untersuchen:
      - "Ein Wildstyle, der hier schon ein paar Jahre hängt. Second Outline, sauberes 3D."
      - "Darunter schimmert ein älteres Throw-up durch, halb weggeputzt."
      - "Unten rechts ein Tag, den du aus Kalles Blackbook kennst."

  - id: hallentor
    label: Hallentor
    rect: [142, 70, 54, 82]
    untersuchen:
      - "Das rote Hallentor. Dahinter standen früher die Löschzüge, heute proben da Bands."
      - "Zu. Aber der Hof ist offen, und die Wand daneben gehört allen."

  - id: dosen
    label: Karton
    rect: [212, 118, 46, 46]
    untersuchen: "Ein Karton voller leerer Dosen. Hier wird gemalt, nicht geredet."

  - id: zur_strasse
    label: Zur Straße
    rect: [0, 60, 16, 100]
    gehen: strasse
```

```yaml
id: bruecke
name: Eisenbahnbrücke
background: bruecke.png
description: "Oben auf der Eisenbahnbrücke. Der Wind zieht, unten fahren die Autos."
hotspots:
  - id: brueckenwand
    label: Brückenblech
    rect: [60, 40, 180, 60]
    sprühen: bruecke
    untersuchen:
      - if: [{sprayed: bruecke}]
        text: "Dein Name über der Straße. Den sieht jetzt jeder, der unten langfährt."
      - text:
          - "Das Blech an der Brücke. Seit Jahren hat hier keiner gemalt."
          - "Von unten sieht man das von der ganzen Straße aus."

  - id: aussicht
    label: Aussicht
    rect: [250, 20, 60, 50]
    untersuchen: "Von hier siehst du den ganzen Bezirk. Die Unterführung, die Ladenzeile, das Abstellgleis."

  - id: runter
    label: Runter zur Straße
    rect: [0, 110, 40, 70]
    gehen: strasse
```

```yaml
id: abstellgleis
name: Abstellgleis
background: abstellgleis.png
description: "Hinter dem Zaun. Schotter, abgestellte Waggons, kein Mensch zu sehen."
hotspots:
  - id: waggon
    label: Waggon
    rect: [40, 50, 200, 80]
    sprühen: abstellgleis
    untersuchen:
      - if: [{sprayed: abstellgleis}]
        text: "Dein Werk auf dem Waggon. Wenn der losfährt, fährt dein Name mit."
      - text:
          - "Ein abgestellter Waggon. Die Seite ist fast leer."
          - "Nur ein paar alte Tags, halb abgewaschen."

  - id: gleise
    label: Gleise
    rect: [250, 120, 60, 50]
    untersuchen: "Die Gleise glänzen. Hier fährt nachts noch was."

  - id: zurueck
    label: Zurück durch den Zaun
    rect: [0, 60, 20, 110]
    gehen: unterfuehrung
```

## 6. M4a – Aufstieg

### 6.1 progress.yaml

```yaml
# Aufstieg (M4a): XP eines Werks = Style-Wert × Qualitätsfaktor × Spot-Faktor × (1 + Tempo-Bonus).
# Angerechnet wird die Verbesserung gegenüber dem besten eigenen Werk am Spot,
# sonst repeat_share als Übung.
rank_up_title: "Neuer Rang"

ranks:
  - id: toy
    name: Toy
    xp: 0
    text: "Du hast eine Dose und einen Namen. Mehr nicht."
    unlocks: "Tag"
  - id: tagger
    name: Tagger
    xp: 50
    text: "Dein Handstyle steht. Jetzt wird es größer."
    unlocks: "Straight Letter und Bubble"
  - id: bomber
    name: Bomber
    xp: 250
    text: "Dein Name hängt im halben Bezirk."
    unlocks: "Bombing"
  - id: piece_writer
    name: Piece-Writer
    xp: 450
    text: "Zeit für die Hall. Da schaut die Szene hin."
    unlocks: "Piece an der Hall"
  - id: king
    name: King
    xp: 700
    text: "Jeder hier kennt deinen Namen."

# Qualität: wackelig, geht so, sauber, sitzt
quality_factors: [0, 0.5, 1, 1.5]

spot_factors:
  rolltor: 1
  legale_wand: 1
  hauswand: 1.2
  heaven_spot: 1.6
  zug: 1.6

tempo_bonus_max: 0.3
tempo_min_quality: 2
repeat_share: 0.2
```

## 7. Raumbilder (Grafik-Schritt)

Die Hintergründe liegen als PNG in `public/art/<room>.png` und entstehen aus Code:
`scripts/lib/rooms-art.ts` malt jede Szene, `npm run art` schreibt die Bilder.
Jeder Room verweist über `background: <room>.png` darauf. Wer ein Bild ändern will, ändert die Szene
und lässt `npm run art` neu laufen – ein Test vergleicht Bild und Szene.

## 8. M4b – Risiko (Zeit, Heat, Wanted, Buff)

Werte und Texte stehen in `content/risk.yaml` (siehe `SPEC-M4b.md`, Abschnitt 4). Neu dazu:

### 8.1 Wache

```yaml
id: wache
name: Wache
background: wache.png
description: "Ein Raum mit Neonlicht und einem Tisch. Deine Tasche liegt offen daneben, halb leer."
hotspots:
  - id: brandt_wache
    label: Frau Brandt
    rect: [180, 70, 40, 80]
    untersuchen:
      - "Sie sortiert deine Dosen in eine Kiste und schreibt etwas auf."
      - "„Name steht schon dran. Spar dir die Mühe.\""
      - "„Nächstes Mal ruf einer deiner Freunde an, bevor ich es tue.\""

  - id: tasche_wache
    label: Deine Tasche
    rect: [90, 110, 50, 40]
    untersuchen: "Caps noch da, Farben weg. Hätte schlimmer kommen können."

  - id: raus_wache
    label: Raus hier
    rect: [20, 60, 40, 100]
    gehen: hinterhof
```

### 8.2 Nowak – Reinigungstrupp

Steht montags an den Rolltoren und macht sie sauber. Nicht der Feind, er hat einen Job.
Gibt dem Buff ein Gesicht.

```yaml
id: buff
name: Nowak
role: Reinigungstrupp
room: strasse
hotspot: nowak
trust:
  start: 0

dialogue:
  start:
    - if: [{flag: nowak_kennt_dich}]
      node: wieder_da
    - node: erstes_mal

  nodes:
    erstes_mal:
      text:
        - "Ein Mann in oranger Jacke zieht den Schlauch vom Wagen."
        - "„Morgen. Geh mal zwei Schritte weiter, das spritzt.\""
      effects:
        - set_flag: nowak_kennt_dich
      options:
        - text: "Machen Sie das jede Woche?"
          next: jede_woche
        - text: "Das war richtig gute Arbeit, die Sie da wegmachen."
          next: gute_arbeit
        - text: "Ich geh dann mal."
          end: true

    wieder_da:
      text: "„Du schon wieder. Und ich schon wieder.\""
      options:
        - text: "Was macht am meisten Arbeit?"
          if: [{trust_min: 1}]
          show_locked: "Nowak redet nicht mit jedem über seine Arbeit."
          next: arbeit
        - text: "Lassen Sie was stehen?"
          next: stehen_lassen
        - text: "Bis nächste Woche."
          end: true

    jede_woche:
      text:
        - "„Montags die Ladenzeile, mittwochs die Unterführung. Steht so im Plan.\""
        - "„Die Unterführung lassen wir inzwischen. Da kommt eh am Freitag was Neues.\""
      effects:
        - learn: buff_montag
      next: hub

    gute_arbeit:
      text:
        - "Er stellt den Schlauch ab und guckt sich die Wand an."
        - "„Kunst hin oder her. Ist halt nicht meine Wand und nicht deine.\""
        - "„Aber ja. Manches ist schade drum.\""
      effects:
        - trust: 1
      next: hub

    arbeit:
      text:
        - "„Rolltore sind einfach. Ein Durchgang, fertig.\""
        - "„Backstein ist die Hölle. Da kriegst du das nie ganz raus, das sieht man noch nach Jahren.\""
      effects:
        - trust: 1
      next: hub

    stehen_lassen:
      text:
        - "„Was an der Hall hängt, fasse ich nicht an. Das ist freigegeben, das ist nicht mein Problem.\""
        - "„Alles andere kommt weg. Nicht persönlich.\""
      next: hub

    hub:
      text: "Der Schlauch zischt."
      options:
        - text: "Was macht am meisten Arbeit?"
          if: [{trust_min: 1}]
          next: arbeit
        - text: "Lassen Sie was stehen?"
          next: stehen_lassen
        - text: "Ich lass Sie mal machen."
          end: true
```

### 8.3 Ergänzungen an bestehenden Inhalten

- `content/rooms/strasse.yaml`: neuer Hotspot `nowak`, sichtbar nur `if: [{weekday: mo}]`.
- `content/rooms/strasse.yaml`: `zum_laden` gilt jetzt nur `if: [{not_phase: nacht}]`. Nachts steht
  dort stattdessen `laden_zu` – Rollladen runter, kein Weg hinein.
- `content/map.yaml`: der Graffitistore steht nachts nicht auf der Karte.
- `content/rooms/strasse.yaml`: Nowak ist nur montags **tagsüber** da (`{weekday: mo}, {not_phase: nacht}`).

### 8.4 Die NPCs merken Tageszeit und Fahndung

Alle vier alten NPCs haben neue Einstiegsknoten. Die Reihenfolge in `start` entscheidet: Fahndung
schlägt Tageszeit, Tageszeit schlägt den Normalfall.

| NPC | Nachts | Ab Wanted 1 | Ab Wanted 2 |
|-----|--------|-------------|-------------|
| Frau Brandt | `nachts` – „Spät für dein Alter." | `abtasten` – sie will die Hände sehen | `gesucht` – sie kennt den Namen von den Wänden |
| KRUX | `nachts` – jetzt ist die richtige Zeit | – | `gesucht` – Respekt, dazu +1 Vertrauen |
| Kalle | `nachts` – zwei Sorten Leute sind um die Zeit draußen | – | `sorge` – setz dich nicht ans Fenster |
| Sibel | – (Laden ist zu) | – | `vorsichtig` – „dann kenn ich dich nicht" |
- `content/spots.yaml`: der Waggon am Abstellgleis geht nur nachts (`{phase: nacht}`).
- `content/npcs/mentor.yaml`: neue Antwort bei Kalle „Ich muss ein paar Tage weg vom Fenster"
  (`if: [{wanted_min: 1}]`), Knoten `untertauchen` mit den Effekten `wanted: -1` und `advance_day`.

## 9. M5a – Material und Geld

Werte in `content/economy.yaml`, Preise an den Gegenständen in `content/items.yaml`
(siehe `SPEC-M5a.md`, Abschnitt 4).

### 9.1 Die drei Marker

Ein Marker ist Dose, Cap und Farbe in einem. Im Sketch wählt man nur den Marker.

| Marker | Breite | Fluss | Farbe | Preis | Eigenheit |
|--------|--------|-------|-------|-------|-----------|
| T-Tip | 1 | 5 | schwarz | 4 € | sauber, tropft nicht – der Anfänger-Marker |
| Dripper | 3 | 12 | schwarz | 6 € | breit und nass, läuft beim Stehenbleiben |
| Wachsmarker | 4 | 7 | weiß | 9 € | tropft nie, hält den Buff aus (`keeps`) |

Kalle gibt den T-Tip im ersten Gespräch: „Hier. Der lag noch rum."

### 9.2 Die fünf Marker-Spots

Alle auf vorhandenen Hotspots, kein neues Raumbild. `surface` bestimmt, was im
Sprüh-Bildschirm hinter dem Werk zu sehen ist.

| Spot | Raum | Hotspot | Untergrund | Bedingung |
|------|------|---------|------------|-----------|
| Mülltonnen | Hinterhof | `muelltonnen` | tonne | – |
| Laternenmast | Straße | `laterne` | mast | – |
| Stromkasten | Hinterhof | `stromkasten` | kasten | – |
| Waggontür | Abstellgleis | `waggontuer` (neu) | blech | Info „zaun" |
| Zaunschild | Unterführung | `zaunloch` | kasten | Info „zaun" |

### 9.3 Ergänzungen an bestehenden Inhalten

- `content/spray.yaml`: der Tag-Style hat `tool: marker`, ideales Werkzeug ist der T-Tip.
- `content/rooms/farbenladen.yaml`: Sibels Theke hat `kaufen: true`.
- `content/progress.yaml`: Toy heißt jetzt „Du hast einen Marker und einen Namen."

### 9.4 Funde beim Untersuchen

Sieben Hotspots geben beim **ersten** Untersuchen etwas her. Danach steht dort der normale Text.
Technisch braucht das nichts Neues: eine Textvariante mit `if: [{not_flag: fund_…}]` und
`effects` darunter, die dieselbe Flagge setzt. Kein Fund lässt sich wiederholen.

| Raum | Hotspot | Fund | Flagge |
|------|---------|------|--------|
| Hinterhof | Mülltonnen | Dose Chrom | `fund_tonne` |
| Hinterhof | Stromkasten | Skinny Cap | `fund_kasten` |
| Straße | Laterne | 5 € in der Sockelklappe | `fund_laterne` |
| Jugendzentrum | Karton mit Dosen | Dose Weiß | `fund_karton` |
| Abstellgleis | Gleise | NY Fat im Schotter | `fund_gleise` |
| Unterführung | Tagwand | Info „NOX" (die Crew) | `fund_nox` |
| Wache | Deine Tasche | Fat Cap, den sie übersehen haben | `fund_wache` |

Der Fund auf der Wache ist der einzige, den man nur sieht, wenn man erwischt wurde – ein kleiner
Trost, damit der Besuch nicht nur Verlust ist.

Die Info **NOX** ist die erste, die von keinem NPC kommt. Im Blackbook steht als Quelle deshalb
„selbst gesehen".
