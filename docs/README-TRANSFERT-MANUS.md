# Transfert du projet Noppalé vers un autre espace Manus

## État actuel

Le projet est actuellement à **l’étape 3 de l’intégration de Claude**. L’étape 3 concerne le comportement conversationnel de l’assistant vocal : réponses courtes, une question à la fois, respect de la langue choisie et absence de longues listes spontanées.

Le dernier correctif vocal a également été publié : le microphone reste actif pendant la session, l’assistant peut être interrompu lorsque l’utilisateur parle et l’écoute redémarre après chaque réponse.

## Contenu de l’archive

| Dossier | Contenu |
|---|---|
| `production-app/` | Version principale de l’application issue du projet relié à GitHub et Vercel, sans historique Git, dépendances installées ni build généré. |
| `working-copy/` | Copie de travail comprenant notamment les fonctions Supabase Edge Functions et le guide de migration Claude. |
| `docs/` | Feuille de route, informations de reconnexion et instructions de reprise. |

## Reprendre le travail dans le nouvel espace Manus

1. Importer et décompresser cette archive.
2. Ouvrir `production-app/` comme projet principal frontend.
3. Ouvrir `working-copy/supabase/functions/assistant/index.ts` pour continuer l’étape 3 côté Claude.
4. Reconnecter manuellement les services dans le nouvel espace : GitHub, Supabase et Vercel. Aucun jeton ni mot de passe n’est inclus dans l’archive.
5. Vérifier les secrets Supabase `ANTHROPIC_API_KEY` et `ANTHROPIC_MODEL` dans le nouveau projet Supabase.
6. Tester l’assistant en français, wolof, arabe et anglais avant de passer à l’étape 4.

## Sécurité

Cette archive ne contient pas :

- de dossier `.git` ou d’identifiants GitHub ;
- de clé Anthropic, OpenAI, Supabase ou Vercel ;
- de fichier `.env` ;
- de jeton d’accès, mot de passe ou fichier de credentials ;
- de dépendances `node_modules` ou de fichiers de build volumineux.

Les URLs et identifiants publics de projet nécessaires à la reconnexion sont documentés séparément dans `CONFIGURATION-SERVICES.md`.

## Important

Ne pas supprimer `working-copy/supabase/functions/assistant/index.ts` : c’est la fonction backend qui appelle Claude. Ne pas mettre de clé API dans le frontend. Les clés doivent rester dans les secrets Supabase Edge Functions.
