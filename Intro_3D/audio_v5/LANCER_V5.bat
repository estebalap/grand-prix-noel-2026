@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
echo === Intro v5 : bande-son (appel des écuries allongé + signature sonore de chaque écurie) ===
where ffmpeg >nul 2>nul || (echo ffmpeg introuvable dans le PATH. & goto :err)
py -3 -m pip install --quiet numpy scipy soundfile || goto :err
py -3 telecharger_sons_bbc.py || goto :err
py -3 telecharger_sons_ecuries.py || goto :err
py -3 sound_v5.py || goto :err
echo.
echo OK : audio\mix_v5.wav  (+ audio\rapport_v5.json : temps de chaque mot et de chaque signature)
echo Pour que limage suive : lancer ..\outils\generer_plans_v5.py (fait automatiquement par LANCER_ANIMATIC_V5.bat)
pause
exit /b 0
:err
echo ECHEC.
pause
exit /b 1
