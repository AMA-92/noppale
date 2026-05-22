-- SYNCHRONISATION AUTOMATIQUE SUR LA TABLE "profiles"
-- Récupère automatiquement le nom et téléphone des nouveaux utilisateurs
-- S'intègre directement dans la table "profiles" existante

-- ÉTAPE 1: Mettre à jour le trigger pour la table "profiles"
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_or_update_user_profile();

-- ÉTAPE 2: Créer la fonction de synchronisation pour "profiles"
CREATE OR REPLACE FUNCTION create_or_update_user_profile()
RETURNS TRIGGER AS $$
DECLARE
    phone_number TEXT;
    full_name TEXT;
    business_name TEXT;
    profile_exists BOOLEAN;
BEGIN
    -- Extraire les informations des métadonnées
    phone_number := NEW.raw_user_meta_data->>'phone';
    full_name := NEW.raw_user_meta_data->>'name';
    business_name := NEW.raw_user_meta_data->>'business_name';
    
    -- Vérifier si le profil existe déjà dans "profiles"
    SELECT EXISTS(SELECT 1 FROM profiles WHERE user_id = NEW.id) INTO profile_exists;
    
    -- Insérer ou mettre à jour le profil dans la table "profiles"
    INSERT INTO profiles (
        user_id, 
        email, 
        phone, 
        full_name,
        business_name,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        phone_number,
        full_name,
        business_name,
        NEW.created_at,
        NOW()
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
        email = EXCLUDED.email,
        phone = COALESCE(phone_number, profiles.phone),
        full_name = COALESCE(full_name, profiles.full_name),
        business_name = COALESCE(business_name, profiles.business_name),
        updated_at = NOW();
    
    -- Journaliser pour le débogage
    RAISE NOTICE 'Profil synchronisé dans "profiles": % | Téléphone: % | Nom: %', 
                 NEW.email, 
                 COALESCE(phone_number, 'Non fourni'), 
                 COALESCE(full_name, 'Non fourni');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ÉTAPE 3: Recréer le trigger pour qu'il s'exécute à chaque inscription
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_or_update_user_profile();

-- ÉTAPE 4: Créer une fonction de synchronisation manuelle pour la table "profiles"
CREATE OR REPLACE FUNCTION sync_existing_profiles()
RETURNS TABLE(
    user_id UUID,
    email TEXT,
    phone_synced TEXT,
    name_synced TEXT,
    status TEXT
) AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- Parcourir tous les utilisateurs auth qui n'ont pas de profil dans "profiles"
    FOR user_record IN 
        SELECT 
            au.id,
            au.email,
            au.raw_user_meta_data->>'phone' as phone,
            au.raw_user_meta_data->>'name' as name,
            au.raw_user_meta_data->>'business_name' as business_name
        FROM auth.users au
        LEFT JOIN profiles p ON au.id = p.user_id
        WHERE p.user_id IS NULL
    LOOP
        -- Créer le profil manquant dans "profiles"
        INSERT INTO profiles (
            user_id,
            email,
            phone,
            full_name,
            business_name,
            created_at,
            updated_at
        ) VALUES (
            user_record.id,
            user_record.email,
            user_record.phone,
            user_record.name,
            user_record.business_name,
            NOW(),
            NOW()
        )
        ON CONFLICT (user_id) DO NOTHING;
        
        -- Retourner le résultat
        user_id := user_record.id;
        email := user_record.email;
        phone_synced := COALESCE(user_record.phone, 'Non fourni');
        name_synced := COALESCE(user_record.name, 'Non fourni');
        status := 'Profil créé';
        
        RETURN NEXT;
    END LOOP;
    
    -- Traiter aussi les profils existants mais incomplets dans "profiles"
    FOR user_record IN 
        SELECT 
            p.user_id,
            p.email,
            au.raw_user_meta_data->>'phone' as phone,
            au.raw_user_meta_data->>'name' as name,
            au.raw_user_meta_data->>'business_name' as business_name
        FROM profiles p
        JOIN auth.users au ON p.user_id = au.id
        WHERE p.phone IS NULL 
           OR p.full_name IS NULL
           OR p.business_name IS NULL
    LOOP
        -- Mettre à jour le profil incomplet dans "profiles"
        UPDATE profiles SET
            phone = COALESCE(user_record.phone, phone),
            full_name = COALESCE(user_record.name, full_name),
            business_name = COALESCE(user_record.business_name, business_name),
            updated_at = NOW()
        WHERE user_id = user_record.user_id;
        
        -- Retourner le résultat
        user_id := user_record.user_id;
        email := user_record.email;
        phone_synced := COALESCE(user_record.phone, 'Non fourni');
        name_synced := COALESCE(user_record.name, 'Non fourni');
        status := 'Profil mis à jour';
        
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ÉTAPE 5: Mettre à jour la vue pour qu'elle utilise la table "profiles"
DROP VIEW IF EXISTS admin_profiles_view;
CREATE OR REPLACE VIEW admin_profiles_view AS
SELECT 
    p.id,
    p.user_id,
    p.email,
    p.phone,
    p.full_name,
    p.business_name,
    p.business_type,
    p.location,
    p.created_at,
    p.updated_at,
    p.is_active,
    
    -- Statistiques (si vous avez ces colonnes dans "profiles")
    COALESCE(p.products_count, 0) as products_count,
    COALESCE(p.sales_count, 0) as sales_count,
    COALESCE(p.expenses_count, 0) as expenses_count,
    COALESCE(p.customers_count, 0) as customers_count,
    COALESCE(p.total_sales_amount, 0) as total_sales_amount,
    COALESCE(p.total_expenses_amount, 0) as total_expenses_amount,
    (COALESCE(p.total_sales_amount, 0) - COALESCE(p.total_expenses_amount, 0)) as net_profit,
    
    -- Informations de l'utilisateur auth
    au.created_at as auth_created_at,
    au.last_sign_in_at,
    au.email_confirmed_at,
    au.phone as auth_phone,
    au.raw_user_meta_data as user_metadata,
    
    -- Indicateurs de synchronisation
    CASE 
        WHEN p.phone IS NOT NULL AND p.full_name IS NOT NULL THEN '✅ Complet'
        WHEN p.phone IS NOT NULL OR p.full_name IS NOT NULL THEN '⚠️ Partiel'
        ELSE '❌ Incomplet'
    END as sync_status,
    
    -- Dernière synchronisation
    CASE 
        WHEN p.updated_at > au.created_at THEN 'Mis à jour'
        ELSE 'Initial'
    END as last_sync_type
    
FROM profiles p
LEFT JOIN auth.users au ON p.user_id = au.id
ORDER BY p.created_at DESC;

-- ÉTAPE 6: Accorder les permissions
GRANT EXECUTE ON FUNCTION sync_existing_profiles TO authenticated;
GRANT SELECT ON admin_profiles_view TO authenticated;

-- ÉTAPE 7: Test de synchronisation pour les utilisateurs existants
SELECT 'Test de synchronisation des profils existants dans "profiles":' as test_info;
SELECT * FROM sync_existing_profiles();

-- ÉTAPE 8: Vérification finale
SELECT 'Configuration terminée pour la table "profiles":' as final_status;
SELECT 
    COUNT(*) as total_profils,
    COUNT(CASE WHEN phone IS NOT NULL AND full_name IS NOT NULL THEN 1 END) as profils_complets,
    COUNT(CASE WHEN phone IS NULL OR full_name IS NULL THEN 1 END) as profils_incomplets
FROM admin_profiles_view;
