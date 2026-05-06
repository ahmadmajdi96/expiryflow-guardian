import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Check, X, Tag } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { DataTable, DataTableColumn } from "@/components/DataTable";

const urgencyColor: Record<string, string> = {
  LOW: "bg-success/10 text-success border-success/30",
  MEDIUM: "bg-warning/10 text-warning border-warning/30",
  HIGH: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  CRITICAL: "bg-destructive/10 text-destructive border-destructive/30",
};

const statusColor: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/30",
  approved: "bg-success/10 text-success border-success/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
  applied: "bg-primary/10 text-primary border-primary/30",
};

const MarkdownApprovals = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [adjustedPrice, setAdjustedPrice] = useState<string>("");

  const { data: proposals } = useQuery({
    queryKey: ["markdown-proposals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("markdown_proposals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, notes, price }: { id: string; status: string; notes: string; price?: number }) => {
      const update: any = {
        status,
        reviewer_notes: notes,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      };
      if (price !== undefined) update.proposed_price = price;
      if (status === "applied") update.applied_at = new Date().toISOString();
      const { error } = await supabase.from("markdown_proposals").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["markdown-proposals"] });
      setSelectedId(null);
      setReviewNotes("");
      setAdjustedPrice("");
      toast.success("Proposal updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const selected = proposals?.find((p) => p.id === selectedId);

  const bulkApprove = async (rows: any[]) => {
    for (const r of rows) {
      await supabase.from("markdown_proposals").update({
        status: "approved", reviewed_by: user?.id, reviewed_at: new Date().toISOString(),
      }).eq("id", r.id);
    }
    queryClient.invalidateQueries({ queryKey: ["markdown-proposals"] });
    toast.success(`${rows.length} proposals approved`);
  };

  const bulkReject = async (rows: any[]) => {
    for (const r of rows) {
      await supabase.from("markdown_proposals").update({
        status: "rejected", reviewed_by: user?.id, reviewed_at: new Date().toISOString(),
      }).eq("id", r.id);
    }
    queryClient.invalidateQueries({ queryKey: ["markdown-proposals"] });
    toast.success(`${rows.length} proposals rejected`);
  };

  const columns: DataTableColumn<any>[] = [
    { key: "sku", header: "SKU", accessor: (r) => r.sku, sortable: true, filter: "text", cell: (r) => <span className="font-mono text-xs">{r.sku}</span> },
    { key: "batch_number", header: "Batch", accessor: (r) => r.batch_number, sortable: true, filter: "text", cell: (r) => <span className="font-mono text-xs">{r.batch_number}</span> },
    { key: "current_price", header: "Current", accessor: (r) => Number(r.current_price), sortable: true, align: "right", cell: (r) => <span className="tabular-nums">${Number(r.current_price).toFixed(2)}</span> },
    { key: "proposed_price", header: "Proposed", accessor: (r) => Number(r.proposed_price), sortable: true, align: "right", cell: (r) => <span className="tabular-nums font-semibold text-primary">${Number(r.proposed_price).toFixed(2)}</span> },
    { key: "discount_percent", header: "Discount", accessor: (r) => Number(r.discount_percent), sortable: true, align: "right", cell: (r) => <span className="tabular-nums">{Number(r.discount_percent).toFixed(0)}%</span> },
    { key: "urgency", header: "Urgency", accessor: (r) => r.urgency, filter: "select", options: ["LOW", "MEDIUM", "HIGH", "CRITICAL"], cell: (r) => <Badge variant="outline" className={urgencyColor[r.urgency] || ""}>{r.urgency}</Badge> },
    { key: "status", header: "Status", accessor: (r) => r.status, filter: "select", options: ["pending", "approved", "rejected", "applied"], cell: (r) => <Badge variant="outline" className={statusColor[r.status] || ""}>{r.status}</Badge> },
    { key: "action", header: "Action", accessor: () => "", exportable: false, cell: (r) => (
      r.status === "pending" ? (
        <Button variant="outline" size="sm" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); setSelectedId(r.id); setAdjustedPrice(String(r.proposed_price)); }}>Review</Button>
      ) : r.status === "approved" ? (
        <Button variant="outline" size="sm" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); setSelectedId(r.id); setAdjustedPrice(String(r.proposed_price)); }}>Apply</Button>
      ) : null
    )},
  ];

  return (
    <>
      <PageHeader
        title="Markdown Approvals"
        description="Review, approve, and apply AI-generated pricing proposals. Bulk approve or reject multiple proposals at once."
        badge={<Badge variant="outline" className="text-xs">{proposals?.filter((p) => p.status === "pending").length ?? 0} pending</Badge>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DataTable
            rows={proposals ?? []}
            columns={columns}
            rowKey={(r) => r.id}
            exportFilename="markdown-proposals"
            tableId="markdown"
            createdAtKey="created_at"
            selectable
            bulkActions={[
              { label: "Approve", icon: <Check className="h-3.5 w-3.5" />, onRun: bulkApprove },
              { label: "Reject", icon: <X className="h-3.5 w-3.5" />, onRun: bulkReject, variant: "destructive" },
            ]}
            rowClassName={(r) => selectedId === r.id ? "bg-primary/5" : ""}
            emptyMessage="No proposals yet. Trigger AI pricing from Expiry Alerts."
          />
        </div>

        <div className="page-section p-5 space-y-4 h-fit">
          <h3 className="font-semibold flex items-center gap-2"><Tag className="h-4 w-4 text-primary" /> Review Panel</h3>
          {selected ? (
            <>
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">SKU:</span> <span className="font-mono">{selected.sku}</span></p>
                <p><span className="text-muted-foreground">Batch:</span> <span className="font-mono">{selected.batch_number}</span></p>
                <p><span className="text-muted-foreground">AI Reasoning:</span> {selected.reasoning || "N/A"}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Adjusted Price ($)</label>
                <input type="number" step="0.01" value={adjustedPrice} onChange={(e) => setAdjustedPrice(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm font-mono" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reviewer Notes</label>
                <Textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Optional notes…" rows={3} />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
                  onClick={() => updateMutation.mutate({ id: selected.id, status: "approved", notes: reviewNotes, price: adjustedPrice ? Number(adjustedPrice) : undefined })}
                  disabled={updateMutation.isPending}>
                  <Check className="h-4 w-4 mr-1" /> Approve
                </Button>
                <Button variant="destructive" className="flex-1"
                  onClick={() => updateMutation.mutate({ id: selected.id, status: "rejected", notes: reviewNotes })}
                  disabled={updateMutation.isPending}>
                  <X className="h-4 w-4 mr-1" /> Reject
                </Button>
              </div>
              {selected.status === "approved" && (
                <Button className="w-full"
                  onClick={() => updateMutation.mutate({ id: selected.id, status: "applied", notes: reviewNotes })}
                  disabled={updateMutation.isPending}>
                  Apply Markdown
                </Button>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Select a pending proposal to review.</p>
          )}
        </div>
      </div>
    </>
  );
};

export default MarkdownApprovals;