# Configuration des variables d'environnement Vercel

## 🚨 IMPORTANT : Vous devez configurer ces variables dans Vercel pour que l'authentification fonctionne

### Étapes pour configurer les variables dans Vercel

1. **Allez sur votre projet Vercel**
   - Connectez-vous sur [https://vercel.com](https://vercel.com)
   - Sélectionnez votre projet Noppalé

2. **Accédez aux Settings**
   - Cliquez sur l'onglet "Settings"
   - Puis sur "Environment Variables"

3. **Ajoutez les variables suivantes**

#### Variable 1 : VITE_SUPABASE_URL
- **Nom** : `VITE_SUPABASE_URL`
- **Valeur** : `https://sewgwcxaenssloobnfjk.supabase.co`
- **Environnements** : Production, Preview, Development

#### Variable 2 : VITE_SUPABASE_ANON_KEY
- **Nom** : `VITE_SUPABASE_ANON_KEY`
- **Valeur** : `[VOTRE CLÉ ANONYME SUPABASE]`
- **Environnements** : Production, Preview, Development

#### Variable 3 : VITE_DEFAULT_CURRENCY
- **Nom** : `VITE_DEFAULT_CURRENCY`
- **Valeur** : `FCFA`
- **Environnements** : Production, Preview, Development

#### Variable 4 : VITE_ASSISTANT_FUNCTION_URL
- **Nom** : `VITE_ASSISTANT_FUNCTION_URL`
- **Valeur** : `https://sewgwcxaenssloobnfjk.supabase.co/functions/v1/assistant`
- **Environnements** : Production, Preview, Development

### 🔑 Comment obtenir votre clé anonyme Supabase

1. Allez sur [https://supabase.com/dashboard/project/sewgwcxaenssloobnfjk/settings/api](https://supabase.com/dashboard/project/sewgwcxaenssloobnfjk/settings/api)
2. Copiez la valeur de "anon public"
3. Collez-la dans la variable `VITE_SUPABASE_ANON_KEY`

### 🔄 Redéploiement après configuration

Une fois les variables configurées :
1. Cliquez sur "Deployments" dans Vercel
2. Cliquez sur les trois points (...) à côté du dernier déploiement
3. Sélectionnez "Redeploy"
4. Attendez que le redéploiement soit terminé

### ✅ Vérification

Après redéploiement :
1. Ouvrez l'URL de votre application
2. Essayez de vous connecter avec vos identifiants
3. Si ça ne marche toujours pas, vérifiez les logs dans Vercel

## 🆘 En cas de problème

Si l'authentification ne fonctionne toujours pas après configuration :
1. Vérifiez que les variables sont bien configurées dans les 3 environnements (Production, Preview, Development)
2. Vérifiez que la clé anonyme est correcte (commence par `eyJ...`)
3. Consultez les logs de déploiement dans Vercel
4. Contactez le support si nécessaire