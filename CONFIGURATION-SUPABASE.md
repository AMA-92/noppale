# Configuration Supabase - Instructions de correction

## 🚨 PROBLÈME ACTUEL

L'URL Supabase dans `.env.example` est incorrecte:
```
VITE_SUPABASE_URL=https://whyeeetelquryhgvprcq.supabase.co
```

Cette URL n'existe pas, ce qui cause l'erreur:
```
Failed to load resource: net::ERR_NAME_NOT_RESOLVED
```

## ✅ SOLUTION ÉTAPE PAR ÉTAPE

### 📋 ÉTAPE 1: Obtenir vos vraies clés Supabase

1. **Allez sur** https://supabase.com/dashboard
2. **Connectez-vous** avec votre email
3. **Sélectionnez** votre projet Noppalé
4. **Allez dans** Settings → API
5. **Copiez** les deux valeurs:
   - **Project URL** (ex: https://abcdefgh.supabase.co)
   - **anon public key** (commence par eyJhbGciOiJIUzI1NiIs...)

### 📋 ÉTAPE 2: Créer le fichier .env

1. **Créez un fichier** nommé `.env` à la racine du projet
2. **Copiez-collez** ce modèle:

```env
# Configuration Supabase - REMPLACEZ AVEC VOS VALEURS RÉELLES
VITE_SUPABASE_URL=https://VOTRE-VRAIE-URL.supabase.co
VITE_SUPABASE_ANON_KEY=VOTRE-VRAIE-CLÉ-ANONYME-ICI
```

3. **Remplacez** les valeurs par celles de votre projet Supabase

### 📋 ÉTAPE 3: Redémarrer l'application

1. **Arrêtez** le serveur de développement (Ctrl+C)
2. **Relancez** avec: `npm run dev`
3. **Rafraîchissez** la page du navigateur (Ctrl+F5)

## 🎯 EXEMPLE CONCRET

Si dans Supabase Dashboard vous avez:
- **Project URL**: https://myproject-abc123.supabase.co
- **anon key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15cHJvamVjdC1hYmMxMjMiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY3ODg3NzQ1MiwiZXhwIjoyMDk0NDUzNDUyfQ.abc123def456ghi789

Votre fichier `.env` devrait contenir:
```env
VITE_SUPABASE_URL=https://myproject-abc123.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15cHJvamVjdC1hYmMxMjMiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY3ODg3NzQ1MiwiZXhwIjoyMDk0NDUzNDUyfQ.abc123def456ghi789
```

## ⚠️ POINTS IMPORTANTS

- **Ne partagez jamais** votre clé anon key publiquement
- **Le fichier .env** est dans .gitignore (non envoyé sur GitHub)
- **Vérifiez bien** l'URL (pas de faute de frappe)
- **Utilisez exactement** la clé fournie par Supabase

## 🔧 VÉRIFICATION

Après avoir créé le fichier `.env`:

1. **Vérifiez** que le fichier existe bien à la racine
2. **Redémarrez** le serveur de développement
3. **Testez** la connexion avec un email/mot de passe valides
4. **Devriez voir** "Connexion réussie !" si tout est bon

## 🚨 SI ÇA NE FONCTIONNE TOUJOURS PAS

1. **Vérifiez** l'URL Supabase (copiez-collez depuis le dashboard)
2. **Vérifiez** la clé anon key (copiez entièrement)
3. **Assurez-vous** que le projet Supabase est actif
4. **Vérifiez** que l'authentification est activée dans Settings → Auth

## 📞 AIDE SUPPLÉMENTAIRE

Si vous avez besoin d'aide:
1. **Faites une capture** d'écran de vos clés Supabase
2. **Montrez** votre fichier `.env` (cachez la clé)
3. **Partagez** l'erreur exacte que vous voyez

---

**Une fois le fichier `.env` correctement configuré, l'application fonctionnera normalement !** 🚀✨
