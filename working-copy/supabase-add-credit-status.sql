-- Ajouter le champ credit_status à la table sales pour gérer l'état des dettes
-- Valeurs possibles: 'pending' (en attente de remboursement), 'repaid' (remboursé)

ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS credit_status TEXT DEFAULT 'pending';

-- Ajouter un index pour optimiser les requêtes sur les dettes
CREATE INDEX IF NOT EXISTS idx_sales_credit_status ON sales(credit_status);
CREATE INDEX IF NOT EXISTS idx_sales_payment_method_credit ON sales(payment_method) WHERE payment_method = 'credit';

-- Mettre à jour les ventes existantes avec payment_method = 'credit' pour avoir credit_status = 'pending'
UPDATE sales 
SET credit_status = 'pending' 
WHERE payment_method = 'credit' AND (credit_status IS NULL OR credit_status = '');
