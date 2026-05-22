-- Fonction pour supprimer un utilisateur et toutes ses données
CREATE OR REPLACE FUNCTION delete_user_and_data(user_to_delete_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    is_admin BOOLEAN := FALSE;
BEGIN
    -- Vérifier l'utilisateur actuel
    current_user_id := auth.uid();
    
    -- Vérifier si l'utilisateur est admin (vous pouvez adapter cette logique)
    -- Pour l'instant, seul l'utilisateur lui-même peut se supprimer
    IF current_user_id != user_to_delete_id THEN
        RAISE EXCEPTION 'Permission denied: You can only delete your own account';
    END IF;
    
    -- Supprimer les données de l'utilisateur dans toutes les tables
    DELETE FROM products WHERE user_id = user_to_delete_id;
    DELETE FROM sales WHERE user_id = user_to_delete_id;
    DELETE FROM expenses WHERE user_id = user_to_delete_id;
    DELETE FROM customers WHERE user_id = user_to_delete_id;
    DELETE FROM shop_info WHERE user_id = user_to_delete_id;
    DELETE FROM user_preferences WHERE user_id = user_to_delete_id;
    DELETE FROM user_secret_code WHERE user_id = user_to_delete_id;
    
    -- Supprimer l'utilisateur auth
    PERFORM auth.admin.delete_user(user_to_delete_id);
    
    RETURN 'User and all data deleted successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error deleting user: %', SQLERRM;
END;
$$;
