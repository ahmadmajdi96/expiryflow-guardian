import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageSquare, X, Send, Bot, User, Loader2, Sparkles,
  Truck, MapPin, ListOrdered, TrendingDown, ShieldAlert, AlertTriangle,
  CheckCircle2, XCircle, PauseCircle, RefreshCw, History, ArrowUpRight,
  RotateCcw, ShieldQuestion, ExternalLink, Download, Clock, Undo2,
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
import { Checkbox } from "@/components/ui/checkbox";

// ---- SLA thresholds (hours) ----
const SLA = {
  markdownPendingHours: 24,
  quarantineOpenHours: 48,
};

type MarkdownProposal = {
  sku: string; batchNumber: string; currentPrice: number; proposedPrice: number;
  discountPercent: number; reasoning: string; urgency: "LOW"|"MEDIUM"|"HIGH"|"CRITICAL";
  batchId?: string;
  // per-item review state
  status?: "approved"|"rejected"; notes?: string;
  proposalId?: string; auditId?: string;
  selected?: boolean;
};

type QCDecision = "RELEASE"|"EXTEND_HOLD"|"WRITE_OFF"|"RETURN_TO_SUPPLIER"|"ESCALATE_TO_QA";

type TriageItem = {
  batchId: string; batchNumber: string; product: string; sku: string;
  store?: string; quantity: number; daysLeft?: number;
  triage: {
    holdReason: string; severity: "LOW"|"MEDIUM"|"HIGH"|"CRITICAL";
    recommendedAction: QCDecision; rationale: string; followUpChecks: string[];
  };
  auditId: string | null;
  decided?: QCDecision;
  priorStatus?: string; priorQc?: string; priorQuantity?: number;
};

type SLAReminder = {
  kind: "MARKDOWN_PENDING" | "QUARANTINE_OPEN";
  id: string;
  label: string;
  detail: string;
  hoursOpen: number;
  link?: string;
  batchId?: string;
};

type Attachment =
  | { kind: "markdowns"; proposals: MarkdownProposal[] }
  | { kind: "triage"; items: TriageItem[] }
  | { kind: "sla"; reminders: SLAReminder[] };

type Msg = { role: "user" | "assistant"; content: string; attachment?: Attachment };

type UndoState =
  | { kind: "markdown"; msgIdx: number; batchNumber: string; proposalId: string; auditId?: string }
  | { kind: "markdown-bulk"; msgIdx: number; entries: Array<{ batchNumber: string; proposalId: string; auditId?: string }> }
  | { kind: "qc"; msgIdx: number; idx: number; batchId: string; auditId: string | null; prior: { status?: string; qc_status?: string; quantity?: number }; decision: QCDecision };

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

const zoneHex: Record<string, string> = {
  BLACK: "#18181b", RED: "#dc2626", ORANGE: "#ea580c", YELLOW: "#d97706", GREEN: "#16a34a",
};

const csvEscape = (v: any) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const hoursBetween = (a: Date, b: Date) => Math.floor((a.getTime() - b.getTime()) / 3600000);

