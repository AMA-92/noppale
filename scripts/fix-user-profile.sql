-- SCRIPT DE RÉPARATION - Recréer le profil d'un utilisateur
-- Utilisez ce script si un utilisateur peut se connecter mais ne peut pas ajouter de ventes

-- ÉTAPE 1: Trouver l'utilisateur qui a des problèmes
SELECT 'Utilisateurs auth sans profil:' as status;
SELECT 
    au.id,
    au.email,
    au.created_at,
    up.user_id as profile_exists
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
WHERE up.user_id IS NULL
ORDER BY au.created_at DESC;

-- ÉTAPE 2: Recréer le profil pour un utilisateur spécifique
-- Remplacez 'UUID-DE-LUTILISATEUR-A-REPARER' par l'UUID réel
DO $$
DECLARE
    user_uuid UUID := 'UUID-DE-LUTILISATEUR-A-REPARER';  -- ← REMPLACEZ CECI
    user_email TEXT;
    user_phone TEXT;
    user_name TEXT;
BEGIN
    -- Obtenir les informations de l'utilisateur auth
    SELECT 
        email,
        raw_user_meta_data->>'phone' as phone,
        raw_user_meta_data->>'name' as name
    INTO user_email, user_phone, user_name
    FROM auth.users 
    WHERE id = user_uuid;
    
    -- Insérer le profil manquant
    INSERT INTO user_profiles (
        user_id,
        email,
        phone,
        full_name,
        created_at,
        updated_at
    ) VALUES (
        user_uuid,
        user_email,
        user_phone,
        user_name,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    RAISE NOTICE 'Profil recréé pour l''utilisateur: %', user_email;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Erreur lors de la recréation du profil: %', SQLERRM;
END $$;

-- ÉTAPE 3: Vérifier que le profil est bien créé
SELECT 'Vérification du profil:' as status;
SELECT 
    up.user_id,
    up.email,
    up.phone,
    up.full_name,
    up.created_at,
    au.last_sign_in_at
FROM user_profiles up
JOIN auth.users au ON up.user_id = au.id
WHERE up.user_id = 'UUID-DE-LUTILISATEUR-A-REPARER';  -- ← REMPLACEZ CECI

-- ÉTAPE 4: Mettre à jour les statistiques de l'utilisateur
DO $$
DECLARE
    user_uuid UUID := 'UUID-DE-LUTILISATEUR-A-REPARER';  -- ← REMPLACEZ CECI
BEGIN
    -- Mettre à jour les statistiques
    UPDATE user_profiles SET
        products_count = (SELECT COUNT(*) FROM products WHERE user_id = user_uuid),
        sales_count = (SELECT COUNT(*) FROM sales WHERE user_id = user_uuid),
        expenses_count = (SELECT COUNT(*) FROM expenses WHERE user_id = user_uuid),
        customers_count = (SELECT COUNT(*) FROM customers WHERE user_id = user_uuid),
        total_sales_amount = COALESCE((SELECT SUM(amount) FROM sales WHERE user_id = user_uuid), 0),
        total_expenses_amount = COALESCE((SELECT SUM(amount) FROM expenses WHERE user_id = user_uuid), 0),
        updated_at = NOW()
    WHERE user_id = user_uuid;
    
    RAISE NOTICE 'Statistiques mises à jour pour l''utilisateur';
END $$;

-- ÉTAPE 5: Vérifier les contraintes et triggers
SELECT 'Contraintes sur la table sales:' as status;
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'sales' 
  AND constraint_type = 'FOREIGN KEY';

-- ÉTAPE 6: Test d'insertion (optionnel)
-- Pour vérifier que l'utilisateur peut maintenant ajouter des ventes
SELECT 'Test de permissions utilisateur:' as status;
SELECT 
    user_id,
    email,
    last_sign_in_at,
    email_confirmed_at
FROM auth.users 
WHERE id = 'UUID-DE-LUTILISATEUR-A-REPARER'  -- ← REMPLACEZ CECI
LIMIT 1;
