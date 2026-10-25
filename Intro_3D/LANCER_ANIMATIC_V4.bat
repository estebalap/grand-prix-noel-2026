@echo off
chcp 65001 >nul
setlocal
rem Sert 00_Lab_Vision_2.0 en LECTURE SEULE sur 127.0.0.1:8765 et ouvre l'animatic dans Chrome.
rem (les pages 3D lisent teams.json, les logos et la bande-son : un navigateur refuse ces lectures depuis un simple double-clic sur le fichier)
cd /d "%~dp0.."
start "Serveur intro v4 (fermer pour arrêter)" /min py -3 -m http.server 8765 --bind 127.0.0.1
timeout /t 2 >nul
echo.
echo  1 = Animatic de l'intro v4 (103 s, avec le son)
echo  2 = Aperçu du salon
echo  3 = Aperçu de l'arène (ring)
choice /c 123 /n /m "Votre choix : "
if errorlevel 3 (start "" chrome "http://127.0.0.1:8765/Intro_3D/apercu_arene.html" & goto :fin)
if errorlevel 2 (start "" chrome "http://127.0.0.1:8765/Intro_3D/apercu_salon.html" & goto :fin)
start "" chrome "http://127.0.0.1:8765/Intro_3D/animatic_v4.html"
:fin
echo La page est ouverte dans Chrome. Fermez la fenêtre « Serveur intro v4 » quand vous avez fini.
