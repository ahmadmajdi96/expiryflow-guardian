import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Which batches expire in the next 7 days?",
  "What's quarantined right now and why?",
  "Top SKUs at risk of write-off",
  "Summarize today's open alerts",
];

const WMSAssistantChat = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi — I'm **CORTA AI**. Ask me about your live inventory, expiries, FEFO, quarantine, or alerts." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

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
        body: { messages: next.slice(-10) },
      });
      if (error) throw error;
      setMessages((p) => [...p, { role: "assistant", content: data?.reply || "No response." }]);
    } catch (e: any) {
      setMessages((p) => [...p, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

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
        <div className="fixed bottom-24 right-6 z-50 w-[400px] max-w-[calc(100vw-2rem)] h-[560px] rounded-2xl border bg-card shadow-2xl flex flex-col overflow-hidden animate-fade-in">
          <div className="px-4 py-3 border-b flex items-center gap-3" style={{ background: "var(--gradient-primary)" }}>
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="text-primary-foreground">
              <div className="text-sm font-semibold">CORTA AI Assistant</div>
              <div className="text-[10px] opacity-90">Live inventory · expiries · FEFO</div>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-background">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-3 w-3 text-primary" />
                  </div>
                )}
                <div className={`max-w-[82%] px-3 py-2 rounded-xl text-xs leading-relaxed ${m.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>
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
                                  if (isInternal && href) {
                                    e.preventDefault();
                                    setOpen(false);
                                    navigate(href);
                                  }
                                }}
                                className="text-primary underline underline-offset-2 hover:opacity-80"
                              >
                                {children}
                              </a>
                            );
                          },
                        }}
                      >{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    m.content
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
                placeholder="Ask about inventory, expiries…"
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