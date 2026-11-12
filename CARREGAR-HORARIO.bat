@echo off
REM Carrega o horario semanal das aulas em ginasioko.site.
REM Corre-se UMA vez; depois disso o horario mantem-se na propria aplicacao.
chcp 65001 > nul
cd /d "%~dp0"

echo.
echo  ===========================================
echo   HORARIO DAS AULAS - Ginasio KO
echo  ===========================================
echo.
echo  Primeiro mostra-se o que vai ser feito,
echo  sem escrever nada.
echo.

backend\venv\Scripts\python.exe servidor\carregar-horario.py
if errorlevel 1 goto fim

echo.
set /p RESPOSTA="Carregar mesmo? (s/n) "
if /i not "%RESPOSTA%"=="s" goto cancelado

echo.
backend\venv\Scripts\python.exe servidor\carregar-horario.py --a-serio
goto fim

:cancelado
echo.
echo  Cancelado. Nada foi escrito.

:fim
echo.
pause
