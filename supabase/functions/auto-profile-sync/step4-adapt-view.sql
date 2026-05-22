-- ÉTAPE 4: Créer la vue pour Table Editor (VERSION ADAPTÉE)
-- Ne passez à l'étape suivante qu'après avoir validé cette étape

-- D'abord, vérifier la structure exacte de la table profiles
SELECT 'Vérification de la structure de "profiles":' as step;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Créer la vue en s'adaptant à la structure réelle
DROP VIEW IF EXISTS admin_profiles_view;

-- Version adaptée qui utilise les colonnes existantes
CREATE OR REPLACE VIEW admin_profiles_view AS
SELECT 
    -- Colonnes principales (adapter selon votre structure)
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
    
    -- Statistiques (si ces colonnes existent)
    COALESCE(p.products_count, 0) as products_count,
    COALESCE(p.sales_count, 0) as sales_count,
    COALESCE(p.expenses_count, 0) as expenses_count,
    COALESCE(p.customers_count, 0) as customers_count,
    COALESCE(p.total_sales_amount, 0) as total_sales_amount,
    COALESCE(p.total_expenses_amount, 0) as total_expenses_amount,
    (COALESCE(p.total_sales_amount, 0) - COALESCE(p.total_expenses_amount, 0)) as net_profit,
    
    -- Indicateurs de synchronisation
    CASE 
        WHEN p.phone IS NOT NULL AND p.full_name IS NOT NULL THEN '✅ Complet'
        WHEN p.phone IS NOT NULL OR p.full_name IS NOT NULL THEN '⚠️ Partiel'
        ELSE '❌ Incomplet'
    END as sync_status,
    
    -- Type de dernière synchronisation
    CASE 
        WHEN p.updated_at > p.created_at THEN 'Mis à jour'
        ELSE 'Initial'
    END as last_sync_type,
    
    -- Jours depuis la création
    EXTRACT(DAYS FROM NOW() - p.created_at) as days_since_created
    
FROM profiles p
ORDER BY p.created_at DESC;

-- Accorder les permissions pour la vue
GRANT SELECT ON admin_profiles_view TO authenticated;
GRANT SELECT ON admin_profiles_view TO anon;

-- Vérifier que la vue est bien créée
SELECT 'Vérification de la vue créée:' as step;
SELECT 
    table_name,
    table_type
FROM information_schema.views 
WHERE table_name = 'admin_profiles_view'
  AND table_schema = 'public';

-- Afficher la structure de la vue
SELECT 'Structure de la vue admin_profiles_view:' as step;
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'admin_profiles_view'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test de la vue avec quelques enregistrements
SELECT 'Test de la vue (premiers enregistrements):' as step;
SELECT 
    email,
    phone,
    full_name,
    sync_status,
    products_count,
    sales_count,
    created_at
FROM admin_profiles_view
ORDER BY created_at DESC
LIMIT 5;

-- Statistiques sur la synchronisation
SELECT 'Statistiques de synchronisation:' as step;
SELECT 
    COUNT(*) as total_profils,
    COUNT(CASE WHEN phone IS NOT NULL AND full_name IS NOT NULL THEN 1 END) as profils_complets,
    COUNT(CASE WHEN phone IS NULL OR full_name IS NULL THEN 1 END) as profils_incomplets,
    COUNT(CASE WHEN phone IS NOT NULL THEN 1 END) as avec_telephone,
    COUNT(CASE WHEN full_name IS NOT NULL THEN 1 END) as avec_nom
FROM admin_profiles_view;

-- Conclusion
SELECT '=== ÉTAPE 4 TERMINÉE (VERSION ADAPTÉE) ===' as step;
SELECT '✅ Vue "admin_profiles_view" créée avec succès' as status;
SELECT 'La vue est prête pour Table Editor' as info;
SELECT 'Passez à l''étape 5 pour synchroniser les utilisateurs existants' as next_step;
