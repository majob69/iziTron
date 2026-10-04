# iziTron – Spielkonzept & Technikplan

## Context
Neues, leeres Projekt in `C:\Users\Mario\Coding\iziTron`. Ziel: ein Android-Spiel auf Basis der Spielidee von **Quazatron** (1986), also Säubern einer Zitadelle, Kapern von Droiden per Platinen-Minispiel und Aufrüsten mit erbeuteten Teilen. Es soll aber **realistisch und modern** aussehen und zusätzlich eine **umschaltbare Roboter-Sicht** bieten.
Festgelegt: **Unity 6 LTS + URP**, Zielgeräte **Mittel- bis Oberklasse** (Vulkan).
**Erste Phase: ein Prototyp, der nur die Spielidee testet und ausschließlich kostenlose Werkzeuge und Assets nutzt** (siehe Abschnitt 8a). Gekaufte Packs und kostenpflichtige Werkzeuge kommen erst in Frage, wenn der Prototyp überzeugt (ab M4).
Dieser Plan beschreibt Spielkonzept, Erweiterungen, Technik, Architektur und Meilensteine. Nach der Freigabe kommen als erstes die Design-Dokumente und das Projektgerüst.

> **Anpassung vom 04.10.2026: Start auf vorhandener Hardware.** Der Entwicklungsrechner (Intel NUC7i3BNK: i3-7100U, Intel HD 620, 16 GB RAM, C: fast voll, externe X8-SSD läuft derzeit nur mit USB-2.0-Geschwindigkeit) reicht noch nicht für Unity. Deshalb kommt **vor M0 die Phase P0, ein Browser-Prototyp mit Three.js + Vite** (siehe Abschnitt 10a). Sie testet die Spielidee am PC und im Handy-Browser. Unity (M0–M6) startet, sobald die Hardware passt (siehe Abschnitt 10b).

---

## 1. Story (erweitert)

**Achtung, Rechtliches:** „Quazatron“, „KLP-2“ und „Quartech“ stammen aus dem Original (Graftgold/Hewson). Bei einer Play-Store-Veröffentlichung eigene Namen verwenden. Vorschlag:
- Spieltitel **iziTron**, Planet **Kvartis**, Held **KLX-7 „Klix“** (ein diebischer Bergungsdroide). Die Arbeitsnamen können bis dahin bleiben.

**Prämisse:** Die Zentral-KI **ARCHON** der Bergbau-Zitadelle hat sich abgeschottet. Sie hat alle Droiden umprogrammiert und die Menschen evakuiert. Klix war ein ausrangierter Schrott-Sammeldroide, der übersehen wurde, weil seine Firmware zu alt für das Update war. Gerade seine Schwäche macht ihn immun.

**Zusätzliche Story-Elemente:**
- **Daten-Fragmente:** Jeder gekaperte Droide gibt einen Log-Eintrag frei. Daraus setzt sich nach und nach zusammen, warum ARCHON abtrünnig wurde (Wendung: ARCHON schützt etwas im untersten Deck).
- **Begleiterstimme:** „MOTHER“ ist eine fast leere Wartungs-KI und funkt Klix an. Das bringt Humor und Tutorial-Hinweise ohne Textwüsten.
- **Deck-Bosse:** Jede Ebene hat einen Sektor-Wächter (Klasse 8xx/9xx). Das Ende bildet ein mehrphasiger Kampf gegen ARCHONs Kern-Chassis, bei dem das Minispiel über drei Platinen nacheinander läuft.
- **Zwei Enden:** ARCHON zerstören oder kapern. Beim Kapern übernimmt Klix die Zitadelle (New Game+).

## 2. Kern-Spielschleife
Erkunden → Droide scannen (Klasse und Teile sehen) → Taktik wählen (Laser, Rammen, Grappeln) → Beute ausschlachten → in der Werkstatt neu konfigurieren → stärkere Gegner / nächstes Deck.
Risiko und Belohnung bleiben der Kern: Wer einen mächtigen Droiden kapern will, setzt die eigene Hülle aufs Spiel.

