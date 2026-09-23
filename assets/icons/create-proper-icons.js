// Création d'icônes de qualité pour Noppale Desktop
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Créer des icônes PNG de différentes tailles (placeholder pour le moment)
const createIconFiles = () => {
  console.log('🎨 Création des icônes Noppale...')
  
  // Pour le moment, on crée des icônes de base
  // En production, il faudra utiliser votre vrai logo
  
  const iconSizes = [16, 32, 48, 64, 128, 256]
  const base64Icon = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  
  iconSizes.forEach(size => {
    const iconPath = path.join(__dirname, `noppale-${size}x${size}.png`)
    fs.writeFileSync(iconPath, Buffer.from(base64Icon, 'base64'))
    console.log(`✅ Créé: noppale-${size}x${size}.png`)
  })
  
  // Créer un fichier ICO simple (Windows)
  const icoPath = path.join(__dirname, 'noppale.ico')
  fs.writeFileSync(icoPath, Buffer.from(base64Icon, 'base64'))
  console.log('✅ Créé: noppale.ico')
  
  // Icônes pour l'installeur
  const setupIco = path.join(__dirname, 'setup-icon.ico')
  fs.writeFileSync(setupIco, Buffer.from(base64Icon, 'base64'))
  console.log('✅ Créé: setup-icon.ico')
  
  const uninstallIco = path.join(__dirname, 'uninstall.ico')
  fs.writeFileSync(uninstallIco, Buffer.from(base64Icon, 'base64'))
  console.log('✅ Créé: uninstall.ico')
  
  console.log('\n📁 Icônes créées avec succès')
  console.log('⚠️  IMPORTANT: Remplacez ces placeholders par votre vrai logo Noppale')
  console.log('📝 Utilisez un outil comme "png2ico" pour créer un vrai fichier .ico')
}

createIconFiles()
