# Guide de déploiement complet - Backend Assistant IA

## 🎯 Objectif
Déployer le serveur backend de l'assistant IA sur Vercel (gratuit) et l'intégrer au frontend.

## 📋 Prérequis

1. **Clé API Anthropic** : https://console.anthropic.com/settings/keys
2. **Compte Vercel** : https://vercel.com (existant pour le frontend)
3. **Node.js 18+** installé localement

## 🚀 Étape 1 : Préparation du backend

### 1.1 Installer les dépendances
```bash
cd assistant-server
npm install
```

### 1.2 Créer un fichier .env.local (test local)
```bash
echo "ANTHROPIC_API_KEY=votre_clé_anthropic" > .env.local
```

### 1.3 Tester localement (optionnel)
```bash
npm install -g vercel
vercel dev
```
Le backend sera accessible sur `http://localhost:3000/api/assistant`

## 🌐 Étape 2 : Déploiement sur Vercel

### 2.1 Créer un nouveau projet Vercel
1. **Allez sur** [https://vercel.com](https://vercel.com)
2. **Cliquez sur "Add New Project"**
3. **Importez le dépôt GitHub** `AMA-92/noppale`
4. **Configurez le projet** :
   - **Project Name** : `noppale-assistant`
   - **Root Directory** : `assistant-server`
   - **Framework Preset** : Other
   - **Build Command** : (laisser vide)
   - **Output Directory** : (laisser vide)

### 2.2 Configurer les variables d'environnement
Dans **Settings → Environment Variables**, ajoutez :

```
ANTHROPIC_API_KEY = sk-ant-votre_clé_anthropic
```

**IMPORTANT** : N'utilisez JAMAIS la clé dans le code !

### 2.3 Déployer
1. **Cliquez sur "Deploy"**
2. **Attendez que le déploiement soit terminé**
3. **Notez l'URL** (ex: `https://noppale-assistant.vercel.app`)

## 🔗 Étape 3 : Intégration dans le frontend

### 3.1 Mettre à jour les variables Vercel frontend
Dans le projet **noppale** (frontend), ajoutez :

```
VITE_ASSISTANT_BACKEND_URL = https://noppale-assistant.vercel.app/api/assistant
```

### 3.2 Redéployer le frontend
1. **Le code est déjà modifié** dans `VoiceSaleAssistant.jsx`
2. **Les commits sont déjà pushés** sur GitHub
3. **Vercel déploiera automatiquement**

## ✅ Étape 4 : Test complet

### 4.1 Tester le backend directement
```bash
curl -X POST https://noppale-assistant.vercel.app/api/assistant \
  -H "Content-Type: application/json" \
  -d '{"message": "Bonjour", "language": "fr-FR", "currency": "FCFA"}'
```

### 4.2 Tester l'application complète
1. **Ouvrez** `https://noppale.vercel.app`
2. **Connectez-vous**
3. **Activez l'assistant vocal**
4. **Testez avec "Bonjour"**

## 🔧 Dépannage

### Backend ne répond pas
- **Vérifiez les logs** dans Vercel Dashboard
- **Vérifiez la clé API** Anthropic
- **Testez localement** avec `vercel dev`

### Erreur CORS
- Le backend a déjà CORS configuré
- Vérifiez que l'URL est correcte dans le frontend

### Frontend utilise toujours Supabase
- Vérifiez que `VITE_ASSISTANT_BACKEND_URL` est configurée
- Redéployez le frontend après configuration

## 💰 Coûts

- **Vercel Backend** : Gratuit (100GB bandwidth/mois)
- **Vercel Frontend** : Gratuit (100GB bandwidth/mois)
- **Anthropic API** : ~$3-5/mois pour usage modéré

## 🔄 Workflow futur

### Pour modifier l'assistant :
1. **Modifiez** `assistant-server/api/assistant.js`
2. **Testez localement** : `vercel dev`
3. **Commit et push** sur GitHub
4. **Vercel déploie automatiquement**

### Pour modifier le frontend :
1. **Modifiez** le code React
2. **Commit et push** sur GitHub
3. **Vercel déploie automatiquement**

## 📊 Monitoring

### Logs backend
```bash
vercel logs --scope noppale-assistant
```

### Variables d'environnement
```bash
vercel env ls --scope noppale-assistant
```

Cette architecture est gratuite, scalable et résoutra vos problèmes avec l'assistant vocal !