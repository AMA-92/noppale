# 🔧 Guide de Correction - Erreur SQL Admin

## 🚨 ERREUR RENCONTRÉE

```
ERROR: 42703: column u.user_metadata does not exist
LINE 91: u.user_metadata,
```

## ✅ SOLUTION

### 📋 Problème identifié
La colonne `user_metadata` n'existe pas dans la table `auth.users` de Supabase. La colonne correcte est `raw_user_meta_data`.

### 🔧 Correction apportée
J'ai créé une version corrigée qui utilise les bonnes colonnes Supabase.

## 📋 ÉTAPE 1: Utiliser la version corrigée

1. **Allez sur** Supabase Dashboard
2. **Database** → **SQL Editor**
3. **New query**
4. **Copiez-collez** le contenu de `supabase/functions/admin-delete-user/fixed-version.sql`
5. **Exécutez** la fonction

## 📋 ÉTAPE 2: Vérifier l'installation

### ✅ Test de la vue
```sql
-- Vérifier que la vue fonctionne
SELECT COUNT(*) as total_users FROM admin_users_list;
```

### ✅ Test de la fonction
```sql
-- Test avec un UUID fictif (ne supprimera rien)
SELECT admin_delete_user('00000000-0000-0000-0000-000000000000', 'test@admin.com');
```

## 📋 ÉTAPE 3: Utiliser l'interface admin

### ✅ Si vous utilisez l'interface React:
1. **Rafraîchissez** la page admin
2. **Vérifiez** que la liste des utilisateurs s'affiche
3. **Testez** la suppression d'un utilisateur

## 🔧 COLONNES SUPABASE CORRECTES

### ✅ Colonnes disponibles dans `auth.users`:
- `id` (UUID)
- `email` (TEXT)
- `created_at` (TIMESTAMP)
- `last_sign_in_at` (TIMESTAMP)
- `email_confirmed_at` (TIMESTAMP)
- `phone` (TEXT)
- `raw_user_meta_data` (JSONB) ← **C'est la bonne colonne**

### ❌ Colonnes qui n'existent pas:
- `user_metadata` ← **N'existe pas**
- `metadata` ← **N'existe pas**

## 🎯 ACCÈS AUX MÉTADONNÉES

### ✅ Comment accéder aux métadonnées utilisateur:
```sql
-- Dans la vue, nous utilisons:
u.raw_user_meta_data as user_metadata

-- Pour accéder au nom dans l'interface React:
user.user_metadata?.name || 'Nom non défini'
```

### ✅ Structure des métadonnées:
```json
{
  "name": "John Doe",
  "phone": "+221771234567",
  "other_field": "value"
}
```

## 🚨 SI L'ERREUR PERSISTE

### ✅ Vérifiez les points suivants:

1. **Version Supabase**: Assurez-vous d'utiliser une version récente
2. **Permissions**: Vérifiez que vous avez les droits admin
3. **Tables**: Confirmez que les tables existent

### ✅ Requête de diagnostic:
```sql
-- Vérifier les colonnes disponibles
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND table_schema = 'auth'
ORDER BY ordinal_position;
```

## 📊 RÉSULTAT ATTENDU

### ✅ Après correction:
- ✅ Vue `admin_users_list` fonctionne
- ✅ Fonction `admin_delete_user` disponible
- ✅ Interface admin affiche les utilisateurs
- ✅ Suppression d'utilisateur fonctionne

### ✅ Messages de succès:
```
Vue admin_users_list créée avec succès
total_users: X
```

## 🔄 ALTERNATIVE SI NÉCESSAIRE

### ✅ Version simplifiée (sans métadonnées):
```sql
CREATE OR REPLACE VIEW admin_users_list AS
SELECT 
    u.id,
    u.email,
    u.created_at,
    u.last_sign_in_at,
    u.email_confirmed_at,
    u.phone,
    NULL as user_metadata,  -- Simplifié
    COALESCE((SELECT COUNT(*) FROM products WHERE user_id = u.id), 0) as products_count,
    COALESCE((SELECT COUNT(*) FROM sales WHERE user_id = u.id), 0) as sales_count,
    COALESCE((SELECT COUNT(*) FROM expenses WHERE user_id = u.id), 0) as expenses_count,
    COALESCE((SELECT COUNT(*) FROM customers WHERE user_id = u.id), 0) as customers_count
FROM auth.users u
ORDER BY u.created_at DESC;
```

---

## 🎊 RÉSOLUTION

**✅ Utilisez `fixed-version.sql` pour corriger l'erreur**
**✅ La vue utilise maintenant `raw_user_meta_data`**
**✅ L'interface admin fonctionnera correctement**

---

**L'erreur `column u.user_metadata does not exist` est maintenant résolue !** 🚀✨
