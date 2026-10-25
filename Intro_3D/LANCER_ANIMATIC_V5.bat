@echo off
chcp 65001 >nul
setlocal
rem Régénère le découpage v5 depuis la bande-son (audio_v5\audio\rapport_v5.json), puis sert 00_Lab_Vision_2.0 en
rem LECTURE SEULE sur 127.0.0.1:8766 et ouvre l'animatic dans Chrome.
cd /d "%~dp0"
if not exist "audio_v5\audio\rapport_v5.json" (echo Bande-son v5 absente : lancer d'abord audio_v5\LANCER_V5.bat & pause & exit /b 1)
py -3 outils\generer_plans_v5.py || (echo Echec du decoupage. & pause & exit /b 1)
cd /d "%~dp0.."
start "Serveur intro v5 (fermer pour arrêter)" /min py -3 -m http.server 8766 --bind 127.0.0.1
timeout /t 2 >nul
echo.
echo  1 = Animatic de l'intro v5 (avec le son, ~2 min 30, vrais bolides + invocations)
echo  2 = Capture : planche + contrôle de déterminisme
echo  3 = Capture : planche + vidéo MP4 60 images/s 1280 px (sorties\animatic_v5_apercu.mp4)
choice /c 123 /n /m "Votre choix : "
if errorlevel 3 (py -3 "%~dp0outils\capturer_animatic_v5.py" --video & goto :fin)
if errorlevel 2 (py -3 "%~dp0outils\capturer_animatic_v5.py" & goto :fin)
start "" chrome "http://127.0.0.1:8766/Intro_3D/animatic_v5.html"
:fin
echo Fermez la fenêtre « Serveur intro v5 » quand vous avez fini.
pause
