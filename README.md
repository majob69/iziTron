# iziTron

Android-Spiel auf Basis der Spielidee von *Quazatron* (1986): Als kleiner Bergungsdroide säuberst du eine unterirdische Zitadelle. Gegnerische Droiden kaperst du per Platinen-Minispiel und baust dich mit ihren Teilen um. Dazu kommen realistische Grafik und eine umschaltbare Roboter-Sicht (Iso / Verfolger / Optik-POV).

- **Engine:** Unity 6 LTS + URP (Android, Vulkan)
- **Aktuelle Phase: P0**, ein Browser-Prototyp mit Three.js + Vite in `prototype-web/`. Er testet die Spielidee auf der vorhandenen Hardware. Unity folgt, sobald die Hardware passt (siehe [PLAN.md, Abschnitte 10a/10b](docs/PLAN.md)).

## Dokumente
- [docs/PLAN.md](docs/PLAN.md): Spielkonzept, Technik, Architektur, Meilensteine
- [docs/TOOLS.md](docs/TOOLS.md): Werkzeug-Checkliste mit Installationsbefehlen
- [docs/CREDITS.md](docs/CREDITS.md): Asset-Lizenzen

## P0 starten
`start_p0.bat` doppelklicken. Danach im Browser **http://localhost:5173** öffnen, am Handy im selben WLAN die angezeigte Network-Adresse. Details: [prototype-web/README.md](prototype-web/README.md).

## Nächster Schritt
1. **P0:** Der Browser-Prototyp in `prototype-web/` ist spielbar (Deck, Kameras, Gegner, Laser, Rammen, Grapple-Minispiel, Ausschlachten). Als Nächstes folgen Spieltests nach der Checkliste und Feinschliff.
2. Parallel die Hardware für Unity vorbereiten: X8 an USB 3 bringen oder Notebook prüfen, auf C: Platz schaffen.
3. Danach M0: Im Unity Hub ein Projekt mit der Vorlage **„Universal 3D“** und Unity 6 LTS anlegen.
