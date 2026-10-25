@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
echo === Intro du Grand Prix : mix avec BRUITAGES REELS (voix et musique inchangees) ===
if not exist audio mkdir audio
if not exist sorties mkdir sorties
if not exist "audio\vo_take1.mp3" (
  copy /Y "..\..\Intro_Catch\audio\take1.mp3" "audio\vo_take1.mp3" >nul || (echo Voix introuvable : Intro_Catch\audio\take1.mp3 & goto :err)
)
where ffmpeg >nul 2>nul || (echo ffmpeg introuvable dans le PATH. & goto :err)
py -3 -m pip install --quiet numpy scipy soundfile || goto :err
py -3 telecharger_sons_bbc.py || goto :err
py -3 sound_reel.py || goto :err
ffmpeg -y -v error -i "..\..\Edition_23_Decembre\3_Application\web\videos\intro_grand_prix.mp4" -i "audio\mix_reel.wav" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -movflags +faststart "sorties\intro_grand_prix_SONS_REELS_apercu.mp4" || goto :err
echo.
echo OK : audio\mix_reel.wav et sorties\intro_grand_prix_SONS_REELS_apercu.mp4
echo (l'intro en place dans web\videos n'est pas touchee)
start "" "sorties\intro_grand_prix_SONS_REELS_apercu.mp4"
pause
exit /b 0
:err
echo ECHEC : rien n'a ete remplace.
pause
exit /b 1
