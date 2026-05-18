import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageSquare, X, Send, Bot, User, Loader2, Sparkles,
  Truck, MapPin, ListOrdered, TrendingDown, ShieldAlert, AlertTriangle,
  CheckCircle2, XCircle, PauseCircle, RefreshCw, History, ArrowUpRight,
  RotateCcw, ShieldQuestion, ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type MarkdownProposal = {
  sku: string; batchNumber: string; currentPrice: number; proposedPrice: number;
  discountPercent: number; reasoning: string; urgency: "LOW"|"MEDIUM"|"HIGH"|"CRITICAL";
  batchId?: string;
};

type QCDecision = "RELEASE"|"EXTEND_HOLD"|"WRITE_OFF"|"RETURN_TO_SUPPLIER"|"ESCALATE_TO_QA";

type TriageItem = {
  batchId: string;
  batchNumber: string;
  product: string;
  sku: string;
  store?: string;
  quantity: number;
  daysLeft?: number;
  triage: {
    holdReason: string;
    severity: "LOW"|"MEDIUM"|"HIGH"|"CRITICAL";
    recommendedAction: QCDecision;
    rationale: string;
    followUpChecks: string[];
  };
  auditId: string | null;
  decided?: QCDecision;
};

type Attachment =
  | { kind: "markdowns"; proposals: (MarkdownProposal & { status?: "approved"|"rejected"; notes?: string })[] }
  | { kind: "triage"; items: TriageItem[] };

type Msg = { role: "user" | "assistant"; content: string; attachment?: Attachment };

const SUGGESTIONS = [
  "Rank stores and batches by expiry risk now",
  "Show me a FEFO picking plan for today",
  "Suggest putaway locations for the latest receipts",
  "Which quarantined batches should I release vs write-off?",
];

const sevTone: Record<string, string> = {
  LOW: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  MEDIUM: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  HIGH: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  CRITICAL: "bg-red-500/10 text-red-600 border-red-500/30",
};

