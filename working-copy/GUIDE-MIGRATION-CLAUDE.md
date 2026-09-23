# Migration de l’assistant vocal Noppalé vers Claude

## État actuel

Le projet possède déjà :

- un composant vocal côté React : `src/components/VoiceSaleAssistant.jsx` ;
- une fonction Supabase `assistant` pour les réponses IA et les lectures de données ;
- des fonctions séparées pour la transcription et la synthèse vocale ;
- des actions métier avec confirmation vocale pour les ventes, dépenses et produits.

La fonction `supabase/functions/assistant/index.ts` a été migrée du format OpenAI Chat Completions vers l’API Anthropic Messages. Une copie de l’ancienne version est conservée dans `supabase/functions/assistant/index.openai.backup.ts`.

Le build frontend passe avec `npm run build`.

## Point important : Claude Code n’est pas automatiquement l’API Anthropic

Un compte ou un abonnement Claude Code permet d’utiliser Claude Code comme outil de développement, mais l’application Noppalé doit appeler l’API Anthropic avec une **clé API Anthropic** créée dans la Claude Console.

La clé à utiliser côté serveur commence généralement par `sk-ant-`. Elle doit être créée dans [Claude Console → Settings → API keys](https://platform.claude.com/settings/keys). Ne m’envoyez jamais cette clé dans le chat et ne la placez jamais dans `src/`, `.env` publié ou le code JavaScript du navigateur.

Selon votre organisation, les crédits de Claude Code et la facturation de l’API peuvent être deux accès distincts. Il faut donc vérifier que la Claude Console possède bien un compte API actif, un workspace autorisé et un moyen de facturation/crédits pour les appels API.

## Étape 1 — Créer la clé API Anthropic

1. Ouvrir [platform.claude.com](https://platform.claude.com/).
2. Aller dans **Settings → API keys**.
3. Créer une clé personnelle pour un test individuel, ou une clé de compte de service pour la production.
4. Lui donner un nom explicite, par exemple `noppale-production-assistant`.
5. Choisir le workspace utilisé par Noppalé.
6. Copier la clé une seule fois et la conserver dans un gestionnaire de secrets.

Ne pas utiliser un jeton de session Claude Code ou un fichier local de configuration Claude Code comme clé de production de l’application.

## Étape 2 — Configurer les secrets Supabase

Dans le tableau de bord du projet Supabase :

1. Ouvrir **Project Settings → Edge Functions → Secrets**.
2. Ajouter :

```text
ANTHROPIC_API_KEY=sk-ant-********
ANTHROPIC_MODEL=claude-3-5-haiku-latest
```

La valeur de `ANTHROPIC_API_KEY` ne doit pas être commitée dans Git ni copiée dans le frontend. Le modèle peut être changé plus tard uniquement via le secret `ANTHROPIC_MODEL`.

Si votre organisation exige un workspace explicite pour la clé, la fonction pourra recevoir ultérieurement le secret `ANTHROPIC_WORKSPACE_ID` et l’envoyer dans l’en-tête `anthropic-workspace-id`. Pour une clé limitée à un workspace, ce réglage n’est généralement pas nécessaire.

## Étape 3 — Déployer uniquement la fonction assistant

Depuis le dossier du projet, avec Supabase CLI installé et connecté :

```bash
supabase login
supabase link --project-ref VOTRE_PROJECT_REF
supabase functions deploy assistant
```

Le `project-ref` est le sous-domaine du projet, par exemple :

```text
https://abcdefghijklmnop.supabase.co
```

Dans l’archive reçue, `src/supabase/config.js` contient encore `https://votre-projet.supabase.co`. Il faudra donc aussi créer un fichier `.env.local` local avec les vraies valeurs du projet :

```dotenv
VITE_SUPABASE_URL=https://VOTRE_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=VOTRE_CLE_ANON_PUBLIQUE
```

La clé `VITE_SUPABASE_ANON_KEY` peut être utilisée dans le frontend selon le modèle Supabase, mais la clé Anthropic ne doit jamais y apparaître.

## Étape 4 — Tester l’appel sans modifier les données

Après déploiement, se connecter à Noppalé et tester dans cet ordre :

1. « Bonjour » : l’assistant doit répondre par une salutation courte.
2. « Combien ai-je vendu aujourd’hui ? » : il doit utiliser `get_today_sales`.
3. « Quelles sont mes dépenses aujourd’hui ? » : il doit utiliser `get_today_expenses`.
4. « Quel est mon bénéfice aujourd’hui ? » : il doit utiliser `get_today_profit`.
5. « Quels produits sont en rupture ? » : il doit utiliser `get_stock_status`.
6. « Cherche le produit riz » : il doit utiliser `search_products`.

Les commandes de création, modification, dépense et vente doivent continuer à demander une confirmation avant l’écriture.

## Étape 5 — Vérifications en cas d’erreur

### Erreur `ANTHROPIC_API_KEY manquante`

Le secret n’est pas présent dans le projet Supabase, ou il a été ajouté dans un autre projet/workspace. Vérifier les secrets Edge Functions et redéployer `assistant`.

### Erreur Anthropic `401`

La clé est invalide, expirée, désactivée, mal copiée ou n’est pas une clé API Anthropic. Créer une nouvelle clé dans Claude Console et remplacer le secret Supabase.

### Erreur Anthropic `400` sur le workspace

La clé n’est pas limitée à un workspace et l’organisation exige l’en-tête de workspace. Ajouter la prise en charge de `ANTHROPIC_WORKSPACE_ID` dans la fonction, puis renseigner ce secret.

### Réponse vide ou erreur d’outil

Consulter les logs de la fonction :

```bash
supabase functions logs assistant
```

Vérifier également que l’utilisateur connecté possède bien les droits de lecture sur les tables `sales`, `expenses` et `products`.

### Le micro ne fonctionne pas

Le microphone nécessite une page HTTPS et une autorisation navigateur. Chrome et Edge offrent la meilleure compatibilité avec `SpeechRecognition`. Ce problème est indépendant de la clé Anthropic.

## Architecture retenue

```text
Microphone navigateur
        ↓
VoiceSaleAssistant.jsx
        ↓ session Supabase authentifiée
Supabase Edge Function: assistant
        ↓ clé secrète côté serveur
Anthropic Messages API
        ↓ tool_use si une donnée est nécessaire
Supabase: sales / expenses / products
```

La clé Anthropic ne circule donc pas dans le navigateur.

## Fichiers modifiés dans cette reprise

- `supabase/functions/assistant/index.ts` : migration Anthropic.
- `supabase/functions/assistant/index.openai.backup.ts` : sauvegarde de l’ancienne fonction OpenAI.
- `GUIDE-MIGRATION-CLAUDE.md` : ce guide.

## Ordre recommandé de la suite

1. Créer et vérifier la clé API Anthropic dans Claude Console.
2. Ajouter les deux secrets dans le bon projet Supabase.
3. Me communiquer uniquement le résultat non sensible : « clé créée », le `project-ref` et l’erreur éventuelle — jamais la clé elle-même.
4. Déployer la fonction `assistant`.
5. Effectuer les six tests de lecture ci-dessus.
6. Tester ensuite une action avec confirmation, par exemple l’ajout d’une dépense fictive ou réelle choisie par vous.
7. Une fois le chemin texte validé, tester le micro et la synthèse vocale séparément.

Références officielles : [création d’une clé API Claude](https://platform.claude.com/docs/en/get-api-key) et [authentification API](https://platform.claude.com/docs/en/manage-claude/authentication).
