
-- 1. Fix has_role SECURITY DEFINER
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- 2. Add foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_inventory_batches_product') THEN
    ALTER TABLE public.inventory_batches ADD CONSTRAINT fk_inventory_batches_product FOREIGN KEY (product_id) REFERENCES public.products(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_inventory_batches_store') THEN
    ALTER TABLE public.inventory_batches ADD CONSTRAINT fk_inventory_batches_store FOREIGN KEY (store_id) REFERENCES public.stores(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_inventory_batches_po_line') THEN
    ALTER TABLE public.inventory_batches ADD CONSTRAINT fk_inventory_batches_po_line FOREIGN KEY (po_line_id) REFERENCES public.po_lines(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_po_lines_po') THEN
    ALTER TABLE public.po_lines ADD CONSTRAINT fk_po_lines_po FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_po_lines_product') THEN
    ALTER TABLE public.po_lines ADD CONSTRAINT fk_po_lines_product FOREIGN KEY (product_id) REFERENCES public.products(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pick_requests_product') THEN
    ALTER TABLE public.pick_requests ADD CONSTRAINT fk_pick_requests_product FOREIGN KEY (product_id) REFERENCES public.products(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pick_requests_store') THEN
    ALTER TABLE public.pick_requests ADD CONSTRAINT fk_pick_requests_store FOREIGN KEY (store_id) REFERENCES public.stores(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pick_request_lines_pick') THEN
    ALTER TABLE public.pick_request_lines ADD CONSTRAINT fk_pick_request_lines_pick FOREIGN KEY (pick_request_id) REFERENCES public.pick_requests(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pick_request_lines_batch') THEN
    ALTER TABLE public.pick_request_lines ADD CONSTRAINT fk_pick_request_lines_batch FOREIGN KEY (batch_id) REFERENCES public.inventory_batches(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pick_exceptions_pick') THEN
    ALTER TABLE public.pick_exceptions ADD CONSTRAINT fk_pick_exceptions_pick FOREIGN KEY (pick_request_id) REFERENCES public.pick_requests(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pick_exceptions_line') THEN
    ALTER TABLE public.pick_exceptions ADD CONSTRAINT fk_pick_exceptions_line FOREIGN KEY (original_line_id) REFERENCES public.pick_request_lines(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pick_exceptions_batch') THEN
    ALTER TABLE public.pick_exceptions ADD CONSTRAINT fk_pick_exceptions_batch FOREIGN KEY (batch_id) REFERENCES public.inventory_batches(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_stock_transfers_batch') THEN
    ALTER TABLE public.stock_transfers ADD CONSTRAINT fk_stock_transfers_batch FOREIGN KEY (batch_id) REFERENCES public.inventory_batches(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_stock_transfers_from_store') THEN
    ALTER TABLE public.stock_transfers ADD CONSTRAINT fk_stock_transfers_from_store FOREIGN KEY (from_store_id) REFERENCES public.stores(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_stock_transfers_to_store') THEN
    ALTER TABLE public.stock_transfers ADD CONSTRAINT fk_stock_transfers_to_store FOREIGN KEY (to_store_id) REFERENCES public.stores(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_qc_inspections_batch') THEN
    ALTER TABLE public.qc_inspections ADD CONSTRAINT fk_qc_inspections_batch FOREIGN KEY (batch_id) REFERENCES public.inventory_batches(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_markdown_proposals_batch') THEN
    ALTER TABLE public.markdown_proposals ADD CONSTRAINT fk_markdown_proposals_batch FOREIGN KEY (batch_id) REFERENCES public.inventory_batches(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_roles_user') THEN
    ALTER TABLE public.user_roles ADD CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Storage SELECT policy for batch-labels (upload policy already exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated users can view batch labels') THEN
    CREATE POLICY "Authenticated users can view batch labels"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'batch-labels');
  END IF;
END $$;

-- 4. Server-side trigger for demo role assignment
CREATE OR REPLACE FUNCTION public.handle_demo_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role app_role;
BEGIN
  CASE NEW.email
    WHEN 'admin@corta.demo' THEN _role := 'admin';
    WHEN 'warehouse@corta.demo' THEN _role := 'warehouse_clerk';
    WHEN 'qc@corta.demo' THEN _role := 'qc_inspector';
    WHEN 'store@corta.demo' THEN _role := 'store_manager';
    ELSE RETURN NEW;
  END CASE;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_demo_user_role() FROM public;
REVOKE EXECUTE ON FUNCTION public.handle_demo_user_role() FROM anon;

DROP TRIGGER IF EXISTS on_auth_user_created_demo_role ON auth.users;
CREATE TRIGGER on_auth_user_created_demo_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_demo_user_role();
