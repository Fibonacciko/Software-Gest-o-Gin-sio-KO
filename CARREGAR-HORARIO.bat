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
echo  Entra com o seu utilizador de ginasioko.site,
echo  mostra as aulas que vai criar, e so depois
echo  pergunta se pode escrever.
echo.
echo  A senha aparece como asteriscos. Escreva e
echo  carregue Enter.
echo.

backend\venv\Scripts\python.exe servidor\carregar-horario.py

echo.
pause
