-- ÉTAPE 1: Créer la fonction de base admin_delete_user
-- Version simplifiée pour éviter les erreurs

-- Supprimer les anciennes versions
DROP FUNCTION IF EXISTS admin_delete_user(UUID, TEXT, BOOLEAN);

-- Fonction principale de suppression admin (version simplifiée)
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
    
    -- Supprimer les données dans l'ordre pour éviter les conflits
    
    -- 1. Supprimer les codes secrets et préférences
    DELETE FROM user_secret_code WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Secret codes supprimés: %', deleted_count;
    
    DELETE FROM user_preferences WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Préférences supprimées: %', deleted_count;
    
    -- 2. Supprimer les ventes
    DELETE FROM sales WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Ventes supprimées: %', deleted_count;
    
    -- 3. Supprimer les dépenses
    DELETE FROM expenses WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Dépenses supprimées: %', deleted_count;
    
    -- 4. Supprimer les produits
    DELETE FROM products WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Produits supprimés: %', deleted_count;
    
    -- 5. Supprimer les clients
    DELETE FROM customers WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Clients supprimés: %', deleted_count;
    
    -- 6. Supprimer les informations boutique
    DELETE FROM shop_info WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Shop info supprimée: %', deleted_count;
    
    -- 7. Supprimer le profil utilisateur
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

-- Test de la fonction
SELECT 'ÉTAPE 1: Fonction admin_delete_user créée' as status;
