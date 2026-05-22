# 🔄 Synchronisation Automatique - Table "profiles"

## 🎯 OBJECTIF

Faire en sorte que la section **Table Editor → profiles** récupère automatiquement le nom et le numéro de téléphone des nouveaux utilisateurs dès leur inscription.

## ✅ SOLUTION IMPLÉMENTÉE

### 🔄 Synchronisation sur la table "profiles"

**Fichier**: `supabase/functions/auto-profile-sync/profiles-version.sql`

**Ce que fait le système:**
- **Trigger automatique** qui se déclenche à chaque nouvelle inscription
- **Extraction** du nom et téléphone depuis `auth.users.raw_user_meta_data`
- **Création/Mise à jour** du profil dans la table `profiles`
- **Vue `admin_profiles_view`** pour Table Editor

## 🔧 INSTALLATION

### 📋 Étape 1: Installer la synchronisation pour "profiles"

1. **Allez sur** Supabase Dashboard
2. **Database** → **SQL Editor**
3. **Copiez-collez** `supabase/functions/auto-profile-sync/profiles-version.sql`
4. **Exécutez** le script

### 📋 Étape 2: Synchroniser les profils existants

1. **Copiez** `scripts/sync-profiles-table.sql`
2. **Exécutez** pour synchroniser tous les utilisateurs existants

## 📱 CE QUI SE PASSE AUTOMATIQUEMENT

### ✅ Pour chaque nouvel utilisateur:

1. **Inscription** → Trigger se déclenche
2. **Extraction** des données depuis `raw_user_meta_data`:
   - **Email**: `auth.users.email`
   - **Téléphone**: `raw_user_meta_data->'phone'`
   - **Nom**: `raw_user_meta_data->'name'`
   - **Entreprise**: `raw_user_meta_data->'business_name'`
3. **Création** automatique du profil dans la table `profiles`
4. **Disponible** immédiatement dans Table Editor

### 📊 Dans Table Editor → profiles:

| email | phone | full_name | business_name | sync_status |
|-------|-------|-----------|---------------|-------------|
| marie@example.com | +221 76 123 45 67 | Marie Sarr | Boutique Marie | ✅ Complet |

## 🎯 EXEMPLE CONCRET

### 📝 Scénario: Nouvel utilisateur s'inscrit

**Données d'inscription:**
```json
{
  "email": "alioune@example.com",
  "password": "******",
  "name": "Alioune Bâ",
  "phone": "+221 77 234 56 78",
  "business_name": "Super Marché Alioune"
}
```

**Résultat automatique dans Table Editor → profiles:**
```
✅ Profil créé automatiquement dans "profiles":
- Email: alioune@example.com
- Téléphone: +221 77 234 56 78
- Nom: Alioune Bâ
- Entreprise: Super Marché Alioune
- Statut: ✅ Complet
```

## 📊 VUE POUR TABLE EDITOR

### ✅ Vue `admin_profiles_view`:

**Colonnes principales:**
- **`user_id`** - UUID de l'utilisateur
- **`email`** - Email de l'utilisateur
- **`phone`** - **Numéro de téléphone récupéré** ✨
- **`full_name`** - **Nom récupéré** ✨
- **`business_name`** - Nom de l'entreprise
- **`sync_status`** - État de synchronisation
- **`products_count, sales_count, expenses_count`** - Statistiques
- **`net_profit`** - Bénéfice net
- **`created_at, last_sign_in_at`** - Dates

### ✅ Indicateurs de synchronisation:
- **✅ Complet** - Téléphone et nom présents
- **⚠️ Partiel** - Un seul des deux champs
- **❌ Incomplet** - Aucun des deux champs

## 🔍 UTILISATION DANS TABLE EDITOR

### 📋 Étape 1: Accéder aux profils

1. **Supabase Dashboard** → **Database** → **Table Editor**
2. **Cherchez** la vue `admin_profiles_view`
3. **Visualisez** tous les profils synchronisés

