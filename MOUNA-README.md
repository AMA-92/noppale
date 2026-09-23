# Mouna — assistant vocal de Noppalé

La base Mouna est volontairement séparée du métier de Noppalé.

- Interface : `src/components/mouna/MounaAssistant.jsx`
- API sécurisée : `supabase/functions/mouna/index.ts`
- Guide d'intégration : `docs/MOUNA-GUIDE.md`
- Feuille de route : `docs/MOUNA-ROADMAP.md`

## Démarrage rapide

1. `npm install`
2. Déployer la fonction Supabase `mouna`.
3. Configurer `AI_API_KEY`, `AI_BASE_URL` et `AI_MODEL` comme indiqué dans le guide.
4. Créer `.env.local` avec `VITE_MOUNA_API_URL`.
5. `npm run dev`.

Aucune clé secrète IA ne doit être placée dans le code React.
