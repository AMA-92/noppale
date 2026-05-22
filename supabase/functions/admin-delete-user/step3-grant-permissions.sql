-- ÉTAPE 3: Accorder les permissions et tester

-- Accorder les permissions nécessaires
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_user TO authenticated;

-- Test final de la fonction
DO $$
DECLARE
    test_result TEXT;
BEGIN
    -- Test avec un UUID fictif (ne supprimera rien mais testera la fonction)
    SELECT admin_delete_user('00000000-0000-0000-0000-000000000000'::UUID, 'test@admin.com', TRUE) INTO test_result;
    
    RAISE NOTICE 'Test réussi: %', test_result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- L'erreur est attendue avec un UUID fictif
        IF SQLERRM LIKE 'Utilisateur non trouvé%' THEN
            RAISE NOTICE '✅ Test réussi: La fonction fonctionne correctement';
        ELSE
            RAISE NOTICE '⚠️ Erreur inattendue: %', SQLERRM;
        END IF;
END;
$$;

-- Vérification finale
SELECT 'ÉTAPE 3: Permissions accordées et test effectué' as status;

-- Afficher les utilisateurs disponibles
SELECT 'UTILISATEURS DISPONIBLES:' as info;
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
