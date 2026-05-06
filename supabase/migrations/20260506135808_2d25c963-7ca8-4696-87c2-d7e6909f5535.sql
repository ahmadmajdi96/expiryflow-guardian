
-- Drop existing policies to avoid conflicts, then recreate
DO $$ 
BEGIN
  -- inbound_orders
  DROP POLICY IF EXISTS "Authenticated users can view inbound orders" ON public.inbound_orders;
  DROP POLICY IF EXISTS "Authenticated users can create inbound orders" ON public.inbound_orders;
  DROP POLICY IF EXISTS "Authenticated users can update inbound orders" ON public.inbound_orders;
  DROP POLICY IF EXISTS "Authenticated users can delete inbound orders" ON public.inbound_orders;
  -- outbound_orders
  DROP POLICY IF EXISTS "Authenticated users can view outbound orders" ON public.outbound_orders;
  DROP POLICY IF EXISTS "Authenticated users can create outbound orders" ON public.outbound_orders;
  DROP POLICY IF EXISTS "Authenticated users can update outbound orders" ON public.outbound_orders;
  DROP POLICY IF EXISTS "Authenticated users can delete outbound orders" ON public.outbound_orders;
  -- inbound_order_lines
  DROP POLICY IF EXISTS "Authenticated users can view inbound order lines" ON public.inbound_order_lines;
  DROP POLICY IF EXISTS "Authenticated users can create inbound order lines" ON public.inbound_order_lines;
  DROP POLICY IF EXISTS "Authenticated users can update inbound order lines" ON public.inbound_order_lines;
  DROP POLICY IF EXISTS "Authenticated users can delete inbound order lines" ON public.inbound_order_lines;
  -- outbound_order_lines
  DROP POLICY IF EXISTS "Authenticated users can view outbound order lines" ON public.outbound_order_lines;
  DROP POLICY IF EXISTS "Authenticated users can create outbound order lines" ON public.outbound_order_lines;
  DROP POLICY IF EXISTS "Authenticated users can update outbound order lines" ON public.outbound_order_lines;
  DROP POLICY IF EXISTS "Authenticated users can delete outbound order lines" ON public.outbound_order_lines;
END $$;

-- inbound_orders
CREATE POLICY "Authenticated users can view inbound orders" ON public.inbound_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create inbound orders" ON public.inbound_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update inbound orders" ON public.inbound_orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete inbound orders" ON public.inbound_orders FOR DELETE TO authenticated USING (true);

-- outbound_orders
CREATE POLICY "Authenticated users can view outbound orders" ON public.outbound_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create outbound orders" ON public.outbound_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update outbound orders" ON public.outbound_orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete outbound orders" ON public.outbound_orders FOR DELETE TO authenticated USING (true);

-- inbound_order_lines
CREATE POLICY "Authenticated users can view inbound order lines" ON public.inbound_order_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create inbound order lines" ON public.inbound_order_lines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update inbound order lines" ON public.inbound_order_lines FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete inbound order lines" ON public.inbound_order_lines FOR DELETE TO authenticated USING (true);

-- outbound_order_lines
CREATE POLICY "Authenticated users can view outbound order lines" ON public.outbound_order_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create outbound order lines" ON public.outbound_order_lines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update outbound order lines" ON public.outbound_order_lines FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete outbound order lines" ON public.outbound_order_lines FOR DELETE TO authenticated USING (true);
