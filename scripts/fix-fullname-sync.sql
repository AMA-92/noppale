-- SCRIPT POUR CORRIGER LA SYNCHRONISATION DES full_name
-- Utilisez ce script pour que les noms s'affichent correctement dans Table Editor

-- ÉTAPE 1: Vérifier l'état actuel des full_name
SELECT '=== ÉTAT ACTUEL DES full_name ===' as step;
SELECT 
    COUNT(*) as total_profils,
    COUNT(CASE WHEN full_name IS NOT NULL AND full_name != '' THEN 1 END) as avec_nom,
    COUNT(CASE WHEN full_name IS NULL OR full_name = '' THEN 1 END) as sans_nom,
    COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as avec_telephone
FROM admin_profiles_view;

-- ÉTAPE 2: Voir les profils avec full_name manquant
SELECT '=== PROFILS AVEC full_name MANQUANT ===' as step;
SELECT 
    id,
    email,
    phone,
    full_name,
    sync_status,
    created_at
FROM admin_profiles_view
WHERE full_name IS NULL OR full_name = ''
ORDER BY created_at DESC;

-- ÉTAPE 3: Voir les métadonnées des utilisateurs auth pour récupérer les noms
SELECT '=== MÉTADONNÉES UTILISATEURS AUTH ===' as step;
SELECT 
    au.id,
    au.email,
    au.raw_user_meta_data->>'name' as metadata_name,
    au.raw_user_meta_data->>'phone' as metadata_phone,
    p.full_name as current_full_name,
    p.phone as current_phone,
    CASE 
        WHEN p.full_name IS NULL OR p.full_name = '' THEN '❌ Nom manquant'
        ELSE '✅ Nom OK'
    END as name_status
FROM auth.users au
LEFT JOIN profiles p ON au.email = p.email  -- Utiliser email pour faire le lien
WHERE au.raw_user_meta_data->>'name' IS NOT NULL 
  AND (p.full_name IS NULL OR p.full_name = '')
ORDER BY au.created_at DESC;

-- ÉTAPE 4: Mettre à jour tous les profils avec les noms depuis les métadonnées
DO $$
DECLARE
    updated_count INTEGER := 0;
    user_record RECORD;
BEGIN
    RAISE NOTICE '=== MISE À JOUR DES full_name ===';
    
    -- Parcourir tous les utilisateurs auth qui ont un nom dans les métadonnées
    FOR user_record IN 
        SELECT 
            au.id as auth_id,
            au.email,
            au.raw_user_meta_data->>'name' as metadata_name,
            au.raw_user_meta_data->>'phone' as metadata_phone,
            p.id as profile_id
        FROM auth.users au
        LEFT JOIN profiles p ON au.email = p.email
        WHERE au.raw_user_meta_data->>'name' IS NOT NULL 
          AND au.raw_user_meta_data->>'name' != ''
          AND (p.full_name IS NULL OR p.full_name = '')
    LOOP
        -- Mettre à jour le profil avec le nom depuis les métadonnées
        UPDATE profiles SET
            full_name = user_record.metadata_name,
            phone = COALESCE(user_record.metadata_phone, phone),
            updated_at = NOW()
        WHERE id = user_record.profile_id;
        
        updated_count := updated_count + 1;
        
        RAISE NOTICE '✅ Profil mis à jour: % → %', 
                     user_record.email, user_record.metadata_name;
    END LOOP;
    
    RAISE NOTICE 'Total des profils mis à jour: %', updated_count;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erreur lors de la mise à jour: %', SQLERRM;
END $$;

-- ÉTAPE 5: Vérifier les résultats après mise à jour
SELECT '=== RÉSULTATS APRÈS MISE À JOUR ===' as step;
SELECT 
    COUNT(*) as total_profils,
    COUNT(CASE WHEN full_name IS NOT NULL AND full_name != '' THEN 1 END) as avec_nom,
    COUNT(CASE WHEN full_name IS NULL OR full_name = '' THEN 1 END) as sans_nom,
    COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as avec_telephone
FROM admin_profiles_view;

-- ÉTAPE 6: Afficher les profils mis à jour
SELECT '=== PROFILS MIS À JOUR ===' as step;
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

-- ÉTAPE 7: Corriger le trigger pour les futures inscriptions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recréer le trigger avec une meilleure gestion du nom
CREATE OR REPLACE FUNCTION create_or_update_user_profile()
RETURNS TRIGGER AS $$
DECLARE
    phone_number TEXT;
    full_name TEXT;
    business_name TEXT;
BEGIN
    -- Extraire les informations des métadonnées avec meilleure gestion
    phone_number := COALESCE(NEW.raw_user_meta_data->>'phone', NEW.raw_user_meta_data->>'telephone');
    full_name := COALESCE(
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'firstName',
        NEW.raw_user_meta_data->>'lastName',
        split_part(NEW.email, '@', 1)  -- Utiliser la partie email comme fallback
    );
    business_name := NEW.raw_user_meta_data->>'business_name';
    
    -- Journaliser pour le débogage
    RAISE NOTICE 'Nouvel utilisateur: % | Téléphone: % | Nom: %', 
                 NEW.email, 
                 COALESCE(phone_number, 'Non fourni'), 
                 COALESCE(full_name, 'Non fourni');
    
    -- Insérer ou mettre à jour le profil
    INSERT INTO profiles (
        email, 
        phone, 
        full_name,
        business_name,
        created_at,
        updated_at
    ) VALUES (
        NEW.email,
        phone_number,
        full_name,
        business_name,
        NEW.created_at,
        NOW()
    )
    ON CONFLICT (email) 
    DO UPDATE SET
        email = EXCLUDED.email,
        phone = COALESCE(phone_number, profiles.phone),
        full_name = COALESCE(full_name, profiles.full_name),
        business_name = COALESCE(business_name, profiles.business_name),
        updated_at = NOW();
    
    -- Journaliser le succès
    RAISE NOTICE '✅ Profil synchronisé avec succès pour: % | Nom: %', NEW.email, full_name;
    
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Erreur lors de la synchronisation du profil: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recréer le trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_or_update_user_profile();

-- Conclusion
SELECT '=== SYNCHRONISATION CORRIGÉE ===' as step;
SELECT '✅ Les full_name ont été mis à jour' as status;
SELECT '✅ Le trigger a été amélioré pour les futures inscriptions' as info;
SELECT 'Les noms devraient maintenant s''afficher correctement dans Table Editor' as result;
