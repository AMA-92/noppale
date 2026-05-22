-- SCRIPT ADMIN - Supprimer un utilisateur spécifique
-- 
-- UTILISATION:
-- 1. Remplacez 'UUID-DE-L-UTILISATEUR-A-SUPPRIMER' par l'ID réel
-- 2. Remplacez 'votre@email.admin' par votre email administrateur
-- 3. Exécutez dans Supabase Dashboard → Database → SQL Editor
--
-- ATTENTION: Cette action est IRRÉVERSIBLE !

-- PARAMÈTRES À CONFIGURER:
DO $$
DECLARE
    target_user_id UUID := 'UUID-DE-L-UTILISATEUR-A-SUPPRIMER';  -- ← REMPLACEZ CECI
    admin_email TEXT := 'votre@email.admin';  -- ← REMPLACEZ CECI
    result_message TEXT;
BEGIN
    -- Appeler la fonction admin de suppression
    SELECT admin_delete_user(target_user_id, admin_email) INTO result_message;
    
    RAISE NOTICE 'Résultat: %', result_message;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Erreur lors de la suppression: %', SQLERRM;
END $$;

-- Pour vérifier que l'utilisateur n'existe plus:
SELECT 'Vérification finale:' as status;
SELECT 
    (SELECT COUNT(*) FROM auth.users WHERE id = 'UUID-DE-L-UTILISATEUR-A-SUPPRIMER') as auth_users_count,
    (SELECT COUNT(*) FROM products WHERE user_id = 'UUID-DE-L-UTILISATEUR-A-SUPPRIMER') as products_count,
    (SELECT COUNT(*) FROM sales WHERE user_id = 'UUID-DE-L-UTILISATEUR-A-SUPPRIMER') as sales_count,
    (SELECT COUNT(*) FROM expenses WHERE user_id = 'UUID-DE-L-UTILISATEUR-A-SUPPRIMER') as expenses_count;

-- Pour lister tous les utilisateurs (choisissez celui à supprimer):
SELECT 
    id,
    email,
    created_at,
    last_sign_in_at,
    raw_user_meta_data as user_metadata
FROM auth.users 
ORDER BY created_at DESC;
