# Activer la synchronisation en temps réel avec Supabase

Pour que la synchronisation en temps réel fonctionne, vous devez activer Realtime sur les tables Supabase.

## Étapes pour activer Realtime

1. **Connectez-vous à votre dashboard Supabase**
   - Allez sur https://app.supabase.com
   - Sélectionnez votre projet

2. **Activez Realtime sur les tables**
   - Allez dans l'onglet "Database"
   - Cliquez sur "Replication" dans le menu de gauche
   - Activez Realtime pour les tables suivantes:
     - ✅ `products`
     - ✅ `sales`
     - ✅ `expenses`
     - ✅ `customers`
     - ✅ `shop_info`
     - ✅ `user_preferences`
     - ✅ `user_secret_code`

3. **Créer les tables supplémentaires**
   - Exécutez le fichier SQL `supabase-settings-tables.sql` dans le dashboard Supabase
   - Ce fichier crée les tables `user_preferences` et `user_secret_code` pour synchroniser les paramètres

4. **Vérifier les RLS policies**
   - Assurez-vous que les politiques RLS (Row Level Security) sont correctement configurées
   - Les politiques doivent permettre aux utilisateurs de voir leurs propres données uniquement

## Comment vérifier que Realtime fonctionne

1. Ouvrez l'application sur deux appareils différents (ou deux navigateurs)
2. Connectez-vous avec le même compte sur les deux
3. Faites un changement sur un appareil (ajouter un produit, une vente, modifier les préférences, etc.)
4. Le changement devrait apparaître automatiquement sur l'autre appareil

## Données synchronisées en temps réel

- **Produits** - Ajout, modification, suppression
- **Ventes** - Ajout, modification, suppression
- **Dépenses** - Ajout, modification, suppression
- **Clients** - Ajout, modification, suppression
- **Informations de la boutique** - Modification
- **Préférences utilisateur** - Langue, devise, mode sombre, notifications
- **Code secret** - Modification

## Dépannage

Si la synchronisation ne fonctionne pas:

- Vérifiez que Realtime est activé sur toutes les tables
- Vérifiez que les tables `user_preferences` et `user_secret_code` ont été créées
- Vérifiez les logs de la console pour les erreurs
- Assurez-vous que les politiques RLS sont correctes
- Vérifiez que vous êtes connecté avec le même compte sur les deux appareils
