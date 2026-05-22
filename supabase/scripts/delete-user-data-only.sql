-- SCRIPT DE SUPPRESSION DES DONNÉES UTILISATEUR (sans auth)
-- 
-- UTILISATION:
-- 1. Remplacer 'UUID-DE-L-UTILISATEUR-ICI' par l'ID réel
-- 2. Exécuter dans Supabase Dashboard → Database → SQL Editor
-- 3. Pour supprimer l'utilisateur auth, utilisez le Dashboard Authentication
--
-- Ce script supprime seulement les données des tables, pas l'utilisateur auth

-- REMPLACEZ L'UUID CI-DESSOUS (sur toutes les lignes):
DELETE FROM products WHERE user_id = 'UUID-DE-L-UTILISATEUR-ICI';
DELETE FROM sales WHERE user_id = 'UUID-DE-L-UTILISATEUR-ICI';
DELETE FROM expenses WHERE user_id = 'UUID-DE-L-UTILISATEUR-ICI';
DELETE FROM customers WHERE user_id = 'UUID-DE-L-UTILISATEUR-ICI';
DELETE FROM shop_info WHERE user_id = 'UUID-DE-L-UTILISATEUR-ICI';
DELETE FROM user_preferences WHERE user_id = 'UUID-DE-L-UTILISATEUR-ICI';
DELETE FROM user_secret_code WHERE user_id = 'UUID-DE-L-UTILISATEUR-ICI';

-- Vérification que tout est supprimé:
SELECT 'Vérification finale - tout doit être à 0:' as status;
SELECT COUNT(*) as products_remaining FROM products WHERE user_id = 'UUID-DE-L-UTILISATEUR-ICI';
SELECT COUNT(*) as sales_remaining FROM sales WHERE user_id = 'UUID-DE-L-UTILISATEUR-ICI';
SELECT COUNT(*) as expenses_remaining FROM expenses WHERE user_id = 'UUID-DE-L-UTILISATEUR-ICI';
SELECT COUNT(*) as customers_remaining FROM customers WHERE user_id = 'UUID-DE-L-UTILISATEUR-ICI';
SELECT COUNT(*) as shop_info_remaining FROM shop_info WHERE user_id = 'UUID-DE-L-UTILISATEUR-ICI';
SELECT COUNT(*) as preferences_remaining FROM user_preferences WHERE user_id = 'UUID-DE-L-UTILISATEUR-ICI';
SELECT COUNT(*) as secret_codes_remaining FROM user_secret_code WHERE user_id = 'UUID-DE-L-UTILISATEUR-ICI';

-- Pour vérifier que l'utilisateur existe encore dans auth:
SELECT 'Utilisateur auth encore présent:' as auth_status;
SELECT id, email, created_at FROM auth.users WHERE id = 'UUID-DE-L-UTILISATEUR-ICI';
