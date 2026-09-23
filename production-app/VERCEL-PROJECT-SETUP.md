# Configuration Vercel - Projet Noppale

## ⚠️ IMPORTANT : Nom du projet Vercel

Le projet Vercel DOIT être nommé **`noppale`** et non **`noppale-desktop`**

### Instructions pour corriger le nom du projet

1. **Connectez-vous sur Vercel** : https://vercel.com
2. **Allez sur le projet actuel** (noppale-desktop)
3. **Settings → General**
4. **Changez "Project Name" de** `noppale-desktop` **à** `noppale`
5. **Cliquez sur "Save"**
6. **Redéployez** le projet

### Alternative : Créer un nouveau projet

Si le renommage ne fonctionne pas :
1. **Créez un nouveau projet** nommé `noppale`
2. **Importez le même dépôt GitHub** (`AMA-92/noppale`)
3. **Configurez les variables d'environnement** (voir VERCEL-ENV-SETUP.md)
4. **Supprimez l'ancien projet** `noppale-desktop`

## 🔧 Configuration des variables d'environnement

### Variables requises dans Vercel Settings → Environment Variables

```
VITE_SUPABASE_URL = https://sewgwcxaenssloobnfjk.supabase.co
VITE_SUPABASE_ANON_KEY = [votre clé anonyme Supabase]
VITE_DEFAULT_CURRENCY = FCFA
VITE_ASSISTANT_FUNCTION_URL = https://sewgwcxaenssloobnfjk.supabase.co/functions/v1/assistant
```

### Comment obtenir la clé anonyme Supabase

1. Allez sur [https://supabase.com/dashboard/project/sewgwcxaenssloobnfjk/settings/api](https://supabase.com/dashboard/project/sewgwcxaenssloobnfjk/settings/api)
2. Copiez la valeur "anon public"
3. Collez-la dans `VITE_SUPABASE_ANON_KEY`

## 📱 Problème d'affichage sur mobile

Si l'application se charge mais ne s'affiche pas sur téléphone :

### 1. Vérifiez le Content-Security-Policy
Le fichier `vercel.json` contient maintenant une CSP compatible mobile avec :
- `script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:`
- Autorisation des blobs pour les scripts dynamiques

### 2. Consultez les logs
1. **Ouvrez Vercel Dashboard**
2. **Allez dans l'onglet "Deployments"**
3. **Cliquez sur le dernier déploiement**
4. **Consultez les "Build Logs" et "Function Logs"**

### 3. Testez sur ordinateur d'abord
1. **Ouvrez** `https://noppale.vercel.app` sur ordinateur
2. **F12 → Console** pour voir les erreurs
3. **Résolvez les erreurs** avant de tester sur mobile

### 4. Vérifiez le cache
- **Rafraîchissez la page** sur téléphone (Ctrl+F5 ou glisser vers le bas)
- **Désactivez le cache** du navigateur temporairement
- **Essayez en mode navigation privée**

## 🚀 Workflow de déploiement

### Après chaque modification de code :

1. **Commit et push sur GitHub**
   ```bash
   git add .
   git commit -m "Description du changement"
   git push origin master
   ```

2. **Vercel déploie automatiquement**
   - Vérifiez que le projet cible est bien `noppale`
   - Attendez que le déploiement soit terminé
   - Testez sur `https://noppale.vercel.app`

### Si le déploiement échoue :

1. **Consultez les logs dans Vercel**
2. **Vérifiez les variables d'environnement**
3. **Assurez-vous que le build est en local** : `npm run build`

## 📋 Check-list avant déploiement

- [ ] Projet Vercel nommé `noppale` (pas `noppale-desktop`)
- [ ] Variables d'environnement configurées
- [ ] Build local réussi : `npm run build`
- [ ] Code pushé sur GitHub
- [ ] Déploiement Vercel terminé
- [ ] Test sur ordinateur
- [ ] Test sur mobile