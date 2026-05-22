-- SCRIPT FINAL SANS ERREURS DE SYNTAXE

-- ÉTAPE 1: Créer la vue avec la structure réelle
CREATE OR REPLACE VIEW admin_profiles_view AS
SELECT 
    p.id,
    p.email,
    p.phone,
    p.name as full_name,
    p.created_at,
    p.updated_at,
    COALESCE(p.products_count, 0) as products_count,
    COALESCE(p.sales_count, 0) as sales_count,
    COALESCE(p.expenses_count, 0) as expenses_count,
    COALESCE(p.customers_count, 0) as customers_count,
    COALESCE(p.total_sales_amount, 0) as total_sales_amount,
    COALESCE(p.total_expenses_amount, 0) as total_expenses_amount,
    (COALESCE(p.total_sales_amount, 0) - COALESCE(p.total_expenses_amount, 0)) as net_profit,
    
    CASE 
        WHEN p.phone IS NOT NULL AND p.name IS NOT NULL THEN '✅ Complet'
        WHEN p.phone IS NOT NULL OR p.name IS NOT NULL THEN '⚠️ Partiel'
        ELSE '❌ Incomplet'
    END as sync_status,
    
    CASE 
        WHEN p.updated_at > p.created_at THEN 'Mis à jour'
        ELSE 'Initial'
    END as last_sync_type,
    
    au.created_at as auth_created_at,
    au.last_sign_in_at,
    au.email_confirmed_at,
    au.email as auth_email,
    au.raw_user_meta_data as user_metadata,
    
    EXTRACT(DAYS FROM NOW() - COALESCE(au.last_sign_in_at, au.created_at)) as days_since_last_signin
    
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
ORDER BY p.created_at DESC;

-- ÉTAPE 2: Vérifier l'état actuel
SELECT '=== ÉTAT ACTUEL DES NOMS ===' as info;
SELECT 
    COUNT(*) as total_profils,
    COUNT(CASE WHEN name IS NOT NULL AND name != '' THEN 1 END) as avec_nom,
    COUNT(CASE WHEN name IS NULL OR name = '' THEN 1 END) as sans_nom,
    COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as avec_telephone
FROM admin_profiles_view;

-- ÉTAPE 3: Mettre à jour les noms manquants
UPDATE profiles 
SET 
    name = au.raw_user_meta_data->>'name',
    phone = COALESCE(au.raw_user_meta_data->>'phone', profiles.phone),
    updated_at = NOW()
FROM auth_users au
WHERE profiles.id = au.id 
  AND (profiles.name IS NULL OR profiles.name = '')
  AND au.raw_user_meta_data->>'name' IS NOT NULL;

-- ÉTAPE 4: Vérifier les résultats
SELECT '=== RÉSULTATS APRÈS MISE À JOUR ===' as info;
SELECT 
    COUNT(*) as total_profils,
    COUNT(CASE WHEN name IS NOT NULL AND name != '' THEN 1 END) as avec_nom,
    COUNT(CASE WHEN name IS NULL OR name = '' THEN 1 END) as sans_nom,
    COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as avec_telephone
FROM admin_profiles_view;

-- ÉTAPE 5: Afficher des exemples
SELECT '=== EXEMPLES POUR TABLE EDITOR ===' as info;
SELECT 
    email,
    phone,
    name as full_name,
    sync_status,
    created_at
FROM admin_profiles_view
ORDER BY created_at DESC
LIMIT 5;

-- ÉTAPE 6: Créer le trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_or_update_user_profile();

CREATE OR REPLACE FUNCTION create_or_update_user_profile()
RETURNS TRIGGER AS $$
DECLARE
    phone_number TEXT;
    full_name TEXT;
BEGIN
    phone_number := NEW.raw_user_meta_data->>'phone';
    full_name := NEW.raw_user_meta_data->>'name';
    
    INSERT INTO profiles (
        id,
        email, 
        phone, 
        name,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        phone_number,
        full_name,
        NEW.created_at,
        NOW()
    )
    ON CONFLICT (id) 
    DO UPDATE SET
        email = EXCLUDED.email,
        phone = COALESCE(phone_number, profiles.phone),
        name = COALESCE(full_name, profiles.name),
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
SELECT '✅ Vue admin_profiles_view créée' as step1;
SELECT '✅ Noms mis à jour' as step2;
SELECT '✅ Trigger créé' as step3;
SELECT 'Allez dans Table Editor → admin_profiles_view' as next_action;
