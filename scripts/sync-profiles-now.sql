-- SCRIPT DE SYNCHRONISATION IMMÉDIATE
-- Utilisez ce script pour synchroniser tous les profils existants

-- ÉTAPE 1: Voir l'état actuel des profils
SELECT '=== ÉTAT ACTUEL DES PROFILS ===' as step;
SELECT 
    COUNT(*) as total_utilisateurs_auth,
    COUNT(up.user_id) as profils_existants,
    COUNT(*) - COUNT(up.user_id) as profils_manquants
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id;

-- ÉTAPE 2: Voir les utilisateurs sans profil
SELECT '=== UTILISATEURS SANS PROFIL (À CRÉER) ===' as step;
SELECT 
    au.id,
    au.email,
    au.created_at,
    COALESCE(au.raw_user_meta_data->>'phone', 'Non fourni') as phone,
    COALESCE(au.raw_user_meta_data->>'name', 'Non fourni') as name
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
WHERE up.user_id IS NULL
ORDER BY au.created_at DESC;

-- ÉTAPE 3: Voir les profils incomplets
SELECT '=== PROFILS INCOMPLETS (À METTRE À JOUR) ===' as step;
SELECT 
    up.user_id,
    up.email,
    up.phone,
    up.full_name,
    COALESCE(au.raw_user_meta_data->>'phone', 'Non fourni') as auth_phone,
    COALESCE(au.raw_user_meta_data->>'name', 'Non fourni') as auth_name,
    CASE 
        WHEN up.phone IS NULL AND au.raw_user_meta_data->>'phone' IS NOT NULL THEN '❌ Téléphone manquant'
        WHEN up.full_name IS NULL AND au.raw_user_meta_data->>'name' IS NOT NULL THEN '❌ Nom manquant'
        WHEN up.phone IS NULL OR up.full_name IS NULL THEN '⚠️ Incomplet'
        ELSE '✅ Complet'
    END as status
FROM user_profiles up
JOIN auth.users au ON up.user_id = au.id
WHERE up.phone IS NULL 
   OR up.full_name IS NULL
   OR (au.raw_user_meta_data->>'phone' IS NOT NULL AND up.phone IS NULL)
   OR (au.raw_user_meta_data->>'name' IS NOT NULL AND up.full_name IS NULL)
ORDER BY up.created_at DESC;

-- ÉTAPE 4: Synchroniser tous les profils manquants et incomplets
SELECT '=== SYNCHRONISATION AUTOMATIQUE ===' as step;
SELECT * FROM sync_existing_user_profiles();

-- ÉTAPE 5: Vérifier les résultats de la synchronisation
SELECT '=== RÉSULTATS APRÈS SYNCHRONISATION ===' as step;
SELECT 
    COUNT(*) as total_profils,
    COUNT(CASE WHEN phone IS NOT NULL AND full_name IS NOT NULL THEN 1 END) as profils_complets,
    COUNT(CASE WHEN phone IS NULL OR full_name IS NULL THEN 1 END) as profils_incomplets,
    COUNT(CASE WHEN phone IS NOT NULL THEN 1 END) as avec_telephone,
    COUNT(CASE WHEN full_name IS NOT NULL THEN 1 END) as avec_nom
FROM admin_user_profiles;

-- ÉTAPE 6: Afficher les profils récemment synchronisés
SELECT '=== DERNIERS PROFILS SYNCHRONISÉS ===' as step;
SELECT 
    email,
    phone,
    full_name,
    business_name,
    sync_status,
    last_sync_type,
    updated_at
FROM admin_user_profiles
WHERE updated_at >= NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;

-- ÉTAPE 7: Test pour un nouvel utilisateur (simulation)
SELECT '=== TEST POUR NOUVEAUX UTILISATEURS ===' as step;
-- Ce test simule ce qui se passera pour les nouveaux utilisateurs
RAISE NOTICE 'Les nouveaux utilisateurs auront automatiquement leur profil créé avec:';
RAISE NOTICE '- Email: depuis auth.users.email';
RAISE NOTICE '- Téléphone: depuis raw_user_meta_data->phone';
RAISE NOTICE '- Nom: depuis raw_user_meta_data->name';
RAISE NOTICE '- Nom entreprise: depuis raw_user_meta_data->business_name';