## 3. Kameras – iso & Roboter-Sicht (zentrales Alleinstellungsmerkmal)
| Modus | Zweck | Umsetzung |
|---|---|---|
| **Taktik-Iso** (Standard) | Übersicht, Rammen an Kanten, Planung | Cinemachine-Kamera, ~35° Neigung, drehbar in 90°-Schritten, Pinch-Zoom |
| **Verfolger** (3rd Person) | Dynamische Kämpfe | Kamera hinter Klix, weiche Kollision |
| **Optik-Sicht (POV)** | Atmosphäre, präzises Zielen, Schwachstellen | Kamera im Sensorkopf mit HUD-Overlay |

- **Umschalten** per Tastendruck mit einem kurzen, nahtlosen Kameraflug in den Sensorkopf (ca. 0,4 s, Cinemachine-Blend).
- **Die POV-Ansicht hängt vom installierten Sensor-Bauteil ab** und ist damit Teil des Aufrüst-Systems:
  - Billigsensor: Rauschen, Scanlines, geringe Auflösung
  - Militär-Optik: klares Bild, Zielmarkierungen
  - Thermalsensor: Droiden glühen durch Wände
  - EM-Scanner: zeigt Stromleitungen und versteckte Terminals
- **Spielerischer Vorteil der POV-Ansicht:** Schwachstellen-Treffer richten doppelten Schaden an, Scans gehen schneller. Der Nachteil ist das eingeschränkte Sichtfeld. Dadurch hat jede Sicht ihren Sinn.

## 4. Grapple-Minispiel (Kapern) – modernisiert
- **Darstellung:** eine 3D-Holo-Platine, die sich aus dem Gegner „herausfaltet“. Leuchtende Leiterbahnen, Funken und Haptik-Feedback bei jedem Impuls.
- **Regeln wie im Original:** zwei Seiten, 12 Spalten. Beide Spieler schicken Impulse („Pulser“) in Leitungen und versuchen, Zielsegmente in der eigenen Farbe zu halten. Bei Zeitablauf gewinnt die Mehrheit.
- **Die Bauteile bestimmen die Platine:**
  - Anzahl der Pulser = Energieversorgung
  - Impulsdauer = Chassis-Qualität
  - Gegnerklasse = Komplexität der Platine
- **Neue Leitungselemente:** Splitter, Verbinder, Inverter, Verzögerer, Feuerwand (blockiert eine Runde), Virus-Knoten (wechselt nach einer Zeit die Farbe).
- **Aktive Fähigkeiten aus Devices:** z. B. „Überspannung“ (ein Impuls doppelt so lang) oder „Spiegel“ (eine gegnerische Leitung kopieren).
- **Ausgang:**
  - Sieg: Gegner deaktiviert, Teile unbeschädigt
  - Knapper Sieg: Teile teilweise beschädigt
  - Niederlage: Klix verliert Hülle oder ein Bauteil. Bei sehr schwachem Klix wird er ausgeschaltet.
- **Optional zum Üben:** Arcade-Modus mit dem Minispiel allein (Highscore, tägliche Platine).

## 5. Ausschlachten & Aufrüsten
- **Slots:** Waffe, Antrieb, Energie, Chassis und 2–3 Devices (Schild, Sensor, Störsender, Magnetgreifer, Selbstreparatur, Tarnfeld, Sprungdüse …).
- **Werte:**
  - Masse (wichtig fürs Rammen)
  - Energiebudget: Verbraucher gegen Generator
  - Hitze: Laser-Dauerfeuer führt zu Überhitzung
  - Verschleiß: Teile altern wie im Original, das erzeugt Druck zum Weiterplündern
- **Kompatibilität:** Ein schweres Chassis braucht einen starken Antrieb, sonst wird Klix träge.
- **Set-Boni:** drei Teile derselben Baureihe ergeben einen Bonus (z. B. „Sentinel-Reihe“: +Schild).
- **Werkstatt-Terminals** an sicheren Punkten: Teile tauschen, verschrotten zu Rohstoff, kleine Reparaturen.
- **Optische Anpassung:** Klix' 3D-Modell setzt sich modular aus den echten Teilen zusammen. Man **sieht** also jedes erbeutete Bauteil an ihm.

