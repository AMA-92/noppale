-- =====================================================
-- FIX FINAL: Désactiver le trigger qui corrompt paid_amount
-- =====================================================

-- 1. Désactiver le trigger problématique
DROP TRIGGER IF EXISTS trg_update_sale_payment_status ON public.sale_payments;

-- 2. Supprimer la fonction
DROP FUNCTION IF EXISTS public.update_sale_payment_status();

-- 3. Mettre à jour toutes les ventes pour corriger paid_amount
-- Pour les ventes à crédit sans paiement, paid_amount doit être 0
UPDATE public.sales
SET paid_amount = 0
WHERE payment_method = 'credit'
  AND paid_amount > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.sale_payments sp WHERE sp.sale_id = sales.id
  );

-- 4. Pour les ventes à crédit avec des paiements, recalculer paid_amount
UPDATE public.sales
SET paid_amount = COALESCE(
  (SELECT SUM(amount) FROM public.sale_payments WHERE sale_id = sales.id),
  0
)
WHERE payment_method = 'credit';

-- 5. Pour les ventes cash, s'assurer que paid_amount = total
UPDATE public.sales
SET paid_amount = total
WHERE payment_method != 'credit' OR payment_method IS NULL;

-- 6. Vérification: Afficher les ventes à crédit avec leurs montants
SELECT 
  id,
  customer_name,
  total,
  paid_amount,
  remaining_amount,
  payment_status,
  (SELECT SUM(amount) FROM public.sale_payments WHERE sale_id = sales.id) as calculated_paid
FROM public.sales
WHERE payment_method = 'credit'
ORDER BY created_at DESC
LIMIT 10;

-- Message de confirmation
SELECT 'Fix final appliqué - Le trigger a été supprimé et les montants ont été recalculés' as status;
