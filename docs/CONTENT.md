# CONTENT – Spielinhalte M1 & M2

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
```

---

## 2. Rooms

### 2.1 Hinterhof (M1)

In M1 ohne Gespräch, ohne Ausgang und ohne Info-Bedingungen – die kennt die Engine erst ab M2. Die Ergänzungen für M2 stehen in Abschnitt 4.5.

```yaml
id: hinterhof
name: Hinterhof
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
    # M2: sprechen: mentor

  - id: durchgang
    label: Durchgang
    rect: [295, 60, 25, 100]
    untersuchen: "Der Durchgang zur Straße."
    # M2: gehen: strasse
```

### 2.2 Straße (M2)

```yaml
id: strasse
name: Straße
description: "Die Ladenzeile. Kiosk, Handyladen, Farbenladen. Und eine Streife, die hier öfter steht als der Bus."
hotspots:
  - id: rolltore
    label: Rolltore
    rect: [40, 60, 90, 80]
    untersuchen:
      - if: [{fact: buff_montag}]
        text: "Alle drei Rolltore frisch grau. Montag war Buff-Tag."
      - text:
          - "Drei Rolltore, alle voll mit Tags."
          - "Dazwischen graue Flecken. Irgendwer räumt hier regelmäßig auf."

  - id: laterne
    label: Laternenmast
    rect: [140, 20, 15, 130]
    untersuchen: "Sticker über Sticker. KRUX klebt ganz oben. Wie ist er da hochgekommen?"

  - id: kamera
    label: Kamera
    rect: [200, 30, 20, 15]
    if: [{fact: kamera}]
    untersuchen: "Die neue Kamera über dem Farbenladen. Sie zeigt genau auf die Rolltore."

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
    label: Farbenladen
    rect: [180, 50, 50, 90]
    gehen: farbenladen

  - id: zur_unterfuehrung
    label: Unterführung
    rect: [290, 70, 30, 90]
    gehen: unterfuehrung
```

### 2.3 Farbenladen (M2)

```yaml
id: farbenladen
name: Farbenladen
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
description: "Jeder Zentimeter bemalt, bis unter die Decke. Das Licht flackert."
hotspots:
  - id: tagwand
    label: Wand voller Tags
    rect: [10, 30, 70, 110]
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
    rect: [0, 40, 10, 100]
    untersuchen:
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
    rect: [270, 90, 35, 60]
    if: [{fact: zaun}]
    untersuchen:
      - "Der Zaun ist unten aufgebogen, gerade breit genug."
      - "Dahinter Schotter, Gleise, abgestellte Waggons. Nicht heute."

  - id: raus
    label: Zur Straße
    rect: [305, 50, 15, 110]
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
  text: "Über dem Farbenladen hängt seit letzter Woche eine Kamera. Sie zeigt auf die Rolltore."
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
        - "Deine Buchstaben stehen zu eng. Gib ihnen Luft, dann wird das auch als Hollow lesbar."
        - "Die Connection hier ist gut. Bleib dabei."
      next: hub

    zaun:
      text:
        - "Hinten in der Unterführung, rechts, ist der Zaun aufgebogen."
        - "Dahinter stehen nachts die Züge. Da gehst du erst hin, wenn du weißt, was du tust."
      effects:
        - learn: zaun
      next: hub
```

### 4.2 Sibel – Farbenladen

Führt den Farbenladen. Sachlich-freundlich, Materialnerd, kennt die Kaufgewohnheiten jedes Writers in der Gegend.
Vertrauen: +1 für die erste echte Materialfrage, +1, wenn man sich mit ihr über die Kamera ärgert. −1 für die Frage nach Klauen. Ab 2 redet sie über Kunden.

```yaml
id: laden
name: Sibel
role: Farbenladen
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
        - text: "Danke, bis dann."
          end: true

    caps:
      text:
        - "Für saubere Outlines Skinny Cap. Für Fill-ins Fat Cap."
        - "NY Fat nur, wenn's schnell gehen muss. Damit malst du keine Details."
      effects:
        - learn: caps
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
      text: "Und wie. Die Hälfte meiner Kunden kommt jetzt lieber hinten rum."
      effects:
        - trust: 1
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
          if: [{trust_min: 2}]
          show_locked: "KRUX erzählt dir sowas nicht. Noch nicht."
          next: bruecke
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
      effects:
        - learn: bruecke
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