## 6. Gegner & Kampf
- **Sicherheitsklassen 1xx–9xx:**
  - 1xx: Reinigungsdroiden, harmlos
  - 3xx: Arbeitsdroiden, schieben und blockieren
  - 5xx: Wachdroiden, Laser
  - 7xx: Kampfdroiden, Rudelverhalten
  - 9xx: Kommando- und Wächterdroiden, rufen Verstärkung
- **KI-Verhalten:** Patrouille, Alarm, Flankieren, Flucht bei wenig Hülle, Helfen (Reparaturdroiden heilen andere), Zusammenschluss von Rudeln.
- **Drei Kampfwege:**
  1. **Laser:** Projektil oder Strahl, Hitze-Management, Schwachstellen in der POV-Ansicht.
  2. **Rammen/Schubsen:** physikbasiert, Impuls aus Masse × Geschwindigkeit. Gegner fallen von Kanten, in Schächte oder auf Stromgitter. Zeitlupe bei Kantensturz.
  3. **Grappeln:** siehe Abschnitt 4. Funktioniert nur, wenn der Gegner nicht schwer beschädigt ist, sonst gibt es weniger Beute.
- **Umgebung als Waffe:** Förderbänder, Lastenaufzüge, Pressen, Kraftfelder, elektrifizierte Böden, explosive Energiezellen, Luftschleusen.

## 7. Zusätzliche Vorschläge zur Bereicherung
1. **Alarmstufen-System:** Laute Kämpfe erhöhen die Deck-Alarmstufe. Dann kommen mehr Patrouillen und Türen werden verriegelt. Leises Kapern wird belohnt.
2. **Stromnetz-Zustände:** Klix kann Generatoren sabotieren. Dann gilt Notbeleuchtung (rot, flackernd), Kraftfelder fallen aus, und die Sensor-Sicht wird wichtiger. Optisch ist das spektakulär und lässt sich günstig umsetzen (zwei gebakte Licht-Sets).
3. **Terminal-Hacks:** Mini-Varianten des Platinen-Spiels öffnen Türen, schalten Kameras ab oder drehen Geschütze um.
4. **Kontrollierte Drohne:** Ein gekaperter kleiner Droide wird zeitweise zum Begleiter oder lässt sich fernsteuern (mit eigener POV-Ansicht).
5. **Deck-Karte als Hologramm** mit Fog of War und markierten Fundorten bekannter Teile.
6. **Roguelite-Modus „Zufallszitadelle“:** prozedurale Decks und permanenter Tod, für den Wiederspielwert.
7. **Foto-Modus** zum Präsentieren der realistischen Grafik.
8. **Erfolge und Kodex:** Droiden-Enzyklopädie mit 3D-Inspektor, gefüllt durch Scannen und Kapern.
9. **Gamepad-Support** (Android unterstützt Bluetooth-Controller) zusätzlich zu Touch.
10. *Später:* asynchrone Bestenlisten für die tägliche Platine (Google Play Games Services).

## 8. Technik

### Engine & Rendering
- **Unity 6 LTS (6000.x)**, **URP mit Forward+**, Grafik-API Vulkan (Fallback GLES 3.2), IL2CPP, ARM64, Ausgabe als AAB.
- **Realismus-Strategie für Mobilgeräte:** Die Zitadelle ist überwiegend statisch, das ist ideal für gebakte Beleuchtung.
  - **Licht:** gebakte Lightmaps (GPU Lightmapper), Light Probes / **Adaptive Probe Volumes** für dynamische Droiden, Reflection Probes (box-projiziert) für Metall- und Nassböden.
  - **Materialien:** PBR mit Trim-Sheets und Decals (Schmutz, Warnstreifen, Kratzer). Emissive Panels sorgen für die Sci-Fi-Lichtstimmung.
  - **Post-Processing:** Bloom, Tonemapping (ACES), Color Grading pro Deck, SSAO nur auf der hohen Stufe, Vignette und Film Grain in der POV-Ansicht.
  - **Volumetrik vortäuschen:** Lichtkegel als Meshes, Partikelnebel, Höhennebel im Shader.
  - **Performance-Werkzeuge:** **GPU Resident Drawer** und GPU Occlusion Culling (Unity 6), LODs, Texturkompression ASTC.
