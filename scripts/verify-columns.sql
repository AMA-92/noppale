-- VÉRIFICATION EXACTE DES COLONNES DISPONIBLES
-- Pour trouver la bonne colonne de jointure

-- ÉTAPE 1: Liste complète des colonnes de profiles
SELECT '=== COLONNES DISPONIBLES DANS profiles ===' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ÉTAPE 2: Voir quelques données pour comprendre
SELECT '=== DONNÉES EXISTANTES ===' as info;
SELECT *
FROM profiles
LIMIT 2;

-- ÉTAPE 3: Voir les utilisateurs auth pour trouver la correspondance
SELECT '=== UTILISATEURS AUTH AVEC LEURS ID ===' as info;
SELECT 
    id,
    email,
    raw_user_meta_data->>'name' as name,
    raw_user_meta_data->>'phone' as phone,
    created_at
FROM auth.users 
ORDER BY created_at DESC
LIMIT 3;
