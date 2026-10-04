# iziTron – Werkzeug-Checkliste (Prototyp, alles kostenlos)

Stand: 04.10.2026. Bereits vorhanden auf diesem PC: Git + Git LFS 3.7.1, VS Code, Node 22 + npm, Unity Hub, Blender, Material Maker, Krita, Audacity, scrcpy.

> **Phase P0 (Browser-Prototyp)** braucht keine weiteren Werkzeuge. Node und npm reichen, Three.js und Vite kommen per `npm install` ins Projekt.
> Den **Unity 6 Editor mit Android-Modulen** erst installieren, wenn die Voraussetzungen aus [PLAN.md, Abschnitt 10b](PLAN.md) erfüllt sind.

## 1. Pflicht für M0/M1

| ✔ | Werkzeug | Wozu | Installation |
|---|---|---|---|
| [ ] | **Unity-Konto** (Personal) | Lizenz für den Editor (kostenlos bis 200k $ Umsatz/Jahr) | https://id.unity.com |
| [ ] | **Unity Hub** | Verwaltet Editor-Versionen und Projekte | `winget install --id Unity.UnityHub -e` oder https://unity.com/download |
| [ ] | **Unity 6 LTS Editor** (neueste 6000.x LTS) | Die Engine | Im Unity Hub → *Installs* → *Install Editor* → Reiter LTS |
| [ ] | ↳ Modul **Android Build Support** | Android-Builds (APK/AAB) | Beim Editor-Install anhaken |
| [ ] | ↳ ↳ **OpenJDK** | Java für den Android-Build | Unterpunkt von Android Build Support |
| [ ] | ↳ ↳ **Android SDK & NDK Tools** | SDK, NDK, ADB | Unterpunkt von Android Build Support |
| [ ] | **VS Code-Erweiterungen** „Unity“ + „C# Dev Kit“ (Microsoft) | C#-Code, Debugging | In VS Code → Erweiterungen. In Unity: *Edit → Preferences → External Tools → VS Code* |
| [x] | **Git + Git LFS** | Versionsverwaltung, große Dateien | vorhanden |
| [ ] | **Android-Gerät** vorbereitet | Testen auf echter Hardware | *Einstellungen → Über das Telefon → 7× auf Build-Nummer tippen* → *Entwickleroptionen → USB-Debugging an* + USB-**Daten**kabel |
| [ ] | **Speicherplatz** | ca. 20–25 GB für Unity + Android-Module, dazu einige GB für das Projekt | – |

> Alternative zu VS Code: Visual Studio Community 2022 mit der Workload „Spieleentwicklung mit Unity“ (kann im Unity Hub als Modul mitinstalliert werden).

## 2. Grafik & Sound (ab M1/M2)

| ✔ | Werkzeug | Wozu | Installation |
|---|---|---|---|
| [ ] | **Blender** | Modelle, UVs, Rig, Baken, Texturmalen | `winget install --id BlenderFoundation.Blender -e` |
| [ ] | **Material Maker** | Prozedurale PBR-Texturen (Ersatz für Substance) | `winget install --id RodZill4.MaterialMaker -e` |
| [ ] | **Krita** *oder* **GIMP** | Bildbearbeitung, HUD-Grafiken, Decals | `winget install --id KDE.Krita -e` / `winget install --id GIMP.GIMP.3 -e` |
| [ ] | **Audacity** | Sounds schneiden und bearbeiten | `winget install --id Audacity.Audacity -e` |

## 3. Empfohlen zum Testen

| ✔ | Werkzeug | Wozu | Installation |
|---|---|---|---|
| [ ] | **scrcpy** | Handy-Bildschirm am PC anzeigen und aufnehmen | `winget install --id Genymobile.scrcpy -e` |
| [ ] | **Profiler für den Handy-Chip** | GPU-/Performance-Analyse | Snapdragon: *Snapdragon Profiler* (qualcomm.com). Mali/Tensor/Exynos: *Arm Performance Studio* (developer.arm.com). Alle Chips: *Android GPU Inspector* (gpuinspector.dev) |
| [ ] | Bluetooth-Gamepad (optional) | Controller-Steuerung testen | – |
| [ ] | GitHub-Konto (optional) | Privates Repo als Sicherung | https://github.com |

## 4. Asset-Quellen (nur online, ohne Installation)

| Quelle | Inhalt | Lizenz |
|---|---|---|
| https://polyhaven.com | PBR-Texturen, HDRIs, Modelle | CC0 |
| https://ambientcg.com | PBR-Texturen | CC0 |
| https://quaternius.com | Low-Poly-Sci-Fi und Roboter | CC0 |
| https://kenney.nl | Space Kit, UI, Sounds | CC0 |
| https://freesound.org | Soundeffekte | CC0 / CC-BY (Lizenz je Datei prüfen!) |
| https://sfxr.me (jsfxr), https://sfbgames.itch.io/chiptone | Synthetische Soundeffekte selbst erzeugen | frei |
| https://sonniss.com/gameaudiogdc | Große Sound-Bundles | lizenzfrei, auch kommerziell |
| Meshy / Tripo (Gratis-Kontingent, optional) | KI-generierte 3D-Modelle | **Lizenz der Gratis-Stufe prüfen** (teils nur mit Namensnennung oder nicht kommerziell) |

Jedes verwendete Asset kommt in [CREDITS.md](CREDITS.md).

## 5. Alles auf einmal installieren (PowerShell)

```powershell
winget install --id Unity.UnityHub -e
winget install --id BlenderFoundation.Blender -e
winget install --id RodZill4.MaterialMaker -e
winget install --id KDE.Krita -e
winget install --id Audacity.Audacity -e
winget install --id Genymobile.scrcpy -e
```
Danach im Unity Hub den Unity 6 LTS Editor mit den Android-Modulen installieren (siehe Abschnitt 1).
