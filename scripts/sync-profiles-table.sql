-- SCRIPT DE SYNCHRONISATION POUR LA TABLE "profiles"
-- Utilisez ce script pour synchroniser tous les profils dans la table "profiles"

-- ÉTAPE 1: Voir l'état actuel de la table "profiles"
SELECT '=== ÉTAT ACTUEL DE LA TABLE "profiles" ===' as step;
SELECT 
    COUNT(*) as total_utilisateurs_auth,
    COUNT(p.user_id) as profils_existants,
    COUNT(*) - COUNT(p.user_id) as profils_manquants
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.user_id;

-- ÉTAPE 2: Voir les utilisateurs sans profil dans "profiles"
SELECT '=== UTILISATEURS SANS PROFIL DANS "profiles" (À CRÉER) ===' as step;
SELECT 
    au.id,
    au.email,
    au.created_at,
    COALESCE(au.raw_user_meta_data->>'phone', 'Non fourni') as phone,
    COALESCE(au.raw_user_meta_data->>'name', 'Non fourni') as name,
    COALESCE(au.raw_user_meta_data->>'business_name', 'Non fourni') as business_name
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.user_id
WHERE p.user_id IS NULL
ORDER BY au.created_at DESC;

-- ÉTAPE 3: Voir les profils incomplets dans "profiles"
SELECT '=== PROFILS INCOMPLETS DANS "profiles" (À METTRE À JOUR) ===' as step;
SELECT 
    p.user_id,
    p.email,
    p.phone,
    p.full_name,
    p.business_name,
    COALESCE(au.raw_user_meta_data->>'phone', 'Non fourni') as auth_phone,
    COALESCE(au.raw_user_meta_data->>'name', 'Non fourni') as auth_name,
    CASE 
        WHEN p.phone IS NULL AND au.raw_user_meta_data->>'phone' IS NOT NULL THEN '❌ Téléphone manquant'
        WHEN p.full_name IS NULL AND au.raw_user_meta_data->>'name' IS NOT NULL THEN '❌ Nom manquant'
        WHEN p.phone IS NULL OR p.full_name IS NULL THEN '⚠️ Incomplet'
        ELSE '✅ Complet'
    END as status
FROM profiles p
JOIN auth.users au ON p.user_id = au.id
WHERE p.phone IS NULL 
   OR p.full_name IS NULL
   OR (au.raw_user_meta_data->>'phone' IS NOT NULL AND p.phone IS NULL)
   OR (au.raw_user_meta_data->>'name' IS NOT NULL AND p.full_name IS NULL)
ORDER BY p.created_at DESC;

-- ÉTAPE 4: Synchroniser tous les profils manquants et incomplets dans "profiles"
SELECT '=== SYNCHRONISATION AUTOMATIQUE DANS "profiles" ===' as step;
SELECT * FROM sync_existing_profiles();

-- ÉTAPE 5: Vérifier les résultats de la synchronisation
SELECT '=== RÉSULTATS APRÈS SYNCHRONISATION DANS "profiles" ===' as step;
SELECT 
    COUNT(*) as total_profils,
    COUNT(CASE WHEN phone IS NOT NULL AND full_name IS NOT NULL THEN 1 END) as profils_complets,
    COUNT(CASE WHEN phone IS NULL OR full_name IS NULL THEN 1 END) as profils_incomplets,
    COUNT(CASE WHEN phone IS NOT NULL THEN 1 END) as avec_telephone,
    COUNT(CASE WHEN full_name IS NOT NULL THEN 1 END) as avec_nom
FROM admin_profiles_view;

-- ÉTAPE 6: Afficher les profils récemment synchronisés dans "profiles"
SELECT '=== DERNIERS PROFILS SYNCHRONISÉS DANS "profiles" ===' as step;
SELECT 
    email,
    phone,
    full_name,
    business_name,
    sync_status,
    last_sync_type,
    updated_at
FROM admin_profiles_view
WHERE updated_at >= NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;

-- ÉTAPE 7: Afficher la vue complète pour Table Editor
SELECT '=== VUE COMPLÈTE POUR TABLE EDITOR (admin_profiles_view) ===' as step;
SELECT 
    user_id,
    email,
    phone,
    full_name,
    business_name,
    sync_status,
    products_count,
    sales_count,
    expenses_count,
    customers_count,
    net_profit,
    created_at,
    last_sign_in_at
FROM admin_profiles_view
ORDER BY created_at DESC
LIMIT 10;

-- ÉTAPE 8: Test pour un nouvel utilisateur (simulation)
SELECT '=== TEST POUR NOUVEAUX UTILISATEURS DANS "profiles" ===' as step;
RAISE NOTICE 'Les nouveaux utilisateurs auront automatiquement leur profil créé dans la table "profiles" avec:';
RAISE NOTICE '- Email: depuis auth.users.email';
RAISE NOTICE '- Téléphone: depuis raw_user_meta_data->phone';
RAISE NOTICE '- Nom: depuis raw_user_meta_data->name';
RAISE NOTICE '- Entreprise: depuis raw_user_meta_data->business_name';
RAISE NOTICE '- Vue: admin_profiles_view (pour Table Editor)';