// ---- Mini sparkline component (days-left over time, zone-tinted segments) ----
const DaysLeftSparkline = ({ receivedAt, expiryDate }: { receivedAt: string; expiryDate: string }) => {
  const start = new Date(receivedAt);
  const end = new Date(expiryDate);
  const today = new Date();
  const totalDays = Math.max(2, Math.ceil((end.getTime() - start.getTime()) / 86400000));
  const points: Array<{ t: number; days: number; zone: string }> = [];
  for (let i = 0; i <= totalDays; i++) {
    const t = new Date(start.getTime() + i * 86400000);
    if (t > end) break;
    const days = Math.ceil((end.getTime() - t.getTime()) / 86400000);
    points.push({ t: i, days, zone: zoneFor(days) });
  }
  if (points.length < 2) return null;
  const W = 260, H = 56, P = 4;
  const maxD = points[0].days;
  const x = (i: number) => P + (i / (points.length - 1)) * (W - P * 2);
  const y = (d: number) => P + (1 - d / maxD) * (H - P * 2);
  // build path
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.days).toFixed(1)}`).join(" ");
  // today marker
  const todayIdx = Math.min(points.length - 1, Math.max(0, Math.floor((today.getTime() - start.getTime()) / 86400000)));
  const todayPoint = points[todayIdx];
  // zone bands as background
  const zoneSegs: Array<{ x1: number; x2: number; zone: string }> = [];
  for (let i = 0; i < points.length - 1; i++) {
    zoneSegs.push({ x1: x(i), x2: x(i + 1), zone: points[i].zone });
  }
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="block">
        {zoneSegs.map((s, i) => (
          <rect key={i} x={s.x1} y={P} width={s.x2 - s.x1} height={H - P * 2} fill={zoneHex[s.zone]} opacity={0.10} />
        ))}
        <path d={path} fill="none" stroke="hsl(var(--primary))" strokeWidth={1.5} />
        {todayPoint && (
          <>
            <line x1={x(todayIdx)} x2={x(todayIdx)} y1={P} y2={H - P} stroke="hsl(var(--primary))" strokeDasharray="2 2" strokeWidth={1} />
            <circle cx={x(todayIdx)} cy={y(todayPoint.days)} r={2.5} fill={zoneHex[todayPoint.zone]} stroke="white" strokeWidth={1} />
          </>
        )}
      </svg>
      <div className="mt-1 flex items-center justify-between text-[9px] text-muted-foreground">
        <span>received {receivedAt.slice(0, 10)} · {maxD}d shelf</span>
        <span className="inline-flex items-center gap-2">
          {(["GREEN","YELLOW","ORANGE","RED","BLACK"] as const).map((z) => (
            <span key={z} className="inline-flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-sm" style={{ background: zoneHex[z] }} /> {z[0]}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
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

  const [auditOpen, setAuditOpen] = useState(false);
  const [auditRows, setAuditRows] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const [batchDrawer, setBatchDrawer] = useState<{ batchId: string } | null>(null);
  const [batchData, setBatchData] = useState<any | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);

  // Single + bulk markdown comment dialog
  const [commentDlg, setCommentDlg] = useState<null | {
    msgIdx: number; decision: "approved" | "rejected"; mode: "single" | "bulk"; batchNumber?: string;
  }>(null);
  const [commentText, setCommentText] = useState("");

  // Undo stack (last single action)
  const [undo, setUndo] = useState<UndoState | null>(null);
  const undoTimerRef = useRef<number | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const armUndo = (u: UndoState) => {
    setUndo(u);
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    undoTimerRef.current = window.setTimeout(() => setUndo(null), 30000);
  };

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

  const refreshExpiryRisk = () =>
    send("Refresh expiry risk: rank top 10 stores and batches by current near-expiry risk using the latest snapshot. Include zone, days-left and qty.");

  // ---- Markdown recommendations ----
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
        .eq("status", "AVAILABLE").eq("qc_status", "PASSED").gt("quantity", 0)
        .lte("expiry_date", horizon).gte("expiry_date", today.toISOString().slice(0, 10))
        .order("expiry_date", { ascending: true }).limit(8);
      if (error) throw error;
      if (!batches?.length) { pushAssistant("No near-expiry AVAILABLE batches in the next 30 days."); return; }
      const items = batches.map((b: any) => ({
        sku: b.products?.sku, productName: b.products?.name, batchNumber: b.batch_number,
        currentPrice: Number(b.products?.current_price ?? 0), quantity: b.quantity, expiryDate: b.expiry_date,
        daysUntilExpiry: Math.ceil((new Date(b.expiry_date).getTime() - today.getTime()) / 86400000),
        store: b.stores?.store_code, category: b.products?.category,
      }));
      const { data, error: e2 } = await supabase.functions.invoke("ai-pricing-proposal", { body: { items } });
      if (e2) throw e2;
      const proposals: MarkdownProposal[] = (data?.proposals ?? []).map((p: any) => {
        const match = batches.find((b: any) => b.batch_number === p.batchNumber);
        return { ...p, batchId: match?.id, selected: false };
      });
      if (!proposals.length) { pushAssistant("AI returned no proposals — try again in a moment."); return; }
      pushAssistant(
        `Here are **${proposals.length} markdown recommendations**. Approve/reject individually, or select multiple and apply a single decision — each saves to [Markdown Approvals](/markdown-approvals) and the AI audit log.`,
        { kind: "markdowns", proposals },
      );
    } catch (e: any) {
      pushAssistant(`Couldn't generate markdown recommendations: ${e.message || "unknown error"}.`);
    } finally { setLoading(false); }
  };

  const writeMarkdownDecision = async (p: MarkdownProposal, decision: "approved"|"rejected", notes: string) => {
    if (!p.batchId) throw new Error(`Missing batch reference for ${p.batchNumber}`);
    const { data: ins, error } = await supabase.from("markdown_proposals").insert({
      batch_id: p.batchId, sku: p.sku, batch_number: p.batchNumber,
      current_price: p.currentPrice, proposed_price: p.proposedPrice,
      discount_percent: p.discountPercent, reasoning: p.reasoning,
      urgency: p.urgency, status: decision,
      reviewer_notes: notes || null,
      reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString(),
    }).select("id").single();
    if (error) throw error;
    const { data: aud } = await supabase.from("ai_audit_log").insert({
      feature: "MARKDOWN_RECOMMENDATION",
      prompt: "In-chat markdown recommendation",
      input: { sku: p.sku, batchNumber: p.batchNumber, currentPrice: p.currentPrice },
      output: { proposedPrice: p.proposedPrice, discountPercent: p.discountPercent, reasoning: p.reasoning, urgency: p.urgency },
      confidence: p.urgency, batch_id: p.batchId, user_id: user?.id ?? null,
      user_decision: `CHAT_${decision.toUpperCase()}${notes ? `: ${notes.slice(0,140)}` : ""}`,
      decision_at: new Date().toISOString(),
    }).select("id").single();
    return { proposalId: ins!.id as string, auditId: aud?.id as string | undefined };
  };

  const submitMarkdownDecision = async () => {
    if (!commentDlg) return;
    const { msgIdx, decision, mode, batchNumber } = commentDlg;
    const msg = messages[msgIdx];
    if (msg?.attachment?.kind !== "markdowns") return;

    try {
      if (mode === "single" && batchNumber) {
        const p = msg.attachment.proposals.find((x) => x.batchNumber === batchNumber);
        if (!p) return;
        const ids = await writeMarkdownDecision(p, decision, commentText);
        setMessages((prev) => prev.map((m, i) => {
          if (i !== msgIdx || m.attachment?.kind !== "markdowns") return m;
          return { ...m, attachment: { ...m.attachment, proposals: m.attachment.proposals.map((x) => x.batchNumber === batchNumber ? { ...x, status: decision, notes: commentText, proposalId: ids.proposalId, auditId: ids.auditId } : x) } };
        }));
        armUndo({ kind: "markdown", msgIdx, batchNumber, proposalId: ids.proposalId, auditId: ids.auditId });
        toast.success(`Markdown ${decision} · ${p.sku} ${p.batchNumber}`);
      } else {
        const selected = msg.attachment.proposals.filter((x) => x.selected && !x.status);
        if (!selected.length) { toast.error("Nothing selected"); return; }
        const results: Array<{ batchNumber: string; proposalId: string; auditId?: string }> = [];
        for (const p of selected) {
          try {
            const ids = await writeMarkdownDecision(p, decision, commentText);
            results.push({ batchNumber: p.batchNumber, proposalId: ids.proposalId, auditId: ids.auditId });
          } catch (e: any) {
            toast.error(`${p.batchNumber}: ${e.message}`);
          }
        }
        setMessages((prev) => prev.map((m, i) => {
          if (i !== msgIdx || m.attachment?.kind !== "markdowns") return m;
          return { ...m, attachment: { ...m.attachment, proposals: m.attachment.proposals.map((x) => {
            const r = results.find((rr) => rr.batchNumber === x.batchNumber);
            return r ? { ...x, status: decision, notes: commentText, proposalId: r.proposalId, auditId: r.auditId, selected: false } : x;
          }) } };
        }));
        if (results.length) armUndo({ kind: "markdown-bulk", msgIdx, entries: results });
        toast.success(`${results.length} markdown${results.length === 1 ? "" : "s"} ${decision}`);
      }
      setCommentDlg(null); setCommentText("");
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    }
  };

  const toggleSelectMarkdown = (msgIdx: number, batchNumber: string, val?: boolean) => {
    setMessages((prev) => prev.map((m, i) => {
      if (i !== msgIdx || m.attachment?.kind !== "markdowns") return m;
      return { ...m, attachment: { ...m.attachment, proposals: m.attachment.proposals.map((x) => x.batchNumber === batchNumber ? { ...x, selected: val ?? !x.selected } : x) } };
    }));
  };
  const toggleSelectAllMarkdowns = (msgIdx: number, val: boolean) => {
    setMessages((prev) => prev.map((m, i) => {
      if (i !== msgIdx || m.attachment?.kind !== "markdowns") return m;
      return { ...m, attachment: { ...m.attachment, proposals: m.attachment.proposals.map((x) => x.status ? x : { ...x, selected: val }) } };
    }));
  };

  // ---- QC triage flow ----
  const runTriageFlow = async () => {
    if (loading) return;
    setMessages((p) => [...p, { role: "user", content: "Triage incoming quarantined batches." }]);
    setLoading(true);
    try {
      const { data: qBatches, error } = await supabase
        .from("inventory_batches")
        .select("id, batch_number, quantity, expiry_date, status, qc_status, products!inventory_batches_product_id_fkey(sku, name), stores!inventory_batches_store_id_fkey(store_code)")
        .eq("status", "QUARANTINED").order("received_at", { ascending: false }).limit(5);
      if (error) throw error;
      if (!qBatches?.length) { pushAssistant("No quarantined batches right now. ✅"); return; }
      const today = new Date();
      const items: TriageItem[] = [];
      for (const b of qBatches as any[]) {
        try {
          const { data, error: e } = await supabase.functions.invoke("wms-quarantine-triage", { body: { batchId: b.id, userId: user?.id } });
          if (e) throw e;
          if (data?.triage) items.push({
            batchId: b.id, batchNumber: b.batch_number, product: b.products?.name, sku: b.products?.sku,
            store: b.stores?.store_code, quantity: b.quantity,
            daysLeft: Math.ceil((new Date(b.expiry_date).getTime() - today.getTime()) / 86400000),
            triage: data.triage, auditId: data.auditId ?? null,
            priorStatus: b.status, priorQc: b.qc_status, priorQuantity: b.quantity,
          });
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
      if (decision === "RELEASE") await supabase.from("inventory_batches").update({ status: "AVAILABLE", qc_status: "PASSED" }).eq("id", item.batchId);
      else if (decision === "WRITE_OFF") await supabase.from("inventory_batches").update({ status: "WRITTEN_OFF", quantity: 0 }).eq("id", item.batchId);
      else if (decision === "RETURN_TO_SUPPLIER") await supabase.from("inventory_batches").update({ status: "RETURNED", quantity: 0 }).eq("id", item.batchId);
      if (item.auditId) await supabase.from("ai_audit_log").update({ user_decision: `CHAT_${decision}`, decision_at: new Date().toISOString() }).eq("id", item.auditId);
      setMessages((prev) => prev.map((m, i) => {
        if (i !== msgIdx || m.attachment?.kind !== "triage") return m;
        const items = m.attachment.items.map((it, j) => j === idx ? { ...it, decided: decision } : it);
        return { ...m, attachment: { ...m.attachment, items } };
      }));
      armUndo({
        kind: "qc", msgIdx, idx, batchId: item.batchId, auditId: item.auditId,
        prior: { status: item.priorStatus, qc_status: item.priorQc, quantity: item.priorQuantity }, decision,
      });
      toast.success(`${decision.replace(/_/g, " ").toLowerCase()} · ${item.batchNumber}`);
    } catch (e: any) {
      toast.error(e.message || "Decision failed");
    }
  };

  // ---- Undo ----
  const performUndo = async () => {
    if (!undo) return;
    try {
      if (undo.kind === "markdown") {
        await supabase.from("markdown_proposals").delete().eq("id", undo.proposalId);
        if (undo.auditId) await supabase.from("ai_audit_log").update({ user_decision: "UNDONE", decision_at: null }).eq("id", undo.auditId);
        setMessages((prev) => prev.map((m, i) => {
          if (i !== undo.msgIdx || m.attachment?.kind !== "markdowns") return m;
          return { ...m, attachment: { ...m.attachment, proposals: m.attachment.proposals.map((x) => x.batchNumber === undo.batchNumber ? { ...x, status: undefined, notes: undefined, proposalId: undefined, auditId: undefined } : x) } };
        }));
      } else if (undo.kind === "markdown-bulk") {
        const propIds = undo.entries.map((e) => e.proposalId);
        const audIds = undo.entries.map((e) => e.auditId).filter(Boolean) as string[];
        await supabase.from("markdown_proposals").delete().in("id", propIds);
        if (audIds.length) await supabase.from("ai_audit_log").update({ user_decision: "UNDONE", decision_at: null }).in("id", audIds);
        const set = new Set(undo.entries.map((e) => e.batchNumber));
        setMessages((prev) => prev.map((m, i) => {
          if (i !== undo.msgIdx || m.attachment?.kind !== "markdowns") return m;
          return { ...m, attachment: { ...m.attachment, proposals: m.attachment.proposals.map((x) => set.has(x.batchNumber) ? { ...x, status: undefined, notes: undefined, proposalId: undefined, auditId: undefined } : x) } };
        }));
      } else if (undo.kind === "qc") {
        // Revert inventory
        const revertPatch: any = {};
        if (undo.prior.status) revertPatch.status = undo.prior.status;
        if (undo.prior.qc_status) revertPatch.qc_status = undo.prior.qc_status;
        if (typeof undo.prior.quantity === "number") revertPatch.quantity = undo.prior.quantity;
        if (Object.keys(revertPatch).length) await supabase.from("inventory_batches").update(revertPatch).eq("id", undo.batchId);
        if (undo.auditId) await supabase.from("ai_audit_log").update({ user_decision: null, decision_at: null }).eq("id", undo.auditId);
        setMessages((prev) => prev.map((m, i) => {
          if (i !== undo.msgIdx || m.attachment?.kind !== "triage") return m;
          const items = m.attachment.items.map((it, j) => j === undo.idx ? { ...it, decided: undefined } : it);
          return { ...m, attachment: { ...m.attachment, items } };
        }));
      }
      toast.success("Reverted last decision");
    } catch (e: any) {
      toast.error(e.message || "Undo failed");
    } finally {
      setUndo(null);
      if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    }
  };

  // ---- SLA check ----
  const runSLACheck = async () => {
    if (loading) return;
    setMessages((p) => [...p, { role: "user", content: "Check SLA breaches on markdowns and QC holds." }]);
    setLoading(true);
    try {
      const now = new Date();
      const reminders: SLAReminder[] = [];
      const mdCutoff = new Date(now.getTime() - SLA.markdownPendingHours * 3600000).toISOString();
      const { data: pendings } = await supabase
        .from("markdown_proposals")
        .select("id, batch_number, sku, urgency, created_at, batch_id, discount_percent")
        .eq("status", "pending").lte("created_at", mdCutoff)
        .order("created_at", { ascending: true }).limit(20);
      (pendings ?? []).forEach((m: any) => {
        const hrs = hoursBetween(now, new Date(m.created_at));
        reminders.push({
          kind: "MARKDOWN_PENDING", id: m.id,
          label: `Markdown ${m.sku} · ${m.batch_number}`,
          detail: `${hrs}h pending · −${m.discount_percent}% · ${m.urgency}`,
          hoursOpen: hrs, link: "/markdown-approvals", batchId: m.batch_id,
        });
      });
      const qCutoff = new Date(now.getTime() - SLA.quarantineOpenHours * 3600000).toISOString();
      const { data: quars } = await supabase
        .from("inventory_batches")
        .select("id, batch_number, received_at, products!inventory_batches_product_id_fkey(sku), stores!inventory_batches_store_id_fkey(store_code)")
        .eq("status", "QUARANTINED").lte("received_at", qCutoff)
        .order("received_at", { ascending: true }).limit(20);
      (quars ?? []).forEach((b: any) => {
        const hrs = hoursBetween(now, new Date(b.received_at));
        reminders.push({
          kind: "QUARANTINE_OPEN", id: b.id,
          label: `Quarantine ${b.products?.sku} · ${b.batch_number}`,
          detail: `${hrs}h on hold @ ${b.stores?.store_code}`,
          hoursOpen: hrs, link: "/quarantine", batchId: b.id,
        });
      });
      if (!reminders.length) { pushAssistant(`✅ All clear — no markdowns pending >${SLA.markdownPendingHours}h and no quarantine holds open >${SLA.quarantineOpenHours}h.`); return; }
      reminders.sort((a, b) => b.hoursOpen - a.hoursOpen);
      pushAssistant(
        `⏰ **${reminders.length} SLA breach${reminders.length === 1 ? "" : "es"}** — markdowns pending > ${SLA.markdownPendingHours}h or QC holds open > ${SLA.quarantineOpenHours}h. Tap to act.`,
        { kind: "sla", reminders },
      );
    } catch (e: any) {
      pushAssistant(`SLA check failed: ${e.message || "unknown error"}.`);
    } finally { setLoading(false); }
  };

  // ---- Audit log ----
  const loadAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      const { data, error } = await supabase
        .from("ai_audit_log")
        .select("id, feature, batch_id, decision_at, user_decision, confidence, output, created_at")
        .not("user_decision", "is", null)
        .order("decision_at", { ascending: false, nullsFirst: false }).limit(50);
      if (error) throw error;
      const batchIds = Array.from(new Set((data ?? []).map((r: any) => r.batch_id).filter(Boolean)));
      let labels: Record<string, { batch_number: string; sku?: string }> = {};
      if (batchIds.length) {
        const { data: bs } = await supabase
          .from("inventory_batches")
          .select("id, batch_number, products!inventory_batches_product_id_fkey(sku)").in("id", batchIds);
        (bs ?? []).forEach((b: any) => { labels[b.id] = { batch_number: b.batch_number, sku: b.products?.sku }; });
      }
      setAuditRows((data ?? []).map((r: any) => ({ ...r, batch: r.batch_id ? labels[r.batch_id] : null })));
    } catch (e: any) {
      toast.error(e.message || "Audit fetch failed");
    } finally { setAuditLoading(false); }
  }, []);

  const openAuditPanel = () => { setAuditOpen(true); loadAudit(); };

  const exportAuditCSV = () => {
    if (!auditRows.length) { toast.error("Nothing to export"); return; }
    const headers = ["timestamp","feature","batch_number","sku","ai_recommendation","rationale","confidence","user_decision"];
    const rows = auditRows.map((r) => {
      const aiRec = r.output?.recommendedAction ?? (r.output?.discountPercent != null ? `Markdown -${r.output.discountPercent}% -> ${r.output.proposedPrice}` : "");
      const rationale = r.output?.rationale || r.output?.reasoning || "";
      return [
        r.decision_at ? new Date(r.decision_at).toISOString() : "",
        r.feature, r.batch?.batch_number ?? "", r.batch?.sku ?? "",
        aiRec, rationale, r.confidence ?? "", r.user_decision ?? "",
      ];
    });
    const csv = [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `corta-ai-decisions-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} decision${rows.length === 1 ? "" : "s"}`);
  };

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
        .eq("product_id", b.product_id).eq("store_id", b.store_id)
        .in("status", ["AVAILABLE", "QUARANTINED"])
        .order("expiry_date", { ascending: true }).limit(15);
      setBatchData({ batch: b, siblings: siblings ?? [] });
    } catch (e: any) {
      toast.error(e.message || "Couldn't load batch");
      setBatchDrawer(null);
    } finally { setBatchLoading(false); }
  };

  const QUICK_ACTIONS: Array<{ label: string; icon: any; run: () => void }> = [
    { label: "Receiving", icon: Truck, run: () => { setOpen(false); navigate("/receiving"); } },
    { label: "Putaway", icon: MapPin, run: () => send("Suggest FEFO putaway locations for the most recent receipts based on current pickface batches.") },
    { label: "FEFO Pick", icon: ListOrdered, run: () => send("Build a FEFO picking plan for the next outbound — show batches in expiry order with location and qty.") },
    { label: "Expiry Risk", icon: AlertTriangle, run: refreshExpiryRisk },
    { label: "Markdowns", icon: TrendingDown, run: runMarkdownRecos },
    { label: "QC Triage", icon: ShieldAlert, run: runTriageFlow },
    { label: "SLA Check", icon: Clock, run: runSLACheck },
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
        <div className="fixed bottom-24 right-6 z-50 w-[480px] max-w-[calc(100vw-2rem)] h-[660px] rounded-2xl border bg-card shadow-2xl flex flex-col overflow-hidden animate-fade-in">
          <div className="px-4 py-3 border-b flex items-center gap-3" style={{ background: "var(--gradient-primary)" }}>
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center"><Sparkles className="h-4 w-4 text-primary-foreground" /></div>
            <div className="text-primary-foreground flex-1 min-w-0">
              <div className="text-sm font-semibold">CORTA AI Assistant</div>
              <div className="text-[10px] opacity-90">Live inventory · FEFO · markdowns · QC</div>
            </div>
            <button onClick={refreshExpiryRisk} title="Refresh expiry risk rankings" className="h-7 w-7 rounded-md bg-white/15 hover:bg-white/25 flex items-center justify-center text-primary-foreground">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={openAuditPanel} title="View audit log" className="h-7 w-7 rounded-md bg-white/15 hover:bg-white/25 flex items-center justify-center text-primary-foreground">
              <History className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="px-3 py-2 border-b bg-muted/40 flex flex-wrap gap-1.5">
            {QUICK_ACTIONS.map((a) => (
              <button key={a.label} onClick={a.run} disabled={loading}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-full border bg-card hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50">
                <a.icon className="h-3 w-3 text-primary" />{a.label}
              </button>
            ))}
          </div>

          {undo && (
            <div className="px-3 py-2 border-b bg-amber-500/10 text-amber-700 flex items-center justify-between text-[11px]">
              <span className="inline-flex items-center gap-1.5"><Undo2 className="h-3 w-3" /> Last decision can be undone</span>
              <div className="flex gap-2">
                <button onClick={performUndo} className="px-2 py-0.5 rounded bg-amber-600 text-white hover:bg-amber-700">Undo</button>
                <button onClick={() => setUndo(null)} className="px-2 py-0.5 rounded border border-amber-500/30 hover:bg-amber-500/20">Dismiss</button>
              </div>
            </div>
          )}

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-background">
            {messages.map((m, i) => {
              const att = m.attachment;
              const mdSelected = att?.kind === "markdowns" ? att.proposals.filter((x) => x.selected && !x.status).length : 0;
              const mdSelectable = att?.kind === "markdowns" ? att.proposals.filter((x) => !x.status).length : 0;
              return (
                <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "assistant" && (
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5"><Bot className="h-3 w-3 text-primary" /></div>
                  )}
                  <div className={`max-w-[92%] ${m.role === "user" ? "" : "w-full"}`}>
                    <div className={`px-3 py-2 rounded-xl text-xs leading-relaxed ${m.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>
                      {m.role === "assistant" ? (
                        <div className="prose prose-xs max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ul]:pl-4 [&_li]:my-0.5 [&_strong]:font-semibold">
                          <ReactMarkdown components={{
                            a: ({ href, children }) => {
                              const isInternal = href?.startsWith("/");
                              const isBatch = href?.startsWith("/batch/");
                              return (
                                <a href={href} onClick={(e) => {
                                  if (isBatch && href) { e.preventDefault(); openBatch(href.replace("/batch/", "")); return; }
                                  if (isInternal && href) { e.preventDefault(); setOpen(false); navigate(href); }
                                }} className="text-primary underline underline-offset-2 hover:opacity-80">{children}</a>
                              );
                            },
                          }}>{m.content}</ReactMarkdown>
                        </div>
                      ) : m.content}
                    </div>

                    {/* Markdown attachment */}
                    {att?.kind === "markdowns" && (
                      <div className="mt-2 space-y-2">
                        {mdSelectable > 0 && (
                          <div className="flex items-center justify-between gap-2 px-1">
                            <label className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <Checkbox
                                checked={mdSelected > 0 && mdSelected === mdSelectable}
                                onCheckedChange={(v) => toggleSelectAllMarkdowns(i, !!v)}
                              />
                              Select all ({mdSelected}/{mdSelectable})
                            </label>
                            <div className="flex gap-1.5">
                              <button disabled={mdSelected === 0}
                                onClick={() => { setCommentDlg({ msgIdx: i, decision: "rejected", mode: "bulk" }); setCommentText(""); }}
                                className="text-[10px] px-2 py-1 rounded border bg-red-500/10 text-red-700 border-red-500/30 hover:bg-red-500/20 inline-flex items-center gap-1 disabled:opacity-40">
                                <XCircle className="h-3 w-3" /> Bulk reject
                              </button>
                              <button disabled={mdSelected === 0}
                                onClick={() => { setCommentDlg({ msgIdx: i, decision: "approved", mode: "bulk" }); setCommentText(""); }}
                                className="text-[10px] px-2 py-1 rounded bg-primary text-primary-foreground hover:opacity-90 inline-flex items-center gap-1 disabled:opacity-40">
                                <CheckCircle2 className="h-3 w-3" /> Bulk approve
                              </button>
                            </div>
                          </div>
                        )}
                        {att.proposals.map((p) => (
                          <div key={p.batchNumber} className="rounded-lg border bg-card p-2.5 text-xs">
                            <div className="flex items-start gap-2">
                              {!p.status && (
                                <Checkbox className="mt-0.5" checked={!!p.selected} onCheckedChange={(v) => toggleSelectMarkdown(i, p.batchNumber, !!v)} />
                              )}
                              <div className="flex-1 min-w-0">
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
                                      <button onClick={() => { setCommentDlg({ msgIdx: i, batchNumber: p.batchNumber, decision: "rejected", mode: "single" }); setCommentText(""); }}
                                        className="text-[10px] px-2 py-1 rounded border bg-red-500/10 text-red-700 border-red-500/30 hover:bg-red-500/20 inline-flex items-center gap-1">
                                        <XCircle className="h-3 w-3" /> Reject
                                      </button>
                                      <button onClick={() => { setCommentDlg({ msgIdx: i, batchNumber: p.batchNumber, decision: "approved", mode: "single" }); setCommentText(""); }}
                                        className="text-[10px] px-2 py-1 rounded bg-primary text-primary-foreground hover:opacity-90 inline-flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" /> Approve
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Triage attachment */}
                    {att?.kind === "triage" && (
                      <div className="mt-2 space-y-2">
                        {att.items.map((it, j) => (
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

                    {/* SLA attachment */}
                    {att?.kind === "sla" && (
                      <div className="mt-2 space-y-2">
                        {att.reminders.map((r) => (
                          <div key={r.kind + r.id} className="rounded-lg border bg-card p-2.5 text-xs flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded border ${r.hoursOpen > 72 ? sevTone.CRITICAL : r.hoursOpen > 36 ? sevTone.HIGH : sevTone.MEDIUM}`}>
                                  {r.kind === "MARKDOWN_PENDING" ? "Markdown" : "QC Hold"}
                                </span>
                                <span className="font-medium truncate">{r.label}</span>
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">{r.detail}</div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {r.batchId && (
                                <button onClick={() => openBatch(r.batchId!)} className="text-[10px] px-2 py-0.5 rounded border hover:bg-muted inline-flex items-center gap-1">
                                  Batch <ArrowUpRight className="h-3 w-3" />
                                </button>
                              )}
                              {r.link && (
                                <button onClick={() => { setOpen(false); navigate(r.link!); }} className="text-[10px] px-2 py-0.5 rounded bg-primary text-primary-foreground hover:opacity-90">
                                  Review
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {m.role === "user" && (
                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5"><User className="h-3 w-3 text-muted-foreground" /></div>
                  )}
                </div>
              );
            })}
            {loading && (
              <div className="flex gap-2">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><Bot className="h-3 w-3 text-primary" /></div>
                <div className="bg-muted rounded-xl px-4 py-2"><Loader2 className="h-4 w-4 text-primary animate-spin" /></div>
              </div>
            )}
            {messages.length <= 1 && !loading && (
              <div className="pt-2 space-y-1.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1">Try asking</div>
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="block w-full text-left text-xs px-3 py-2 rounded-lg border bg-card hover:bg-muted transition-colors">{s}</button>
                ))}
              </div>
            )}
          </div>

          <div className="px-3 py-3 border-t bg-card">
            <div className="flex items-center gap-2">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Ask about inventory, expiries, markdowns, QC…"
                className="flex-1 bg-muted border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
              <button onClick={() => send()} disabled={!input.trim() || loading}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-primary-foreground disabled:opacity-40"
                style={{ background: "var(--gradient-primary)" }}><Send className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        </div>
      )}

      {/* Comment dialog (single + bulk) */}
      <Dialog open={!!commentDlg} onOpenChange={(o) => { if (!o) { setCommentDlg(null); setCommentText(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {commentDlg?.mode === "bulk" ? `Bulk ${commentDlg?.decision}` : (commentDlg?.decision === "approved" ? "Approve markdown" : "Reject markdown")}
            </DialogTitle>
            <DialogDescription>
              {commentDlg?.mode === "bulk"
                ? "One comment is saved against every selected proposal and one consolidated audit-log entry is written per batch."
                : "Add an optional comment. This is saved to the markdown approvals queue and the AI audit log."}
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

      {/* Audit log */}
      <Sheet open={auditOpen} onOpenChange={setAuditOpen}>
        <SheetContent side="right" className="w-[440px] sm:w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><History className="h-4 w-4" /> My AI decisions</SheetTitle>
            <SheetDescription>Outcomes you recorded from chat — timestamp, batch, AI recommendation and your decision.</SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <div className="flex justify-end mb-2 gap-2">
              <Button size="sm" variant="outline" onClick={exportAuditCSV} disabled={auditLoading || !auditRows.length}>
                <Download className="h-3 w-3 mr-1" /> Export CSV
              </Button>
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
        <SheetContent side="right" className="w-[480px] sm:w-[540px] overflow-y-auto">
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

            // FEFO position over time: today's rank among siblings
            const rank = (batchData.siblings ?? []).findIndex((s: any) => s.id === b.id) + 1;
            const totalRank = (batchData.siblings ?? []).length;

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

                {/* Mini timeline */}
                {b.received_at && (
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Days-left trend</div>
                      <div className="text-[10px] text-muted-foreground">FEFO rank today: <span className="font-semibold text-foreground">{rank || "—"}/{totalRank || "—"}</span></div>
                    </div>
                    <DaysLeftSparkline receivedAt={b.received_at} expiryDate={b.expiry_date} />
                  </div>
                )}

                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">FEFO order — same SKU @ {b.stores?.store_code}</div>
                  <div className="rounded-lg border overflow-hidden">
                    {(batchData.siblings ?? []).map((s: any, idx: number) => {
                      const sDays = Math.ceil((new Date(s.expiry_date).getTime() - today.getTime()) / 86400000);
                      const sZ = zoneFor(sDays);
                      const isCurrent = s.id === b.id;
                      return (
                        <button key={s.id} onClick={() => !isCurrent && openBatch(s.id)} disabled={isCurrent}
                          className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-left border-b last:border-b-0 ${isCurrent ? "bg-primary/5" : "hover:bg-muted"}`}>
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