# Feuille de route de l’assistant IA Noppalé avec OpenAI

## Conclusion

Noppalé dispose déjà d’une base fonctionnelle pour l’assistance vocale française. L’interface React/Vite est opérationnelle, l’authentification repose sur Supabase, les données métier sont stockées dans Supabase et une fonction Edge `assistant` existe déjà. Cette fonction appelle actuellement Gemini et ne couvre que les ventes du jour, les dettes et la préparation limitée d’une facture.

La prochaine évolution doit remplacer les règles locales rigides par un assistant conversationnel sécurisé. Le navigateur continuera de gérer le microphone et la restitution vocale. OpenAI sera appelé exclusivement depuis une fonction Supabase côté serveur. Le modèle ne modifiera jamais directement la base de données : il demandera l’exécution d’outils contrôlés par le backend.

La première version cible **le français uniquement**. Le wolof, l’arabe et l’anglais seront ajoutés après validation du parcours français.

## 1. État actuel audité

| Élément | État actuel | Conséquence pour la suite |
|---|---|---|
| Interface | React 18 avec Vite | Le composant vocal peut rester côté client. |
| Données | Supabase via `appStorage` | Les outils IA doivent réutiliser les mêmes tables et règles. |
| Authentification | Supabase Auth | Chaque appel IA doit utiliser l’utilisateur connecté. |
| Assistant côté client | `VoiceSaleAssistant.jsx` | Il contient actuellement des règles et des parcours vocaux locaux. |
| Assistant côté serveur | `supabase/functions/assistant/index.ts` | Il appelle actuellement Gemini avec quelques outils en lecture. |
| Synthèse vocale | Fonction Supabase `tts`, puis voix navigateur en secours | Cette couche peut rester indépendante du modèle conversationnel. |
| Produits | Ajout, modification et suppression disponibles | Les outils IA doivent appeler des opérations validées sur `products`. |
| Ventes | Ajout, modification, suppression et paiements disponibles | L’outil de vente doit réutiliser `appStorage.addSale` ou une fonction serveur équivalente. |
| Dépenses | Ajout, modification et suppression disponibles | L’outil de dépense doit réutiliser les validations existantes. |
| Permissions | RLS Supabase et session utilisateur | Les outils ne doivent jamais contourner les politiques de sécurité. |

## 2. Architecture cible

```text
Microphone du navigateur
        |
        v
Reconnaissance vocale française
        |
        v
VoiceSaleAssistant.jsx
        |
        v
Supabase Edge Function: assistant
        |
        +--> OpenAI Responses/Chat Completions API
        |
        +--> Outils Noppalé contrôlés par le backend
                    |
                    v
              Supabase + RLS
        |
        v
Réponse française naturelle
        |
        v
Fonction TTS ou voix navigateur
```

La variable `OPENAI_API_KEY` doit être enregistrée dans les secrets des Edge Functions Supabase. Elle ne doit pas commencer par `VITE_`, ne doit pas être placée dans le bundle React et ne doit pas être ajoutée à Git.

## 3. Ordre de réalisation recommandé

### Étape 1 — Connecter OpenAI sans action métier

La fonction `assistant` sera d’abord convertie de Gemini vers OpenAI. Elle recevra l’historique de conversation, le contexte strictement nécessaire et la langue `fr-FR`. Le premier test portera uniquement sur une réponse à « Bonjour ».

Critère de réussite : la réponse vient d’OpenAI, la clé reste absente du navigateur et une session non authentifiée est refusée.

### Étape 2 — Ajouter les outils de lecture

Les premiers outils seront sans effet de bord :

- `get_today_sales` pour le chiffre d’affaires et le nombre de ventes du jour ;
- `get_today_expenses` pour le total des dépenses du jour ;
- `get_today_profit` pour la marge estimée après coût d’achat et dépenses ;
- `get_outstanding_debts` pour les montants encore dus ;
- `get_stock_status` pour les stocks disponibles ;
- `get_low_or_out_of_stock_products` pour les produits faibles ou en rupture ;
- `search_product` pour retrouver un produit par son nom.

Le backend calculera les montants à partir de la base. Le modèle ne devra jamais inventer un chiffre ni effectuer lui-même un calcul critique à partir d’informations incomplètes.

### Étape 3 — Ajouter les opérations avec confirmation

Les outils d’écriture seront séparés des outils de lecture. Une action d’écriture produira d’abord une proposition structurée contenant l’opération, les paramètres et un résumé lisible. L’exécution ne se fera qu’après une confirmation explicite vocale ou visuelle.

Les premiers outils seront :

- `create_sale` pour une vente et la mise à jour du stock ;
- `create_expense` pour une dépense ;
- `create_product` pour un nouveau produit ;
- `update_product` pour le stock, le prix de vente ou le prix d’achat ;
- `add_stock` pour une entrée de stock distincte ;
- `add_customer` pour un nouveau client.

