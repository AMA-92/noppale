# Guide de déploiement - Assistant IA Noppalé (Vercel Serverless)

## 🎯 Architecture

Serveur backend gratuit avec Vercel Serverless Functions qui utilise directement l'API Claude pour l'assistant vocal.

```
Frontend (noppale.vercel.app) → Backend (noppale-assistant.vercel.app) → Claude API
```

## 📋 Prérequis

1. **Compte Anthropic** avec clé API : https://console.anthropic.com/settings/keys
2. **Compte Vercel** : https://vercel.com
3. **Git** installé sur votre machine

## 🚀 Étapes de déploiement

### 1. Installation des dépendances

```bash
cd assistant-server
npm install
```

### 2. Configuration de la clé API Anthropic

**Option A : Via Vercel Dashboard (recommandé)**
1. Créez un projet Vercel pour le backend
2. Settings → Environment Variables
3. Ajoutez : `ANTHROPIC_API_KEY` = `votre_clé_anthropic`

**Option B : Via CLI**
```bash
vercel env add ANTHROPIC_API_KEY
```

### 3. Déploiement sur Vercel

```bash
# Depuis le dossier assistant-server
vercel
```

Suivez les instructions :
- Sélectionnez "Create new project"
- Choisissez le dossier actuel
- Configurez les variables d'environnement
- Deploy

### 4. Obtenir l'URL du backend

Une fois déployé, Vercel vous donnera une URL comme :
`https://noppale-assistant.vercel.app/api/assistant`

## 🔗 Intégration dans le frontend

### Modifier VoiceSaleAssistant.jsx

Remplacer l'appel Supabase par l'appel au nouveau backend :

```javascript
// Ancien code (Supabase)
const { data, error } = await supabase.functions.invoke('assistant', { 
  body: { messages, currency } 
})

// Nouveau code (Backend Vercel)
const response = await fetch('https://noppale-assistant.vercel.app/api/assistant', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    message: answer, 
    context: { products, sales, expenses },
    language: languageRef.current,
    currency 
  })
})

const data = await response.json()
const assistantResponse = data.response
```

## 💰 Coûts

### Vercel (Gratuit)
- 100GB bandwidth/mois
- 100GB hours of serverless functions/mois
- Suffisant pour usage modéré

### Anthropic API (Pay-as-you-go)
- Claude 3.5 Sonnet : ~$3/1M tokens input, ~$15/1M tokens output
- Pour usage vocal modéré : < $5/mois

## 🎛️ Gestion et monitoring

### Logs
```bash
vercel logs
```

### Variables d'environnement
```bash
vercel env ls
vercel env pull .env.local
```

### Redéploiement
```bash
git add .
git commit -m "Mise à jour assistant"
git push
# Vercel déploie automatiquement
```

## 🔧 Dépannage

### Erreur 401 sur Claude API
- Vérifiez que `ANTHROPIC_API_KEY` est configurée dans Vercel
- Vérifiez que la clé est valide et active

### Erreur CORS
- Le backend est déjà configuré avec CORS
- Vérifiez que l'URL du backend est correcte dans le frontend

### Timeout
- Augmentez le timeout dans Vercel Settings
- Optimisez le prompt pour réduire les tokens

## 📈 Évolutions possibles

1. **Ajouter TTS/STT** : Intégrer ElevenLabs ou Google Speech
2. **Base de données** : Ajouter PostgreSQL pour l'historique
3. **Analytics** : Suivre les questions les plus fréquentes
4. **Cache** : Mettre en cache les réponses similaires

## 🔄 Workflow de développement

1. **Modifier le code** dans `assistant-server/api/assistant.js`
2. **Tester localement** : `vercel dev`
3. **Commit et push** sur GitHub
4. **Vercel déploie automatiquement**
5. **Tester en production**

Cette solution est gratuite, scalable et s'intègre parfaitement avec votre infrastructure Vercel existante.
