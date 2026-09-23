-- Activer l'extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  buying_price DECIMAL(10, 2),
  selling_price DECIMAL(10, 2),
  stock INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 0,
  barcode TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table sales
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  total DECIMAL(10, 2) NOT NULL,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table sale_items
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table expenses
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table shop_info
CREATE TABLE shop_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer des indexes pour améliorer les performances
CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_sales_user_id ON sales(user_id);
CREATE INDEX idx_sales_created_at ON sales(created_at);
CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_shop_info_user_id ON shop_info(user_id);

-- Activer Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_info ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour users
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Politiques RLS pour products
CREATE POLICY "Users can view own products" ON products
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own products" ON products
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own products" ON products
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own products" ON products
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Politiques RLS pour customers
CREATE POLICY "Users can view own customers" ON customers
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own customers" ON customers
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own customers" ON customers
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own customers" ON customers
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Politiques RLS pour sales
CREATE POLICY "Users can view own sales" ON sales
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own sales" ON sales
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own sales" ON sales
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own sales" ON sales
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Politiques RLS pour sale_items
CREATE POLICY "Users can view own sale_items" ON sale_items
  FOR SELECT USING (
    sale_id IN (
      SELECT id FROM sales WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert own sale_items" ON sale_items
  FOR INSERT WITH CHECK (
    sale_id IN (
      SELECT id FROM sales WHERE user_id::text = auth.uid()::text
    )
  );

-- Politiques RLS pour expenses
CREATE POLICY "Users can view own expenses" ON expenses
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own expenses" ON expenses
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own expenses" ON expenses
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own expenses" ON expenses
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Politiques RLS pour shop_info
CREATE POLICY "Users can view own shop_info" ON shop_info
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own shop_info" ON shop_info
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own shop_info" ON shop_info
  FOR UPDATE USING (auth.uid()::text = user_id::text);
