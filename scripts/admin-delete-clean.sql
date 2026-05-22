-- SCRIPT ADMIN DELETE USER - Version nettoyée
-- Utilisez ce script après avoir exécuté cleanup-and-recreate.sql

-- ÉTAPE 1: Lister tous les utilisateurs
SELECT '=== LISTE DES UTILISATEURS DISPONIBLES ===' as step;
SELECT 
    id,
    email,
    created_at,
    profile_status,
    products_count,
    sales_count,
    expenses_count,
    customers_count,
    net_profit
FROM admin_users_list
ORDER BY created_at DESC;

-- ÉTAPE 2: Supprimer un utilisateur spécifique
-- ATTENTION: Cette action est IRRÉVERSIBLE !
-- Remplacez les valeurs ci-dessous avant d'exécuter
DO $$
DECLARE
    target_user_id UUID := 'UUID-DE-LUTILISATEUR-A-SUPPRIMER';  -- ← REMPLACEZ CECI
    admin_email TEXT := 'votre@email.admin';  -- ← REMPLACEZ CECI
    result_message TEXT;
BEGIN
    RAISE NOTICE '=== CONFIRMATION DE SUPPRESSION ===';
    RAISE NOTICE 'Target UUID: %', target_user_id;
    RAISE NOTICE 'Admin Email: %', admin_email;
    RAISE NOTICE 'EXÉCUTEZ SEULEMENT SI VOUS ÊTES SÛR !';
    
    -- Appeler la fonction avec la signature complète
    SELECT admin_delete_user(target_user_id, admin_email, TRUE) INTO result_message;
    
    RAISE NOTICE '=== RÉSULTAT ===';
    RAISE NOTICE '%', result_message;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Erreur: %', SQLERRM;
END $$;

-- ÉTAPE 3: Vérification
SELECT '=== VÉRIFICATION FINALE ===' as step;
SELECT 
    (SELECT COUNT(*) FROM auth.users WHERE id = 'UUID-DE-LUTILISATEUR-A-SUPPRIMER') as auth_users_count,
    (SELECT COUNT(*) FROM user_profiles WHERE user_id = 'UUID-DE-LUTILISATEUR-A-SUPPRIMER') as profiles_count,
    (SELECT COUNT(*) FROM products WHERE user_id = 'UUID-DE-LUTILISATEUR-A-SUPPRIMER') as products_count,
    (SELECT COUNT(*) FROM sales WHERE user_id = 'UUID-DE-LUTILISATEUR-A-SUPPRIMER') as sales_count,
    (SELECT COUNT(*) FROM expenses WHERE user_id = 'UUID-DE-LUTILISATEUR-A-SUPPRIMER') as expenses_count,
    (SELECT COUNT(*) FROM customers WHERE user_id = 'UUID-DE-LUTILISATEUR-A-SUPPRIMER') as customers_count;
