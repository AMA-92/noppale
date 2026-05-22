-- ÉTAPE 2: Créer la vue admin_users_list

-- Supprimer l'ancienne vue si elle existe
DROP VIEW IF EXISTS admin_users_list;

-- Créer la vue pour lister tous les utilisateurs
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

-- Accorder les permissions
GRANT SELECT ON admin_users_list TO authenticated;

-- Test de la vue
SELECT 'ÉTAPE 2: Vue admin_users_list créée' as status,
       COUNT(*) as total_users 
FROM admin_users_list;