- **Qualitätsstufen:** Niedrig, Mittel, Hoch, Ultra mit automatischer Erkennung beim ersten Start. Ziel sind 60 fps auf der Oberklasse und 30/45 fps auf der Mittelklasse. **Adaptive Performance** hilft gegen thermisches Drosseln.

### Pakete & Werkzeuge
| Bereich | Wahl |
|---|---|
| Kamera | Cinemachine 3 |
| Eingabe | Input System (Touch-Joystick + Gamepad), On-Screen Controls |
| Physik | PhysX (Rigidbody für Rammen und Kantenstürze) |
| KI | AI Navigation (NavMesh) und eine eigene, leichte Zustandsmaschine |
| UI | UI Toolkit (Menüs, Werkstatt), uGUI für HUD in der Welt |
| VFX | Shader Graph und Particle System (VFX Graph nur auf Ultra/Vulkan-Compute) |
| Daten | ScriptableObjects für Droiden, Teile und Platinen-Layouts |
| Inhalte | Addressables und Play Asset Delivery (bei > 150 MB) |
| Audio | Unity Audio Mixer (Prototyp), später evtl. FMOD für adaptive Musik je nach Alarmstufe |
| Lokalisierung | Unity Localization (DE/EN) |
| Speichern | JSON in `persistentDataPath`, später Play Games Cloud Save |
| Tests | Unity Test Framework (EditMode für Logik, PlayMode für Abläufe) |
| CI/Build | lokal im Prototyp, später GitHub Actions + GameCI |
| Profiling | Unity Profiler, Frame Debugger, Android GPU Inspector, Snapdragon Profiler |

### 8a. Prototyp-Phase: nur kostenlose Werkzeuge
| Bereich | Kostenlose Wahl | Hinweis |
|---|---|---|
| Engine | **Unity 6 Personal** | kostenlos bis 200k $ Umsatz/Jahr |
| IDE | VS Code + C# Dev Kit oder Visual Studio Community | |
| 3D-Modellierung | **Blender** | Modellieren, UVs, Rig, Baken, Texturmalen |
| Texturen | **Material Maker** (prozedural), Blender-Texture-Paint, Poly Haven / ambientCG (CC0) | statt Substance |
| Fertige Modelle | **Quaternius** (CC0, Sci-Fi-/Roboter-Packs), **Kenney** (CC0, Space Kit), kostenlose Unity-Asset-Store-Pakete (z. B. Starter Assets) | Lizenz je Paket in `docs/CREDITS.md` festhalten |
| KI-3D (optional) | Gratis-Kontingente von Meshy/Tripo | **Lizenz der Gratis-Stufe prüfen** (teils nur mit Namensnennung oder nicht kommerziell). Für den Prototyp unkritisch, vor Release ersetzen. |
| Sound | Unity Audio Mixer, **jsfxr/ChipTone** (Effekte), **freesound.org** (CC0/CC-BY), Sonniss GDC-Gratisbundles | FMOD erst später |
| Bildbearbeitung | Krita, GIMP | |
| Versionsverwaltung | Git + Git LFS (GitHub: privates Repo kostenlos) | |
| Tests auf dem Gerät | APK per USB/ADB sideloaden | kein Play-Developer-Konto (25 $) nötig |
| Profiling | Unity Profiler, Android GPU Inspector, Snapdragon Profiler | alle kostenlos |
| CI | zunächst weggelassen, lokale Builds reichen | GameCI später möglich |

**Grafikziel im Prototyp:** „sauberes Greybox+“, also einfache Formen mit PBR-Materialien aus CC0-Texturen, gebaktem Licht, Emissive-Panels und Bloom. Das reicht, um Licht-Stimmung, Lesbarkeit und Kamerawechsel zu beurteilen. Der echte Realismus-Pass folgt in M4.

