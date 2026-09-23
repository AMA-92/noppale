@echo off
echo =====================================
echo    RESTAURATION DU FICHIER .ENV
echo =====================================
echo.
echo Restauration de .env depuis la sauvegarde...
echo.

if exist .env.backup (
    copy .env.backup .env >nul
    if exist .env (
        echo ✅ .env restaure avec succes !
        echo.
        echo Contenu restaure:
        type .env
        echo.
        echo Redemarrez votre serveur avec: npm run dev
    ) else (
        echo ❌ Erreur lors de la restauration
    )
) else (
    echo ❌ Fichier .env.backup non trouve
    echo.
    echo Creer d'abord le fichier .env.backup avec votre configuration
)

echo.
pause
