@echo off
echo Demarrage de ngrok pour Vite Dev Server...
echo.
echo Ce script va creer un tunnel public accessible depuis votre telephone.
echo.
echo Appuyez sur Ctrl+C pour arreter ngrok.
echo.
ngrok http 5173
pause