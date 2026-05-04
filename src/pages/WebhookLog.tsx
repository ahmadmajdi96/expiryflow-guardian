import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
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

  return (
    <>
      <PageHeader
        title="Webhook Event Log"
        description="Real-time trace of all CoreERP PO webhook events — PO creations, updates, and receipt confirmations."
        badge={<Badge variant="outline" className="text-xs font-mono animate-pulse">Live</Badge>}
      />

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
              {(logs ?? []).map((log: any) => (
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
              {(logs ?? []).length === 0 && (
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