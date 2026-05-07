
-- Add reserved_quantity to inventory_batches for reservation locking
ALTER TABLE public.inventory_batches
ADD COLUMN IF NOT EXISTS reserved_quantity integer NOT NULL DEFAULT 0;

-- Create outbound_pick_lines for multi-batch FEFO allocations per outbound line
CREATE TABLE public.outbound_pick_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outbound_order_line_id uuid NOT NULL,
  batch_id uuid NOT NULL,
  allocated_quantity integer NOT NULL DEFAULT 0,
  picked_quantity integer NOT NULL DEFAULT 0,
  location_type text NOT NULL DEFAULT 'RESERVE',
  location_code text,
  scanned_at timestamptz,
  status text NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_outbound_pick_lines_line ON public.outbound_pick_lines(outbound_order_line_id);
CREATE INDEX idx_outbound_pick_lines_batch ON public.outbound_pick_lines(batch_id);

ALTER TABLE public.outbound_pick_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view outbound pick lines"
ON public.outbound_pick_lines FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authorized roles can manage outbound pick lines"
ON public.outbound_pick_lines FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'warehouse_clerk'::app_role) OR
  has_role(auth.uid(), 'store_manager'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'warehouse_clerk'::app_role) OR
  has_role(auth.uid(), 'store_manager'::app_role)
);
