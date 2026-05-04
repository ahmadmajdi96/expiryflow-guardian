import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Search } from "lucide-react";
import { useEffect } from "react";

const statusBadge: Record<string, string> = {
  SUCCESS: "bg-success/10 text-success border-success/30",
  ERROR: "bg-destructive/10 text-destructive border-destructive/30",
  UNKNOWN_EVENT: "bg-warning/10 text-warning border-warning/30",
};

const eventBadge: Record<string, string> = {
  "po.created": "bg-primary/10 text-primary border-primary/30",
  "po.updated": "bg-info/10 text-info border-info/30",
  "receipt.confirmed": "bg-success/10 text-success border-success/30",
};

const WebhookLog = () => {
  const [searchPO, setSearchPO] = useState("");
  const [filterEvent, setFilterEvent] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: logs, refetch } = useQuery({
    queryKey: ["webhook-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("webhook_event_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
    refetchInterval: 5000,
  });

  // Realtime subscription for instant updates
  useEffect(() => {
    const channel = supabase
      .channel("webhook-log-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "webhook_event_log" }, () => {
        refetch();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

  const filtered = useMemo(() => {
    if (!logs) return [];
    return logs.filter((log: any) => {
      if (searchPO && !(log.po_number || "").toLowerCase().includes(searchPO.toLowerCase()) && !(log.sku || "").toLowerCase().includes(searchPO.toLowerCase())) return false;
      if (filterEvent !== "ALL" && log.event_type !== filterEvent) return false;
      if (filterStatus !== "ALL" && log.status !== filterStatus) return false;
      if (dateFrom && new Date(log.created_at) < new Date(dateFrom)) return false;
      if (dateTo && new Date(log.created_at) > new Date(dateTo + "T23:59:59")) return false;
      return true;
    });
  }, [logs, searchPO, filterEvent, filterStatus, dateFrom, dateTo]);

  const handleExportCSV = () => {
    const headers = ["Timestamp", "Event", "PO Number", "SKU", "Status", "Details"];
    const rows = filtered.map((log: any) => [
      new Date(log.created_at).toISOString(),
      log.event_type,
      log.po_number || "",
      log.sku || "",
      log.status,
      log.error_message || (log.payload ? JSON.stringify(log.payload).slice(0, 200) : ""),
    ]);
    const csv = [headers, ...rows].map(r => r.map((c: string) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `webhook-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="Webhook Event Log"
        description="Real-time trace of all CoreERP PO webhook events — PO creations, updates, and receipt confirmations."
        badge={<Badge variant="outline" className="text-xs font-mono animate-pulse">Live</Badge>}
        actions={
          <Button size="sm" variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        }
      />

      {/* Filters */}
      <div className="page-section p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search PO / SKU…" value={searchPO} onChange={(e) => setSearchPO(e.target.value)} />
          </div>
          <Select value={filterEvent} onValueChange={setFilterEvent}>
            <SelectTrigger><SelectValue placeholder="Event type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Events</SelectItem>
              <SelectItem value="po.created">po.created</SelectItem>
              <SelectItem value="po.updated">po.updated</SelectItem>
              <SelectItem value="receipt.confirmed">receipt.confirmed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="SUCCESS">Success</SelectItem>
              <SelectItem value="ERROR">Error</SelectItem>
              <SelectItem value="UNKNOWN_EVENT">Unknown</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="From" />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="To" />
        </div>
        <p className="text-xs text-muted-foreground mt-2">{filtered.length} of {(logs ?? []).length} events shown</p>
      </div>

      <div className="page-section">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-5 py-3 font-medium text-muted-foreground">Timestamp</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Event</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">PO Number</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">SKU</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log: any) => (
                <tr key={log.id} className="table-row-hover border-b border-border/50">
                  <td className="px-5 py-3 font-mono text-xs whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant="outline" className={eventBadge[log.event_type] || ""}>{log.event_type}</Badge>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs">{log.po_number || "—"}</td>
                  <td className="px-5 py-3 font-mono text-xs">{log.sku || "—"}</td>
                  <td className="px-5 py-3">
                    <Badge variant="outline" className={statusBadge[log.status] || ""}>{log.status}</Badge>
                  </td>
                  <td className="px-5 py-3 text-xs text-muted-foreground max-w-[300px] truncate">
                    {log.error_message || (log.payload ? JSON.stringify(log.payload).slice(0, 120) : "—")}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">No webhook events yet. Send a PO from CoreERP to see events here.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default WebhookLog;