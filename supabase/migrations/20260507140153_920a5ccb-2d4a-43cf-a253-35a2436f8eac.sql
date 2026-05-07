
-- Add check constraint on event_type values
ALTER TABLE public.reservation_audit_log
  ADD CONSTRAINT reservation_audit_log_event_type_check
  CHECK (event_type IN ('LOCK', 'UNLOCK_CANCEL', 'UNLOCK_TIMEOUT', 'UNLOCK_CONFIRM'));

-- Drop existing policies and recreate with tighter roles
DROP POLICY IF EXISTS "Authorized roles can insert reservation audit log" ON public.reservation_audit_log;
DROP POLICY IF EXISTS "Authorized roles can view reservation audit log" ON public.reservation_audit_log;

-- Only warehouse clerks and admins can write audit entries
CREATE POLICY "Warehouse clerks and admins can insert audit log"
  ON public.reservation_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'warehouse_clerk'::app_role)
  );

-- Admins, warehouse clerks, and store managers can read
CREATE POLICY "Authorized roles can view audit log"
  ON public.reservation_audit_log
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'warehouse_clerk'::app_role)
    OR has_role(auth.uid(), 'store_manager'::app_role)
  );
