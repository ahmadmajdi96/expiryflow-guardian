import { useState, useRef, useEffect } from "react";
import {
  MessageSquare, X, Send, Bot, User, Loader2, Sparkles,
  Truck, MapPin, ListOrdered, TrendingDown, ShieldAlert, AlertTriangle,
  CheckCircle2, XCircle, PauseCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type MarkdownProposal = {
  sku: string; batchNumber: string; currentPrice: number; proposedPrice: number;
  discountPercent: number; reasoning: string; urgency: "LOW"|"MEDIUM"|"HIGH"|"CRITICAL";
  batchId?: string;
};

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
    recommendedAction: "RELEASE"|"EXTEND_HOLD"|"WRITE_OFF"|"RETURN_TO_SUPPLIER"|"ESCALATE_TO_QA";
    rationale: string;
    followUpChecks: string[];
  };
  auditId: string | null;
  decided?: string;
};

type Attachment =
  | { kind: "markdowns"; proposals: MarkdownProposal[]; approvedIds: string[] }
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
        sku: b.products?.sku,
        productName: b.products?.name,
        batchNumber: b.batch_number,
        currentPrice: Number(b.products?.current_price ?? 0),
        quantity: b.quantity,
        expiryDate: b.expiry_date,
        daysUntilExpiry: Math.ceil((new Date(b.expiry_date).getTime() - today.getTime()) / 86400000),
        store: b.stores?.store_code,
        category: b.products?.category,
      }));

      const { data, error: e2 } = await supabase.functions.invoke("ai-pricing-proposal", { body: { items } });
      if (e2) throw e2;
      const proposals: MarkdownProposal[] = (data?.proposals ?? []).map((p: any) => {
        const match = batches.find((b: any) => b.batch_number === p.batchNumber);
        return { ...p, batchId: match?.id };
      });
      if (!proposals.length) { pushAssistant("AI returned no proposals — try again in a moment."); return; }

      pushAssistant(
        `Here are **${proposals.length} markdown recommendations** based on live near-expiry stock. Each has an explainable rationale; approve to add it to the [Markdown Approvals](/markdown-approvals) queue.`,
        { kind: "markdowns", proposals, approvedIds: [] },
      );
    } catch (e: any) {
      pushAssistant(`Couldn't generate markdown recommendations: ${e.message || "unknown error"}.`);
    } finally { setLoading(false); }
  };

  const approveMarkdown = async (msgIdx: number, p: MarkdownProposal) => {
    if (!p.batchId) { toast.error("Missing batch reference"); return; }
    try {
      const { error } = await supabase.from("markdown_proposals").insert({
        batch_id: p.batchId, sku: p.sku, batch_number: p.batchNumber,
        current_price: p.currentPrice, proposed_price: p.proposedPrice,
        discount_percent: p.discountPercent, reasoning: p.reasoning,
        urgency: p.urgency, status: "pending",
      });
      if (error) throw error;
      setMessages((prev) => prev.map((m, i) => {
        if (i !== msgIdx || m.attachment?.kind !== "markdowns") return m;
        return { ...m, attachment: { ...m.attachment, approvedIds: [...m.attachment.approvedIds, p.batchNumber] } };
      }));
      toast.success(`Markdown queued for ${p.sku} · ${p.batchNumber}`);
    } catch (e: any) {
      toast.error(e.message || "Approval failed");
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
        `Triaged **${items.length} quarantined batch${items.length === 1 ? "" : "es"}**. Review the AI recommendation and apply a decision — outcomes are logged to the audit trail.`,
        { kind: "triage", items },
      );
    } catch (e: any) {
      pushAssistant(`Triage failed: ${e.message || "unknown error"}.`);
    } finally { setLoading(false); }
  };

  const applyTriageDecision = async (msgIdx: number, idx: number, decision: "RELEASE" | "EXTEND_HOLD" | "WRITE_OFF") => {
    const msg = messages[msgIdx];
    if (msg?.attachment?.kind !== "triage") return;
    const item = msg.attachment.items[idx];
    try {
      if (decision === "RELEASE") {
        await supabase.from("inventory_batches").update({ status: "AVAILABLE", qc_status: "PASSED" }).eq("id", item.batchId);
      } else if (decision === "WRITE_OFF") {
        await supabase.from("inventory_batches").update({ status: "WRITTEN_OFF", quantity: 0 }).eq("id", item.batchId);
      }
      // EXTEND_HOLD leaves status as-is.
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
      toast.success(`${decision.replace("_", " ").toLowerCase()} · ${item.batchNumber}`);
    } catch (e: any) {
      toast.error(e.message || "Decision failed");
    }
  };

  // ---- Quick action chips ----
  const QUICK_ACTIONS: Array<{ label: string; icon: any; run: () => void; tone?: string }> = [
    { label: "Receiving", icon: Truck, run: () => { setOpen(false); navigate("/receiving"); } },
    { label: "Putaway", icon: MapPin, run: () => send("Suggest FEFO putaway locations for the most recent receipts based on current pickface batches.") },
    { label: "FEFO Pick", icon: ListOrdered, run: () => send("Build a FEFO picking plan for the next outbound — show batches in expiry order with location and qty.") },
    { label: "Expiry Risk", icon: AlertTriangle, run: () => send("Rank stores and batches by expiry risk right now (top 10).") },
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
        <div className="fixed bottom-24 right-6 z-50 w-[440px] max-w-[calc(100vw-2rem)] h-[620px] rounded-2xl border bg-card shadow-2xl flex flex-col overflow-hidden animate-fade-in">
          <div className="px-4 py-3 border-b flex items-center gap-3" style={{ background: "var(--gradient-primary)" }}>
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="text-primary-foreground">
              <div className="text-sm font-semibold">CORTA AI Assistant</div>
              <div className="text-[10px] opacity-90">Live inventory · FEFO · markdowns · QC</div>
            </div>
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
                <div className={`max-w-[88%] ${m.role === "user" ? "" : "w-full"}`}>
                  <div className={`px-3 py-2 rounded-xl text-xs leading-relaxed ${m.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>
                    {m.role === "assistant" ? (
                      <div className="prose prose-xs max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ul]:pl-4 [&_li]:my-0.5 [&_strong]:font-semibold">
                        <ReactMarkdown
                          components={{
                            a: ({ href, children }) => {
                              const isInternal = href?.startsWith("/");
                              return (
                                <a
                                  href={href}
                                  onClick={(e) => {
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
                      {m.attachment.proposals.map((p) => {
                        const approved = m.attachment!.kind === "markdowns" && m.attachment!.approvedIds.includes(p.batchNumber);
                        return (
                          <div key={p.batchNumber} className="rounded-lg border bg-card p-2.5 text-xs">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="font-medium truncate">{p.sku} · <span className="font-mono">{p.batchNumber}</span></div>
                                <div className="text-[10px] text-muted-foreground">
                                  {p.currentPrice.toFixed(2)} → <span className="text-foreground font-semibold">{p.proposedPrice.toFixed(2)}</span>
                                  <span className="ml-1 text-destructive">−{p.discountPercent}%</span>
                                </div>
                              </div>
                              <span className={`text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded border ${sevTone[p.urgency]}`}>{p.urgency}</span>
                            </div>
                            <div className="mt-1.5 text-[11px] text-muted-foreground italic">"{p.reasoning}"</div>
                            <div className="mt-2 flex justify-end">
                              {approved ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600"><CheckCircle2 className="h-3 w-3" /> Queued for approval</span>
                              ) : (
                                <button
                                  onClick={() => approveMarkdown(i, p)}
                                  className="text-[10px] px-2 py-1 rounded bg-primary text-primary-foreground hover:opacity-90"
                                >Approve markdown</button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Triage attachment */}
                  {m.attachment?.kind === "triage" && (
                    <div className="mt-2 space-y-2">
                      {m.attachment.items.map((it, j) => (
                        <div key={it.batchId} className="rounded-lg border bg-card p-2.5 text-xs">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <button onClick={() => { setOpen(false); navigate(`/batch/${it.batchId}`); }} className="font-mono text-[11px] text-primary hover:underline">{it.batchNumber}</button>
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
                              <button onClick={() => applyTriageDecision(i, j, "RELEASE")} className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded border bg-emerald-500/10 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/20">
                                <CheckCircle2 className="h-3 w-3" /> Release
                              </button>
                              <button onClick={() => applyTriageDecision(i, j, "EXTEND_HOLD")} className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded border bg-amber-500/10 text-amber-700 border-amber-500/30 hover:bg-amber-500/20">
                                <PauseCircle className="h-3 w-3" /> Hold
                              </button>
                              <button onClick={() => applyTriageDecision(i, j, "WRITE_OFF")} className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded border bg-red-500/10 text-red-700 border-red-500/30 hover:bg-red-500/20">
                                <XCircle className="h-3 w-3" /> Write-off
                              </button>
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
    </>
  );
};

export default WMSAssistantChat;