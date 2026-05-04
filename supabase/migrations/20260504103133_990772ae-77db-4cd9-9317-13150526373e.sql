
-- Stores table
CREATE TABLE public.stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT,
  shelf_life_days INTEGER,
  expiry_trackable BOOLEAN NOT NULL DEFAULT true,
  unit_cost NUMERIC(10,2),
  current_price NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Purchase Orders
CREATE TABLE public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  po_number TEXT NOT NULL UNIQUE,
  supplier_id TEXT NOT NULL,
  supplier_name TEXT,
  expected_delivery_date DATE,
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PO Lines
CREATE TABLE public.po_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity_ordered INTEGER NOT NULL,
  quantity_received INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inventory Batches
CREATE TABLE public.inventory_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_number TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  po_line_id UUID REFERENCES public.po_lines(id),
  quantity INTEGER NOT NULL DEFAULT 0,
  manufacturing_date DATE,
  expiry_date DATE NOT NULL,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'AVAILABLE',
  qc_status TEXT NOT NULL DEFAULT 'PENDING',
  received_by UUID REFERENCES auth.users(id),
  received_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(batch_number, store_id)
);

-- Expiry alerts
CREATE TABLE public.expiry_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id TEXT NOT NULL UNIQUE,
  batch_id UUID NOT NULL REFERENCES public.inventory_batches(id),
  zone TEXT NOT NULL,
  days_until_expiry INTEGER NOT NULL,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  action_taken TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- QC Inspections
CREATE TABLE public.qc_inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.inventory_batches(id),
  inspector_id UUID REFERENCES auth.users(id),
  result TEXT NOT NULL DEFAULT 'PENDING',
  notes TEXT,
  inspected_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stock Transfers
CREATE TABLE public.stock_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transfer_code TEXT NOT NULL UNIQUE,
  batch_id UUID NOT NULL REFERENCES public.inventory_batches(id),
  from_store_id UUID NOT NULL REFERENCES public.stores(id),
  to_store_id UUID NOT NULL REFERENCES public.stores(id),
  quantity INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Alert thresholds configuration
CREATE TABLE public.alert_thresholds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_name TEXT NOT NULL,
  min_days INTEGER NOT NULL,
  max_days INTEGER,
  action_description TEXT,
  product_id UUID REFERENCES public.products(id),
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.po_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expiry_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qc_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_thresholds ENABLE ROW LEVEL SECURITY;

-- RLS policies: authenticated users can read/write all tables (enterprise app with auth)
CREATE POLICY "Authenticated users can view stores" ON public.stores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage stores" ON public.stores FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage products" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view POs" ON public.purchase_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage POs" ON public.purchase_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view PO lines" ON public.po_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage PO lines" ON public.po_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view batches" ON public.inventory_batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage batches" ON public.inventory_batches FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view alerts" ON public.expiry_alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage alerts" ON public.expiry_alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view QC" ON public.qc_inspections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage QC" ON public.qc_inspections FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view transfers" ON public.stock_transfers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage transfers" ON public.stock_transfers FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view thresholds" ON public.alert_thresholds FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage thresholds" ON public.alert_thresholds FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_batches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expiry_alerts;
