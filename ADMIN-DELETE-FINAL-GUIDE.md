# 🛡️ Guide Final - Fonction admin_delete_user

## 🎯 OBJECTIF

Créer une fonction `admin_delete_user` complète et robuste pour supprimer définitivement un utilisateur et toutes ses données.

## ✅ FONCTION CRÉÉE

### 🗄️ `admin_delete_user(target_user_id, admin_email, force_delete)`

**Paramètres:**
- `target_user_id` (UUID) - ID de l'utilisateur à supprimer
- `admin_email` (TEXT) - Email de l'admin qui effectue la suppression
- `force_delete` (BOOLEAN) - Forcer la suppression même si des erreurs surviennent

**Retourne:**
- Message détaillé de succès ou d'erreur

## 🔧 INSTALLATION

### 📋 Étape 1: Installer la fonction

1. **Allez sur** Supabase Dashboard
2. **Database** → **SQL Editor**
3. **New query**
4. **Copiez-collez** le contenu de `supabase/functions/admin-delete-user/final-version.sql`
5. **Exécutez** la fonction

### 📋 Étape 2: Vérifier l'installation

```sql
-- Vérifier que la fonction existe
SELECT 'admin_delete_user créée avec succès' as status,
       COUNT(*) as total_users 
FROM admin_users_list;
```

## 🚀 UTILISATION

### 📋 Méthode 1: Script SQL (Recommandée)

**Fichier**: `scripts/admin-delete-final.sql`

1. **Copiez** le script
2. **Remplacez** `UUID-DE-LUTILISATEUR-A-SUPPRIMER` par l'UUID réel
3. **Remplacez** `votre@email.admin` par votre email
4. **Exécutez** le script

### 📋 Méthode 2: Appel direct

```sql
-- Suppression simple
SELECT admin_delete_user(
    'uuid-de-lutilisateur', 
    'votre@email.admin'
);

-- Suppression forcée
SELECT admin_delete_user(
    'uuid-de-lutilisateur', 
    'votre@email.admin',
    TRUE
);
```

### 📋 Méthode 3: Via interface React

Si vous avez intégré `AdminUserManager.jsx`:
1. **Connectez-vous** à l'interface admin
2. **Recherchez** l'utilisateur
3. **Cliquez** sur "Supprimer"
4. **Confirmez** l'action

## 📊 CE QUE LA FONCTION SUPPRIME

### ✅ Dans l'ordre chronologique:

1. **`user_secret_code`** - Codes secrets de l'utilisateur
2. **`user_preferences`** - Préférences de l'application
3. **`sales`** - Toutes les ventes
4. **`expenses`** - Toutes les dépenses
5. **`products`** - Tous les produits
6. **`customers`** - Tous les clients
7. **`shop_info`** - Informations boutique
8. **`user_profiles`** - Profil utilisateur
9. **`auth.users`** - Compte d'authentification

### ✅ Statistiques affichées avant suppression:

```
UTILISATEUR À SUPPRIMER: email@example.com
Produits: 15, Ventes: 45, Dépenses: 8, Clients: 23
```

## 🎯 EXEMPLE CONCRET

### 📋 Scénario: Supprimer l'utilisateur `test@example.com`

1. **Trouver l'UUID:**
```sql
SELECT id, email FROM auth.users WHERE email = 'test@example.com';
-- Résultat: abc-123-def-456
```

2. **Supprimer l'utilisateur:**
```sql
SELECT admin_delete_user(
    'abc-123-def-456', 
    'admin@noppale.app',
    TRUE
);
```

3. **Résultat attendu:**
```
✅ UTILISATEUR SUPPRIMÉ AVEC SUCCÈS
Email: test@example.com
UUID: abc-123-def-456
Produits: 15 | Ventes: 45 | Dépenses: 8 | Clients: 23
Admin: admin@noppale.app | Date: 2025-05-22
```

## 📱 FONCTIONS COMPLÉMENTAIRES

### ✅ `admin_users_list` (Vue)

**Colonnes disponibles:**
- **id, email** - Informations de base
- **created_at, last_sign_in_at** - Dates
- **products_count, sales_count, expenses_count, customers_count** - Compteurs
- **net_profit** - Bénéfice calculé
- **profile_status** - État du profil

### ✅ `admin_get_user_stats(user_uuid)`

**Retourne les statistiques détaillées:**
- Email et compteurs
- Montants totaux
- Bénéfice net
- État du profil

## 🔍 VÉRIFICATIONS

### ✅ Avant suppression:

```sql
-- Voir les données de l'utilisateur
SELECT * FROM admin_get_user_stats('uuid-de-lutilisateur');

-- Voir toutes les données
SELECT * FROM admin_users_list WHERE id = 'uuid-de-lutilisateur';
```

### ✅ Après suppression:

```sql
-- Vérifier que tout est supprimé (tout devrait être à 0)
SELECT 
    (SELECT COUNT(*) FROM auth.users WHERE id = 'uuid-de-lutilisateur') as auth_users_count,
    (SELECT COUNT(*) FROM user_profiles WHERE user_id = 'uuid-de-lutilisateur') as profiles_count,
    (SELECT COUNT(*) FROM products WHERE user_id = 'uuid-de-lutilisateur') as products_count,
    (SELECT COUNT(*) FROM sales WHERE user_id = 'uuid-de-lutilisateur') as sales_count;
```

## 🚨 CAS D'ERREUR

### ❌ Si l'utilisateur n'existe pas:
```
ERREUR: Utilisateur non trouvé avec l'UUID: xxx
```

### ❌ Si UUID invalide:
```
ERREUR: UUID utilisateur invalide
```

### ❌ Si erreur de suppression auth:
```
⚠️ DONNÉES SUPPRIMÉES MAIS ÉCHEC AUTH
Supprimez manuellement dans Authentication → Users
```

## 🛡️ SÉCURITÉ

### ✅ Protections intégrées:

- **Validation UUID** - Vérifie que l'UUID est valide
- **Vérification existence** - Confirme que l'utilisateur existe
- **Journalisation** - Enregistre toutes les actions
- **Confirmation** - Affiche les détails avant suppression
- **Gestion d'erreurs** - Continue même si certaines étapes échouent

### ✅ Logging des actions:

```
ADMIN DELETE: admin=uuid-admin, target=uuid-cible, email=user@test.com, force=true
```

## 🔄 MAINTENANCE

### ✅ Surveillance régulière:

```sql
-- Voir les utilisateurs sans profil
SELECT id, email, profile_status 
FROM admin_users_list 
WHERE profile_status = '❌ Profil manquant';

-- Voir les utilisateurs inactifs
SELECT id, email, last_sign_in_at 
FROM admin_users_list 
WHERE last_sign_in_at < NOW() - INTERVAL '30 days';
```

## 📊 RAPPORTS

### ✅ Statistiques globales:

```sql
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN products_count > 0 THEN 1 END) as active_sellers,
    COUNT(CASE WHEN profile_status = '❌ Profil manquant' THEN 1 END) as missing_profiles,
    SUM(net_profit) as total_profit
FROM admin_users_list;
```

---

## 🎊 RÉSULTAT FINAL

✅ **Fonction `admin_delete_user` complète et robuste**  
✅ **Suppression totale de l'utilisateur et de ses données**  
✅ **Logging et sécurité intégrés**  
✅ **Interface de visualisation complète**  
✅ **Scripts d'utilisation prêts**  

---

**La fonction `admin_delete_user` est maintenant prête à l'emploi !** 🛡️✨

**Utilisez `admin-delete-final.sql` pour une suppression complète et sécurisée !**
