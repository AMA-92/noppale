#!/usr/bin/env node

/**
 * Script de déploiement automatique vers Vercel
 * Usage: node deploy.js "message de commit"
 */

import { execSync } from 'child_process';

const timestamp = new Date().toLocaleString('fr-FR');
const defaultMessage = `Mise à jour automatique - ${timestamp}`;
const commitMessage = process.argv[2] || defaultMessage;

function deploy() {
  try {
    console.log('🔄 Vérification du statut Git...');
    
    // Vérifier s'il y a des changements
    const status = execSync('git status --short', { encoding: 'utf8' });
    
    if (!status.trim()) {
      console.log('✅ Aucun changement à déployer');
      return;
    }

    console.log('📝 Changements détectés:');
    console.log(status);

    console.log(`\n📌 Ajout des fichiers...`);
    execSync('git add .', { stdio: 'inherit' });

    console.log(`\n💾 Commit: "${commitMessage}"`);
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });

    console.log('\n🚀 Push vers GitHub...');
    execSync('git push origin master', { stdio: 'inherit' });

    console.log('\n✅ Déploiement lancé sur Vercel!');
    console.log('🌐 Votre app sera mise à jour dans quelques secondes...');
    console.log('📱 Vérifiez: https://noppale.vercel.app');

  } catch (error) {
    if (error.message && error.message.includes('nothing to commit')) {
      console.log('✅ Aucun changement à déployer');
    } else if (error.status === 1 && error.message.includes('nothing to commit')) {
      console.log('✅ Aucun changement à déployer');
    } else {
      console.error('❌ Erreur lors du déploiement');
      process.exit(1);
    }
  }
}

deploy();
