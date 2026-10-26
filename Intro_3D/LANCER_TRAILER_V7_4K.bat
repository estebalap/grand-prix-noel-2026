@echo off
rem Trailer V7 "Multivers -> Ring" : serveur local + temps reel ou rendu video (1080p / MASTER 4K).
rem Sert la racine du depot OU 00_Lab_Vision_2.0 (dossier parent d'Intro_3D) : l'URL est la meme dans les deux cas.
setlocal
cd /d "%~dp0"
set "V7=%~dp0v7_multivers_4k"
rem V7.1 : la bande-son est (re)calculee si elle manque, si elle est plus ancienne que le script ou le plan, ou si elle a ete
rem faite sans les vrais extraits (restaurer AUDIO_REEL_INTRO_3D*.zip avec RESTAURER_AUDIO_REEL.py) ; sinon rien n'est refait.
if not exist "%~dp0audio_v5\themes_ecuries\01_*.mp3" echo ATTENTION : extraits reels absents (audio_v5\themes_ecuries) - restaurer le pack audio pour le vrai son.
pushd "%V7%"
py -3 sound_v7_crescendo.py --si-perime
popd
cd /d "%~dp0.."
start "Serveur trailer V7 (fermer pour arreter)" /min py -3 -m http.server 8767 --bind 127.0.0.1
timeout /t 2 >nul
echo.
echo  1 = Temps reel dans le navigateur (Chrome)
echo  2 = Rendu 1080p 60 images/s  (sorties\trailer_v7_1080p.mp4)
echo  3 = Rendu MASTER 4K 3840x2160 60 images/s CGI  (sorties\trailer_v7_4k.mp4, plusieurs heures)
choice /c 123 /n /m "Votre choix : "
if errorlevel 3 (py -3 "%V7%\render_v7_4k.py" --qualite 4k --gpu & goto :fin)
if errorlevel 2 (py -3 "%V7%\render_v7_4k.py" --qualite 1080p --gpu & goto :fin)
start "" chrome "http://127.0.0.1:8767/Intro_3D/v7_multivers_4k/index.html"
:fin
echo Fermez la fenetre "Serveur trailer V7" quand vous avez fini.
pause
