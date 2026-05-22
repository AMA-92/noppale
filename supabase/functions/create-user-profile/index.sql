-- Fonction pour créer automatiquement un profil utilisateur lors de l'inscription
-- Inclut le numéro de téléphone et autres informations

-- D'abord, créer la table des profils utilisateurs
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    phone TEXT,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Statistiques
    products_count INTEGER DEFAULT 0,
    sales_count INTEGER DEFAULT 0,
    expenses_count INTEGER DEFAULT 0,
    customers_count INTEGER DEFAULT 0,
    total_sales_amount DECIMAL(15,2) DEFAULT 0,
    total_expenses_amount DECIMAL(15,2) DEFAULT 0,
    
    -- Informations de profil
    business_name TEXT,
    business_type TEXT,
    location TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Index pour optimisation
    UNIQUE(user_id)
);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour créer/mettre à jour le profil utilisateur
CREATE OR REPLACE FUNCTION create_or_update_user_profile()
RETURNS TRIGGER AS $$
DECLARE
    phone_number TEXT;
    full_name TEXT;
BEGIN
    -- Extraire le téléphone et le nom des métadonnées
    phone_number := NEW.raw_user_meta_data->>'phone';
    full_name := NEW.raw_user_meta_data->>'name';
    
    -- Insérer ou mettre à jour le profil
    INSERT INTO user_profiles (
        user_id, 
        email, 
        phone, 
        full_name
    ) VALUES (
        NEW.id,
        NEW.email,
        phone_number,
        full_name
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
        email = EXCLUDED.email,
        phone = COALESCE(phone_number, user_profiles.phone),
        full_name = COALESCE(full_name, user_profiles.full_name),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour créer automatiquement le profil lors de l'inscription
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_or_update_user_profile();

-- Fonction pour mettre à jour les statistiques du profil
CREATE OR REPLACE FUNCTION update_user_profile_stats(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
    -- Mettre à jour les compteurs
    UPDATE user_profiles SET
        products_count = (SELECT COUNT(*) FROM products WHERE user_id = user_uuid),
        sales_count = (SELECT COUNT(*) FROM sales WHERE user_id = user_uuid),
        expenses_count = (SELECT COUNT(*) FROM expenses WHERE user_id = user_uuid),
        customers_count = (SELECT COUNT(*) FROM customers WHERE user_id = user_uuid),
        total_sales_amount = COALESCE((SELECT SUM(amount) FROM sales WHERE user_id = user_uuid), 0),
        total_expenses_amount = COALESCE((SELECT SUM(amount) FROM expenses WHERE user_id = user_uuid), 0),
        updated_at = NOW()
    WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Créer une vue pour le Table Editor avec toutes les informations
CREATE OR REPLACE VIEW admin_user_profiles AS
SELECT 
    up.id,
    up.user_id,
    up.email,
    up.phone,
    up.full_name,
    up.business_name,
    up.business_type,
    up.location,
    up.created_at,
    up.updated_at,
    up.is_active,
    
    -- Statistiques
    up.products_count,
    up.sales_count,
    up.expenses_count,
    up.customers_count,
    up.total_sales_amount,
    up.total_expenses_amount,
    
    -- Calcul du bénéfice
    (up.total_sales_amount - COALESCE(up.total_expenses_amount, 0)) as net_profit,
    
    -- Informations de l'utilisateur auth
    au.created_at as auth_created_at,
    au.last_sign_in_at,
    au.email_confirmed_at,
    au.phone as auth_phone,
    
    -- Métadonnées brutes
    au.raw_user_meta_data
    
FROM user_profiles up
LEFT JOIN auth.users au ON up.user_id = au.id
ORDER BY up.created_at DESC;

-- Accorder les permissions
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON user_profiles TO anon;
GRANT SELECT ON admin_user_profiles TO authenticated;
GRANT SELECT ON admin_user_profiles TO anon;
GRANT EXECUTE ON FUNCTION update_user_profile_stats TO authenticated;

-- Trigger pour mettre à jour les stats après modification des données
CREATE OR REPLACE FUNCTION auto_update_profile_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Si insertion ou modification dans une table utilisateur
    IF TG_TABLE_NAME IN ('products', 'sales', 'expenses', 'customers') THEN
        PERFORM update_user_profile_stats(NEW.user_id);
    END IF;
    
    -- Si suppression
    IF TG_OP = 'DELETE' THEN
        PERFORM update_user_profile_stats(OLD.user_id);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Créer les triggers pour les mises à jour automatiques
DROP TRIGGER IF EXISTS trigger_products_stats ON products;
CREATE TRIGGER trigger_products_stats
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW
    EXECUTE FUNCTION auto_update_profile_stats();

DROP TRIGGER IF EXISTS trigger_sales_stats ON sales;
CREATE TRIGGER trigger_sales_stats
    AFTER INSERT OR UPDATE OR DELETE ON sales
    FOR EACH ROW
    EXECUTE FUNCTION auto_update_profile_stats();

DROP TRIGGER IF EXISTS trigger_expenses_stats ON expenses;
CREATE TRIGGER trigger_expenses_stats
    AFTER INSERT OR UPDATE OR DELETE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION auto_update_profile_stats();

DROP TRIGGER IF EXISTS trigger_customers_stats ON customers;
CREATE TRIGGER trigger_customers_stats
    AFTER INSERT OR UPDATE OR DELETE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION auto_update_profile_stats();
