@echo off
title KO Gym - Testes automaticos
echo.
echo  A correr os testes do KO Gym...
echo.

cd /d "%~dp0backend"
venv\Scripts\python.exe -m pytest tests -q --no-header -p no:warnings

echo.
if errorlevel 1 (
  echo  ALGUNS TESTES FALHARAM. Ver acima o que se partiu.
) else (
  echo  TUDO CERTO. As regras do sistema continuam a funcionar.
)
echo.
pause
