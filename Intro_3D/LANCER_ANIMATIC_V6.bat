@echo off
chcp 65001 >nul
setlocal
rem Intro V6 "L'Hybride Ultime" : regenere le decoupage depuis la bande-son V6 (audio_v6\audio\rapport_v6.json),
rem sert 00_Lab_Vision_2.0 en LECTURE SEULE sur 127.0.0.1:8767 et ouvre l'intro dans Chrome.
cd /d "%~dp0"
if not exist "audio_v6\audio\rapport_v6.json" (echo Bande-son V6 absente : lancer d'abord audio_v6\LANCER_V6.bat & pause & exit /b 1)
py -3 outils\generer_plans_v6.py || (echo Echec du decoupage. & pause & exit /b 1)
cd /d "%~dp0.."
start "Serveur intro V6 (fermer pour arreter)" /min py -3 -m http.server 8767 --bind 127.0.0.1
timeout /t 2 >nul
echo.
echo  1 = Intro V6 dans Chrome (avec le son ; Espace lecture/pause, fleches image par image, PgPrec/PgSuiv plan par plan)
echo  2 = Capture : planche (1 image par plan) + planche de CONTROLE v5 / V6 + determinisme + erreurs console
echo  3 = Capture : planche + video MP4 1920 px 60 images/s avec le son (sorties\intro_v6_hybride.mp4)
choice /c 123 /n /m "Votre choix : "
if errorlevel 3 (py -3 "%~dp0outils\capturer_animatic_v6.py" --video & goto :fin)
if errorlevel 2 (py -3 "%~dp0outils\capturer_animatic_v6.py" --comparer-v5 & goto :fin)
start "" chrome "http://127.0.0.1:8767/Intro_3D/animatic_v6.html"
:fin
echo Fermez la fenetre "Serveur intro V6" quand vous avez fini.
pause
