@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
echo === Intro v4 : bande-son complete (voix ElevenLabs + musique + bruitages reels) ===
where ffmpeg >nul 2>nul || (echo ffmpeg introuvable dans le PATH. & goto :err)
py -3 -m pip install --quiet numpy scipy soundfile || goto :err
py -3 telecharger_sons_bbc.py || goto :err
py -3 sound_v4.py || goto :err
echo.
echo OK : audio\mix_v4.wav  (+ audio\rapport_v4.json : temps de chaque mot dans le film)
pause
exit /b 0
:err
echo ECHEC.
pause
exit /b 1
