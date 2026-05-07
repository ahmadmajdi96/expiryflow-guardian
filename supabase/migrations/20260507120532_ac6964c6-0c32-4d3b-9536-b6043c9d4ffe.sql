
CREATE TABLE public.reservation_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL,
  order_id uuid NOT NULL,
  batch_id uuid NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  user_id uuid,
  notes text
);

ALTER TABLE public.reservation_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized roles can view reservation audit log"
  ON public.reservation_audit_log FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'warehouse_clerk'::app_role)
    OR has_role(auth.uid(), 'store_manager'::app_role)
  );

CREATE POLICY "Authorized roles can insert reservation audit log"
  ON public.reservation_audit_log FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'warehouse_clerk'::app_role)
    OR has_role(auth.uid(), 'store_manager'::app_role)
  );

CREATE INDEX idx_reservation_audit_order ON public.reservation_audit_log(order_id);
CREATE INDEX idx_reservation_audit_batch ON public.reservation_audit_log(batch_id);
