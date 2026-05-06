import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { DataTable, DataTableColumn } from "@/components/DataTable";
import { useRole, AppRole } from "@/hooks/useRole";

const roleLabel: Record<string, { label: string; cls: string }> = {
  admin: { label: "Admin", cls: "bg-destructive/10 text-destructive border-destructive/30" },
  warehouse_clerk: { label: "Warehouse Clerk", cls: "bg-primary/10 text-primary border-primary/30" },
  qc_inspector: { label: "QC Inspector", cls: "bg-warning/10 text-warning border-warning/30" },
  store_manager: { label: "Store Manager", cls: "bg-success/10 text-success border-success/30" },
};

const UserManagement = () => {
  const queryClient = useQueryClient();
  const { isAdmin } = useRole();
  const [addingRoleFor, setAddingRoleFor] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<string>("");

  const { data: userRoles } = useQuery({
    queryKey: ["all-user-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: isAdmin,
  });

  // Group by user_id
  const userMap = new Map<string, { user_id: string; roles: string[] }>();
  (userRoles ?? []).forEach((r: any) => {
    const entry = userMap.get(r.user_id) || { user_id: r.user_id, roles: [] };
    entry.roles.push(r.role);
    userMap.set(r.user_id, entry);
  });
  const users = Array.from(userMap.values());

  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-user-roles"] });
      setAddingRoleFor(null);
      setNewRole("");
      toast.success("Role assigned");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const columns: DataTableColumn<any>[] = [
    { key: "user_id", header: "User ID", accessor: (r) => r.user_id, filter: "text", cell: (r) => <span className="font-mono text-xs">{r.user_id.slice(0, 8)}…</span> },
    { key: "roles", header: "Roles", accessor: (r) => r.roles.join(", "), cell: (r) => (
      <div className="flex flex-wrap gap-1">
        {r.roles.map((role: string) => (
          <Badge key={role} variant="outline" className={roleLabel[role]?.cls || ""}>{roleLabel[role]?.label || role}</Badge>
        ))}
      </div>
    )},
    { key: "action", header: "Action", accessor: () => "", exportable: false, cell: (r) => (
      addingRoleFor === r.user_id ? (
        <div className="flex items-center gap-2">
          <Select value={newRole} onValueChange={setNewRole}>
            <SelectTrigger className="w-40 h-7 text-xs"><SelectValue placeholder="Select role" /></SelectTrigger>
            <SelectContent>
              {(["admin", "warehouse_clerk", "qc_inspector", "store_manager"] as AppRole[])
                .filter((role) => !r.roles.includes(role))
                .map((role) => <SelectItem key={role} value={role}>{roleLabel[role]?.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" className="text-xs h-7" disabled={!newRole} onClick={() => addRoleMutation.mutate({ userId: r.user_id, role: newRole })}>Assign</Button>
          <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setAddingRoleFor(null)}>Cancel</Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setAddingRoleFor(r.user_id)}>
          <UserPlus className="h-3 w-3 mr-1" /> Add Role
        </Button>
      )
    )},
  ];

  if (!isAdmin) {
    return (
      <>
        <PageHeader title="User Management" description="Only admins can manage user roles." />
        <div className="page-section p-8 text-center text-muted-foreground">You need admin access to view this page.</div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="User Management" description="View and assign roles to system users."
        badge={<Badge variant="outline" className="text-xs"><Shield className="h-3 w-3 mr-1 inline" /> Admin only</Badge>} />
      <DataTable rows={users} columns={columns} rowKey={(r) => r.user_id} exportFilename="users" tableId="users" emptyMessage="No users found" />
    </>
  );
};

export default UserManagement;