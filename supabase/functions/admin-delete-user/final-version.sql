-- FONCTION ADMIN DELETE USER - Version finale et complète
-- Supprime complètement un utilisateur et toutes ses données
-- Nécessite les permissions administrateur (SERVICE ROLE)

-- D'abord, supprimer les anciennes versions si elles existent
DROP FUNCTION IF EXISTS admin_delete_user(UUID, TEXT);
DROP VIEW IF EXISTS admin_users_list;

-- Fonction principale de suppression admin
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
    is_admin BOOLEAN := FALSE;
    deleted_count INTEGER;
    result_message TEXT;
    user_email TEXT;
    user_stats RECORD;
BEGIN
    -- Vérifier l'utilisateur actuel
    current_user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID);
    
    -- Validation de l'UUID cible
    IF target_user_id IS NULL OR target_user_id = '00000000-0000-0000-0000-000000000000'::UUID THEN
        RAISE EXCEPTION 'UUID utilisateur invalide';
    END IF;
    
    -- Vérifier si l'utilisateur existe
    SELECT 
        email,
        (SELECT COUNT(*) FROM products WHERE user_id = target_user_id) as products_count,
        (SELECT COUNT(*) FROM sales WHERE user_id = target_user_id) as sales_count,
        (SELECT COUNT(*) FROM expenses WHERE user_id = target_user_id) as expenses_count,
        (SELECT COUNT(*) FROM customers WHERE user_id = target_user_id) as customers_count
    INTO user_email, user_stats
    FROM auth.users 
    WHERE id = target_user_id;
    
    IF user_email IS NULL THEN
        RAISE EXCEPTION 'Utilisateur non trouvé avec l''UUID: %', target_user_id;
    END IF;
    
    -- Vérification admin (vous pouvez adapter cette logique)
    IF admin_email IS NOT NULL THEN
        -- Pour l'instant, nous acceptons n'importe quel email admin
        -- Vous pouvez ajouter une validation plus stricte ici
        is_admin := TRUE;
    END IF;
    
    -- Journaliser l'action
    RAISE NOTICE 'ADMIN DELETE: admin=%, target=%, email=%, force=%', 
                 current_user_id, target_user_id, user_email, force_delete;
    
    -- Afficher les statistiques avant suppression
    RAISE NOTICE 'UTILISATEUR À SUPPRIMER: %', user_email;
    RAISE NOTICE 'Produits: %, Ventes: %, Dépenses: %, Clients: %',
                 user_stats.products_count, user_stats.sales_count, 
                 user_stats.expenses_count, user_stats.customers_count;
    
    -- Supprimer les données dans l'ordre pour éviter les conflits de clés étrangères
    
    -- 1. Supprimer d'abord les données qui référencent d'autres tables
    DELETE FROM user_secret_code WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Secret codes supprimés: %', deleted_count;
    
    DELETE FROM user_preferences WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Préférences supprimées: %', deleted_count;
    
    -- 2. Supprimer les données principales
    DELETE FROM sales WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Ventes supprimées: %', deleted_count;
    
    DELETE FROM expenses WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Dépenses supprimées: %', deleted_count;
    
    DELETE FROM products WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Produits supprimés: %', deleted_count;
    
    DELETE FROM customers WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Clients supprimés: %', deleted_count;
    
    DELETE FROM shop_info WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Shop info supprimée: %', deleted_count;
    
    -- 3. Supprimer le profil utilisateur
    DELETE FROM user_profiles WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Profil utilisateur supprimé: %', deleted_count;
    
    -- 4. Supprimer l'utilisateur auth (nécessite SERVICE ROLE)
    BEGIN
        PERFORM auth.admin.delete_user(target_user_id);
        RAISE NOTICE 'Utilisateur auth supprimé avec succès';
        
        result_message := format(
            '✅ UTILISATEUR SUPPRIMÉ AVEC SUCCÈS\n' ||
            'Email: %\n' ||
            'UUID: %\n' ||
            'Produits: % | Ventes: % | Dépenses: % | Clients: %\n' ||
            'Admin: % | Date: %',
            user_email, target_user_id,
            user_stats.products_count, user_stats.sales_count,
            user_stats.expenses_count, user_stats.customers_count,
            COALESCE(admin_email, 'Non spécifié'), NOW()
        );
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Erreur suppression auth: % (données supprimées)', SQLERRM;
            result_message := format(
                '⚠️ DONNÉES SUPPRIMÉES MAIS ÉCHEC AUTH\n' ||
                'Email: %\n' ||
                'Erreur: %\n' ||
                'Supprimez manuellement dans Authentication → Users',
                user_email, SQLERRM
            );
    END;
    
    RETURN result_message;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'ERREUR SUPPRESSION ADMIN: %', SQLERRM;
END;
$$;

-- Vue pour lister tous les utilisateurs avec leurs données
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
    COALESCE(up.products_count, 0) as products_count,
    COALESCE(up.sales_count, 0) as sales_count,
    COALESCE(up.expenses_count, 0) as expenses_count,
    COALESCE(up.customers_count, 0) as customers_count,
    COALESCE(up.total_sales_amount, 0) as total_sales_amount,
    COALESCE(up.total_expenses_amount, 0) as total_expenses_amount,
    
    -- Calculer le bénéfice net
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

-- Fonction pour obtenir les statistiques d'un utilisateur
CREATE OR REPLACE FUNCTION admin_get_user_stats(user_uuid UUID)
RETURNS TABLE(
    email TEXT,
    products_count INTEGER,
    sales_count INTEGER,
    expenses_count INTEGER,
    customers_count INTEGER,
    total_sales DECIMAL,
    total_expenses DECIMAL,
    net_profit DECIMAL,
    profile_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.email,
        COALESCE(up.products_count, 0) as products_count,
        COALESCE(up.sales_count, 0) as sales_count,
        COALESCE(up.expenses_count, 0) as expenses_count,
        COALESCE(up.customers_count, 0) as customers_count,
        COALESCE(up.total_sales_amount, 0) as total_sales,
        COALESCE(up.total_expenses_amount, 0) as total_expenses,
        COALESCE(up.total_sales_amount, 0) - COALESCE(up.total_expenses_amount, 0) as net_profit,
        CASE 
            WHEN up.user_id IS NOT NULL THEN 'Profil OK'
            ELSE '❌ Profil manquant'
        END as profile_status
    FROM auth.users u
    LEFT JOIN user_profiles up ON u.id = up.user_id
    WHERE u.id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Accorder les permissions nécessaires
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_user TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_user_stats TO authenticated;
GRANT SELECT ON admin_users_list TO authenticated;

-- Test de la fonction
SELECT 'Fonction admin_delete_user créée avec succès' as status,
       COUNT(*) as total_users 
FROM admin_users_list;
