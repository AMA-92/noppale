DROP POLICY IF EXISTS "Users can update own sale_items" ON public.sale_items;
CREATE POLICY "Users can update own sale_items"
ON public.sale_items
FOR UPDATE
TO authenticated
USING (
  sale_id IN (
    SELECT id FROM public.sales WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  sale_id IN (
    SELECT id FROM public.sales WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete own sale_items" ON public.sale_items;
CREATE POLICY "Users can delete own sale_items"
ON public.sale_items
FOR DELETE
TO authenticated
USING (
  sale_id IN (
    SELECT id FROM public.sales WHERE user_id = auth.uid()
  )
);
