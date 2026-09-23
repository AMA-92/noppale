# Script pour configurer le pare-feu Windows pour Vite Dev Server
# Exécutez ce script en tant qu'administrateur

Write-Host "Configuration du pare-feu Windows pour Vite Dev Server..." -ForegroundColor Yellow

# Ajouter une règle pour autoriser le port 5173
try {
    New-NetFirewallRule -DisplayName "Vite Dev Server" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
    Write-Host "✅ Règle de pare-feu ajoutée avec succès!" -ForegroundColor Green
    Write-Host "Vous pouvez maintenant accéder à http://192.168.1.188:5173 depuis votre téléphone" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erreur lors de la configuration: $_" -ForegroundColor Red
    Write-Host "Essayez d'exécuter ce script en tant qu'administrateur" -ForegroundColor Yellow
}

Write-Host "`nAppuyez sur n'importe quelle touche pour continuer..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")