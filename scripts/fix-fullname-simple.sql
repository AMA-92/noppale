-- SCRIPT SIMPLE POUR CORRIGER LES full_name
-- Utilisez ce script pour que les noms s'affichent correctement

-- ÉTAPE 1: Vérifier si la vue existe, sinon la créer
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'admin_profiles_view' AND table_schema = 'public') THEN
        RAISE NOTICE 'Création de la vue admin_profiles_view...';
        
        -- Créer la vue simple
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
        
        GRANT SELECT ON admin_profiles_view TO authenticated;
        GRANT SELECT ON admin_profiles_view TO anon;
        
        RAISE NOTICE '✅ Vue admin_profiles_view créée';
    ELSE
        RAISE NOTICE '✅ Vue admin_profiles_view existe déjà';
    END IF;
END $$;

-- ÉTAPE 2: Vérifier l'état actuel des full_name
SELECT '=== ÉTAT ACTUEL DES full_name ===' as step;
SELECT 
    COUNT(*) as total_profils,
    COUNT(CASE WHEN full_name IS NOT NULL AND full_name != '' THEN 1 END) as avec_nom,
    COUNT(CASE WHEN full_name IS NULL OR full_name = '' THEN 1 END) as sans_nom,
    COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as avec_telephone
FROM admin_profiles_view;

-- ÉTAPE 3: Voir les profils avec full_name manquant
SELECT '=== PROFILS AVEC full_name MANQUANT ===' as step;
SELECT 
    id,
    email,
    phone,
    full_name,
    sync_status,
    created_at
FROM admin_profiles_view
WHERE full_name IS NULL OR full_name = ''
ORDER BY created_at DESC;

-- ÉTAPE 4: Voir les métadonnées des utilisateurs auth
SELECT '=== MÉTADONNÉES UTILISATEURS AUTH ===' as step;
SELECT 
    au.id,
    au.email,
    au.raw_user_meta_data->>'name' as metadata_name,
    au.raw_user_meta_data->>'phone' as metadata_phone,
    p.full_name as current_full_name,
    p.phone as current_phone,
    CASE 
        WHEN p.full_name IS NULL OR p.full_name = '' THEN '❌ Nom manquant'
        ELSE '✅ Nom OK'
    END as name_status
FROM auth.users au
LEFT JOIN profiles p ON au.email = p.email
WHERE au.raw_user_meta_data->>'name' IS NOT NULL 
  AND (p.full_name IS NULL OR p.full_name = '')
ORDER BY au.created_at DESC
LIMIT 10;

-- ÉTAPE 5: Mettre à jour les profils avec les noms depuis les métadonnées
DO $$
DECLARE
    updated_count INTEGER := 0;
    user_record RECORD;
BEGIN
    RAISE NOTICE '=== MISE À JOUR DES full_name ===';
    
    -- Parcourir les utilisateurs et mettre à jour les profils
    FOR user_record IN 
        SELECT 
            au.id as auth_id,
            au.email,
            au.raw_user_meta_data->>'name' as metadata_name,
            au.raw_user_meta_data->>'phone' as metadata_phone,
            p.id as profile_id
        FROM auth.users au
        LEFT JOIN profiles p ON au.email = p.email
        WHERE au.raw_user_meta_data->>'name' IS NOT NULL 
          AND au.raw_user_meta_data->>'name' != ''
          AND (p.full_name IS NULL OR p.full_name = '')
    LOOP
        -- Mettre à jour le profil
        UPDATE profiles SET
            full_name = user_record.metadata_name,
            phone = COALESCE(user_record.metadata_phone, profiles.phone),
            updated_at = NOW()
        WHERE id = user_record.profile_id;
        
        updated_count := updated_count + 1;
        
        RAISE NOTICE '✅ Profil mis à jour: % → %', 
                     user_record.email, user_record.metadata_name;
    END LOOP;
    
    RAISE NOTICE 'Total des profils mis à jour: %', updated_count;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erreur lors de la mise à jour: %', SQLERRM;
END $$;

-- ÉTAPE 6: Vérifier les résultats après mise à jour
SELECT '=== RÉSULTATS APRÈS MISE À JOUR ===' as step;
SELECT 
    COUNT(*) as total_profils,
    COUNT(CASE WHEN full_name IS NOT NULL AND full_name != '' THEN 1 END) as avec_nom,
    COUNT(CASE WHEN full_name IS NULL OR full_name = '' THEN 1 END) as sans_nom,
    COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as avec_telephone
FROM admin_profiles_view;

-- ÉTAPE 7: Afficher les profils mis à jour
SELECT '=== PROFILS MIS À JOUR ===' as step;
SELECT 
    email,
    phone,
    full_name,
    sync_status,
    updated_at
FROM admin_profiles_view
WHERE full_name IS NOT NULL AND full_name != ''
  AND updated_at >= NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;

-- ÉTAPE 8: Afficher quelques exemples pour vérification
SELECT '=== EXEMPLES POUR VÉRIFICATION ===' as step;
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

-- Conclusion
SELECT '=== SYNCHRONISATION TERMINÉE ===' as step;
SELECT '✅ Les full_name ont été traités' as status;
SELECT 'Vérifiez maintenant dans Table Editor → admin_profiles_view' as info;