### 📋 Étape 2: Colonnes importantes à vérifier

**Pour la gestion des utilisateurs:**
- **`email`** - Pour identifier l'utilisateur
- **`phone`** - **Numéro de téléphone visible** ✨
- **`full_name`** - **Nom visible** ✨
- **`sync_status`** - État de synchronisation
- **`business_name`** - Nom de l'entreprise

### 📋 Étape 3: Filtrer et rechercher

**Recherche par téléphone:**
- **Filtre** → `phone` → `CONTAINS` → `+221`

**Recherche par nom:**
- **Filtre** → `full_name` → `CONTAINS` → `Alioune`

**Voir les profils incomplets:**
- **Filtre** → `sync_status` → `EQUALS` → `❌ Incomplet`

**Voir les utilisateurs actifs:**
- **Filtre** → `last_sign_in_at` → `GREATER THAN` → `date`

## 🚀 SYNCHRONISATION MANUELLE

### ✅ Pour synchroniser les utilisateurs existants:

```sql
-- Synchroniser tous les profils manquants/incomplets
SELECT * FROM sync_existing_profiles();
```

### ✅ Pour vérifier l'état:

```sql
-- Voir les statistiques de synchronisation
SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN phone IS NOT NULL THEN 1 END) as avec_telephone,
    COUNT(CASE WHEN full_name IS NOT NULL THEN 1 END) as avec_nom
FROM admin_profiles_view;
```

## 📊 RAPPORTS ET STATISTIQUES

### ✅ État de la synchronisation:

```sql
-- Rapport complet
SELECT 
    sync_status,
    COUNT(*) as nombre,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as pourcentage
FROM admin_profiles_view
GROUP BY sync_status
ORDER BY COUNT(*) DESC;
```

**Résultat attendu:**
```
sync_status    | nombre | pourcentage
---------------|--------|-----------
✅ Complet     |    45  |    78.95
⚠️ Partiel     |    10  |    17.54
❌ Incomplet   |     2  |     3.51
```

## 🔧 MAINTENANCE

### ✅ Surveillance régulière:

1. **Exécutez** `sync-profiles-table.sql` hebdomadairement
2. **Vérifiez** les profils incomplets
3. **Contactez** les utilisateurs si nécessaire

### ✅ Script de surveillance:

```sql
-- Utilisateurs récemment inscrits sans profil complet
SELECT 
    email,
    created_at,
    phone,
    full_name,
    CASE 
        WHEN phone IS NULL OR full_name IS NULL THEN '⚠️ Profil incomplet'
        ELSE '✅ Profil complet'
    END as status
FROM admin_profiles_view
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

## 🎯 BÉNÉFICES

### ✅ Pour l'administrateur:

- **🔄 Synchronisation automatique** dans la table `profiles`
- **📱 Numéros visibles** immédiatement dans Table Editor
- **👤 Noms récupérés** depuis l'inscription
- **📊 Vue dédiée** `admin_profiles_view`
- **🔍 Recherche facile** par téléphone ou nom
- **⚡ Gestion centralisée** dans une seule table

### ✅ Pour l'utilisateur:

- **🚀 Profil créé** automatiquement dans `profiles`
- **⚡ Pas d'action** manuelle requise
- **📈 Données cohérentes** partout

## 🎊 RÉSULTAT FINAL

✅ **Synchronisation automatique dans la table "profiles"**  
✅ **Vue "admin_profiles_view" pour Table Editor**  
✅ **Nom et téléphone récupérés automatiquement**  
✅ **Disponible immédiatement dans Table Editor**  
✅ **Pas de nouvelles tables créées**  

---

**Le système de synchronisation automatique est maintenant configuré pour la table "profiles" ! Chaque nouvel utilisateur aura son profil avec nom et téléphone visible dans Table Editor → admin_profiles_view !** 🔄✨
