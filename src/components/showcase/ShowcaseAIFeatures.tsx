import { Brain, ScanText, Boxes, TrendingUp, ShieldAlert, MessageSquare, Tag, Bell, Webhook } from "lucide-react";

const aiFeatures = [
  { icon: ScanText, title: "Smart Receiving (OCR + NLP)", desc: "wms-receiving-parse extracts batch number, expiry date, quantity and location from pasted delivery notes or OCR text and pre-fills the receiving form." },
  { icon: Boxes, title: "AI FEFO Putaway", desc: "wms-putaway-recommend analyses live stock to suggest the optimal pickface vs. reserve location with a 'why this location' explanation and pickface swap suggestions." },
  { icon: Bell, title: "Expiry Alert Job", desc: "expiry-alert-job + check-expiry score every batch into Black/Red/Orange/Yellow/Green zones on a schedule, and on-demand from the Dashboard's 'Run AI Alert Job' button." },
  { icon: TrendingUp, title: "Demand & Waste Forecast", desc: "wms-forecast predicts 7 / 14 / 30-day sell-through and write-off risk per SKU/store from stock depth and expiry pressure, with confidence scores and per-row markdown / write-off task actions." },
  { icon: Tag, title: "AI Markdown Proposals", desc: "ai-pricing-proposal generates discount % proposals from forecast risk; one-click approval in Markdown Approvals pushes the new price live and logs the decision." },
  { icon: ShieldAlert, title: "AI Quarantine Triage", desc: "wms-quarantine-triage scores single batches and bulk selections — RELEASE / WRITE-OFF / RETURN-TO-SUPPLIER with severity, reasoning and confidence; bulk-execute in one step." },
  { icon: MessageSquare, title: "AI Expiry Assistant (Chat)", desc: "wms-assistant runs natural-language Q&A over live inventory, alerts and quarantine. Answers cite batch UUIDs and deep-link straight to /batch/:id." },
  { icon: Webhook, title: "CoreERP Integration", desc: "coreerp-po-webhook ingests purchase-order events from CoreERP into Inbound Orders with retry logic and a full Webhook Log audit trail." },
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
          Eight purpose-built AI &amp; automation services embedded across the WMS — every
          recommendation captured with prompts, inputs, confidence and the final user decision.
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
