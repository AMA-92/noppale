# 📱 Guide Complet - Profils Utilisateurs dans Table Editor

## 🎯 OBJECTIF

Faire en sorte que le numéro de téléphone et toutes les informations des nouveaux utilisateurs apparaissent automatiquement dans un profil consultable via Supabase Table Editor.

## ✅ SOLUTION COMPLÈTE CRÉÉE

### 🗄️ 1. Système de Profils Automatique
**Fichier**: `supabase/functions/create-user-profile/index.sql`

**Fonctionnalités**:
- **Table `user_profiles`** - Stocke toutes les infos utilisateur
- **Trigger automatique** - Crée le profil lors de l'inscription
- **Vue `admin_user_profiles`** - Interface complète pour Table Editor
- **Mise à jour automatique** des statistiques

### 🔧 2. Gestionnaire de Profil JavaScript
**Fichier**: `src/utils/profileManager.js`

**Fonctionnalités**:
- **Synchronisation** automatique après inscription
- **Mise à jour** des informations de profil
- **Statistiques** en temps réel
- **Interface admin** pour gestion

### 📊 3. Intégration avec l'inscription
**Modification**: `src/utils/storage.js`

**Fonctionnalités**:
- **Création automatique** du profil lors du signup
- **Synchronisation** du téléphone et nom
- **Mise à jour** des métadonnées

## 🔧 INSTALLATION

### 📋 Étape 1: Installer le système de profils

1. **Allez sur** Supabase Dashboard
2. **Database** → **SQL Editor**
3. **New query**
4. **Copiez-collez** le contenu de `supabase/functions/create-user-profile/index.sql`
5. **Exécutez** la fonction

### 📋 Étape 2: Vérifier l'installation

```sql
-- Vérifier que la table existe
SELECT COUNT(*) as profiles_count FROM user_profiles;

-- Vérifier que la vue fonctionne
SELECT COUNT(*) as admin_profiles_count FROM admin_user_profiles;
```

## 📱 UTILISATION - TABLE EDITOR

### 📋 Étape 1: Accéder aux profils

1. **Supabase Dashboard**
2. **Database** → **Table Editor**
3. **Cherchez** la table `admin_user_profiles`

### 📋 Étape 2: Colonnes disponibles

#### **🔍 Informations de base:**
- **id** - ID du profil
- **user_id** - UUID de l'utilisateur auth
- **email** - Email de l'utilisateur
- **phone** - **Numéro de téléphone** ✨
- **full_name** - Nom complet
- **business_name** - Nom de l'entreprise
- **business_type** - Type d'entreprise
- **location** - Localisation

#### **📊 Statistiques automatiques:**
- **products_count** - Nombre de produits
- **sales_count** - Nombre de ventes
- **expenses_count** - Nombre de dépenses
- **customers_count** - Nombre de clients
- **total_sales_amount** - Montant total des ventes
- **total_expenses_amount** - Montant total des dépenses
- **net_profit** - Bénéfice net (calculé automatiquement)

#### **📅 Dates et statut:**
- **created_at** - Date de création du profil
- **updated_at** - Dernière mise à jour
- **is_active** - Statut du compte
- **auth_created_at** - Date d'inscription auth
- **last_sign_in_at** - Dernière connexion

## 🎯 CE QUI SE PASSE AUTOMATIQUEMENT

### ✅ Lors de l'inscription d'un nouvel utilisateur:

1. **Trigger** se déclenche dans `auth.users`
2. **Création** automatique du profil dans `user_profiles`
3. **Extraction** du téléphone et nom des métadonnées
4. **Insertion** dans la vue `admin_user_profiles`
5. **Disponible** immédiatement dans Table Editor

### ✅ Lors de l'utilisation de l'application:

1. **Mise à jour** automatique des statistiques
2. **Synchronisation** des données
3. **Calcul** des totaux et bénéfices
4. **Mise à jour** du profil

## 📊 EXEMPLE CONCRET

### ✅ Nouvel utilisateur s'inscrit:

```
Email: test@example.com
Téléphone: +221 77 123 45 67
Nom: Alioune Bâ
```

### ✅ Ce qui apparaît dans Table Editor:

| user_id | email | phone | full_name | products_count | sales_count | net_profit |
|---------|-------|-------|-----------|----------------|-------------|------------|
| abc-123 | test@example.com | +221 77 123 45 67 | Alioune Bâ | 0 | 0 | 0.00 |

### ✅ Après qu'il ajoute des produits et fait des ventes:

| user_id | email | phone | full_name | products_count | sales_count | net_profit |
|---------|-------|-------|-----------|----------------|-------------|------------|
| abc-123 | test@example.com | +221 77 123 45 67 | Alioune Bâ | 15 | 45 | 125000.00 |

## 🔧 FONCTIONNALITÉS AVANCÉES

### ✅ Recherche et filtrage dans Table Editor:

1. **Filtre par téléphone** - Cherchez `+221 77`
2. **Filtre par email** - Cherchez `@example.com`
3. **Filtre par nom** - Cherchez `Alioune`
4. **Filtre par statut** - `is_active = true`
5. **Filtre par date** - `created_at > 2024-01-01`

### ✅ Tri des données:

- **Par date d'inscription** - `ORDER BY created_at DESC`
- **Par nombre de ventes** - `ORDER BY sales_count DESC`
- **Par bénéfice** - `ORDER BY net_profit DESC`

### ✅ Export des données:

1. **Sélectionnez** les lignes voulues
2. **Cliquez** sur "Export"
3. **Choisissez** le format (CSV, Excel)
4. **Téléchargez** les données

## 🚀 ADMINISTRATION

### ✅ Gérer les profils:

1. **Activer/désactiver** un compte: `is_active = false`
2. **Mettre à jour** les informations directement
3. **Supprimer** un profil (supprime aussi l'utilisateur auth)
4. **Exporter** les données pour analyse

### ✅ Monitoring:

- **Nouveaux inscrits** - `created_at` du jour
- **Utilisateurs actifs** - `last_sign_in_at` récent
- **Performance** - `net_profit` par utilisateur
- **Adoption** - `products_count > 0`

## 🎯 BÉNÉFICES

### ✅ Pour l'administrateur:

- **Vue complète** de tous les utilisateurs
- **Numéros de téléphone** visibles immédiatement
- **Statistiques** en temps réel
- **Export** facile pour analyse
- **Gestion** centralisée

### ✅ Pour l'utilisateur:

- **Profil** créé automatiquement
- **Statistiques** mises à jour automatiquement
- **Pas d'action** manuelle requise

## 🔄 MAINTENANCE

### ✅ Vérifications régulières:

```sql
-- Vérifier les profils sans téléphone
SELECT email, phone FROM admin_user_profiles WHERE phone IS NULL;

-- Vérifier les statistiques à jour
SELECT user_id, products_count, sales_count FROM admin_user_profiles;

-- Nettoyer les profils inactifs
SELECT * FROM admin_user_profiles WHERE is_active = false;
```

---

## 🎊 RÉSULTAT FINAL

✅ **Numéros de téléphone visibles dans Table Editor**  
✅ **Profils créés automatiquement**  
✅ **Statistiques en temps réel**  
✅ **Interface admin complète**  
✅ **Export et filtrage faciles**  

---

**Le système de profils est maintenant prêt ! Chaque nouvel utilisateur aura automatiquement son profil visible dans Table Editor avec son numéro de téléphone et toutes ses informations !** 📱✨