### 8b. Werkzeug-Checkliste: was du installieren musst (alles kostenlos)
**Pflicht für M0/M1**
- [ ] **Unity-Konto** (Personal-Lizenz), anlegen auf unity.com
- [ ] **Unity Hub** von unity.com/download
- [ ] **Unity 6 LTS Editor** (neueste 6000.x LTS). Im Hub diese Module anhaken:
  - [ ] Android Build Support
    - [ ] OpenJDK
    - [ ] Android SDK & NDK Tools
  - [ ] Microsoft Visual Studio Community (falls nicht VS Code)
- [ ] **Code-Editor**, eine der beiden Varianten:
  - Visual Studio Community 2022 mit der Workload „Spieleentwicklung mit Unity“
  - VS Code mit den Erweiterungen „Unity“ und „C# Dev Kit“ (Microsoft)
- [ ] **Git für Windows** inkl. Git LFS. Git ist vermutlich schon vorhanden, prüfen mit `git lfs version`.
- [ ] **Android-Gerät:** Entwickleroptionen und USB-Debugging aktivieren, ein USB-Datenkabel. ADB ist im Unity-Android-SDK enthalten.
- [ ] **Speicherplatz:** ca. 20–25 GB für Unity + Android-Module, dazu einige GB für das Projekt

**Für Grafik/Sound (ab M1/M2)**
- [ ] **Blender** (aktuelle Version, blender.org) für Modelle, UVs, Rig und Texturen
- [ ] **Material Maker** (materialmaker.org) für prozedurale PBR-Texturen
- [ ] **Krita** oder **GIMP** für Bildbearbeitung, HUD-Grafiken und Decals
- [ ] **Audacity** zum Schneiden und Bearbeiten von Sounds

**Empfohlen zum Testen**
- [ ] **scrcpy**: zeigt den Handy-Bildschirm auf dem PC und nimmt ihn auf
- [ ] **Profiler passend zum Handy-Chip:**
  - Snapdragon: Snapdragon Profiler
  - Mali/Tensor/Exynos: Arm Performance Studio
  - Alle Chips: Android GPU Inspector
- [ ] Optional: **Bluetooth-Gamepad** und **GitHub-Konto** (privates Repo als Sicherung)

**Nur online, ohne Installation (Asset-Quellen):** Poly Haven, ambientCG, Quaternius, Kenney, freesound.org, jsfxr, ChipTone.

### Asset-Pipeline (ab M4, nach erfolgreichem Prototyp)
- **Umgebung:** Sci-Fi-Modular-Kit (gekauft oder selbst gebaut), vereinheitlicht über eigene Trim-Sheets und Decals.
- **Droiden:** Basis aus KI-3D-Tools oder Blender. In Blender folgen Retopologie, Aufteilung in **modulare Teile** (Slot-Anchor-Punkte), UVs, Rig und Baken.
- **Budgets:** Held/Boss ca. 15–25k Dreiecke, Standard-Droide ca. 5–10k, jeweils mit 3 LODs. Texturen 2k für den Helden, 1k für Gegner, Atlanten für die Umgebung.

## 9. Architektur (Code)
Grundprinzip wie im Original: **Klix ist auch nur ein Droide.** Spieler und Gegner teilen dasselbe Droiden-Modell und dieselben Komponenten. Sie unterscheiden sich nur in der Steuerung (`PlayerBrain` gegen `AIBrain`). Dadurch funktioniert das Aufrüsten automatisch.

