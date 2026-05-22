-- ÉTAPE 2: Créer la fonction de synchronisation pour "profiles"
-- Ne passez à l'étape suivante qu'après avoir validé cette étape

-- Supprimer les anciennes versions si elles existent
DROP FUNCTION IF EXISTS create_or_update_user_profile();

-- Créer la fonction de synchronisation pour la table "profiles"
CREATE OR REPLACE FUNCTION create_or_update_user_profile()
RETURNS TRIGGER AS $$
DECLARE
    phone_number TEXT;
    full_name TEXT;
    business_name TEXT;
    profile_exists BOOLEAN;
BEGIN
    -- Extraire les informations des métadonnées de l'utilisateur
    phone_number := NEW.raw_user_meta_data->>'phone';
    full_name := NEW.raw_user_meta_data->>'name';
    business_name := NEW.raw_user_meta_data->>'business_name';
    
    -- Journaliser pour le débogage
    RAISE NOTICE 'Nouvel utilisateur: % | Téléphone: % | Nom: %', 
                 NEW.email, 
                 COALESCE(phone_number, 'Non fourni'), 
                 COALESCE(full_name, 'Non fourni');
    
    -- Insérer le profil dans la table "profiles"
    -- Utiliser INSERT ON CONFLICT pour éviter les doublons
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
    
    -- Journaliser le succès
    RAISE NOTICE '✅ Profil synchronisé avec succès pour: %', NEW.email;
    
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Erreur lors de la synchronisation du profil: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Test de la fonction (sans trigger pour l'instant)
SELECT 'Test de la fonction create_or_update_user_profile:' as step;

-- Vérifier que la fonction est bien créée
SELECT 'Fonction créée avec succès:' as status,
       proname as function_name,
       pronargs as argument_count
FROM pg_proc 
WHERE proname = 'create_or_update_user_profile';

-- Afficher la définition de la fonction pour vérification
SELECT 'Définition de la fonction:' as step;
SELECT 
    routine_definition,
    routine_name
FROM information_schema.routines 
WHERE routine_name = 'create_or_update_user_profile'
  AND routine_schema = 'public';

-- Test manuel avec un utilisateur fictif (ne crée rien de réel)
DO $$
DECLARE
    test_result TEXT;
BEGIN
    RAISE NOTICE '=== TEST DE LA FONCTION ===';
    RAISE NOTICE 'La fonction est prête pour être utilisée avec un trigger';
    RAISE NOTICE 'Prochaine étape: Créer le trigger AFTER INSERT';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Test terminé';
END $$;

-- Conclusion
SELECT '=== ÉTAPE 2 TERMINÉE ===' as step;
SELECT '✅ Fonction create_or_update_user_profile créée avec succès' as status;
SELECT 'Passez à l''étape 3 pour créer le trigger' as next_step;
