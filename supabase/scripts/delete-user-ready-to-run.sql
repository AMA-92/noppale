-- SCRIPT PRÊT À EXÉCUTER POUR L'UTILISATEUR: 4bb480a9-952e-48ee-9936-f8a3e445b5d1
-- 
-- INSTRUCTIONS:
-- 1. Copiez tout ce script
-- 2. Allez dans Supabase Dashboard → Database → SQL Editor
-- 3. Collez et exécutez
-- 4. Ensuite allez dans Authentication → Users pour supprimer l'utilisateur auth

-- Suppression des données de l'utilisateur:
DELETE FROM products WHERE user_id = '4bb480a9-952e-48ee-9936-f8a3e445b5d1';
DELETE FROM sales WHERE user_id = '4bb480a9-952e-48ee-9936-f8a3e445b5d1';
DELETE FROM expenses WHERE user_id = '4bb480a9-952e-48ee-9936-f8a3e445b5d1';
DELETE FROM customers WHERE user_id = '4bb480a9-952e-48ee-9936-f8a3e445b5d1';
DELETE FROM shop_info WHERE user_id = '4bb480a9-952e-48ee-9936-f8a3e445b5d1';
DELETE FROM user_preferences WHERE user_id = '4bb480a9-952e-48ee-9936-f8a3e445b5d1';
DELETE FROM user_secret_code WHERE user_id = '4bb480a9-952e-48ee-9936-f8a3e445b5d1';

-- Vérification que tout est supprimé:
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
