-- SCRIPT AUTOMATIQUE - Recréer tous les profils manquants
-- Utilisez ce script pour réparer tous les utilisateurs qui peuvent se connecter mais n'ont pas de profil

-- ÉTAPE 1: Voir tous les utilisateurs sans profil
SELECT 'Utilisateurs sans profil (à réparer):' as status;
SELECT 
    au.id,
    au.email,
    au.created_at,
    au.last_sign_in_at,
    COALESCE(au.raw_user_meta_data->>'phone', 'Non défini') as phone,
    COALESCE(au.raw_user_meta_data->>'name', 'Non défini') as name
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
WHERE up.user_id IS NULL
ORDER BY au.created_at DESC;

-- ÉTAPE 2: Recréer automatiquement tous les profils manquants
DO $$
DECLARE
    user_record RECORD;
    profiles_created INTEGER := 0;
BEGIN
    -- Parcourir tous les utilisateurs sans profil
    FOR user_record IN 
        SELECT 
            au.id,
            au.email,
            au.raw_user_meta_data->>'phone' as phone,
            au.raw_user_meta_data->>'name' as name
        FROM auth.users au
        LEFT JOIN user_profiles up ON au.id = up.user_id
        WHERE up.user_id IS NULL
    LOOP
        -- Insérer le profil manquant
        INSERT INTO user_profiles (
            user_id,
            email,
            phone,
            full_name,
            created_at,
            updated_at
        ) VALUES (
            user_record.id,
            user_record.email,
            user_record.phone,
            user_record.name,
            NOW(),
            NOW()
        )
        ON CONFLICT (user_id) DO NOTHING;
        
        profiles_created := profiles_created + 1;
        RAISE NOTICE 'Profil créé pour: %', user_record.email;
    END LOOP;
    
    RAISE NOTICE 'Total des profils créés: %', profiles_created;
END $$;

-- ÉTAPE 3: Mettre à jour les statistiques pour tous les profils
DO $$
DECLARE
    profile_record RECORD;
    stats_updated INTEGER := 0;
BEGIN
    -- Parcourir tous les profils et mettre à jour les stats
    FOR profile_record IN 
        SELECT user_id FROM user_profiles
    LOOP
        UPDATE user_profiles SET
            products_count = (SELECT COUNT(*) FROM products WHERE user_id = profile_record.user_id),
            sales_count = (SELECT COUNT(*) FROM sales WHERE user_id = profile_record.user_id),
            expenses_count = (SELECT COUNT(*) FROM expenses WHERE user_id = profile_record.user_id),
            customers_count = (SELECT COUNT(*) FROM customers WHERE user_id = profile_record.user_id),
            total_sales_amount = COALESCE((SELECT SUM(amount) FROM sales WHERE user_id = profile_record.user_id), 0),
            total_expenses_amount = COALESCE((SELECT SUM(amount) FROM expenses WHERE user_id = profile_record.user_id), 0),
            updated_at = NOW()
        WHERE user_id = profile_record.user_id;
        
        stats_updated := stats_updated + 1;
    END LOOP;
    
    RAISE NOTICE 'Statistiques mises à jour pour % profils', stats_updated;
END $$;

-- ÉTAPE 4: Vérification finale
SELECT 'Vérification finale - tous les utilisateurs ont maintenant un profil:' as status;
SELECT 
    COUNT(*) as total_auth_users,
    COUNT(up.user_id) as users_with_profile,
    COUNT(*) - COUNT(up.user_id) as users_still_without_profile
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id;

-- ÉTAPE 5: Afficher les profils créés
SELECT 'Profils maintenant disponibles:' as status;
SELECT 
    up.email,
    up.phone,
    up.full_name,
    up.products_count,
    up.sales_count,
    up.expenses_count,
    up.customers_count,
    up.created_at,
    au.last_sign_in_at
FROM user_profiles up
JOIN auth.users au ON up.user_id = au.id
WHERE up.created_at >= NOW() - INTERVAL '1 hour'  -- Profils créés récemment
ORDER BY up.created_at DESC;
