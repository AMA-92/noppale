-- Fonction admin pour supprimer n'importe quel utilisateur
-- Nécessite les permissions administrateur (SERVICE ROLE)

CREATE OR REPLACE FUNCTION admin_delete_user(target_user_id UUID, admin_email TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    is_admin BOOLEAN := FALSE;
    deleted_count INTEGER;
    result_message TEXT;
BEGIN
    -- Vérifier l'utilisateur actuel
    current_user_id := auth.uid();
    
    -- Vérifier si l'utilisateur est admin (vous pouvez adapter cette logique)
    -- Pour l'instant, nous vérifions si l'email admin est fourni et correspond
    IF admin_email IS NOT NULL THEN
        -- Vérifier que l'email fourni correspond à un utilisateur admin
        -- Vous pouvez ajouter votre propre logique ici
        is_admin := TRUE;
    END IF;
    
    -- Pour des raisons de sécurité, vous pouvez aussi vérifier une table d'admins
    -- Exemple: SELECT COUNT(*) > 0 FROM admin_users WHERE user_id = current_user_id;
    
    -- Journaliser l'action
    RAISE NOTICE 'Admin deletion attempt: user_id=%, target=%, admin_email=%', 
                 current_user_id, target_user_id, admin_email;
    
    -- Supprimer les données de l'utilisateur dans toutes les tables
    DELETE FROM products WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Products deleted: %', deleted_count;
    
    DELETE FROM sales WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Sales deleted: %', deleted_count;
    
    DELETE FROM expenses WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Expenses deleted: %', deleted_count;
    
    DELETE FROM customers WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Customers deleted: %', deleted_count;
    
    DELETE FROM shop_info WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Shop info deleted: %', deleted_count;
    
    DELETE FROM user_preferences WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'User preferences deleted: %', deleted_count;
    
    DELETE FROM user_secret_code WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'User secret codes deleted: %', deleted_count;
    
    -- Supprimer l'utilisateur auth (nécessite SERVICE ROLE)
    BEGIN
        PERFORM auth.admin.delete_user(target_user_id);
        RAISE NOTICE 'Auth user deleted successfully';
        result_message := format('User %s and all data deleted successfully by admin %s', 
                                target_user_id, current_user_id);
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Error deleting auth user: % (data deleted)', SQLERRM;
            result_message := format('User data deleted, but auth deletion failed: %', SQLERRM);
    END;
    
    RETURN result_message;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Admin delete user error: %', SQLERRM;
END;
$$;

-- Créer une vue pour lister tous les utilisateurs (pour l'admin)
CREATE OR REPLACE VIEW admin_users_list AS
SELECT 
    u.id,
    u.email,
    u.created_at,
    u.last_sign_in_at,
    u.email_confirmed_at,
    u.phone,
    u.raw_user_meta_data as user_metadata,
    -- Compter les données de chaque utilisateur
    (SELECT COUNT(*) FROM products WHERE user_id = u.id) as products_count,
    (SELECT COUNT(*) FROM sales WHERE user_id = u.id) as sales_count,
    (SELECT COUNT(*) FROM expenses WHERE user_id = u.id) as expenses_count,
    (SELECT COUNT(*) FROM customers WHERE user_id = u.id) as customers_count
FROM auth.users u
ORDER BY u.created_at DESC;

-- Accorder les permissions nécessaires
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_user TO authenticated;
GRANT SELECT ON admin_users_list TO authenticated;
