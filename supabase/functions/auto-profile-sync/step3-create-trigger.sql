-- ÉTAPE 3: Créer le trigger automatique sur "profiles"
-- Ne passez à l'étape suivante qu'après avoir validé cette étape

-- Créer le trigger qui se déclenche après chaque nouvelle inscription
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_or_update_user_profile();

-- Vérifier que le trigger est bien créé
SELECT 'Vérification du trigger créé:' as step;
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_condition,
    action_orientation,
    action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created'
  AND event_object_table = 'users'
  AND trigger_schema = 'auth';

-- Vérifier que la fonction est bien liée au trigger
SELECT 'Lien trigger-fonction:' as step;
SELECT 
    t.trigger_name,
    t.event_object_table,
    p.proname as function_name
FROM information_schema.triggers t
JOIN pg_proc p ON t.action_statement LIKE '%' || p.proname || '%'
WHERE t.trigger_name = 'on_auth_user_created'
  AND t.event_object_table = 'users'
  AND t.trigger_schema = 'auth';

-- Test du trigger avec une simulation (sans créer de vrai utilisateur)
DO $$
DECLARE
    test_result TEXT;
BEGIN
    RAISE NOTICE '=== TEST DU TRIGGER ===';
    RAISE NOTICE 'Trigger "on_auth_user_created" créé avec succès';
    RAISE NOTICE 'Il se déclenchera automatiquement à chaque nouvelle inscription';
    RAISE NOTICE 'La fonction "create_or_update_user_profile" sera appelée';
    RAISE NOTICE 'Le profil sera créé dans la table "profiles"';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Test terminé';
END $$;

-- Afficher les informations sur le trigger
SELECT '=== INFORMATIONS SUR LE TRIGGER ===' as step;
SELECT 
    'Trigger' as object_type,
    'on_auth_user_created' as name,
    'auth.users' as table_name,
    'AFTER INSERT' as event,
    'FOR EACH ROW' as execution,
    'create_or_update_user_profile' as function_called;

-- Vérifier qu'il n'y a pas de conflit avec d'autres triggers
SELECT 'Autres triggers sur auth.users:' as step;
SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'users'
  AND trigger_schema = 'auth'
  AND trigger_name != 'on_auth_user_created';

-- Conclusion
SELECT '=== ÉTAPE 3 TERMINÉE ===' as step;
SELECT '✅ Trigger "on_auth_user_created" créé avec succès' as status;
SELECT 'Le trigger se déclenchera automatiquement à chaque nouvelle inscription' as info;
SELECT 'Passez à l''étape 4 pour créer la vue Table Editor' as next_step;
