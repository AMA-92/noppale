-- Security Enhancements for Supabase Database
-- This script adds additional security measures to protect against common attacks

-- 1. Add check constraints to prevent invalid data
ALTER TABLE products 
ADD CONSTRAINT check_buying_price_positive CHECK (buying_price >= 0),
ADD CONSTRAINT check_selling_price_positive CHECK (selling_price >= 0),
ADD CONSTRAINT check_stock_positive CHECK (stock >= 0),
ADD CONSTRAINT check_min_stock_positive CHECK (min_stock >= 0);

ALTER TABLE sales 
ADD CONSTRAINT check_total_positive CHECK (total >= 0);

ALTER TABLE expenses 
ADD CONSTRAINT check_amount_positive CHECK (amount >= 0);

ALTER TABLE sale_items 
ADD CONSTRAINT check_quantity_positive CHECK (quantity >= 0),
ADD CONSTRAINT check_price_positive CHECK (price >= 0);

-- 2. Add constraints to prevent overly long strings (defense in depth)
ALTER TABLE products 
ADD CONSTRAINT check_name_length CHECK (char_length(name) <= 200),
ADD CONSTRAINT check_category_length CHECK (char_length(category) <= 100),
ADD CONSTRAINT check_barcode_length CHECK (char_length(barcode) <= 50);

ALTER TABLE sales 
ADD CONSTRAINT check_customer_name_length CHECK (char_length(customer_name) <= 200),
ADD CONSTRAINT check_notes_length CHECK (char_length(notes) <= 500);

ALTER TABLE expenses 
ADD CONSTRAINT check_description_length CHECK (char_length(description) <= 500),
ADD CONSTRAINT check_category_length CHECK (char_length(category) <= 100),
ADD CONSTRAINT check_notes_length CHECK (char_length(notes) <= 500);

ALTER TABLE customers 
ADD CONSTRAINT check_name_length CHECK (char_length(name) <= 200),
ADD CONSTRAINT check_phone_length CHECK (char_length(phone) <= 20),
ADD CONSTRAINT check_email_length CHECK (char_length(email) <= 255);

-- 3. Strengthen RLS policies with additional checks

-- Products RLS - Ensure users can only access their own data
DROP POLICY IF EXISTS "Users can view their own products" ON products;
CREATE POLICY "Users can view their own products"
ON products
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own products" ON products;
CREATE POLICY "Users can insert their own products"
ON products
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own products" ON products;
CREATE POLICY "Users can update their own products"
ON products
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own products" ON products;
CREATE POLICY "Users can delete their own products"
ON products
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Sales RLS - Ensure users can only access their own data
DROP POLICY IF EXISTS "Users can view their own sales" ON sales;
CREATE POLICY "Users can view their own sales"
ON sales
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own sales" ON sales;
CREATE POLICY "Users can insert their own sales"
ON sales
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own sales" ON sales;
CREATE POLICY "Users can update their own sales"
ON sales
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own sales" ON sales;
CREATE POLICY "Users can delete their own sales"
ON sales
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Expenses RLS - Ensure users can only access their own data
DROP POLICY IF EXISTS "Users can view their own expenses" ON expenses;
CREATE POLICY "Users can view their own expenses"
ON expenses
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own expenses" ON expenses;
CREATE POLICY "Users can insert their own expenses"
ON expenses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own expenses" ON expenses;
CREATE POLICY "Users can update their own expenses"
ON expenses
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own expenses" ON expenses;
CREATE POLICY "Users can delete their own expenses"
ON expenses
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Customers RLS - Ensure users can only access their own data
DROP POLICY IF EXISTS "Users can view their own customers" ON customers;
CREATE POLICY "Users can view their own customers"
ON customers
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own customers" ON customers;
CREATE POLICY "Users can insert their own customers"
ON customers
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own customers" ON customers;
CREATE POLICY "Users can update their own customers"
ON customers
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own customers" ON customers;
CREATE POLICY "Users can delete their own customers"
ON customers
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Shop Info RLS - Ensure users can only access their own data
DROP POLICY IF EXISTS "Users can view their own shop_info" ON shop_info;
CREATE POLICY "Users can view their own shop_info"
ON shop_info
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own shop_info" ON shop_info;
CREATE POLICY "Users can insert their own shop_info"
ON shop_info
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own shop_info" ON shop_info;
CREATE POLICY "Users can update their own shop_info"
ON shop_info
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own shop_info" ON shop_info;
CREATE POLICY "Users can delete their own shop_info"
ON shop_info
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 4. Enable RLS on all tables (ensure it's enabled)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_secret_code ENABLE ROW LEVEL SECURITY;

-- 5. Create indexes for better performance and security
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_info_user_id ON shop_info(user_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);

-- 6. Add function to prevent SQL injection through dynamic queries
CREATE OR REPLACE FUNCTION sanitize_input(input_text TEXT)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(input_text, ';', '', 'g'),
          '--', '', 'g'
        ),
        '/*', '', 'g'
      ),
      '*/', '', 'g'
    );
$$;

-- 7. Add trigger to automatically sanitize inputs (optional, client-side sanitization is preferred)
-- This is a backup measure
CREATE OR REPLACE FUNCTION trigger_sanitize_product_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.name = sanitize_input(NEW.name);
  NEW.category = sanitize_input(NEW.category);
  NEW.barcode = sanitize_input(NEW.barcode);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sanitize_product_name_trigger ON products;
CREATE TRIGGER sanitize_product_name_trigger
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION trigger_sanitize_product_name();

-- 8. Add audit logging for critical operations
CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only allow service role to insert audit logs
CREATE POLICY "Service role can insert audit logs"
ON security_audit_log
FOR INSERT
TO service_role
WITH CHECK (true);

-- Allow users to view their own audit logs
CREATE POLICY "Users can view their own audit logs"
ON security_audit_log
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 9. Create function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
  p_action TEXT,
  p_table_name TEXT,
  p_record_id UUID,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO security_audit_log (user_id, action, table_name, record_id, old_data, new_data)
  VALUES (auth.uid(), p_action, p_table_name, p_record_id, p_old_data, p_new_data);
END;
$$;

-- 10. Add audit triggers for critical tables
CREATE OR REPLACE FUNCTION audit_product_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_security_event('INSERT', 'products', NEW.id, NULL, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_security_event('UPDATE', 'products', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_security_event('DELETE', 'products', OLD.id, to_jsonb(OLD), NULL);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS audit_product_trigger ON products;
CREATE TRIGGER audit_product_trigger
AFTER INSERT OR UPDATE OR DELETE ON products
FOR EACH ROW
EXECUTE FUNCTION audit_product_changes();

-- Similar triggers for sales
CREATE OR REPLACE FUNCTION audit_sale_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_security_event('INSERT', 'sales', NEW.id, NULL, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_security_event('UPDATE', 'sales', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_security_event('DELETE', 'sales', OLD.id, to_jsonb(OLD), NULL);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS audit_sale_trigger ON sales;
CREATE TRIGGER audit_sale_trigger
AFTER INSERT OR UPDATE OR DELETE ON sales
FOR EACH ROW
EXECUTE FUNCTION audit_sale_changes();
