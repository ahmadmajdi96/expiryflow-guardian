
-- 1. alert_thresholds
DROP POLICY IF EXISTS "Authenticated users can manage thresholds" ON public.alert_thresholds;
CREATE POLICY "Authorized roles can manage thresholds" ON public.alert_thresholds
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'store_manager'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'store_manager'));

-- 2. expiry_alerts
DROP POLICY IF EXISTS "Authenticated users can manage alerts" ON public.expiry_alerts;
CREATE POLICY "Authorized roles can manage alerts" ON public.expiry_alerts
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'store_manager'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'store_manager'));

-- 3. fefo_allocation_log
DROP POLICY IF EXISTS "Authenticated can create allocations" ON public.fefo_allocation_log;
CREATE POLICY "Authorized roles can create allocations" ON public.fefo_allocation_log
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'warehouse_clerk')
  OR public.has_role(auth.uid(), 'store_manager')
);

-- 4. inventory_batches
DROP POLICY IF EXISTS "Authenticated users can manage batches" ON public.inventory_batches;
CREATE POLICY "Authorized roles can manage batches" ON public.inventory_batches
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'warehouse_clerk')
  OR public.has_role(auth.uid(), 'store_manager')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'warehouse_clerk')
  OR public.has_role(auth.uid(), 'store_manager')
);

-- 5. markdown_proposals
DROP POLICY IF EXISTS "Authenticated can insert proposals" ON public.markdown_proposals;
CREATE POLICY "Authorized roles can insert proposals" ON public.markdown_proposals
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'store_manager')
);

-- 6. po_lines
DROP POLICY IF EXISTS "Authenticated users can manage PO lines" ON public.po_lines;
CREATE POLICY "Authorized roles can manage PO lines" ON public.po_lines
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'warehouse_clerk')
  OR public.has_role(auth.uid(), 'store_manager')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'warehouse_clerk')
  OR public.has_role(auth.uid(), 'store_manager')
);

-- 7. products
DROP POLICY IF EXISTS "Authenticated users can manage products" ON public.products;
CREATE POLICY "Authorized roles can manage products" ON public.products
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'store_manager'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'store_manager'));

-- 8. purchase_orders
DROP POLICY IF EXISTS "Authenticated users can manage POs" ON public.purchase_orders;
CREATE POLICY "Authorized roles can manage POs" ON public.purchase_orders
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'warehouse_clerk')
  OR public.has_role(auth.uid(), 'store_manager')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'warehouse_clerk')
  OR public.has_role(auth.uid(), 'store_manager')
);

-- 9. qc_inspections
DROP POLICY IF EXISTS "Authenticated users can manage QC" ON public.qc_inspections;
CREATE POLICY "Authorized roles can manage QC" ON public.qc_inspections
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'qc_inspector')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'qc_inspector')
);

-- 10. stock_transfers
DROP POLICY IF EXISTS "Authenticated users can manage transfers" ON public.stock_transfers;
CREATE POLICY "Authorized roles can manage transfers" ON public.stock_transfers
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'warehouse_clerk')
  OR public.has_role(auth.uid(), 'store_manager')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'warehouse_clerk')
  OR public.has_role(auth.uid(), 'store_manager')
);

-- 11. stores
DROP POLICY IF EXISTS "Authenticated users can manage stores" ON public.stores;
CREATE POLICY "Only admins can manage stores" ON public.stores
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 12. Restrict has_role function to authenticated only
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- 13. Fix batch-labels storage: restrict listing to authenticated
DROP POLICY IF EXISTS "Public batch-labels read" ON storage.objects;
CREATE POLICY "Authenticated can read batch-labels" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'batch-labels');
