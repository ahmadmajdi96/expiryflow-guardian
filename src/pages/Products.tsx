import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { DataTable, DataTableColumn } from "@/components/DataTable";

const Products = () => {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ sku: "", name: "", category: "", shelf_life_days: "", unit_cost: "", current_price: "" });

  const { data: products } = useQuery({
    queryKey: ["products-all"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").order("sku");
      return data ?? [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!form.sku || !form.name) throw new Error("SKU and Name are required");
      const { error } = await supabase.from("products").insert({
        sku: form.sku, name: form.name, category: form.category || null,
        shelf_life_days: form.shelf_life_days ? Number(form.shelf_life_days) : null,
        unit_cost: form.unit_cost ? Number(form.unit_cost) : null,
        current_price: form.current_price ? Number(form.current_price) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products-all"] });
      setShowAdd(false);
      setForm({ sku: "", name: "", category: "", shelf_life_days: "", unit_cost: "", current_price: "" });
      toast.success("Product added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const columns: DataTableColumn<any>[] = [
    { key: "sku", header: "SKU", accessor: (r) => r.sku, sortable: true, filter: "text", cell: (r) => <span className="font-mono text-xs font-semibold">{r.sku}</span> },
    { key: "name", header: "Name", accessor: (r) => r.name, sortable: true, filter: "text" },
    { key: "category", header: "Category", accessor: (r) => r.category ?? "", sortable: true, filter: "select" },
    { key: "shelf_life_days", header: "Shelf Life", accessor: (r) => r.shelf_life_days, sortable: true, align: "right", cell: (r) => <span className="tabular-nums">{r.shelf_life_days ?? "—"}d</span> },
    { key: "unit_cost", header: "Unit Cost", accessor: (r) => Number(r.unit_cost ?? 0), sortable: true, align: "right", cell: (r) => <span className="tabular-nums">${Number(r.unit_cost ?? 0).toFixed(2)}</span> },
    { key: "current_price", header: "Price", accessor: (r) => Number(r.current_price ?? 0), sortable: true, align: "right", cell: (r) => <span className="tabular-nums">${Number(r.current_price ?? 0).toFixed(2)}</span> },
    { key: "expiry_trackable", header: "Expiry Tracked", accessor: (r) => r.expiry_trackable ? "Yes" : "No", filter: "select", options: ["Yes", "No"], cell: (r) => (
      <Badge variant="outline" className={r.expiry_trackable ? "bg-success/10 text-success border-success/30" : ""}>{r.expiry_trackable ? "Yes" : "No"}</Badge>
    )},
  ];

  return (
    <>
      <PageHeader title="Products" description="Manage product catalog — SKUs, shelf life, pricing."
        actions={<Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-1" /> Add Product</Button>} />
      <DataTable rows={products ?? []} columns={columns} rowKey={(r) => r.id} exportFilename="products" tableId="products" emptyMessage="No products yet" />
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Product</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>SKU</Label><Input value={form.sku} onChange={(e) => setForm({...form, sku: e.target.value})} placeholder="MILK-001" className="font-mono" /></div>
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="Full Cream Milk 1L" /></div>
            <div className="space-y-2"><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} placeholder="Dairy" /></div>
            <div className="space-y-2"><Label>Shelf Life (days)</Label><Input type="number" value={form.shelf_life_days} onChange={(e) => setForm({...form, shelf_life_days: e.target.value})} /></div>
            <div className="space-y-2"><Label>Unit Cost</Label><Input type="number" step="0.01" value={form.unit_cost} onChange={(e) => setForm({...form, unit_cost: e.target.value})} /></div>
            <div className="space-y-2"><Label>Price</Label><Input type="number" step="0.01" value={form.current_price} onChange={(e) => setForm({...form, current_price: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending}>{addMutation.isPending ? "Adding…" : "Add Product"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Products;