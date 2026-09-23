# Feuille de route technique — Mouna

## Architecture cible
PWA Noppalé → Mouna → API/Edge Function → modèle IA → outils métier sécurisés → Supabase.

## Principe
Le modèle ne reçoit pas un accès direct à la base. Il propose l'appel d'un outil autorisé ; le serveur valide l'utilisateur, les paramètres et les permissions avant toute écriture.

## Priorités
1. Authentification serveur.
2. Outils de lecture.
3. Confirmations pour les écritures.
4. Outils de création/modification.
5. Journalisation et observabilité.
6. Mémoire.
7. Automatisations.
8. Fonctions vocales avancées.
