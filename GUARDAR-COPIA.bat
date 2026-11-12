@echo off
REM Guarda uma copia completa do KO Gym neste computador:
REM o codigo, a base de dados de producao e as fotografias.
chcp 65001 > nul
cd /d "%~dp0"

echo.
echo  ===========================================
echo   COPIA DE SEGURANCA - Ginasio KO
echo  ===========================================
echo.
echo  Vai para a pasta KO-Gym-Copias, no seu
echo  utilizador. Primeiro mostra o que vai
echo  fazer, sem escrever nada.
echo.

backend\venv\Scripts\python.exe servidor\guardar-copia.py
if errorlevel 1 goto fim

echo.
set /p RESPOSTA="Guardar mesmo? (s/n) "
if /i not "%RESPOSTA%"=="s" goto cancelado

echo.
backend\venv\Scripts\python.exe servidor\guardar-copia.py --a-serio
goto fim

:cancelado
echo.
echo  Cancelado. Nada foi escrito.

:fim
echo.
pause
