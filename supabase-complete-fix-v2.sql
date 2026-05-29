-- =====================================================
-- FIX COMPLET V2: Synchronisation CA et Dettes
-- remaining_amount est une colonne générée - ne pas la mettre à jour manuellement
-- =====================================================

-- 1. Activer le realtime pour sale_payments (si pas déjà fait)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'sale_payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sale_payments;
  END IF;
END $$;

-- 2. Supprimer le trigger existant
DROP TRIGGER IF EXISTS trg_update_sale_payment_status ON public.sale_payments;

-- 3. Supprimer la fonction existante
DROP FUNCTION IF EXISTS public.update_sale_payment_status();

-- 4. Recréer la fonction SANS mettre à jour remaining_amount (colonne générée)
CREATE OR REPLACE FUNCTION public.update_sale_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  v_sale_id UUID;
  v_total DECIMAL(12,2);
  v_paid DECIMAL(12,2);
  v_status VARCHAR(20);
BEGIN
  -- Déterminer le sale_id selon l'opération
  IF TG_OP = 'DELETE' THEN
    v_sale_id := OLD.sale_id;
  ELSE
    v_sale_id := NEW.sale_id;
  END IF;
  
  -- Récupérer le total de la vente
  SELECT total INTO v_total FROM public.sales WHERE id = v_sale_id;
  
  -- Calculer le total payé (somme de tous les paiements)
  SELECT COALESCE(SUM(amount), 0) INTO v_paid 
  FROM public.sale_payments 
  WHERE sale_id = v_sale_id;
  
  -- Déterminer le statut
  IF v_paid >= v_total THEN
    v_status := 'paid';
  ELSIF v_paid > 0 THEN
    v_status := 'partial';
  ELSE
    v_status := 'pending';
  END IF;
  
  -- Mettre à jour la vente SEULEMENT paid_amount et payment_status
  -- remaining_amount est une colonne générée, elle se met à jour automatiquement
  UPDATE public.sales 
  SET 
    paid_amount = v_paid,
    payment_status = v_status,
    updated_at = NOW()
  WHERE id = v_sale_id;
  
  -- Retourner la ligne appropriée selon l'opération
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Recréer le trigger pour INSERT, UPDATE, DELETE
CREATE TRIGGER trg_update_sale_payment_status
AFTER INSERT OR UPDATE OR DELETE ON public.sale_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_sale_payment_status();

-- 6. Migrer les ventes existantes avec credit_status mais sans payment_method = 'credit'
UPDATE public.sales
SET 
  payment_method = 'credit',
  payment_status = CASE 
    WHEN credit_status = 'repaid' THEN 'paid'
    WHEN credit_status = 'pending' THEN 'pending'
    ELSE 'pending'
  END
WHERE credit_status IS NOT NULL 
  AND (payment_method IS NULL OR payment_method != 'credit');

-- 7. Recalculer paid_amount pour toutes les ventes (colonne normale, pas générée)
UPDATE public.sales
SET paid_amount = COALESCE(
  (SELECT SUM(amount) FROM public.sale_payments WHERE sale_id = sales.id), 
  0
);

-- 8. Mettre à jour payment_status pour les ventes à crédit
UPDATE public.sales
SET payment_status = CASE
  WHEN paid_amount >= total THEN 'paid'
  WHEN paid_amount > 0 THEN 'partial'
  ELSE 'pending'
END
WHERE payment_method = 'credit';

-- 9. Pour les ventes non-credit, s'assurer qu'elles sont marquées comme payées
UPDATE public.sales
SET 
  payment_status = 'paid',
  paid_amount = total
WHERE payment_method != 'credit' OR payment_method IS NULL;

-- 10. Vérification: Résumé des ventes
SELECT 
  '=== RÉSUMÉ DES VENTES ===' as info;

SELECT 
  payment_method,
  payment_status,
  COUNT(*) as count,
  SUM(total) as total_montant,
  SUM(paid_amount) as total_paye,
  SUM(remaining_amount) as total_restant
FROM public.sales
GROUP BY payment_method, payment_status
ORDER BY payment_method, payment_status;

-- 11. Vérification: Ventes à crédit avec dette
SELECT 
  '=== DÉTAIL DES CRÉDITS ===' as info;

SELECT 
  id,
  customer_name,
  total,
  paid_amount,
  remaining_amount,
  payment_status
FROM public.sales
WHERE payment_method = 'credit' AND remaining_amount > 0
ORDER BY remaining_amount DESC
LIMIT 20;

-- 12. Totaux globaux
SELECT 
  '=== TOTAUX GLOBAUX ===' as info;

SELECT 
  SUM(CASE WHEN payment_method = 'credit' THEN paid_amount ELSE total END) as ca_real,
  SUM(CASE WHEN payment_method = 'credit' THEN remaining_amount ELSE 0 END) as total_dettes
FROM public.sales;

-- Message de confirmation
SELECT 'Fix V2 appliqué avec succès! remaining_amount est une colonne générée et se met à jour automatiquement.' as status;
