import { Brain, ScanText, Boxes, TrendingUp, ShieldAlert, MessageSquare, Tag } from "lucide-react";

const aiFeatures = [
  { icon: ScanText, title: "Smart Receiving (OCR + NLP)", desc: "Paste a supplier delivery note or OCR text — AI extracts batch number, expiry date, qty and location and pre-fills the receiving form in seconds." },
  { icon: Boxes, title: "AI FEFO Putaway", desc: "Recommends optimal pickface vs. reserve location based on live stock and expiry windows, with a 'why this location' explanation and pickface swap suggestions." },
  { icon: TrendingUp, title: "Demand & Waste Forecast", desc: "Predicts 7/14/30-day sell-through and write-off risk per SKU/store using stock depth, expiry pressure and historical movement — with confidence scores." },
  { icon: Tag, title: "AI Markdown Proposals", desc: "Generates discount % proposals from forecast risk; one-click approval pushes the new price live and logs the decision." },
  { icon: ShieldAlert, title: "AI Quarantine Triage", desc: "Single-batch and bulk triage. Suggests RELEASE / WRITE-OFF / RETURN-TO-SUPPLIER with severity, reasoning and confidence — bulk-execute in one step." },
  { icon: MessageSquare, title: "AI Expiry Assistant (Chat)", desc: "Natural-language Q&A over your live near-expiry inventory. Answers reference batch UUIDs and link directly to batch detail pages." },
];

const ShowcaseAIFeatures = () => (
  <section id="ai" className="py-16 sm:py-24 px-4 sm:px-6 relative scroll-mt-20">
    <div className="absolute inset-0 pp-hero-gradient opacity-60" />
    <div className="relative max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
          style={{
            background: "hsl(var(--ai-color) / 0.08)",
            border: "1px solid hsl(var(--ai-color) / 0.25)",
            color: "hsl(var(--ai-color))",
          }}
        >
          <Brain className="w-4 h-4" />
          <span className="text-sm font-medium">CortaneX AI Engine</span>
        </div>
        <h2 className="section-title mb-4">
          AI That <span className="pp-gradient-text">Understands Inventory</span>
        </h2>
        <p className="section-subtitle mx-auto">
          Six purpose-built AI capabilities embedded across the WMS — every recommendation
          captured with prompts, inputs, confidence and the final user decision.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {aiFeatures.map((f) => (
          <div key={f.title} className="benefit-card group">
            <div
              className="p-2.5 rounded-lg w-fit mb-4"
              style={{
                background: "hsl(var(--ai-color) / 0.1)",
                border: "1px solid hsl(var(--ai-color) / 0.25)",
              }}
            >
              <f.icon className="w-5 h-5" style={{ color: "hsl(var(--ai-color))" }} />
            </div>
            <h3 className="font-semibold mb-2 text-sm">{f.title}</h3>
            <p className="text-xs pp-muted-text leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default ShowcaseAIFeatures;
