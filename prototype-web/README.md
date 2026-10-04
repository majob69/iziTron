# iziTron – P0 Browser-Prototyp

Spielbarer Prototyp zum Testen der Spielidee (siehe [../docs/PLAN.md](../docs/PLAN.md), Abschnitt 10a).
Three.js + Vite, keine externen Assets: Texturen, Modelle und Töne werden im Code erzeugt.

## Starten

```bash
npm install
npm run dev
```

- PC: http://localhost:5173
- **Handy (gleiches WLAN):** `http://<IP-des-PCs>:5173`, die Adresse zeigt Vite beim Start unter „Network“ an. Beim ersten Mal fragt die Windows-Firewall eventuell nach, ob Node.js im privaten Netzwerk erlaubt werden soll.
- Alternativ: `start_p0.bat` im Projektordner doppelklicken.

```bash
npm test        # Unit-Tests der Spiellogik (Grapple, Loadout)
npm run build   # Produktions-Build nach dist/
```

## Steuerung

| Aktion | Tastatur | Gamepad | Touch |
|---|---|---|---|
| Bewegen | WASD / Pfeile | linker Stick | Stick links (erscheint, wo du tippst) |
| Feuern | Leertaste | A / RT | FEUER |
| Rammstoß | Shift | B | RAMMEN |
| Kapern / Werkstatt | F | X | KAPERN |
| Sicht wechseln (Iso → Verfolger → Optik) | C | Y | SICHT |
| Iso drehen | Q / E | LB / RB | ⟲ ⟳ |
| Zoom | Mausrad | rechter Stick | – |
| Menü | Esc | Start | ☰ |
| Grafikstufe | P | – | Menü |

Im Minispiel: links in eine Leitung tippen, oder ↑/↓ und Leertaste.

## Was der Prototyp zeigt

- **Deck 1** mit Plattformen, schmalen Stegen, Stromgittern, Pfeilern und zwei Werkstatt-Terminals
- **Drei Kameras** mit Kameraflug: Taktik-Iso, Verfolger, Optik-Sicht. Wie die Optik-Sicht aussieht, hängt vom Sensor ab (Billig-Optik, Militär-Optik, Thermalsensor).
- **Gegner:** 123 Putzdroide (harmlos, flieht), 349 Lastdroide (rammt dich von den Kanten), 516 Wachdroide (Laser, Schild)
- **Drei Kampfwege:** Laser mit Hitze, Rammen mit Absturz (physikbasiert, Masse × Tempo), Kapern
- **Grapple-Minispiel:** Platine mit 12 Leitungen. Sonderleitungen: Split, unterbrochen, Inverter, Verzögerer. Pulser kommen von der Energie, die Impulsdauer vom Chassis. Angeschossene Gegner haben weniger Pulser.
- **Ausschlachten & Werkstatt:** Teile einbauen oder einlagern. Energiebudget, Masse, Trägheit, Verschleiß und Set-Boni wirken sich aus. Das Modell von Klix setzt sich sichtbar aus den eingebauten Teilen zusammen.

## Struktur

```
src/logic/   reine Spiellogik ohne Three.js (wird später nach Unity/C# übertragen)
src/data/    Bauteile, Droiden-Typen, Deck-Karte
src/game/    3D-Welt: Deck, Droiden, Physik, KI, Kamera, Eingabe, Effekte, Töne
src/ui/      HUD, Minispiel, Ausschlachten/Werkstatt
tests/       node --test
```

## Spieltest-Checkliste (Ende P0)

- [ ] Macht das Kapern Spaß? Ist das Risiko spürbar, und lohnt die Belohnung?
- [ ] Gibt es den Moment, in dem ein neues Teil Klix spürbar stärker macht?
- [ ] Funktioniert Rammen von der Kante zuverlässig, auch gegen Klix selbst?
- [ ] Hat jede Kamera einen Sinn? Wird die Optik-Sicht freiwillig benutzt?
- [ ] Touch-Steuerung am Handy: präzise genug? Ist das Minispiel mit dem Finger spielbar?
- [ ] Schwierigkeit: 123 leicht, 349 nur mit Plan, 516 nur nach Aufrüsten oder Anschießen?
- [ ] FPS am Handy (Anzeige oben rechts) bei „Mittel“?
