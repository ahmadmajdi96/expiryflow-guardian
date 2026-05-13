import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = "warehouse_clerk" | "qc_inspector" | "store_manager" | "admin";

const ROLE_PERMISSIONS: Record<AppRole, string[]> = {
  warehouse_clerk: ["/", "/receiving", "/pick-requests", "/transfers"],
  qc_inspector: ["/", "/qc-inspection", "/quarantine", "/inbound-orders"],
  store_manager: ["/", "/expiry-alerts", "/receiving", "/pick-requests", "/qc-inspection", "/quarantine", "/transfers", "/markdown-approvals", "/settings", "/webhook-log", "/inbound-orders", "/outbound-orders", "/products", "/stores", "/forecast"],
  admin: ["*"],
};

export const useRole = () => {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return; // wait for auth to settle
    if (!user) { setRoles([]); setLoading(false); return; }
    setLoading(true);
    const fetch = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      setRoles((data ?? []).map((r: any) => r.role as AppRole));
      setLoading(false);
    };
    fetch();
  }, [user, authLoading]);

  const hasRole = (role: AppRole) => roles.includes(role);
  const isAdmin = roles.includes("admin");

  const canAccess = (path: string) => {
    if (loading) return true; // still loading, allow render
    if (roles.length === 0) return true; // no roles assigned = full access (bootstrapping)
    if (isAdmin) return true;
    return roles.some((r) => {
      const perms = ROLE_PERMISSIONS[r];
      return perms.includes("*") || perms.includes(path);
    });
  };

  return { roles, loading, hasRole, isAdmin, canAccess };
};