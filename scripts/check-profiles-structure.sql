-- VÉRIFICATION PRÉCISE DE LA STRUCTURE profiles
-- Pour trouver la bonne colonne à utiliser pour la jointure

-- ÉTAPE 1: Structure exacte avec tous les détails
SELECT '=== STRUCTURE COMPLÈTE DE profiles ===' as info;
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ÉTAPE 2: Voir les données existantes pour comprendre la structure
SELECT '=== DONNÉES EXISTANTES DANS profiles ===' as info;
SELECT *
FROM profiles
LIMIT 3;

-- ÉTAPE 3: Voir les utilisateurs auth pour comparaison
SELECT '=== UTILISATEURS AUTH POUR COMPARAISON ===' as info;
SELECT 
    id,
    email,
    raw_user_meta_data->>'name' as name,
    raw_user_meta_data->>'phone' as phone,
    created_at
FROM auth.users 
ORDER BY created_at DESC
LIMIT 3;
