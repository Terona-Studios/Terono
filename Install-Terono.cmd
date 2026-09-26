@echo off
title Terono installer
echo Installing Terono (theme + plugin). Discord will close and reopen when it is done.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/Terona-Studios/Terono/main/install.ps1 | iex"
echo.
pause
