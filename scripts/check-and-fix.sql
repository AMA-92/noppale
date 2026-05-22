-- SCRIPT POUR VÉRIFIER LA STRUCTURE ET CORRIGER
-- D'abord vérifier les colonnes existantes

-- ÉTAPE 1: Voir la structure exacte de la table profiles
SELECT '=== STRUCTURE DE LA TABLE profiles ===' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ÉTAPE 2: Voir quelques exemples de données existantes
SELECT '=== EXEMPLES DE DONNÉES EXISTANTES ===' as info;
SELECT *
FROM profiles
LIMIT 3;

-- ÉTAPE 3: Voir les métadonnées des utilisateurs auth pour comparaison
SELECT '=== UTILISATEURS AUTH AVEC NOMS ===' as info;
SELECT 
    id,
    email,
    raw_user_meta_data->>'name' as name_in_metadata,
    raw_user_meta_data->>'phone' as phone_in_metadata,
    created_at
FROM auth.users 
WHERE raw_user_meta_data->>'name' IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
