-- SCRIPT SPÉCIFIQUE POUR L'UTILISATEUR: 4bb480a9-952e-48ee-9936-f8a3e445b5d1
-- 
-- Ce script supprime uniquement les données de l'utilisateur
-- L'utilisateur auth sera supprimé manuellement via le Dashboard

-- Suppression des données de toutes les tables:
DELETE FROM products WHERE user_id = '4bb480a9-952e-48ee-9936-f8a3e445b5d1';
DELETE FROM sales WHERE user_id = '4bb480a9-952e-48ee-9936-f8a3e445b5d1';
DELETE FROM expenses WHERE user_id = '4bb480a9-952e-48ee-9936-f8a3e445b5d1';
DELETE FROM customers WHERE user_id = '4bb480a9-952e-48ee-9936-f8a3e445b5d1';
DELETE FROM shop_info WHERE user_id = '4bb480a9-952e-48ee-9936-f8a3e445b5d1';
DELETE FROM user_preferences WHERE user_id = '4bb480a9-952e-48ee-9936-f8a3e445b5d1';
DELETE FROM user_secret_code WHERE user_id = '4bb480a9-952e-48ee-9936-f8a3e445b5d1';

-- Vérification que les données sont supprimées:
SELECT '=== VÉRIFICATION FINALE ===' as status;
SELECT COUNT(*) as products_remaining FROM products WHERE user_id = '4bb480a9-952e-48ee-9936-f8a3e445b5d1';
SELECT COUNT(*) as sales_remaining FROM sales WHERE user_id = '4bb480a9-952e-48ee-9936-f8a3e445b5d1';
SELECT COUNT(*) as expenses_remaining FROM expenses WHERE user_id = '4bb480a9-952e-48ee-9936-f8a3e445b5d1';
SELECT COUNT(*) as customers_remaining FROM customers WHERE user_id = '4bb480a9-952e-48ee-9936-f8a3e445b5d1';
SELECT COUNT(*) as shop_info_remaining FROM shop_info WHERE user_id = '4bb480a9-952e-48ee-9936-f8a3e445b5d1';
SELECT COUNT(*) as preferences_remaining FROM user_preferences WHERE user_id = '4bb480a9-952e-48ee-9936-f8a3e445b5d1';
SELECT COUNT(*) as secret_codes_remaining FROM user_secret_code WHERE user_id = '4bb480a9-952e-48ee-9936-f8a3e445b5d1';

-- Vérification que l'utilisateur auth existe encore:
SELECT 'Utilisateur auth (à supprimer manuellement):' as auth_status;
SELECT id, email, created_at FROM auth.users WHERE id = '4bb480a9-952e-48ee-9936-f8a3e445b5d1';
