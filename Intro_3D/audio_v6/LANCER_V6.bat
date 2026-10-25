@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
echo === Intro V6 "L'Hybride Ultime" : bande-son continue (fondus cos/sin, risers, sub-drops, sidechain lisse) ===
where ffmpeg >nul 2>nul || (echo ffmpeg introuvable dans le PATH. & goto :err)
py -3 -m pip install --quiet numpy scipy soundfile || goto :err
rem Les sons reels (banque BBC) et les themes sont lus dans ..\audio_v5 : le telechargement ne se fait qu'une fois.
py -3 ..\audio_v5\telecharger_sons_bbc.py || goto :err
py -3 sound_v6.py || goto :err
echo.
echo OK : audio\mix_v6.wav  (+ audio\rapport_v6.json : mots, signatures, impacts, diagnostic de pompage)
echo Pour que l'image suive : ..\LANCER_ANIMATIC_V6.bat (regenere le decoupage automatiquement)
pause
exit /b 0
:err
echo ECHEC.
pause
exit /b 1
