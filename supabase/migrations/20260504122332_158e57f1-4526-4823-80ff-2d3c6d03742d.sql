
-- 1. Harden webhook_event_log RLS
DROP POLICY IF EXISTS "Service can insert webhook logs" ON public.webhook_event_log;
DROP POLICY IF EXISTS "Authenticated can view webhook logs" ON public.webhook_event_log;

CREATE POLICY "Admins and store managers can view webhook logs"
ON public.webhook_event_log FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'store_manager')
);

-- Allow anon/service role inserts via edge function (no authenticated insert needed)
-- Edge functions use service_role key which bypasses RLS, so no insert policy needed for authenticated

-- 2. Harden pick_requests RLS
DROP POLICY IF EXISTS "Authenticated can create picks" ON public.pick_requests;
DROP POLICY IF EXISTS "Authenticated can update picks" ON public.pick_requests;
DROP POLICY IF EXISTS "Authenticated can view picks" ON public.pick_requests;

CREATE POLICY "Authorized roles can view picks"
ON public.pick_requests FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'warehouse_clerk')
  OR public.has_role(auth.uid(), 'store_manager')
);

CREATE POLICY "Authorized roles can create picks"
ON public.pick_requests FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'warehouse_clerk')
  OR public.has_role(auth.uid(), 'store_manager')
);

CREATE POLICY "Creator or admin can update picks"
ON public.pick_requests FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR requested_by = auth.uid()
);

-- 3. Harden pick_request_lines RLS
DROP POLICY IF EXISTS "Authenticated can create pick lines" ON public.pick_request_lines;
DROP POLICY IF EXISTS "Authenticated can update pick lines" ON public.pick_request_lines;
DROP POLICY IF EXISTS "Authenticated can view pick lines" ON public.pick_request_lines;

CREATE POLICY "Authorized roles can view pick lines"
ON public.pick_request_lines FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'warehouse_clerk')
  OR public.has_role(auth.uid(), 'store_manager')
);

CREATE POLICY "Authorized roles can create pick lines"
ON public.pick_request_lines FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'warehouse_clerk')
  OR public.has_role(auth.uid(), 'store_manager')
);

CREATE POLICY "Authorized roles can update pick lines"
ON public.pick_request_lines FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'warehouse_clerk')
  OR public.has_role(auth.uid(), 'store_manager')
);

-- 4. Create pick_exceptions table
CREATE TABLE public.pick_exceptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pick_request_id UUID NOT NULL,
  original_line_id UUID NOT NULL,
  batch_id UUID NOT NULL,
  exception_type TEXT NOT NULL DEFAULT 'REVIEW',
  reason TEXT,
  resolution TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  reallocated_batch_id UUID,
  reallocated_quantity INTEGER,
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pick_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized roles can view pick exceptions"
ON public.pick_exceptions FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'warehouse_clerk')
  OR public.has_role(auth.uid(), 'store_manager')
);

CREATE POLICY "Authorized roles can create pick exceptions"
ON public.pick_exceptions FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'warehouse_clerk')
  OR public.has_role(auth.uid(), 'store_manager')
);

CREATE POLICY "Authorized roles can update pick exceptions"
ON public.pick_exceptions FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'warehouse_clerk')
  OR public.has_role(auth.uid(), 'store_manager')
);
