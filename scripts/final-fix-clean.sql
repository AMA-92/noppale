-- SCRIPT FINAL POUR CORRIGER LES NOMS (VERSION NETTOYÉE)
-- Adapté à votre structure: id (UUID), email (TEXT), phone (TEXT), full_name (TEXT), created_at (TIMESTAMP)

-- ÉTAPE 1: Créer la vue adaptée à votre structure
CREATE OR REPLACE VIEW admin_profiles_view AS
SELECT 
    p.id,
    p.email,
    p.phone,
    p.full_name,
    p.created_at,
    p.updated_at,
    -- Statistiques (si ces colonnes existent, sinon seront NULL)
    COALESCE(p.products_count, 0) as products_count,
    COALESCE(p.sales_count, 0) as sales_count,
    COALESCE(p.expenses_count, 0) as expenses_count,
    COALESCE(p.customers_count, 0) as customers_count,
    COALESCE(p.total_sales_amount, 0) as total_sales_amount,
    COALESCE(p.total_expenses_amount, 0) as total_expenses_amount,
    (COALESCE(p.total_sales_amount, 0) - COALESCE(p.total_expenses_amount, 0)) as net_profit,
    
    -- Indicateurs de synchronisation
    CASE 
        WHEN p.phone IS NOT NULL AND p.full_name IS NOT NULL THEN '✅ Complet'
        WHEN p.phone IS NOT NULL OR p.full_name IS NOT NULL THEN '⚠️ Partiel'
        ELSE '❌ Incomplet'
    END as sync_status,
    
    -- Type de dernière synchronisation
    CASE 
        WHEN p.updated_at > p.created_at THEN 'Mis à jour'
        ELSE 'Initial'
    END as last_sync_type,
    
    -- Informations depuis auth.users
    au.created_at as auth_created_at,
    au.last_sign_in_at,
    au.email_confirmed_at,
    au.raw_user_meta_data as user_metadata,
    
    -- Jours depuis dernière connexion
    EXTRACT(DAYS FROM NOW() - COALESCE(au.last_sign_in_at, au.created_at)) as days_since_last_signin
    
FROM profiles p
LEFT JOIN auth.users au ON p.email = au.email
ORDER BY p.created_at DESC;

-- ÉTAPE 2: Vérifier l'état actuel des noms
SELECT '=== ÉTAT ACTUEL DES NOMS ===' as info;
SELECT 
    COUNT(*) as total_profils,
    COUNT(CASE WHEN full_name IS NOT NULL AND full_name != '' THEN 1 END) as avec_nom,
    COUNT(CASE WHEN full_name IS NULL OR full_name = '' THEN 1 END) as sans_nom,
    COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as avec_telephone
FROM admin_profiles_view;

-- ÉTAPE 3: Mettre à jour tous les noms manquants
UPDATE profiles 
SET 
    full_name = au.raw_user_meta_data->>'name',
    phone = COALESCE(au.raw_user_meta_data->>'phone', profiles.phone),
    updated_at = NOW()
FROM auth_users au
WHERE profiles.email = au.email 
  AND (profiles.full_name IS NULL OR profiles.full_name = '')
  AND au.raw_user_meta_data->>'name' IS NOT NULL;

-- ÉTAPE 4: Vérifier les résultats
SELECT '=== RÉSULTATS APRÈS MISE À JOUR ===' as info;
SELECT 
    COUNT(*) as total_profils,
    COUNT(CASE WHEN full_name IS NOT NULL AND full_name != '' THEN 1 END) as avec_nom,
    COUNT(CASE WHEN full_name IS NULL OR full_name = '' THEN 1 END) as sans_nom,
    COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as avec_telephone
FROM admin_profiles_view;

-- ÉTAPE 5: Afficher les profils mis à jour
SELECT '=== PROFILS MIS À JOUR ===' as info;
SELECT 
    email,
    phone,
    full_name,
    sync_status,
    updated_at
FROM admin_profiles_view
WHERE full_name IS NOT NULL AND full_name != ''
  AND updated_at >= NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;

-- ÉTAPE 6: Afficher quelques exemples pour Table Editor
SELECT '=== EXEMPLES POUR TABLE EDITOR ===' as info;
SELECT 
    email,
    phone,
    full_name,
    sync_status,
    products_count,
    sales_count,
    created_at
FROM admin_profiles_view
ORDER BY created_at DESC
LIMIT 5;

-- ÉTAPE 7: Créer le trigger pour les futures inscriptions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_or_update_user_profile();

CREATE OR REPLACE FUNCTION create_or_update_user_profile()
RETURNS TRIGGER AS $$
DECLARE
    phone_number TEXT;
    full_name TEXT;
BEGIN
    -- Extraire les informations des métadonnées
    phone_number := NEW.raw_user_meta_data->>'phone';
    full_name := NEW.raw_user_meta_data->>'name';
    
    -- Journaliser
    RAISE NOTICE 'Nouvel utilisateur: % | Téléphone: % | Nom: %', 
                 NEW.email, 
                 COALESCE(phone_number, 'Non fourni'), 
                 COALESCE(full_name, 'Non fourni');
    
    -- Insérer ou mettre à jour le profil
    INSERT INTO profiles (
        email, 
        phone, 
        full_name,
        created_at,
        updated_at
    ) VALUES (
        NEW.email,
        phone_number,
        full_name,
        NEW.created_at,
        NOW()
    )
    ON CONFLICT (email) 
    DO UPDATE SET
        email = EXCLUDED.email,
        phone = COALESCE(phone_number, profiles.phone),
        full_name = COALESCE(full_name, profiles.full_name),
        updated_at = NOW();
    
    RAISE NOTICE '✅ Profil synchronisé pour: %', NEW.email;
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Erreur: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_or_update_user_profile();

-- Conclusion
SELECT '=== SYNCHRONISATION TERMINÉE ===' as status;
SELECT '✅ Vue créée: admin_profiles_view' as step1;
SELECT '✅ Noms mis à jour depuis les métadonnées' as step2;
SELECT '✅ Trigger créé pour les futures inscriptions' as step3;
SELECT 'Allez dans Table Editor → admin_profiles_view pour voir les résultats' as next_action;
