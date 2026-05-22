-- SCRIPT RAPIDE POUR CORRIGER LES NOMS
-- Version simplifiée sans dépendances

-- ÉTAPE 1: Créer la vue si elle n'existe pas
CREATE OR REPLACE VIEW admin_profiles_view AS
SELECT 
    p.id,
    p.email,
    p.phone,
    p.full_name,
    p.business_name,
    p.business_type,
    p.location,
    p.created_at,
    p.updated_at,
    p.is_active,
    COALESCE(p.products_count, 0) as products_count,
    COALESCE(p.sales_count, 0) as sales_count,
    COALESCE(p.expenses_count, 0) as expenses_count,
    COALESCE(p.customers_count, 0) as customers_count,
    COALESCE(p.total_sales_amount, 0) as total_sales_amount,
    COALESCE(p.total_expenses_amount, 0) as total_expenses_amount,
    (COALESCE(p.total_sales_amount, 0) - COALESCE(p.total_expenses_amount, 0)) as net_profit,
    CASE 
        WHEN p.phone IS NOT NULL AND p.full_name IS NOT NULL THEN '✅ Complet'
        WHEN p.phone IS NOT NULL OR p.full_name IS NOT NULL THEN '⚠️ Partiel'
        ELSE '❌ Incomplet'
    END as sync_status,
    CASE 
        WHEN p.updated_at > p.created_at THEN 'Mis à jour'
        ELSE 'Initial'
    END as last_sync_type
FROM profiles p
ORDER BY p.created_at DESC;

-- ÉTAPE 2: Vérifier l'état actuel
SELECT '=== ÉTAT ACTUEL ===' as info;
SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN full_name IS NOT NULL AND full_name != '' THEN 1 END) as avec_nom,
    COUNT(CASE WHEN full_name IS NULL OR full_name = '' THEN 1 END) as sans_nom
FROM admin_profiles_view;

-- ÉTAPE 3: Mettre à jour les noms manquants
UPDATE profiles 
SET full_name = auth_users.raw_user_meta_data->>'name',
    updated_at = NOW()
FROM auth_users 
WHERE profiles.email = auth_users.email 
  AND (profiles.full_name IS NULL OR profiles.full_name = '')
  AND auth_users.raw_user_meta_data->>'name' IS NOT NULL;

-- ÉTAPE 4: Vérifier les résultats
SELECT '=== RÉSULTATS ===' as info;
SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN full_name IS NOT NULL AND full_name != '' THEN 1 END) as avec_nom,
    COUNT(CASE WHEN full_name IS NULL OR full_name = '' THEN 1 END) as sans_nom
FROM admin_profiles_view;

-- ÉTAPE 5: Afficher quelques exemples
SELECT '=== EXEMPLES ===' as info;
SELECT 
    email,
    phone,
    full_name,
    sync_status
FROM admin_profiles_view
ORDER BY updated_at DESC
LIMIT 5;

SELECT '=== TERMINÉ ===' as status;
SELECT '✅ Noms mis à jour avec succès' as result;
