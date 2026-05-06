
-- Inbound Orders
CREATE TABLE public.inbound_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL,
  supplier_name text,
  order_type text NOT NULL DEFAULT 'PURCHASE',
  status text NOT NULL DEFAULT 'DRAFT',
  expected_date date,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inbound_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view inbound orders" ON public.inbound_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authorized roles can manage inbound orders" ON public.inbound_orders FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'warehouse_clerk') OR has_role(auth.uid(), 'store_manager'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'warehouse_clerk') OR has_role(auth.uid(), 'store_manager'));

-- Inbound Order Lines
CREATE TABLE public.inbound_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inbound_order_id uuid NOT NULL REFERENCES public.inbound_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity_ordered integer NOT NULL DEFAULT 0,
  quantity_received integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inbound_order_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view inbound order lines" ON public.inbound_order_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authorized roles can manage inbound order lines" ON public.inbound_order_lines FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'warehouse_clerk') OR has_role(auth.uid(), 'store_manager'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'warehouse_clerk') OR has_role(auth.uid(), 'store_manager'));

-- Outbound Orders
CREATE TABLE public.outbound_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL,
  customer_name text,
  order_type text NOT NULL DEFAULT 'SALE',
  status text NOT NULL DEFAULT 'DRAFT',
  ship_date date,
  destination_store_id uuid REFERENCES public.stores(id),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.outbound_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view outbound orders" ON public.outbound_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authorized roles can manage outbound orders" ON public.outbound_orders FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'warehouse_clerk') OR has_role(auth.uid(), 'store_manager'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'warehouse_clerk') OR has_role(auth.uid(), 'store_manager'));

-- Outbound Order Lines
CREATE TABLE public.outbound_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outbound_order_id uuid NOT NULL REFERENCES public.outbound_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity_ordered integer NOT NULL DEFAULT 0,
  quantity_picked integer NOT NULL DEFAULT 0,
  batch_id uuid REFERENCES public.inventory_batches(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.outbound_order_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view outbound order lines" ON public.outbound_order_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authorized roles can manage outbound order lines" ON public.outbound_order_lines FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'warehouse_clerk') OR has_role(auth.uid(), 'store_manager'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'warehouse_clerk') OR has_role(auth.uid(), 'store_manager'));

-- Auto QC Sampling trigger: 5% of perishable batches get auto QC inspection
CREATE OR REPLACE FUNCTION public.auto_qc_sampling()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _is_perishable boolean;
BEGIN
  SELECT expiry_trackable INTO _is_perishable FROM products WHERE id = NEW.product_id;
  IF _is_perishable AND random() < 0.05 THEN
    INSERT INTO qc_inspections (batch_id, result, notes)
    VALUES (NEW.id, 'PENDING', 'Auto-sampled: 5% perishable QC sampling rule');
    NEW.qc_status := 'PENDING';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_qc_sampling
BEFORE INSERT ON public.inventory_batches
FOR EACH ROW
EXECUTE FUNCTION public.auto_qc_sampling();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_inbound_orders_updated_at BEFORE UPDATE ON public.inbound_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_outbound_orders_updated_at BEFORE UPDATE ON public.outbound_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Revoke public execute on security definer functions
REVOKE ALL ON FUNCTION public.auto_qc_sampling() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
