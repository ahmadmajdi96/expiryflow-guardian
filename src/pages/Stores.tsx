import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { DataTable, DataTableColumn } from "@/components/DataTable";

const Stores = () => {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ store_code: "", name: "", address: "" });

  const { data: stores } = useQuery({
    queryKey: ["stores-all"],
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("*").order("store_code");
      return data ?? [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!form.store_code || !form.name) throw new Error("Store code and name are required");
      const { error } = await supabase.from("stores").insert({
        store_code: form.store_code, name: form.name, address: form.address || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores-all"] });
      setShowAdd(false);
      setForm({ store_code: "", name: "", address: "" });
      toast.success("Store added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const columns: DataTableColumn<any>[] = [
    { key: "store_code", header: "Code", accessor: (r) => r.store_code, sortable: true, filter: "text", cell: (r) => <span className="font-mono text-xs font-semibold">{r.store_code}</span> },
    { key: "name", header: "Name", accessor: (r) => r.name, sortable: true, filter: "text" },
    { key: "address", header: "Address", accessor: (r) => r.address ?? "", cell: (r) => <span className="text-sm text-muted-foreground">{r.address || "—"}</span> },
    { key: "created_at", header: "Created", accessor: (r) => r.created_at, sortable: true, cell: (r) => <span className="font-mono text-xs">{r.created_at?.slice(0, 10)}</span> },
  ];

  return (
    <>
      <PageHeader title="Stores" description="Manage store locations across the network."
        actions={<Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-1" /> Add Store</Button>} />
      <DataTable rows={stores ?? []} columns={columns} rowKey={(r) => r.id} exportFilename="stores" tableId="stores" emptyMessage="No stores yet" />
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Store</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Store Code</Label><Input value={form.store_code} onChange={(e) => setForm({...form, store_code: e.target.value})} placeholder="ST-05" className="font-mono" /></div>
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="Warehouse North" /></div>
            <div className="space-y-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} placeholder="123 Industrial Rd" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending}>{addMutation.isPending ? "Adding…" : "Add Store"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Stores;