```
iziTron/
  docs/                 GDD.md, TECH.md, ART_GUIDE.md
  Assets/_Project/
    Scripts/
      Core/             GameBootstrap, EventBus, ServiceLocator, SaveSystem
      Droids/           Droid, DroidLoadout, DroidStats, IDroidBrain, PlayerBrain, AIBrain
      Components/       ComponentDefinition(SO), Slot, Weapon/Drive/Power/Chassis/Device-Logik
      Combat/           Laser, Heat, Damage, RamImpact, EdgeFall
      Grapple/          Model/ (reines C#, testbar: Board, Wire, Pulse, Resolver)
                        View/ (3D-Platine, Effekte, Touch-Eingabe)
      Camera/           CameraModeController (Iso / Chase / POV), SensorPostFX
      Level/            Deck, Lift, Door, PowerGrid, AlarmSystem, Hazards
      UI/               HUD, Workshop, Codex, Map
    Data/               Droids/, Components/, Boards/ (ScriptableObjects)
    Art/ Audio/ Scenes/ Settings/ (URP-Assets je Qualitätsstufe)
  Tests/EditMode/       Grapple-Regeln, Stats-Berechnung, Loadout-Validierung
```
- Die **Grapple-Logik** ist vollständig von Unity entkoppelt (deterministisch, mit Seed). Dadurch ist sie unit-testbar und auch für den Arcade-Modus und die tägliche Platine nutzbar.
- Die **Kamera-Modi** laufen über Cinemachine-Prioritäten. Der Sensor-Effekt ist ein URP-Renderer-Feature (Fullscreen Pass), das vom Sensor-Bauteil parametrisiert wird.

## 10. Meilensteine
| # | Inhalt | Ergebnis |
|---|---|---|
| **P0** | **Browser-Prototyp** (Three.js + Vite) auf vorhandener Hardware, siehe Abschnitt 10a | **Entscheidung: Macht die Idee Spaß?** |
| | **Unity-Prototyp (nur kostenlose Werkzeuge, M0–M3)**, Start erst bei passender Hardware (Abschnitt 10b) | Kern-Spielschleife in Unity |
| **M0** | Unity-Projekt (über Unity Hub), Git + LFS, Ordnerstruktur, URP-Stufen, Android-Build per APK | Leere Szene läuft auf dem Handy |
| **M1** | Greybox-Deck: Bewegung (Touch/Gamepad), 3 Kamera-Modi mit Übergang, 3 Gegnertypen, Laser, Rammen + Kantensturz | Spielbarer Prototyp |
| **M2** | Grapple-Minispiel: Logik + Tests, danach die 3D-Platine | Kapern funktioniert |
| **M3** | Komponenten, Loadout, Werkstatt, modulare Optik von Klix, Sensor-POV-Effekte | Kern-Spielschleife komplett |
| | **Produktion (Budget-Entscheidung nach dem Prototyp)** | |
| **M4** | **Vertical Slice in Endgrafik:** ein Deck mit Licht, Materialien, VFX, Sound, Performance-Messung auf 2–3 Geräten | Beweis für Realismus und fps |
| **M5** | Inhalte: 5–6 Decks, alle Gegnerklassen, Bosse, Story-Logs, Alarm- und Stromnetz-System | Spiel durchspielbar |
| **M6** | Feinschliff, Lokalisierung, Erfolge, Foto-Modus, Play-Store-Vorbereitung (Interne Tests → Closed Beta) | Release-Kandidat |

### 10a. Phase P0 – Browser-Prototyp (Three.js + Vite)
**Ziel:** in wenigen Wochen herausfinden, ob Kapern, Rammen und Ausschlachten Spaß machen. Grafik ist dabei zweitrangig.
- **Technik:** Three.js + Vite, plain JavaScript (wie Galaxy-Sisters). Node 22 und npm sind installiert. Tests mit `node --test`.
- **Testen:** am NUC im Browser und auf dem Android-Handy im Browser über das WLAN (`vite --host`). Touch-Steuerung wird gleich mitgebaut.
- **Umfang:**
  1. Ein Deck aus Plattformen mit Kanten, Schacht und Lift. Iso-Kamera, drehbar.
  2. Kamerawechsel Iso ↔ Verfolger ↔ Roboter-Sicht mit einfachem Sensor-Effekt (Rauschen/Scanlines als Shader).
  3. Klix und drei Gegnertypen (Klasse 1xx, 3xx, 5xx) mit einfacher KI (Patrouille, Verfolgen, Schießen).
  4. Laser mit Hitze. Rammen mit Masse × Geschwindigkeit und Kantensturz.
  5. **Grapple-Minispiel** als 2D-/2,5D-Platine (Canvas oder Three.js-Overlay).
  6. Ausschlachten: Bauteil-Slots (Waffe, Antrieb, Energie, Chassis, 1 Device) wirken sich spürbar auf Klix aus.
