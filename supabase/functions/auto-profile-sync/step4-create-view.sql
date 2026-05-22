-- ÉTAPE 4: Créer la vue pour Table Editor
-- Ne passez à l'étape suivante qu'après avoir validé cette étape

-- Supprimer l'ancienne vue si elle existe
DROP VIEW IF EXISTS admin_profiles_view;

-- Créer la vue pour Table Editor avec toutes les informations nécessaires
CREATE OR REPLACE VIEW admin_profiles_view AS
SELECT 
    -- Colonnes principales de la table profiles
    p.id,
    p.user_id,
    p.email,
    p.phone,
    p.full_name,
    p.business_name,
    p.business_type,
    p.location,
    p.created_at,
    p.updated_at,
    p.is_active,
    
    -- Statistiques (si ces colonnes existent dans votre table profiles)
    COALESCE(p.products_count, 0) as products_count,
    COALESCE(p.sales_count, 0) as sales_count,
    COALESCE(p.expenses_count, 0) as expenses_count,
    COALESCE(p.customers_count, 0) as customers_count,
    COALESCE(p.total_sales_amount, 0) as total_sales_amount,
    COALESCE(p.total_expenses_amount, 0) as total_expenses_amount,
    (COALESCE(p.total_sales_amount, 0) - COALESCE(p.total_expenses_amount, 0)) as net_profit,
    
    -- Informations de l'utilisateur auth pour référence
    au.created_at as auth_created_at,
    au.last_sign_in_at,
    au.email_confirmed_at,
    au.phone as auth_phone,
    au.raw_user_meta_data as user_metadata,
    
    -- Indicateurs de synchronisation très utiles pour Table Editor
    CASE 
        WHEN p.phone IS NOT NULL AND p.full_name IS NOT NULL THEN '✅ Complet'
        WHEN p.phone IS NOT NULL OR p.full_name IS NOT NULL THEN '⚠️ Partiel'
        ELSE '❌ Incomplet'
    END as sync_status,
    
    -- Type de dernière synchronisation
    CASE 
        WHEN p.updated_at > au.created_at THEN 'Mis à jour'
        ELSE 'Initial'
    END as last_sync_type,
    
    -- Dernière activité combinée
    GREATEST(
        COALESCE(au.last_sign_in_at, au.created_at),
        COALESCE(p.updated_at, p.created_at)
    ) as last_activity,
    
    -- Jours depuis la dernière connexion
    EXTRACT(DAYS FROM NOW() - COALESCE(au.last_sign_in_at, au.created_at)) as days_since_last_signin
    
FROM profiles p
LEFT JOIN auth.users au ON p.user_id = au.id
ORDER BY p.created_at DESC;

-- Accorder les permissions pour la vue
GRANT SELECT ON admin_profiles_view TO authenticated;
GRANT SELECT ON admin_profiles_view TO anon;

-- Vérifier que la vue est bien créée
SELECT 'Vérification de la vue créée:' as step;
SELECT 
    table_name,
    table_type,
    is_updatable,
    is_insertable_into
FROM information_schema.views 
WHERE table_name = 'admin_profiles_view'
  AND table_schema = 'public';

-- Afficher la structure de la vue
SELECT 'Structure de la vue admin_profiles_view:' as step;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'admin_profiles_view'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test de la vue avec quelques enregistrements
SELECT 'Test de la vue (premiers enregistrements):' as step;
SELECT 
    user_id,
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
    COUNT(CASE WHEN full_name IS NOT NULL THEN 1 END) as avec_nom,
    COUNT(CASE WHEN last_sign_in_at >= NOW() - INTERVAL '7 days' THEN 1 END) as actifs_7_jours
FROM admin_profiles_view;

-- Conclusion
SELECT '=== ÉTAPE 4 TERMINÉE ===' as step;
SELECT '✅ Vue "admin_profiles_view" créée avec succès' as status;
SELECT 'La vue est prête pour Table Editor' as info;
SELECT 'Passez à l''étape 5 pour synchroniser les utilisateurs existants' as next_step;
