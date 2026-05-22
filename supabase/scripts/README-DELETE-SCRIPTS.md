# Scripts de suppression d'utilisateur par ID

## Scripts disponibles

### 1. `delete-user-simple.sql` (Recommandé pour débutants)
Script simple et direct pour supprimer un utilisateur par son ID.

### 2. `delete-user-by-id.sql` (Version avancée)
Script détaillé avec logs et vérifications.

## Comment trouver l'ID utilisateur

### Méthode 1: Via Supabase Dashboard
1. Allez dans **Authentication** → **Users**
2. Trouvez l'utilisateur à supprimer
3. Copiez son **User ID** (format UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)

### Méthode 2: Via SQL
```sql
-- Voir tous les utilisateurs
SELECT id, email, created_at FROM auth.users;

-- Chercher par email
SELECT id, email FROM auth.users WHERE email = 'email@example.com';
```

## Utilisation du script simple

### Étape 1: Préparation
1. Ouvrez `delete-user-simple.sql`
2. Remplacez `UUID-DE-L-UTILISATEUR-ICI` par l'ID réel
3. Faites cette modification sur TOUTES les lignes

### Étape 2: Exécution
1. Allez dans **Supabase Dashboard**
2. **Database** → **SQL Editor**
3. **New query**
4. Copiez-collez le script modifié
5. **Run** pour exécuter

### Étape 3: Vérification
Le script affiche le nombre d'enregistrements restants (devrait être 0).

## Utilisation du script avancé

Le script `delete-user-by-id.sql` inclut:
- **Logs détaillés** de chaque suppression
- **Compteurs** d'enregistrements supprimés
- **Gestion d'erreurs** automatique
- **Vérification finale** automatique

## Exemple concret

Si l'ID utilisateur est `123e4567-e89b-12d3-a456-426614174000`:

```sql
-- Script simple avec ID réel
DELETE FROM products WHERE user_id = '123e4567-e89b-12d3-a456-426614174000';
DELETE FROM sales WHERE user_id = '123e4567-e89b-12d3-a456-426614174000';
DELETE FROM expenses WHERE user_id = '123e4567-e89b-12d3-a456-426614174000';
DELETE FROM customers WHERE user_id = '123e4567-e89b-12d3-a456-426614174000';
DELETE FROM shop_info WHERE user_id = '123e4567-e89b-12d3-a456-426614174000';
DELETE FROM user_preferences WHERE user_id = '123e4567-e89b-12d3-a456-426614174000';
DELETE FROM user_secret_code WHERE user_id = '123e4567-e89b-12d3-a456-426614174000';
```

## Suppression de l'utilisateur auth

Pour supprimer complètement l'utilisateur auth, vous avez 2 options:

### Option 1: Via Dashboard (Recommandée)
1. **Authentication** → **Users**
2. Trouvez l'utilisateur
3. **3 points** → **Delete**

### Option 2: Via SQL (Admin seulement)
Si vous avez les permissions admin, décommentez cette ligne:
```sql
SELECT auth.admin.delete_user('UUID-DE-L-UTILISATEUR-ICI');
```

## ⚠️ ATTENTIONS IMPORTANTES

1. **IRRÉVERSIBLE**: La suppression ne peut pas être annulée
2. **SAUVEGARDE**: Sauvegardez les données importantes avant
3. **PERMISSIONS**: Certaines opérations nécessitent des droits admin
4. **TEST**: Testez d'abord en environnement de développement

## Dépannage

### Erreur "permission denied"
- Utilisez la suppression via Dashboard pour l'utilisateur auth
- Les données des tables peuvent être supprimées sans problème

### Erreur "relation does not exist"
- Vérifiez que les noms de tables sont corrects
- Adaptez le script à votre structure de base de données

### UUID non trouvé
- Vérifiez que l'UUID est correct
- Utilisez la requête de recherche pour confirmer