- **Übertragbar nach Unity:** Grapple-Regeln, Stats/Energiebudget und Loadout-Validierung sind **reine Logik-Module ohne Three.js-Abhängigkeit**, mit festem Zufalls-Seed und Unit-Tests. Diese Module und ihre Tests werden später fast 1:1 nach C# übertragen. Wegwerfcode ist nur die Darstellung.
- **Struktur:**
  ```
  iziTron/prototype-web/
    index.html, package.json, vite.config.js
    src/logic/      grapple.js, loadout.js, stats.js   (rein, testbar)
    src/game/       deck.js, droid.js, ai.js, combat.js, camera.js, input.js
    src/ui/         hud.js, grapple-view.js, workshop.js
    tests/          grapple.test.mjs, loadout.test.mjs
  ```
- **Ende von P0:** Spieltest-Checkliste (Abschnitt 11) am PC und Handy. Danach Entscheidung: Regeln anpassen, Unity starten oder Idee verwerfen.

### 10b. Voraussetzungen für den Unity-Start (M0)
Mindestens **eine** der beiden Bedingungen muss erfüllt sein:
- **NUC:** Die X8 wird als USB 3 erkannt (Anschlusspfad „SS…“ statt „HS…“, über 300 MB/s) und ist idealerweise in NTFS umgewandelt. Unity Editor und Projekt liegen dann auf D:. Auf dem NUC geht nur reduzierte Grafik: keine berechnete Beleuchtung, kleine Szenen.
- **Notebook mit:**
  - 4+ Kernen
  - eigener Grafikkarte (ab GTX 1650)
  - 16–32 GB RAM
  - NVMe-SSD mit mehr als 50 GB frei

  Damit ist der volle Plan inklusive Realismus-Pass möglich.

Unabhängig davon auf C: Platz schaffen: `powercfg /h off` (6,4 GB) und Datenträgerbereinigung mit Systemdateien.

**Sofort nach Freigabe dieses Plans (ohne Unity-Editor):**
1. In `C:\Users\Mario\Coding\iziTron` anlegen:
   - `docs/PLAN.md` (dieser komplette Plan)
   - `docs/TOOLS.md` (Werkzeug-Checkliste aus 8a/8b mit Download-Links)
   - `docs/GDD.md` (Spielkonzept aus den Abschnitten 1–7)
   - `docs/TECH.md` (Abschnitte 8–10)
   - `docs/CREDITS.md` (Vorlage für Asset-Lizenzen)
   - `README.md`
   - Unity-`.gitignore` und `.gitattributes` (LFS für fbx/png/psd/wav)
   - `git init`
2. Du erstellst das Unity-6-Projekt über Unity Hub in diesem Ordner (Vorlage „Universal 3D“). Alternativ lege ich es per Kommandozeile an, falls der Unity-Editor installiert ist.
3. Danach M1: C#-Skripte für Droiden-Kern, Kamera-Controller und Greybox.

## 11. Verifikation
- **Pro Meilenstein ein Build auf einem echten Android-Gerät:** Aufnahme mit Profiler und Android GPU Inspector.
- **Budgets:** Frame ≤ 16,6 ms (Oberklasse) bzw. ≤ 22 ms (Mittelklasse), < 250 Draw Calls (SRP Batches), < 800k sichtbare Dreiecke, RAM < 1,5 GB, Temperaturtest mit 15 Minuten Dauerspiel.
- **EditMode-Tests:** Grapple-Regeln, Stats/Energiebudget und Loadout-Validierung laufen in CI (GameCI) bei jedem Push.
- **Spielbarkeit:** Testläufe nach Checkliste je Meilenstein (Kamerawechsel, Rammen an allen Kantentypen, Grapple gegen jede Klasse gewinnen und verlieren).
