-- SCRIPT DE SUPPRESSION D'UTILISATEUR PAR ID
-- 
-- INSTRUCTIONS:
-- 1. Remplacer 'VOTRE_USER_ID_ICI' par l'UUID réel de l'utilisateur à supprimer
-- 2. Exécuter ce script dans Supabase Dashboard → Database → SQL Editor
-- 3. Confirmer l'exécution
--
-- ATTENTION: Cette action est IRRÉVERSIBLE!

-- METTRE L'ID DE L'UTILISATEUR A SUPPRIMER ICI:
DO $$
DECLARE
    user_to_delete_id UUID := 'VOTRE_USER_ID_ICI';  -- ← REMPLACEZ CECI
    deleted_count INTEGER;
BEGIN
    -- Afficher l'ID qui va être supprimé
    RAISE NOTICE 'Suppression de l''utilisateur: %', user_to_delete_id;
    
    -- Supprimer les données dans chaque table
    DELETE FROM products WHERE user_id = user_to_delete_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Products supprimés: %', deleted_count;
    
    DELETE FROM sales WHERE user_id = user_to_delete_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Sales supprimés: %', deleted_count;
    
    DELETE FROM expenses WHERE user_id = user_to_delete_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Expenses supprimés: %', deleted_count;
    
    DELETE FROM customers WHERE user_id = user_to_delete_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Customers supprimés: %', deleted_count;
    
    DELETE FROM shop_info WHERE user_id = user_to_delete_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Shop info supprimés: %', deleted_count;
    
    DELETE FROM user_preferences WHERE user_id = user_to_delete_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'User preferences supprimés: %', deleted_count;
    
    DELETE FROM user_secret_code WHERE user_id = user_to_delete_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'User secret codes supprimés: %', deleted_count;
    
    -- Supprimer l'utilisateur auth (nécessite SERVICE ROLE ou admin)
    -- Si cette partie échoue, les données sont déjà supprimées
    BEGIN
        PERFORM auth.admin.delete_user(user_to_delete_id);
        RAISE NOTICE 'Utilisateur auth supprimé avec succès';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'ERREUR suppression auth: % (les données sont déjà supprimées)', SQLERRM;
    END;
    
    RAISE NOTICE '=== SUPPRESSION TERMINÉE ===';
    RAISE NOTICE 'Utilisateur % et toutes ses données ont été supprimés', user_to_delete_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'ERREUR lors de la suppression: %', SQLERRM;
END $$;

-- Pour vérifier que l'utilisateur n'existe plus:
SELECT 'Vérification finale:' as status;
SELECT 
    (SELECT COUNT(*) FROM auth.users WHERE id = 'VOTRE_USER_ID_ICI') as auth_users_count,
    (SELECT COUNT(*) FROM products WHERE user_id = 'VOTRE_USER_ID_ICI') as products_count,
    (SELECT COUNT(*) FROM sales WHERE user_id = 'VOTRE_USER_ID_ICI') as sales_count,
    (SELECT COUNT(*) FROM expenses WHERE user_id = 'VOTRE_USER_ID_ICI') as expenses_count;
