@echo off
rem Startet den iziTron P0 Browser-Prototyp (http://localhost:5173, im WLAN ueber die angezeigte Network-Adresse)
cd /d "%~dp0prototype-web"
if not exist node_modules call npm install
call npm run dev
