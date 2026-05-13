import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };

const ShowcaseAIChat = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi! I'm the CortaneX AI assistant. Ask me anything about CORTA WMS — batch-level inventory, FEFO execution, expiry alerts, smart receiving, AI forecasting, quarantine triage, or markdown pricing." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const userMsg: Msg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("showcase-chat", {
        body: { messages: [...messages, userMsg].slice(-10) },
      });

      if (error) throw error;
      setMessages((prev) => [...prev, { role: "assistant", content: data?.reply || "Sorry, I couldn't generate a response." }]);
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110"
        style={{ background: "linear-gradient(135deg, hsl(210 100% 56%), hsl(142 71% 45%))" }}
        aria-label="Open AI Chat"
      >
        {open ? <X className="w-6 h-6 text-white" /> : <MessageSquare className="w-6 h-6 text-white" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[500px] rounded-2xl border border-[hsl(220,14%,18%)] bg-[hsl(220,20%,7%)] shadow-2xl flex flex-col overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[hsl(220,14%,18%)] flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(210 100% 56%), hsl(142 71% 45%))" }}>
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold">CortaneX AI Assistant</div>
              <div className="text-[10px] text-[hsl(215,12%,50%)]">Ask about CORTA WMS</div>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-[hsl(210,100%,56%)]/10">
                    <Bot className="w-3 h-3 text-[hsl(210,100%,56%)]" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                    m.role === "user"
                      ? "bg-[hsl(210,100%,56%)] text-white rounded-br-sm"
                      : "bg-[hsl(220,16%,16%)] text-[hsl(210,20%,90%)] rounded-bl-sm"
                  }`}
                >
                  {m.content}
                </div>
                {m.role === "user" && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-[hsl(220,16%,16%)]">
                    <User className="w-3 h-3 text-[hsl(215,12%,50%)]" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-[hsl(210,100%,56%)]/10">
                  <Bot className="w-3 h-3 text-[hsl(210,100%,56%)]" />
                </div>
                <div className="bg-[hsl(220,16%,16%)] rounded-xl px-4 py-2">
                  <Loader2 className="w-4 h-4 text-[hsl(210,100%,56%)] animate-spin" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-[hsl(220,14%,18%)]">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Ask about MES, QMS, CMS, AI..."
                className="flex-1 bg-[hsl(220,16%,16%)] border border-[hsl(220,14%,18%)] rounded-lg px-3 py-2 text-xs text-[hsl(210,20%,90%)] placeholder:text-[hsl(215,12%,50%)] focus:outline-none focus:ring-1 focus:ring-[hsl(210,100%,56%)]"
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white disabled:opacity-40 transition-opacity"
                style={{ background: "linear-gradient(135deg, hsl(210 100% 56%), hsl(142 71% 45%))" }}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ShowcaseAIChat;