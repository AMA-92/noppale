-- SCRIPT DE TEST - Vérifier le système de profils
-- Exécutez ce script pour vérifier que tout fonctionne

-- ÉTAPE 1: Vérifier que les tables existent
SELECT 'Tables existantes:' as status;
SELECT 
    'user_profiles' as table_name,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') as exists
UNION ALL
SELECT 
    'admin_user_profiles' as table_name,
    EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'admin_user_profiles') as exists;

-- ÉTAPE 2: Vérifier les profils existants
SELECT 'Profils existants:' as status;
SELECT 
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN phone IS NOT NULL THEN 1 END) as with_phone,
    COUNT(CASE WHEN full_name IS NOT NULL THEN 1 END) as with_name
FROM user_profiles;

-- ÉTAPE 3: Voir tous les profils (limité à 10 pour la lisibilité)
SELECT 'Aperçu des profils:' as status;
SELECT 
    email,
    phone,
    full_name,
    products_count,
    sales_count,
    expenses_count,
    customers_count,
    net_profit,
    created_at
FROM admin_user_profiles 
ORDER BY created_at DESC 
LIMIT 10;

-- ÉTAPE 4: Vérifier les triggers
SELECT 'Triggers actifs:' as status;
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers 
WHERE trigger_name LIKE '%profile%' OR trigger_name LIKE '%stats%';

-- ÉTAPE 5: Test de mise à jour manuelle (optionnel)
-- Pour tester manuellement la mise à jour d'un profil:
-- UPDATE user_profiles 
-- SET phone = '+221 77 999 88 77', full_name = 'Test User'
-- WHERE user_id = 'UUID-DE-LUTILISATEUR';

-- ÉTAPE 6: Statistiques globales
SELECT 'Statistiques globales:' as status;
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN phone IS NOT NULL THEN 1 END) as users_with_phone,
    COUNT(CASE WHEN products_count > 0 THEN 1 END) as active_sellers,
    SUM(products_count) as total_products,
    SUM(sales_count) as total_sales,
    SUM(net_profit) as total_profit
FROM admin_user_profiles;
