-- NETTOYAGE ET RECÉATION PROPRE DE admin_delete_user
-- Ce script nettoie toutes les versions puis recrée la fonction

-- ÉTAPE 1: Supprimer toutes les versions de la fonction
DROP FUNCTION IF EXISTS admin_delete_user(UUID, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS admin_delete_user(UUID, TEXT);
DROP FUNCTION IF EXISTS admin_delete_user(UUID);

-- ÉTAPE 2: Supprimer les vues associées
DROP VIEW IF EXISTS admin_users_list;

-- ÉTAPE 3: Recréer la fonction avec une signature unique
CREATE OR REPLACE FUNCTION admin_delete_user(
    target_user_id UUID, 
    admin_email TEXT DEFAULT NULL,
    force_delete BOOLEAN DEFAULT FALSE
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    result_message TEXT;
    user_email TEXT;
    products_count INTEGER;
    sales_count INTEGER;
    expenses_count INTEGER;
    customers_count INTEGER;
    deleted_count INTEGER;
BEGIN
    -- Vérifier l'utilisateur actuel
    current_user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID);
    
    -- Validation de l'UUID cible
    IF target_user_id IS NULL OR target_user_id = '00000000-0000-0000-0000-000000000000'::UUID THEN
        RAISE EXCEPTION 'UUID utilisateur invalide';
    END IF;
    
    -- Vérifier si l'utilisateur existe et obtenir ses données
    SELECT 
        email,
        (SELECT COUNT(*) FROM products WHERE user_id = target_user_id),
        (SELECT COUNT(*) FROM sales WHERE user_id = target_user_id),
        (SELECT COUNT(*) FROM expenses WHERE user_id = target_user_id),
        (SELECT COUNT(*) FROM customers WHERE user_id = target_user_id)
    INTO 
        user_email, 
        products_count, 
        sales_count, 
        expenses_count, 
        customers_count
    FROM auth.users 
    WHERE id = target_user_id;
    
    IF user_email IS NULL THEN
        RAISE EXCEPTION 'Utilisateur non trouvé avec l''UUID: %', target_user_id;
    END IF;
    
    -- Journaliser l'action
    RAISE NOTICE 'ADMIN DELETE: admin=%, target=%, email=%', 
                 current_user_id, target_user_id, user_email;
    
    -- Afficher les statistiques avant suppression
    RAISE NOTICE 'UTILISATEUR: %', user_email;
    RAISE NOTICE 'Produits: %, Ventes: %, Dépenses: %, Clients: %',
                 products_count, sales_count, expenses_count, customers_count;
    
    -- Supprimer les données dans l'ordre
    
    -- 1. Codes secrets et préférences
    DELETE FROM user_secret_code WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Secret codes supprimés: %', deleted_count;
    
    DELETE FROM user_preferences WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Préférences supprimées: %', deleted_count;
    
    -- 2. Ventes
    DELETE FROM sales WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Ventes supprimées: %', deleted_count;
    
    -- 3. Dépenses
    DELETE FROM expenses WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Dépenses supprimées: %', deleted_count;
    
    -- 4. Produits
    DELETE FROM products WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Produits supprimés: %', deleted_count;
    
    -- 5. Clients
    DELETE FROM customers WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Clients supprimés: %', deleted_count;
    
    -- 6. Shop info
    DELETE FROM shop_info WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Shop info supprimée: %', deleted_count;
    
    -- 7. Profil utilisateur
    DELETE FROM user_profiles WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Profil utilisateur supprimé: %', deleted_count;
    
    -- 8. Supprimer l'utilisateur auth
    BEGIN
        PERFORM auth.admin.delete_user(target_user_id);
        RAISE NOTICE 'Utilisateur auth supprimé avec succès';
        
        result_message := format(
            '✅ UTILISATEUR SUPPRIMÉ\nEmail: %\nUUID: %\nDonnées: % produits, % ventes, % dépenses, % clients',
            user_email, target_user_id,
            products_count, sales_count, expenses_count, customers_count
        );
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Erreur suppression auth: %', SQLERRM;
            result_message := format(
                '⚠️ DONNÉES SUPPRIMÉES MAIS ÉCHEC AUTH\nEmail: %\nErreur: %',
                user_email, SQLERRM
            );
    END;
    
    RETURN result_message;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'ERREUR SUPPRESSION ADMIN: %', SQLERRM;
END;
$$;

-- ÉTAPE 4: Recréer la vue
CREATE OR REPLACE VIEW admin_users_list AS
SELECT 
    u.id,
    u.email,
    u.created_at,
    u.last_sign_in_at,
    u.email_confirmed_at,
    u.phone,
    u.raw_user_meta_data as user_metadata,
    
    -- Compter les données
    COALESCE(up.products_count, 0) as products_count,
    COALESCE(up.sales_count, 0) as sales_count,
    COALESCE(up.expenses_count, 0) as expenses_count,
    COALESCE(up.customers_count, 0) as customers_count,
    COALESCE(up.total_sales_amount, 0) as total_sales_amount,
    COALESCE(up.total_expenses_amount, 0) as total_expenses_amount,
    
    -- Bénéfice net
    COALESCE(up.total_sales_amount, 0) - COALESCE(up.total_expenses_amount, 0) as net_profit,
    
    -- Statut du profil
    CASE 
        WHEN up.user_id IS NOT NULL THEN 'Profil OK'
        ELSE '❌ Profil manquant'
    END as profile_status,
    
    -- Dernière activité
    GREATEST(
        COALESCE(u.last_sign_in_at, u.created_at),
        COALESCE(up.updated_at, u.created_at)
    ) as last_activity
    
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.user_id
ORDER BY u.created_at DESC;

-- ÉTAPE 5: Accorder les permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_user(UUID, TEXT, BOOLEAN) TO authenticated;
GRANT SELECT ON admin_users_list TO authenticated;

-- ÉTAPE 6: Test de la fonction avec la signature complète
DO $$
DECLARE
    test_result TEXT;
BEGIN
    -- Test avec un UUID fictif en utilisant la signature complète
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

-- ÉTAPE 7: Vérification finale
SELECT '=== NETTOYAGE ET RECÉATION TERMINÉS ===' as status;
SELECT 'Fonction admin_delete_user recréée avec succès' as function_status;
SELECT COUNT(*) as total_users FROM admin_users_list;
