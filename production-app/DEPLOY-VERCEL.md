# Guide de déploiement sur Vercel

## Méthode 1 : Déploiement via l'interface web Vercel (recommandé)

### Étape 1 : Préparer le dépôt Git
1. Assurez-vous que votre code est dans un dépôt Git (GitHub, GitLab, Bitbucket)
2. Poussez votre code vers le dépôt distant

### Étape 2 : Créer un projet Vercel
1. Allez sur [https://vercel.com](https://vercel.com)
2. Connectez-vous avec votre compte (GitHub, GitLab, etc.)
3. Cliquez sur "Add New Project"
4. Importez votre dépôt Git
5. Configurez les paramètres :
   - **Framework Preset**: Vite
   - **Root Directory**: `production-app`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Étape 3 : Configurer les variables d'environnement
Dans les settings du projet Vercel, ajoutez ces variables :
```
VITE_SUPABASE_URL=https://sewgwcxaenssloobnfjk.supabase.co
VITE_SUPABASE_ANON_KEY=votre_clé_anonyme_supabase
VITE_DEFAULT_CURRENCY=FCFA
VITE_ASSISTANT_FUNCTION_URL=https://sewgwcxaenssloobnfjk.supabase.co/functions/v1/assistant
```

### Étape 4 : Déployer
1. Cliquez sur "Deploy"
2. Attendez que le déploiement soit terminé
3. Vous obtiendrez une URL publique (ex: `https://noppale.vercel.app`)

## Méthode 2 : Déploiement via CLI (si le problème est résolu)

Une fois le problème CLI résolu :
```bash
cd production-app
npx vercel
```

Suivez les instructions pour :
1. Connecter votre compte Vercel
2. Configurer le projet
3. Déployer

## Méthode 3 : Utiliser Netlify (alternative)

Si Vercel ne fonctionne pas, essayez Netlify :
1. Allez sur [https://netlify.com](https://netlify.com)
2. Connectez-vous
3. "Add new site" → "Deploy manually"
4. Glissez-déposez le dossier `dist` construit
5. Configurez les variables d'environnement dans les settings

## Test après déploiement

Une fois déployé :
1. Ouvrez l'URL publique sur votre téléphone
2. Testez l'assistant vocal
3. Vérifiez que toutes les fonctionnalités marchent