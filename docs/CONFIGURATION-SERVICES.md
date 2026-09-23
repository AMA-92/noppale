# Configuration des services à reconnecter

Ce document conserve les repères techniques du projet, mais aucune information d’authentification.

## GitHub

- Dépôt : `https://github.com/AMA-92/noppale`
- Branche de production : `master`
- Dernier correctif vocal publié : commit `133401ba82c5ed5a8b147a389f312781ec892413`
- Action dans le nouvel espace Manus : reconnecter GitHub avec un compte disposant des droits d’écriture sur ce dépôt.

## Vercel

- Projet : `noppale`
- Domaine de production : `https://noppale.vercel.app`
- Déploiement du correctif vocal : le déploiement lié au commit `133401b` est `Ready`, `Latest` et `Current`.
- Action dans le nouvel espace Manus : reconnecter Vercel au dépôt GitHub et vérifier que la branche `master` est la branche de production.

## Supabase

- Projet : `Noppale`
- Project ref : `sewgwcxaenssloobnfjk`
- URL publique du projet : `https://sewgwcxaenssloobnfjk.supabase.co`
- Fonction assistant : `https://sewgwcxaenssloobnfjk.supabase.co/functions/v1/assistant`
- Tableau de bord Edge Functions : `https://supabase.com/dashboard/project/sewgwcxaenssloobnfjk/functions`
- Fonction à utiliser : `assistant`
- Action dans le nouvel espace Manus : reconnecter Supabase et redéployer les fonctions depuis `working-copy/supabase/functions/`.

## Secrets Supabase à recréer manuellement

Créer ou vérifier ces secrets dans le nouveau projet Supabase :

| Secret | Valeur |
|---|---|
| `ANTHROPIC_API_KEY` | La clé Anthropic de l’utilisateur, à saisir uniquement dans Supabase. |
| `ANTHROPIC_MODEL` | `claude-haiku-4-5` ou l’identifiant Anthropic actuellement disponible dans le compte. |

Ne jamais écrire ces valeurs dans un fichier du projet ou dans GitHub.

## Ordre recommandé après transfert

1. Reconnecter Supabase et vérifier les secrets.
2. Déployer `assistant` depuis `working-copy/supabase/functions/assistant/index.ts`.
3. Tester l’étape 3 avec une question courte sur les capacités de Noppalé.
4. Vérifier les logs Supabase et l’absence d’erreur Anthropic 404.
5. Reconnecter GitHub puis Vercel.
6. Déployer le frontend et tester le microphone persistant.
7. Passer à l’étape 4 uniquement après validation de l’étape 3.
