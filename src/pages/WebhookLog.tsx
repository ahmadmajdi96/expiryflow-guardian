import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { useEffect } from "react";
import { DataTable, DataTableColumn } from "@/components/DataTable";

const WebhookLog = () => {
  const { data: logs, refetch } = useQuery({
    queryKey: ["webhook-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("webhook_event_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      return data ?? [];
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("webhook-log-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "webhook_event_log" }, () => {
        refetch();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

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

  const columns: DataTableColumn<any>[] = [
    {
      key: "created_at", header: "Timestamp", accessor: (r) => r.created_at, sortable: true, filter: "date",
      cell: (r) => <span className="font-mono text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</span>,
      exportValue: (r) => new Date(r.created_at).toISOString(),
    },
    {
      key: "event_type", header: "Event", accessor: (r) => r.event_type, sortable: true, filter: "select",
      options: ["po.created", "po.updated", "receipt.confirmed"],
      cell: (r) => <Badge variant="outline" className={eventBadge[r.event_type] || ""}>{r.event_type}</Badge>,
    },
    {
      key: "po_number", header: "PO Number", accessor: (r) => r.po_number ?? "", sortable: true, filter: "text",
      cell: (r) => <span className="font-mono text-xs">{r.po_number || "—"}</span>,
    },
    {
      key: "sku", header: "SKU", accessor: (r) => r.sku ?? "", sortable: true, filter: "text",
      cell: (r) => <span className="font-mono text-xs">{r.sku || "—"}</span>,
    },
    {
      key: "status", header: "Status", accessor: (r) => r.status, filter: "select",
      options: ["SUCCESS", "ERROR", "UNKNOWN_EVENT"],
      cell: (r) => <Badge variant="outline" className={statusBadge[r.status] || ""}>{r.status}</Badge>,
    },
    {
      key: "details", header: "Details", accessor: (r) => r.error_message || "",
      cell: (r) => (
        <span className="text-xs text-muted-foreground max-w-[300px] truncate block">
          {r.error_message || (r.payload ? JSON.stringify(r.payload).slice(0, 120) : "—")}
        </span>
      ),
      exportValue: (r) => r.error_message || JSON.stringify(r.payload ?? {}),
    },
  ];

  return (
    <>
      <PageHeader
        title="Webhook Event Log"
        description="Real-time trace of all CoreERP PO webhook events — PO creations, updates, and receipt confirmations."
        badge={<Badge variant="outline" className="text-xs font-mono animate-pulse">Live</Badge>}
      />
      <DataTable
        rows={logs ?? []}
        columns={columns}
        rowKey={(r) => r.id}
        exportFilename="webhook-log"
        tableId="webhook-log"
        createdAtKey="created_at"
        emptyMessage="No webhook events yet. Send a PO from CoreERP to see events here."
      />
    </>
  );
};

export default WebhookLog;