
CREATE TABLE public.ai_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature text NOT NULL,
  prompt text,
  input jsonb DEFAULT '{}'::jsonb,
  output jsonb DEFAULT '{}'::jsonb,
  confidence text,
  user_decision text,
  decision_at timestamptz,
  batch_id uuid,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view ai audit" ON public.ai_audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert ai audit" ON public.ai_audit_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authorized roles can update ai audit" ON public.ai_audit_log FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'warehouse_clerk'::app_role) OR has_role(auth.uid(),'store_manager'::app_role) OR has_role(auth.uid(),'qc_inspector'::app_role));
CREATE INDEX idx_ai_audit_feature ON public.ai_audit_log(feature, created_at DESC);
CREATE INDEX idx_ai_audit_batch ON public.ai_audit_log(batch_id);

CREATE TABLE public.write_off_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid,
  sku text,
  store text,
  quantity integer NOT NULL DEFAULT 0,
  reason text,
  source text NOT NULL DEFAULT 'FORECAST',
  status text NOT NULL DEFAULT 'OPEN',
  created_by uuid,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.write_off_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view write-off tasks" ON public.write_off_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authorized roles can create write-off tasks" ON public.write_off_tasks FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'warehouse_clerk'::app_role) OR has_role(auth.uid(),'store_manager'::app_role));
CREATE POLICY "Authorized roles can update write-off tasks" ON public.write_off_tasks FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'warehouse_clerk'::app_role) OR has_role(auth.uid(),'store_manager'::app_role));
CREATE TRIGGER trg_write_off_tasks_updated BEFORE UPDATE ON public.write_off_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_write_off_status ON public.write_off_tasks(status, created_at DESC);
