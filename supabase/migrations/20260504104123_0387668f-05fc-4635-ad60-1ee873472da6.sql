
-- Role enum
CREATE TYPE public.app_role AS ENUM ('warehouse_clerk', 'qc_inspector', 'store_manager', 'admin');

-- User roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Markdown proposals table
CREATE TABLE public.markdown_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL,
  alert_id uuid,
  sku text NOT NULL,
  batch_number text NOT NULL,
  current_price numeric NOT NULL,
  proposed_price numeric NOT NULL,
  discount_percent numeric NOT NULL,
  reasoning text,
  urgency text NOT NULL DEFAULT 'MEDIUM',
  status text NOT NULL DEFAULT 'pending',
  reviewer_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.markdown_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view proposals" ON public.markdown_proposals
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert proposals" ON public.markdown_proposals
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Store managers and admins can update proposals" ON public.markdown_proposals
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'store_manager') OR public.has_role(auth.uid(), 'admin'));

-- FEFO allocation log
CREATE TABLE public.fefo_allocation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL,
  allocation_type text NOT NULL, -- PUTAWAY or PICK
  location_type text NOT NULL,  -- RESERVE or PICKFACE
  location_code text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  allocated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fefo_allocation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view allocations" ON public.fefo_allocation_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can create allocations" ON public.fefo_allocation_log
  FOR INSERT TO authenticated WITH CHECK (true);
