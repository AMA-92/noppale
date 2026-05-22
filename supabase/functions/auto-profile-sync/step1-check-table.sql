-- ÉTAPE 1: Vérifier la structure de la table "profiles"
-- Ne passez à l'étape suivante qu'après avoir validé cette étape

-- Vérifier si la table "profiles" existe
SELECT 'Vérification de l''existence de la table "profiles":' as step;
SELECT 
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'profiles' 
        AND table_schema = 'public'
    ) as table_exists;

-- Si la table existe, afficher sa structure
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'profiles' 
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE '=== STRUCTURE DE LA TABLE "profiles" ===';
    ELSE
        RAISE NOTICE '❌ La table "profiles" n''existe pas !';
        RAISE NOTICE 'Veuillez créer la table "profiles" d''abord ou vérifier le nom exact.';
    END IF;
END $$;

-- Afficher les colonnes de la table "profiles" si elle existe
SELECT 'Colonnes de la table "profiles":' as step;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Vérifier s'il y a déjà des données dans "profiles"
SELECT 'Nombre d''enregistrements dans "profiles":' as step;
SELECT COUNT(*) as record_count 
FROM profiles
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public');

-- Afficher les 3 premiers enregistrements pour voir la structure
SELECT 'Premiers enregistrements dans "profiles":' as step;
SELECT *
FROM profiles
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public')
LIMIT 3;

-- Vérifier la table "auth.users" pour comparaison
SELECT 'Structure de référence - auth.users (colonnes pertinentes):' as step;
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND table_schema = 'auth'
  AND column_name IN ('id', 'email', 'raw_user_meta_data', 'created_at')
ORDER BY ordinal_position;

-- Conclusion et recommandations
SELECT '=== CONCLUSION ===' as step;
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') 
        THEN '✅ Table "profiles" trouvée - Passez à l''étape 2'
        ELSE '❌ Table "profiles" non trouvée - Créez la table d''abord'
    END as next_step;
