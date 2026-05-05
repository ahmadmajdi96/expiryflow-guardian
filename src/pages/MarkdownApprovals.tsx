import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Check, X, Tag, CheckCheck, Filter, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import DataTableFilter, { matchesSearch } from "@/components/DataTableFilter";

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
  const [statusFilter, setStatusFilter] = useState("pending");
  const [bulkSelected, setBulkSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const { data: proposals, isLoading } = useQuery({
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

  const filtered = (proposals ?? []).filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    return matchesSearch(p, search, ["sku", "batch_number", "reasoning"]);
  });

  const toggleBulk = useCallback((id: string) => {
    setBulkSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }, []);

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

  const bulkMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      for (const id of ids) {
        const update: any = {
          status,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        };
        if (status === "applied") update.applied_at = new Date().toISOString();
        await supabase.from("markdown_proposals").update(update).eq("id", id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["markdown-proposals"] });
      setBulkSelected([]);
      toast.success("Bulk action completed");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const selected = proposals?.find((p) => p.id === selectedId);

  return (
    <>
      <PageHeader
        title="Markdown Approvals"
        description="Review, approve, and apply AI-generated pricing proposals. Bulk approve or reject multiple proposals at once."
        badge={
          <Badge variant="outline" className="text-xs">
            {proposals?.filter((p) => p.status === "pending").length ?? 0} pending
          </Badge>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 page-section">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold">Proposals</h2>
              <div className="w-56">
                <DataTableFilter value={search} onChange={setSearch} placeholder="Search SKU, batch…" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {bulkSelected.length > 0 && statusFilter === "pending" && (
                <>
                  <Button
                    size="sm"
                    className="text-xs h-7 bg-success hover:bg-success/90 text-success-foreground"
                    onClick={() => bulkMutation.mutate({ ids: bulkSelected, status: "approved" })}
                    disabled={bulkMutation.isPending}
                  >
                    <CheckCheck className="h-3.5 w-3.5 mr-1" /> Approve {bulkSelected.length}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="text-xs h-7"
                    onClick={() => bulkMutation.mutate({ ids: bulkSelected, status: "rejected" })}
                    disabled={bulkMutation.isPending}
                  >
                    <X className="h-3.5 w-3.5 mr-1" /> Reject {bulkSelected.length}
                  </Button>
                </>
              )}
              {bulkSelected.length > 0 && statusFilter === "approved" && (
                <Button
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => bulkMutation.mutate({ ids: bulkSelected, status: "applied" })}
                  disabled={bulkMutation.isPending}
                >
                  <Check className="h-3.5 w-3.5 mr-1" /> Apply {bulkSelected.length}
                </Button>
              )}
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setBulkSelected([]); }}>
                <SelectTrigger className="w-32 h-7 text-xs">
                  <Filter className="h-3 w-3 mr-1" /><SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="applied">Applied</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading…</div>
          ) : !proposals?.length ? (
            <div className="p-8 text-center text-muted-foreground">No proposals yet. Trigger AI pricing from Expiry Alerts.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-5 py-3 w-10"></th>
                    <th className="px-5 py-3 font-medium text-muted-foreground">SKU</th>
                    <th className="px-5 py-3 font-medium text-muted-foreground">Batch</th>
                    <th className="px-5 py-3 font-medium text-muted-foreground text-right">Current</th>
                    <th className="px-5 py-3 font-medium text-muted-foreground text-right">Proposed</th>
                    <th className="px-5 py-3 font-medium text-muted-foreground text-right">Discount</th>
                    <th className="px-5 py-3 font-medium text-muted-foreground">Urgency</th>
                    <th className="px-5 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="px-5 py-3 font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className={`table-row-hover border-b border-border/50 ${selectedId === p.id ? "bg-primary/5" : ""}`}>
                      <td className="px-5 py-3">
                        <input
                          type="checkbox"
                          checked={bulkSelected.includes(p.id)}
                          onChange={() => toggleBulk(p.id)}
                          className="rounded border-border"
                        />
                      </td>
                      <td className="px-5 py-3 font-mono text-xs">{p.sku}</td>
                      <td className="px-5 py-3 font-mono text-xs">{p.batch_number}</td>
                      <td className="px-5 py-3 text-right tabular-nums">${Number(p.current_price).toFixed(2)}</td>
                      <td className="px-5 py-3 text-right tabular-nums font-semibold text-primary">${Number(p.proposed_price).toFixed(2)}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{Number(p.discount_percent).toFixed(0)}%</td>
                      <td className="px-5 py-3">
                        <Badge variant="outline" className={urgencyColor[p.urgency] || ""}>{p.urgency}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant="outline" className={statusColor[p.status] || ""}>{p.status}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        {p.status === "pending" ? (
                          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => { setSelectedId(p.id); setAdjustedPrice(String(p.proposed_price)); }}>
                            Review
                          </Button>
                        ) : p.status === "approved" ? (
                          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => { setSelectedId(p.id); setAdjustedPrice(String(p.proposed_price)); }}>
                            Apply
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="page-section p-5 space-y-4">
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
                <input
                  type="number"
                  step="0.01"
                  value={adjustedPrice}
                  onChange={(e) => setAdjustedPrice(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reviewer Notes</label>
                <Textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Optional notes…" rows={3} />
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
                  onClick={() => updateMutation.mutate({ id: selected.id, status: "approved", notes: reviewNotes, price: adjustedPrice ? Number(adjustedPrice) : undefined })}
                  disabled={updateMutation.isPending}
                >
                  <Check className="h-4 w-4 mr-1" /> Approve
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => updateMutation.mutate({ id: selected.id, status: "rejected", notes: reviewNotes })}
                  disabled={updateMutation.isPending}
                >
                  <X className="h-4 w-4 mr-1" /> Reject
                </Button>
              </div>
              {(selected.status === "approved" || selectedId) && selected.status !== "applied" && selected.status !== "rejected" && selected.status === "approved" && (
                <Button
                  className="w-full"
                  onClick={() => updateMutation.mutate({ id: selected.id, status: "applied", notes: reviewNotes })}
                  disabled={updateMutation.isPending}
                >
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