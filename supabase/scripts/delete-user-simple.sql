-- SCRIPT SIMPLE DE SUPPRESSION D'UTILISATEUR
-- 
-- UTILISATION:
-- 1. Remplacer 'UUID-DE-L-UTILISATEUR-ICI' par l'ID réel
-- 2. Exécuter dans Supabase Dashboard → Database → SQL Editor
--
-- ATTENTION: ACTION IRRÉVERSIBLE!

-- REMPLACEZ L'UUID CI-DESSOUS:
DELETE FROM products WHERE user_id = 'UUID-DE-L-UTILISATEUR-ICI';
DELETE FROM sales WHERE user_id = 'UUID-DE-L-UTILISATEUR-ICI';
DELETE FROM expenses WHERE user_id = 'UUID-DE-L-UTILISATEUR-ICI';
DELETE FROM customers WHERE user_id = 'UUID-DE-L-UTILISATEUR-ICI';
DELETE FROM shop_info WHERE user_id = 'UUID-DE-L-UTILISATEUR-ICI';
DELETE FROM user_preferences WHERE user_id = 'UUID-DE-L-UTILISATEUR-ICI';
DELETE FROM user_secret_code WHERE user_id = 'UUID-DE-L-UTILISATEUR-ICI';

-- Pour supprimer l'utilisateur auth (nécessite permissions admin):
-- Si vous avez les permissions admin, décommentez la ligne ci-dessous:
-- SELECT auth.admin.delete_user('UUID-DE-L-UTILISATEUR-ICI');

-- Vérification finale:
SELECT 'Suppression terminée' as status;
SELECT COUNT(*) as remaining_products FROM products WHERE user_id = 'UUID-DE-L-UTILISATEUR-ICI';
SELECT COUNT(*) as remaining_sales FROM sales WHERE user_id = 'UUID-DE-L-UTILISATEUR-ICI';
SELECT COUNT(*) as remaining_expenses FROM expenses WHERE user_id = 'UUID-DE-L-UTILISATEUR-ICI';