Les suppressions, annulations de vente, changements importants de prix et opérations financières sensibles resteront bloqués par une confirmation renforcée.

### Étape 4 — Rendre la conversation naturelle

Le système conservera un historique court et utile. Il distinguera les messages de l’utilisateur, les réponses de l’assistant, les appels d’outils et les confirmations. L’assistant devra poser une seule question à la fois lorsqu’une information manque.

Exemple :

> Utilisateur : « Je veux faire une vente. »
>
> Noppalé : « Très bien. Quel produit souhaitez-vous vendre ? »
>
> Utilisateur : « Deux sacs de riz. »
>
> Noppalé : « Quel est le nom du client ? Vous pouvez dire “client comptant”. »

Le modèle ne devra pas réciter la liste de ses fonctionnalités après un simple bonjour. Il répondra brièvement, puis attendra la prochaine intervention.

### Étape 5 — Brancher la voix sur le backend IA

La reconnaissance vocale française actuelle peut rester en place dans un premier temps. Son texte sera envoyé à la fonction `assistant` au lieu d’être interprété uniquement par des expressions régulières. La synthèse vocale recevra uniquement la réponse finale de l’assistant.

L’interruption vocale devra annuler la synthèse en cours, arrêter l’audio et conserver le dernier message utilisateur. La fermeture de l’assistant devra invalider les réponses retardées afin qu’aucun son ne soit joué après la croix.

### Étape 6 — Journaliser et tester

Chaque appel d’outil devra pouvoir être audité avec l’utilisateur, la date, la commande transcrite, le nom de l’outil, les paramètres non sensibles, le résultat et le statut. Les clés API et les secrets ne devront jamais être enregistrés dans ce journal.

Les tests minimaux seront : réponse à bonjour, chiffre d’affaires du jour, dépense du jour, bénéfice du jour, dette, rupture de stock, vente confirmée, dépense confirmée, ajout de produit confirmé, modification de stock confirmée, produit inconnu, stock insuffisant, commande ambiguë et fermeture pendant une réponse vocale.

### Étape 7 — Multilingue après stabilisation

Une fois le français fiable, la même couche d’outils pourra accepter le wolof, l’arabe et l’anglais. La langue de sortie devra être explicitement transmise à OpenAI et à la fonction TTS. Les noms des outils et les champs internes resteront en anglais ou en identifiants stables afin de ne pas modifier le modèle de données.

## 4. Connexion de la clé OpenAI

La connexion nécessite une clé OpenAI appartenant à ton compte. Elle n’est pas présente dans l’archive du projet. La procédure cible est la suivante :

1. Créer une clé API depuis la plateforme OpenAI.
2. Ne pas la mettre dans `src/`, dans `VITE_*`, ni dans le navigateur.
3. Ajouter le secret dans Supabase Edge Functions sous le nom `OPENAI_API_KEY`.
4. Déployer la fonction `assistant` mise à jour.
5. Tester d’abord une réponse sans outil, puis les outils de lecture, puis les outils d’écriture avec confirmation.

Pour le déploiement Supabase, la commande habituelle est :

```bash
supabase secrets set OPENAI_API_KEY="ta-cle-secrete"
supabase functions deploy assistant
```

La commande ne doit être exécutée qu’avec ta vraie clé dans un terminal privé. La clé ne doit pas être écrite dans le dépôt ni dans un fichier partagé.

## 5. Décision de sécurité

Les règles Row Level Security de Supabase restent la dernière barrière. Chaque requête d’outil doit utiliser l’identité de la session courante. L’IA ne doit pas recevoir de capacité générale d’exécuter du SQL, de supprimer une table ou de modifier une donnée hors des outils explicitement autorisés.

Les actions d’écriture seront idempotentes autant que possible. Une confirmation expirera si le contexte change, par exemple si le stock a été modifié entre la proposition et la confirmation.

## 6. Prochaine action

Le projet est prêt pour la première modification technique : convertir `supabase/functions/assistant/index.ts` d’un appel Gemini vers OpenAI, puis reconnecter `VoiceSaleAssistant.jsx` à cette fonction pour la compréhension française. Pour terminer la connexion réelle, il faut maintenant disposer de la clé OpenAI et pouvoir l’ajouter comme secret Supabase. Après cette étape, l’intégration sera réalisée progressivement sans remplacer les validations métier existantes.

## Références

[1]: https://platform.openai.com/docs "OpenAI Platform documentation"
[2]: https://platform.openai.com/api-keys "OpenAI API keys"
[3]: https://supabase.com/docs/guides/functions/secrets "Supabase Edge Function secrets"