const QC_BUTTONS: Array<{ key: QCDecision; label: string; icon: any; tone: string }> = [
  { key: "RELEASE", label: "Release", icon: CheckCircle2, tone: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/20" },
  { key: "EXTEND_HOLD", label: "Hold", icon: PauseCircle, tone: "bg-amber-500/10 text-amber-700 border-amber-500/30 hover:bg-amber-500/20" },
  { key: "WRITE_OFF", label: "Write-off", icon: XCircle, tone: "bg-red-500/10 text-red-700 border-red-500/30 hover:bg-red-500/20" },
  { key: "RETURN_TO_SUPPLIER", label: "Return", icon: RotateCcw, tone: "bg-indigo-500/10 text-indigo-700 border-indigo-500/30 hover:bg-indigo-500/20" },
  { key: "ESCALATE_TO_QA", label: "Escalate", icon: ShieldQuestion, tone: "bg-violet-500/10 text-violet-700 border-violet-500/30 hover:bg-violet-500/20" },
];

const zoneFor = (days: number) =>
  days <= 2 ? "BLACK" : days <= 7 ? "RED" : days <= 14 ? "ORANGE" : days <= 30 ? "YELLOW" : "GREEN";

const zoneTone: Record<string, string> = {
  BLACK: "bg-zinc-800 text-white",
  RED: "bg-red-500/15 text-red-700 border-red-500/30",
  ORANGE: "bg-orange-500/15 text-orange-700 border-orange-500/30",
  YELLOW: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  GREEN: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
};

const WMSAssistantChat = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi — I'm **CORTA AI**. Use the quick actions below, or ask me about live inventory, expiries, FEFO, quarantine, markdowns or receiving." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Side panels
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditRows, setAuditRows] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const [batchDrawer, setBatchDrawer] = useState<{ batchId: string } | null>(null);
  const [batchData, setBatchData] = useState<any | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);

  // Comment dialog (markdown approve/reject)
  const [commentDlg, setCommentDlg] = useState<null | { msgIdx: number; batchNumber: string; decision: "approved" | "rejected" }>(null);
  const [commentText, setCommentText] = useState("");

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const pushAssistant = (content: string, attachment?: Attachment) =>
    setMessages((p) => [...p, { role: "assistant", content, attachment }]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");
    const userMsg: Msg = { role: "user", content };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("wms-assistant", {
        body: { messages: next.slice(-10).map(({ role, content }) => ({ role, content })) },
      });
      if (error) throw error;
      pushAssistant(data?.reply || "No response.");
    } catch {
      pushAssistant("Sorry, something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ---- Refresh expiry risk rankings with the latest data ----
  const refreshExpiryRisk = () =>
    send("Refresh expiry risk: rank top 10 stores and batches by current near-expiry risk using the latest snapshot. Include zone, days-left and qty.");

  // ---- Markdown recommendations flow ----
  const runMarkdownRecos = async () => {
    if (loading) return;
    setMessages((p) => [...p, { role: "user", content: "Generate markdown recommendations for near-expiry batches." }]);
    setLoading(true);
    try {
      const today = new Date();
      const horizon = new Date(today.getTime() + 30 * 86400000).toISOString().slice(0, 10);
      const { data: batches, error } = await supabase
        .from("inventory_batches")
        .select("id, batch_number, quantity, expiry_date, location, products!inventory_batches_product_id_fkey(sku, name, current_price, category), stores!inventory_batches_store_id_fkey(store_code)")
        .eq("status", "AVAILABLE")
        .eq("qc_status", "PASSED")
        .gt("quantity", 0)
        .lte("expiry_date", horizon)
        .gte("expiry_date", today.toISOString().slice(0, 10))
        .order("expiry_date", { ascending: true })
        .limit(8);
      if (error) throw error;
      if (!batches?.length) { pushAssistant("No near-expiry AVAILABLE batches in the next 30 days. Nothing to mark down right now."); return; }

      const items = batches.map((b: any) => ({
        sku: b.products?.sku, productName: b.products?.name, batchNumber: b.batch_number,
        currentPrice: Number(b.products?.current_price ?? 0), quantity: b.quantity, expiryDate: b.expiry_date,
        daysUntilExpiry: Math.ceil((new Date(b.expiry_date).getTime() - today.getTime()) / 86400000),
        store: b.stores?.store_code, category: b.products?.category,
      }));

      const { data, error: e2 } = await supabase.functions.invoke("ai-pricing-proposal", { body: { items } });
      if (e2) throw e2;
      const proposals = (data?.proposals ?? []).map((p: any) => {
        const match = batches.find((b: any) => b.batch_number === p.batchNumber);
        return { ...p, batchId: match?.id };
      });
      if (!proposals.length) { pushAssistant("AI returned no proposals — try again in a moment."); return; }

      pushAssistant(
        `Here are **${proposals.length} markdown recommendations** based on live near-expiry stock. Approve or reject each — decisions go straight to the [Markdown Approvals](/markdown-approvals) queue.`,
        { kind: "markdowns", proposals },
      );
    } catch (e: any) {
      pushAssistant(`Couldn't generate markdown recommendations: ${e.message || "unknown error"}.`);
    } finally { setLoading(false); }
  };

  const submitMarkdownDecision = async () => {
    if (!commentDlg) return;
    const { msgIdx, batchNumber, decision } = commentDlg;
    const msg = messages[msgIdx];
    if (msg?.attachment?.kind !== "markdowns") return;
    const p = msg.attachment.proposals.find((x) => x.batchNumber === batchNumber);
    if (!p?.batchId) { toast.error("Missing batch reference"); return; }
    try {
      const { error } = await supabase.from("markdown_proposals").insert({
        batch_id: p.batchId, sku: p.sku, batch_number: p.batchNumber,
        current_price: p.currentPrice, proposed_price: p.proposedPrice,
        discount_percent: p.discountPercent, reasoning: p.reasoning,
        urgency: p.urgency, status: decision,
        reviewer_notes: commentText || null,
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
      });
      if (error) throw error;
      // audit log entry
      await supabase.from("ai_audit_log").insert({
        feature: "MARKDOWN_RECOMMENDATION",
        prompt: "In-chat markdown recommendation",
        input: { sku: p.sku, batchNumber: p.batchNumber, currentPrice: p.currentPrice },
        output: { proposedPrice: p.proposedPrice, discountPercent: p.discountPercent, reasoning: p.reasoning, urgency: p.urgency },
        confidence: p.urgency,
        batch_id: p.batchId,
        user_id: user?.id ?? null,
        user_decision: `CHAT_${decision.toUpperCase()}${commentText ? `: ${commentText.slice(0,140)}` : ""}`,
        decision_at: new Date().toISOString(),
      });
      setMessages((prev) => prev.map((m, i) => {
        if (i !== msgIdx || m.attachment?.kind !== "markdowns") return m;
        return {
          ...m,
          attachment: {
            ...m.attachment,
            proposals: m.attachment.proposals.map((x) =>
              x.batchNumber === batchNumber ? { ...x, status: decision, notes: commentText } : x,
            ),
          },
        };
      }));
      toast.success(`Markdown ${decision} · ${p.sku} ${p.batchNumber}`);
      setCommentDlg(null); setCommentText("");
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    }
  };

  // ---- QC triage flow ----
  const runTriageFlow = async () => {
    if (loading) return;
    setMessages((p) => [...p, { role: "user", content: "Triage incoming quarantined batches." }]);
    setLoading(true);
    try {
      const { data: qBatches, error } = await supabase
        .from("inventory_batches")
        .select("id, batch_number, quantity, expiry_date, products!inventory_batches_product_id_fkey(sku, name), stores!inventory_batches_store_id_fkey(store_code)")
        .eq("status", "QUARANTINED")
        .order("received_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      if (!qBatches?.length) { pushAssistant("No quarantined batches right now. ✅"); return; }

      const today = new Date();
      const items: TriageItem[] = [];
      for (const b of qBatches as any[]) {
        try {
          const { data, error: e } = await supabase.functions.invoke("wms-quarantine-triage", {
            body: { batchId: b.id, userId: user?.id },
          });
          if (e) throw e;
          if (data?.triage) {
            items.push({
              batchId: b.id, batchNumber: b.batch_number, product: b.products?.name, sku: b.products?.sku,
              store: b.stores?.store_code, quantity: b.quantity,
              daysLeft: Math.ceil((new Date(b.expiry_date).getTime() - today.getTime()) / 86400000),
              triage: data.triage, auditId: data.auditId ?? null,
            });
          }
        } catch { /* skip */ }
      }
      if (!items.length) { pushAssistant("Couldn't generate triage decisions right now."); return; }

      pushAssistant(
        `Triaged **${items.length} quarantined batch${items.length === 1 ? "" : "es"}**. Pick a decision — outcomes are written to the AI audit log.`,
        { kind: "triage", items },
      );
    } catch (e: any) {
      pushAssistant(`Triage failed: ${e.message || "unknown error"}.`);
    } finally { setLoading(false); }
  };

  const applyTriageDecision = async (msgIdx: number, idx: number, decision: QCDecision) => {
    const msg = messages[msgIdx];
    if (msg?.attachment?.kind !== "triage") return;
    const item = msg.attachment.items[idx];
    try {
      if (decision === "RELEASE") {
        await supabase.from("inventory_batches").update({ status: "AVAILABLE", qc_status: "PASSED" }).eq("id", item.batchId);
      } else if (decision === "WRITE_OFF") {
        await supabase.from("inventory_batches").update({ status: "WRITTEN_OFF", quantity: 0 }).eq("id", item.batchId);
      } else if (decision === "RETURN_TO_SUPPLIER") {
        await supabase.from("inventory_batches").update({ status: "RETURNED", quantity: 0 }).eq("id", item.batchId);
      }
      // EXTEND_HOLD and ESCALATE_TO_QA leave inventory state untouched.

      if (item.auditId) {
        await supabase.from("ai_audit_log").update({
          user_decision: `CHAT_${decision}`,
          decision_at: new Date().toISOString(),
        }).eq("id", item.auditId);
      }
      setMessages((prev) => prev.map((m, i) => {
        if (i !== msgIdx || m.attachment?.kind !== "triage") return m;
        const items = m.attachment.items.map((it, j) => j === idx ? { ...it, decided: decision } : it);
        return { ...m, attachment: { ...m.attachment, items } };
      }));
      toast.success(`${decision.replace(/_/g, " ").toLowerCase()} · ${item.batchNumber}`);
    } catch (e: any) {
      toast.error(e.message || "Decision failed");
    }
  };

  // ---- Audit log panel ----
  const loadAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      const { data, error } = await supabase
        .from("ai_audit_log")
        .select("id, feature, batch_id, decision_at, user_decision, confidence, output, created_at")
        .not("user_decision", "is", null)
        .order("decision_at", { ascending: false, nullsFirst: false })
        .limit(50);
      if (error) throw error;
      // Hydrate batch labels
      const batchIds = Array.from(new Set((data ?? []).map((r: any) => r.batch_id).filter(Boolean)));
      let labels: Record<string, { batch_number: string; sku?: string }> = {};
      if (batchIds.length) {
        const { data: bs } = await supabase
          .from("inventory_batches")
          .select("id, batch_number, products!inventory_batches_product_id_fkey(sku)")
          .in("id", batchIds);
        (bs ?? []).forEach((b: any) => { labels[b.id] = { batch_number: b.batch_number, sku: b.products?.sku }; });
      }
      setAuditRows((data ?? []).map((r: any) => ({ ...r, batch: r.batch_id ? labels[r.batch_id] : null })));
    } catch (e: any) {
      toast.error(e.message || "Audit fetch failed");
    } finally { setAuditLoading(false); }
  }, []);

  const openAuditPanel = () => { setAuditOpen(true); loadAudit(); };

  // ---- Batch drawer ----
  const openBatch = async (batchId: string) => {
    setBatchDrawer({ batchId }); setBatchData(null); setBatchLoading(true);
    try {
      const { data: b } = await supabase
        .from("inventory_batches")
        .select("*, products!inventory_batches_product_id_fkey(sku, name, current_price, category, shelf_life_days), stores!inventory_batches_store_id_fkey(store_code)")
        .eq("id", batchId).single();
      if (!b) throw new Error("Batch not found");
      const { data: siblings } = await supabase
        .from("inventory_batches")
        .select("id, batch_number, expiry_date, quantity, location, status, qc_status, stores!inventory_batches_store_id_fkey(store_code)")
        .eq("product_id", b.product_id)
        .eq("store_id", b.store_id)
        .in("status", ["AVAILABLE", "QUARANTINED"])
        .order("expiry_date", { ascending: true })
        .limit(15);
      setBatchData({ batch: b, siblings: siblings ?? [] });
    } catch (e: any) {
      toast.error(e.message || "Couldn't load batch");
      setBatchDrawer(null);
    } finally { setBatchLoading(false); }
  };

  // ---- Quick action chips ----
  const QUICK_ACTIONS: Array<{ label: string; icon: any; run: () => void }> = [
    { label: "Receiving", icon: Truck, run: () => { setOpen(false); navigate("/receiving"); } },
    { label: "Putaway", icon: MapPin, run: () => send("Suggest FEFO putaway locations for the most recent receipts based on current pickface batches.") },
    { label: "FEFO Pick", icon: ListOrdered, run: () => send("Build a FEFO picking plan for the next outbound — show batches in expiry order with location and qty.") },
    { label: "Expiry Risk", icon: AlertTriangle, run: refreshExpiryRisk },
    { label: "Markdowns", icon: TrendingDown, run: runMarkdownRecos },
    { label: "QC Triage", icon: ShieldAlert, run: runTriageFlow },
  ];

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105"
        style={{ background: "var(--gradient-primary)", color: "hsl(var(--primary-foreground))" }}
        aria-label="Open CORTA AI assistant"
      >
        {open ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[460px] max-w-[calc(100vw-2rem)] h-[640px] rounded-2xl border bg-card shadow-2xl flex flex-col overflow-hidden animate-fade-in">
          <div className="px-4 py-3 border-b flex items-center gap-3" style={{ background: "var(--gradient-primary)" }}>
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="text-primary-foreground flex-1 min-w-0">
              <div className="text-sm font-semibold">CORTA AI Assistant</div>
              <div className="text-[10px] opacity-90">Live inventory · FEFO · markdowns · QC</div>
            </div>
            <button onClick={refreshExpiryRisk} title="Refresh expiry risk rankings"
              className="h-7 w-7 rounded-md bg-white/15 hover:bg-white/25 flex items-center justify-center text-primary-foreground">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={openAuditPanel} title="View audit log"
              className="h-7 w-7 rounded-md bg-white/15 hover:bg-white/25 flex items-center justify-center text-primary-foreground">
              <History className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Quick actions */}
          <div className="px-3 py-2 border-b bg-muted/40 flex flex-wrap gap-1.5">
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.label}
                onClick={a.run}
                disabled={loading}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-full border bg-card hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
              >
                <a.icon className="h-3 w-3 text-primary" />
                {a.label}
              </button>
            ))}
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-background">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-3 w-3 text-primary" />
                  </div>
                )}
                <div className={`max-w-[90%] ${m.role === "user" ? "" : "w-full"}`}>
                  <div className={`px-3 py-2 rounded-xl text-xs leading-relaxed ${m.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>
                    {m.role === "assistant" ? (
                      <div className="prose prose-xs max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ul]:pl-4 [&_li]:my-0.5 [&_strong]:font-semibold">
                        <ReactMarkdown
                          components={{
                            a: ({ href, children }) => {
                              const isInternal = href?.startsWith("/");
                              const isBatch = href?.startsWith("/batch/");
                              return (
                                <a
                                  href={href}
                                  onClick={(e) => {
                                    if (isBatch && href) { e.preventDefault(); openBatch(href.replace("/batch/", "")); return; }
                                    if (isInternal && href) { e.preventDefault(); setOpen(false); navigate(href); }
                                  }}
                                  className="text-primary underline underline-offset-2 hover:opacity-80"
                                >{children}</a>
                              );
                            },
                          }}
                        >{m.content}</ReactMarkdown>
                      </div>
                    ) : m.content}
                  </div>

                  {/* Markdown attachment */}
                  {m.attachment?.kind === "markdowns" && (
                    <div className="mt-2 space-y-2">
                      {m.attachment.proposals.map((p) => (
                        <div key={p.batchNumber} className="rounded-lg border bg-card p-2.5 text-xs">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-medium truncate">
                                {p.sku} · {p.batchId ? (
                                  <button onClick={() => openBatch(p.batchId!)} className="font-mono text-primary hover:underline">{p.batchNumber}</button>
                                ) : <span className="font-mono">{p.batchNumber}</span>}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {p.currentPrice.toFixed(2)} → <span className="text-foreground font-semibold">{p.proposedPrice.toFixed(2)}</span>
                                <span className="ml-1 text-destructive">−{p.discountPercent}%</span>
                              </div>
                            </div>
                            <span className={`text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded border ${sevTone[p.urgency]}`}>{p.urgency}</span>
                          </div>
                          <div className="mt-1.5 text-[11px] text-muted-foreground italic">"{p.reasoning}"</div>
                          <div className="mt-2 flex justify-end gap-1.5">
                            {p.status ? (
                              <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border ${p.status === "approved" ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" : "bg-red-500/10 text-red-700 border-red-500/30"}`}>
                                {p.status === "approved" ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                {p.status === "approved" ? "Approved" : "Rejected"}{p.notes ? " · noted" : ""}
                              </span>
                            ) : (
                              <>
                                <button onClick={() => { setCommentDlg({ msgIdx: i, batchNumber: p.batchNumber, decision: "rejected" }); setCommentText(""); }}
                                  className="text-[10px] px-2 py-1 rounded border bg-red-500/10 text-red-700 border-red-500/30 hover:bg-red-500/20 inline-flex items-center gap-1">
                                  <XCircle className="h-3 w-3" /> Reject
                                </button>
                                <button onClick={() => { setCommentDlg({ msgIdx: i, batchNumber: p.batchNumber, decision: "approved" }); setCommentText(""); }}
                                  className="text-[10px] px-2 py-1 rounded bg-primary text-primary-foreground hover:opacity-90 inline-flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> Approve
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Triage attachment */}
                  {m.attachment?.kind === "triage" && (
                    <div className="mt-2 space-y-2">
                      {m.attachment.items.map((it, j) => (
                        <div key={it.batchId} className="rounded-lg border bg-card p-2.5 text-xs">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <button onClick={() => openBatch(it.batchId)} className="font-mono text-[11px] text-primary hover:underline">{it.batchNumber}</button>
                              <div className="text-[10px] text-muted-foreground truncate">{it.product} · {it.sku} · {it.store} · qty {it.quantity}{typeof it.daysLeft === "number" ? ` · ${it.daysLeft}d left` : ""}</div>
                            </div>
                            <span className={`text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded border ${sevTone[it.triage.severity]}`}>{it.triage.severity}</span>
                          </div>
                          <div className="mt-1 text-[11px]"><span className="font-semibold">Hold:</span> {it.triage.holdReason}</div>
                          <div className="mt-0.5 text-[11px]"><span className="font-semibold">AI suggests:</span> {it.triage.recommendedAction.replace(/_/g, " ")}</div>
                          <div className="mt-1 text-[11px] text-muted-foreground italic">"{it.triage.rationale}"</div>
                          {it.decided ? (
                            <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-emerald-600">
                              <CheckCircle2 className="h-3 w-3" /> Decision: {it.decided.replace(/_/g, " ")} (logged)
                            </div>
                          ) : (
                            <div className="mt-2 flex flex-wrap gap-1.5 justify-end">
                              {QC_BUTTONS.map((b) => (
                                <button key={b.key} onClick={() => applyTriageDecision(i, j, b.key)}
                                  className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded border ${b.tone}`}>
                                  <b.icon className="h-3 w-3" /> {b.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {m.role === "user" && (
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <User className="h-3 w-3 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-3 w-3 text-primary" />
                </div>
                <div className="bg-muted rounded-xl px-4 py-2">
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                </div>
              </div>
            )}
            {messages.length <= 1 && !loading && (
              <div className="pt-2 space-y-1.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1">Try asking</div>
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="block w-full text-left text-xs px-3 py-2 rounded-lg border bg-card hover:bg-muted transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="px-3 py-3 border-t bg-card">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Ask about inventory, expiries, markdowns, QC…"
                className="flex-1 bg-muted border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-primary-foreground disabled:opacity-40"
                style={{ background: "var(--gradient-primary)" }}
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Markdown approve/reject comment dialog */}
      <Dialog open={!!commentDlg} onOpenChange={(o) => { if (!o) { setCommentDlg(null); setCommentText(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{commentDlg?.decision === "approved" ? "Approve markdown" : "Reject markdown"}</DialogTitle>
            <DialogDescription>
              Add a comment (optional). This is saved to the markdown approvals queue and the AI audit log.
            </DialogDescription>
          </DialogHeader>
          <Textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="e.g. Apply 30% in-store flag only; revisit tomorrow." rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCommentDlg(null); setCommentText(""); }}>Cancel</Button>
            <Button onClick={submitMarkdownDecision} variant={commentDlg?.decision === "approved" ? "default" : "destructive"}>
              Confirm {commentDlg?.decision}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit log side sheet */}
      <Sheet open={auditOpen} onOpenChange={setAuditOpen}>
        <SheetContent side="right" className="w-[420px] sm:w-[460px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><History className="h-4 w-4" /> My AI decisions</SheetTitle>
            <SheetDescription>Outcomes you recorded from chat — timestamp, batch, AI recommendation and your decision.</SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <div className="flex justify-end mb-2">
              <Button size="sm" variant="outline" onClick={loadAudit} disabled={auditLoading}>
                <RefreshCw className={`h-3 w-3 mr-1 ${auditLoading ? "animate-spin" : ""}`} /> Refresh
              </Button>
            </div>
            {auditLoading && <div className="text-xs text-muted-foreground">Loading…</div>}
            {!auditLoading && auditRows.length === 0 && (
              <div className="text-xs text-muted-foreground">No decisions recorded yet.</div>
            )}
            <div className="space-y-2">
              {auditRows.map((r) => {
                const aiRec = r.output?.recommendedAction || r.output?.discountPercent
                  ? (r.output.recommendedAction ?? `Markdown −${r.output.discountPercent}% → ${r.output.proposedPrice}`)
                  : "—";
                const rationale = r.output?.rationale || r.output?.reasoning || "";
                return (
                  <div key={r.id} className="rounded-lg border p-2.5 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{r.feature.replace(/_/g, " ")}</div>
                        {r.batch ? (
                          <button onClick={() => { setAuditOpen(false); openBatch(r.batch_id); }} className="font-mono text-[11px] text-primary hover:underline">
                            {r.batch.batch_number}{r.batch.sku ? ` · ${r.batch.sku}` : ""}
                          </button>
                        ) : <span className="text-[11px] text-muted-foreground">No batch</span>}
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {r.decision_at ? new Date(r.decision_at).toLocaleString() : ""}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px]"><span className="font-semibold">AI:</span> {String(aiRec)}</div>
                    <div className="mt-0.5 text-[11px]"><span className="font-semibold">You:</span> {r.user_decision}</div>
                    {rationale && <div className="mt-1 text-[11px] text-muted-foreground italic">"{rationale}"</div>}
                    {r.batch_id && (
                      <button onClick={() => { setAuditOpen(false); openBatch(r.batch_id); }} className="mt-2 inline-flex items-center gap-1 text-[10px] text-primary hover:underline">
                        Open batch <ArrowUpRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Batch details drawer */}
      <Sheet open={!!batchDrawer} onOpenChange={(o) => { if (!o) { setBatchDrawer(null); setBatchData(null); } }}>
        <SheetContent side="right" className="w-[460px] sm:w-[520px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Batch details</SheetTitle>
            <SheetDescription>FEFO order, days-left, qty and suggested next actions.</SheetDescription>
          </SheetHeader>
          {batchLoading && <div className="mt-4 text-xs text-muted-foreground">Loading…</div>}
          {batchData && (() => {
            const b = batchData.batch;
            const today = new Date();
            const days = Math.ceil((new Date(b.expiry_date).getTime() - today.getTime()) / 86400000);
            const z = zoneFor(days);
            const price = Number(b.products?.current_price ?? 0);
            const suggestions: string[] = [];
            if (z === "BLACK") suggestions.push("Pull from sale & create a write-off task.");
            else if (z === "RED") suggestions.push("Apply 40–60% markdown immediately or write off if no demand.");
            else if (z === "ORANGE") suggestions.push("Apply 25–35% markdown and move to PICKFACE.");
            else if (z === "YELLOW") suggestions.push("Apply 10–15% markdown; monitor sell-through.");
            else suggestions.push("OK to sell at full price. Continue FEFO rotation.");
            const earliest = (batchData.siblings ?? [])[0];
            if (earliest && earliest.id !== b.id) suggestions.push(`Earlier batch ${earliest.batch_number} (${Math.ceil((new Date(earliest.expiry_date).getTime() - today.getTime())/86400000)}d) should be picked first.`);
            if (b.status === "QUARANTINED") suggestions.push("Run QC triage and apply RELEASE / EXTEND_HOLD / WRITE_OFF.");
            return (
              <div className="mt-4 space-y-3 text-xs">
                <div className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold">{b.products?.name}</div>
                      <div className="text-[11px] text-muted-foreground">{b.products?.sku} · {b.stores?.store_code} · {b.location || "—"}</div>
                    </div>
                    <span className={`text-[9px] uppercase px-2 py-0.5 rounded border ${zoneTone[z]}`}>{z}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded bg-muted p-2"><div className="text-[10px] text-muted-foreground">Days left</div><div className="font-semibold tabular-nums">{days}</div></div>
                    <div className="rounded bg-muted p-2"><div className="text-[10px] text-muted-foreground">Quantity</div><div className="font-semibold tabular-nums">{b.quantity}</div></div>
                    <div className="rounded bg-muted p-2"><div className="text-[10px] text-muted-foreground">Price</div><div className="font-semibold tabular-nums">{price.toFixed(2)}</div></div>
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    Batch <span className="font-mono text-foreground">{b.batch_number}</span> · expires {b.expiry_date} · status {b.status} / QC {b.qc_status}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">FEFO order — same SKU @ {b.stores?.store_code}</div>
                  <div className="rounded-lg border overflow-hidden">
                    {(batchData.siblings ?? []).map((s: any, idx: number) => {
                      const sDays = Math.ceil((new Date(s.expiry_date).getTime() - today.getTime()) / 86400000);
                      const sZ = zoneFor(sDays);
                      const isCurrent = s.id === b.id;
                      return (
                        <button
                          key={s.id}
                          onClick={() => !isCurrent && openBatch(s.id)}
                          disabled={isCurrent}
                          className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-left border-b last:border-b-0 ${isCurrent ? "bg-primary/5" : "hover:bg-muted"}`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] text-muted-foreground w-4">{idx + 1}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border ${zoneTone[sZ]}`}>{sZ}</span>
                            <span className="font-mono text-[11px] truncate">{s.batch_number}</span>
                            {isCurrent && <span className="text-[9px] uppercase text-primary">current</span>}
                          </div>
                          <div className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">
                            {sDays}d · qty {s.quantity} · {s.location || "—"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Suggested next actions</div>
                  <ul className="rounded-lg border p-2.5 space-y-1 text-[11px]">
                    {suggestions.map((s, i) => <li key={i} className="flex gap-1.5"><span className="text-primary">›</span>{s}</li>)}
                  </ul>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => { setBatchDrawer(null); setOpen(false); navigate(`/batch/${b.id}`); }}>
                    Open full page <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default WMSAssistantChat;