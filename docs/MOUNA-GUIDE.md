# Mouna — guide d'intégration IA

## 1. Objectif
Mouna est l'assistante vocale de Noppalé. Cette version repart d'une base propre : elle fournit l'interface vocale, la synthèse vocale et une passerelle serveur, mais aucune ancienne logique d'assistant n'est conservée.

## 2. Architecture
- `src/components/mouna/MounaAssistant.jsx` : interface, micro et voix.
- `supabase/functions/mouna/index.ts` : passerelle serveur vers le fournisseur IA.
- `.env.mouna.example` : configuration de l'URL de la fonction.

La clé IA doit rester côté serveur. Ne mets jamais `AI_API_KEY` dans `.env` exposé au navigateur ni dans le code React.

## 3. Activer Mouna avec Supabase
Depuis le dossier du projet :

```bash
supabase login
supabase link --project-ref <PROJECT_REF>
supabase functions deploy mouna
supabase secrets set AI_API_KEY="TA_CLE_API"
supabase secrets set AI_BASE_URL="https://api.openai.com/v1"
supabase secrets set AI_MODEL="gpt-4o-mini"
```

Tu peux remplacer `AI_BASE_URL` et `AI_MODEL` par un fournisseur compatible avec l'API Chat Completions.

Ensuite, crée un `.env.local` à partir de `.env.mouna.example` et renseigne :

```env
VITE_MOUNA_API_URL=https://<PROJECT_REF>.supabase.co/functions/v1/mouna
```

Puis :

```bash
npm install
npm run build
npm run dev
```

## 4. Sécurité avant les actions métier
La version actuelle ne modifie aucune donnée métier via l'IA. C'est volontaire.

Quand les outils seront ajoutés :
1. Mouna demande une action structurée.
2. Le serveur vérifie l'utilisateur authentifié.
3. Le serveur vérifie les permissions.
4. Les actions sensibles demandent une confirmation.
5. Le serveur exécute l'opération avec les règles Supabase/RLS.
6. Mouna annonce uniquement le résultat réellement retourné par le serveur.

Ne laisse jamais le modèle décider directement d'une requête SQL ou recevoir la `service_role` key dans le navigateur.

## 5. Feuille de route
### Phase 0 — Base propre (faite)
- Retirer toute ancienne logique IA éventuelle.
- Installer Mouna comme composant indépendant.
- Reconnaissance vocale navigateur.
- Réponse vocale navigateur.
- Passerelle serveur sécurisée.

### Phase 1 — Conversation (à faire)
- Historique persistant.
- Meilleure gestion des erreurs.
- Authentification Supabase obligatoire côté fonction.
- Choix du fournisseur/modèle IA.

### Phase 2 — Outils Noppalé
Créer des fonctions serveur contrôlées :
- `get_sales_today`
- `get_low_stock`
- `search_products`
- `search_customers`
- `create_sale`
- `update_stock`
- `get_expenses`
- `get_report`

### Phase 3 — Actions vocales
Exemples :
- « Mouna, combien ai-je vendu aujourd'hui ? »
- « Mouna, quels produits sont presque en rupture ? »
- « Mouna, prépare une vente pour Amadou. »
- « Mouna, ajoute 20 unités de Coca-Cola au stock. »

Les opérations qui écrivent dans la base doivent avoir une politique de confirmation adaptée.

### Phase 4 — Mémoire et contexte
- contexte de la boutique ;
- préférences utilisateur ;
- historique utile ;
- résumé des conversations ;
- limites de taille et rétention.

### Phase 5 — Automatisations
- rappels ;
- rapports périodiques ;
- alertes de stock ;
- suivi des crédits ;
- synthèse quotidienne.

### Phase 6 — Assistant PWA avancé
- wake word si les contraintes du navigateur le permettent ;
- mode mains libres ;
- commandes enchaînées ;
- journal des actions ;
- confirmations vocales ;
- mode hors-ligne limité pour les fonctions non IA.

## 6. Important sur Android/PWA
La reconnaissance vocale et la synthèse vocale dépendent du navigateur et de ses permissions. Un PWA ne peut pas contrôler librement tout Android. Pour les actions système avancées, une application Android native pourra être ajoutée plus tard sans refaire le cœur métier de Mouna.
