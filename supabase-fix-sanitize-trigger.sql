-- Corrige l'erreur PostgreSQL 2201B (regex invalide) sur INSERT/UPDATE products
-- Exécutez ce script dans Supabase → SQL Editor

CREATE OR REPLACE FUNCTION sanitize_input(input_text TEXT)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT
    replace(
      replace(
        replace(
          replace(COALESCE(input_text, ''), ';', ''),
          '--', ''
        ),
        '/*', ''
      ),
      '*/', ''
    );
$$;
