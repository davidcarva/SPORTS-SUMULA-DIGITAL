@echo off
rem Abre o programa que corta os clipes, vigiando a pasta do Google Drive.
rem Dois cliques neste arquivo bastam. Feche a janela para parar.
cd /d "%~dp0"
.venv\Scripts\python.exe servidor.py --drive
pause
