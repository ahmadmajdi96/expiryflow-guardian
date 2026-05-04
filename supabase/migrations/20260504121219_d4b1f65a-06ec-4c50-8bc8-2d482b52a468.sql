-- Webhook event log
CREATE TABLE public.webhook_event_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  po_number text,
  sku text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'SUCCESS',
  error_message text,
  processed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_event_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view webhook logs"
ON public.webhook_event_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service can insert webhook logs"
ON public.webhook_event_log FOR INSERT TO authenticated WITH CHECK (true);

-- Pick requests
CREATE TABLE public.pick_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pick_code text NOT NULL,
  product_id uuid NOT NULL,
  store_id uuid NOT NULL,
  requested_quantity integer NOT NULL,
  fulfilled_quantity integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'PENDING',
  requested_by uuid,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pick_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view picks"
ON public.pick_requests FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can create picks"
ON public.pick_requests FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update picks"
ON public.pick_requests FOR UPDATE TO authenticated USING (true);

-- Pick request lines (batch-level allocations)
CREATE TABLE public.pick_request_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pick_request_id uuid NOT NULL REFERENCES public.pick_requests(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL,
  allocated_quantity integer NOT NULL,
  picked_quantity integer NOT NULL DEFAULT 0,
  location_type text NOT NULL DEFAULT 'RESERVE',
  location_code text,
  scanned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pick_request_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view pick lines"
ON public.pick_request_lines FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can create pick lines"
ON public.pick_request_lines FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update pick lines"
ON public.pick_request_lines FOR UPDATE TO authenticated USING (true);

-- Enable realtime for webhook log
ALTER PUBLICATION supabase_realtime ADD TABLE public.webhook_event_log;