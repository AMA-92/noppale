-- SCRIPT ADMIN DELETE USER - Version finale
-- Utilisez ce script pour supprimer complètement un utilisateur

-- ÉTAPE 1: Lister tous les utilisateurs avec leurs données
SELECT 'LISTE DES UTILISATEURS DISPONIBLES:' as status;
SELECT 
    id,
    email,
    created_at,
    last_sign_in_at,
    products_count,
    sales_count,
    expenses_count,
    customers_count,
    net_profit,
    profile_status
FROM admin_users_list
ORDER BY created_at DESC;

-- ÉTAPE 2: Supprimer un utilisateur spécifique
-- Remplacez les valeurs ci-dessous
DO $$
DECLARE
    target_user_id UUID := 'UUID-DE-LUTILISATEUR-A-SUPPRIMER';  -- ← REMPLACEZ CECI
    admin_email TEXT := 'votre@email.admin';  -- ← REMPLACEZ CECI
    result_message TEXT;
BEGIN
    -- Appeler la fonction admin de suppression
    SELECT admin_delete_user(target_user_id, admin_email, TRUE) INTO result_message;
    
    RAISE NOTICE '=== RÉSULTAT DE LA SUPPRESSION ===');
    RAISE NOTICE '%', result_message;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Erreur lors de la suppression: %', SQLERRM;
END $$;

-- ÉTAPE 3: Vérifier que l'utilisateur est complètement supprimé
SELECT 'VÉRIFICATION FINALE - UTILISATEUR SUPPRIMÉ:' as status;
SELECT 
    (SELECT COUNT(*) FROM auth.users WHERE id = 'UUID-DE-LUTILISATEUR-A-SUPPRIMER') as auth_users_count,
    (SELECT COUNT(*) FROM user_profiles WHERE user_id = 'UUID-DE-LUTILISATEUR-A-SUPPRIMER') as profiles_count,
    (SELECT COUNT(*) FROM products WHERE user_id = 'UUID-DE-LUTILISATEUR-A-SUPPRIMER') as products_count,
    (SELECT COUNT(*) FROM sales WHERE user_id = 'UUID-DE-LUTILISATEUR-A-SUPPRIMER') as sales_count,
    (SELECT COUNT(*) FROM expenses WHERE user_id = 'UUID-DE-LUTILISATEUR-A-SUPPRIMER') as expenses_count,
    (SELECT COUNT(*) FROM customers WHERE user_id = 'UUID-DE-LUTILISATEUR-A-SUPPRIMER') as customers_count;

-- ÉTAPE 4: Obtenir les statistiques d'un utilisateur (optionnel)
-- Pour voir les détails avant suppression
SELECT 'STATISTIQUES UTILISATEUR (AVANT SUPPRESSION):' as status;
SELECT * FROM admin_get_user_stats('UUID-DE-LUTILISATEUR-A-SUPPRIMER');

-- ÉTAPE 5: Nettoyage des utilisateurs sans profil (optionnel)
SELECT 'UTILISATEURS SANS PROFIL (À RÉPARER):' as status;
SELECT 
    id,
    email,
    created_at,
    profile_status
FROM admin_users_list
WHERE profile_status = '❌ Profil manquant'
ORDER BY created_at DESC;
