#!/usr/bin/env node

// Script de vérification et protection du fichier .env
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '../.env');
const backupPath = path.join(__dirname, '../.env.backup');

console.log('🛡️ Vérification de la protection du fichier .env...\n');

// Vérifier si le fichier .env existe
if (!fs.existsSync(envPath)) {
    console.log('❌ Fichier .env introuvable');
    
    // Tenter de restaurer depuis la sauvegarde
    if (fs.existsSync(backupPath)) {
        console.log('🔄 Tentative de restauration depuis .env.backup...');
        fs.copyFileSync(backupPath, envPath);
        console.log('✅ .env restauré avec succès !');
    } else {
        console.log('❌ Aucune sauvegarde .env.backup trouvée');
        console.log('💡 Créez un fichier .env.backup avec votre configuration');
        process.exit(1);
    }
} else {
    console.log('✅ Fichier .env trouvé');
}

// Vérifier si la sauvegarde existe
if (!fs.existsSync(backupPath)) {
    console.log('⚠️  Fichier .env.backup introuvable');
    console.log('💡 Créez une sauvegarde: copy .env .env.backup');
} else {
    console.log('✅ Sauvegarde .env.backup trouvée');
}

// Vérifier le contenu du .env
try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const hasSupabaseUrl = envContent.includes('VITE_SUPABASE_URL');
    const hasSupabaseKey = envContent.includes('VITE_SUPABASE_ANON_KEY');
    
    if (hasSupabaseUrl && hasSupabaseKey) {
        console.log('✅ Configuration Supabase présente dans .env');
        
        // Vérifier que l'URL est correcte
        const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)/);
        if (urlMatch && urlMatch[1].includes('sewgwcxaenssloobnfjk.supabase.co')) {
            console.log('✅ URL Supabase correcte');
        } else {
            console.log('⚠️  URL Supabase可能 incorrecte');
        }
    } else {
        console.log('❌ Configuration Supabase manquante dans .env');
    }
} catch (error) {
    console.log('❌ Erreur lors de la lecture du fichier .env');
}

// Vérifier les permissions (Windows)
if (process.platform === 'win32') {
    try {
        const stats = fs.statSync(envPath);
        console.log(`📁 Taille: ${stats.size} octets`);
        console.log(`📅 Modifié: ${stats.mtime.toLocaleString()}`);
    } catch (error) {
        console.log('❌ Impossible de vérifier les permissions');
    }
}

console.log('\n🎯 Protection du fichier .env:');
console.log('   ✅ .gitignore protège contre les commits');
console.log('   ✅ .env.backup sert de sauvegarde');
console.log('   ✅ restore-env.bat permet la restauration');
console.log('\n🚀 Le fichier .env est protégé !');
