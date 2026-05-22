-- SCRIPT ADMIN DELETE USER - ÉTAPE PAR ÉTAPE
-- Utilisez ce script pour supprimer un utilisateur en toute sécurité

-- ÉTAPE 1: Lister tous les utilisateurs disponibles
SELECT '=== ÉTAPE 1: LISTE DES UTILISATEURS ===' as step;
SELECT 
    id,
    email,
    created_at,
    last_sign_in_at,
    profile_status,
    products_count,
    sales_count,
    expenses_count,
    customers_count,
    net_profit
FROM admin_users_list
ORDER BY created_at DESC;

-- ÉTAPE 2: Choisir un utilisateur et voir ses détails
-- Remplacez 'UUID-DE-LUTILISATEUR' par l'UUID réel
SELECT '=== ÉTAPE 2: DÉTAILS UTILISATEUR ===' as step;
SELECT 
    id,
    email,
    phone,
    raw_user_meta_data as user_metadata,
    products_count,
    sales_count,
    expenses_count,
    customers_count,
    total_sales_amount,
    total_expenses_amount,
    net_profit
FROM admin_users_list
WHERE id = 'UUID-DE-LUTILISATEUR-A-SUPPRIMER';  -- ← REMPLACEZ CECI

-- ÉTAPE 3: Supprimer l'utilisateur (confirmation requise)
-- ATTENTION: Cette action est IRRÉVERSIBLE !
-- Remplacez les valeurs ci-dessous avant d'exécuter
DO $$
DECLARE
    target_user_id UUID := 'UUID-DE-LUTILISATEUR-A-SUPPRIMER';  -- ← REMPLACEZ CECI
    admin_email TEXT := 'votre@email.admin';  -- ← REMPLACEZ CECI
    result_message TEXT;
BEGIN
    -- Confirmer avant de supprimer
    RAISE NOTICE '=== CONFIRMATION DE SUPPRESSION ===';
    RAISE NOTICE 'Target UUID: %', target_user_id;
    RAISE NOTICE 'Admin Email: %', admin_email;
    RAISE NOTICE 'EXÉCUTEZ LE SCRIPT SEULEMENT SI VOUS ÊTES SÛR !';
    
    -- Appeler la fonction admin de suppression
    SELECT admin_delete_user(target_user_id, admin_email, TRUE) INTO result_message;
    
    RAISE NOTICE '=== RÉSULTAT DE LA SUPPRESSION ===';
    RAISE NOTICE '%', result_message;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Erreur lors de la suppression: %', SQLERRM;
END $$;

-- ÉTAPE 4: Vérifier que l'utilisateur est complètement supprimé
SELECT '=== ÉTAPE 4: VÉRIFICATION FINALE ===' as step;
SELECT 
    (SELECT COUNT(*) FROM auth.users WHERE id = 'UUID-DE-LUTILISATEUR-A-SUPPRIMER') as auth_users_count,
    (SELECT COUNT(*) FROM user_profiles WHERE user_id = 'UUID-DE-LUTILISATEUR-A-SUPPRIMER') as profiles_count,
    (SELECT COUNT(*) FROM products WHERE user_id = 'UUID-DE-LUTILISATEUR-A-SUPPRIMER') as products_count,
    (SELECT COUNT(*) FROM sales WHERE user_id = 'UUID-DE-LUTILISATEUR-A-SUPPRIMER') as sales_count,
    (SELECT COUNT(*) FROM expenses WHERE user_id = 'UUID-DE-LUTILISATEUR-A-SUPPRIMER') as expenses_count,
    (SELECT COUNT(*) FROM customers WHERE user_id = 'UUID-DE-LUTILISATEUR-A-SUPPRIMER') as customers_count;

-- ÉTAPE 5: Vérifier la liste mise à jour
SELECT '=== ÉTAPE 5: LISTE MIS À JOUR ===' as step;
SELECT 
    id,
    email,
    created_at,
    profile_status,
    products_count,
    sales_count
FROM admin_users_list
ORDER BY created_at DESC
LIMIT 5;
