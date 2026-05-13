import {
  PackageCheck, Truck, ArrowLeftRight, Boxes,
  AlertTriangle, TrendingUp, Tag, Sparkles,
  ShieldAlert, ClipboardCheck, ShieldCheck,
  TrendingDown, DollarSign, Clock, Target,
} from "lucide-react";
import screenReceiving from "@/assets/screen-receiving.png";
import screenExpiry from "@/assets/screen-expiry-alerts.png";
import screenQuarantine from "@/assets/screen-quarantine.png";

interface Module {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  aiDescription: string;
  image: string;
  colorVar: string;
  features: { icon: any; title: string; desc: string }[];
  impact: { icon: any; metric: string; label: string; description: string }[];
  screens: string[];
}

const modules: Module[] = [
  {
    id: "fefo",
    title: "FEFO Operations",
    subtitle: "Receiving · Putaway · Picking · Transfers",
    description:
      "End-to-end batch-level execution. Capture batch numbers and expiry dates at receiving, assign FEFO-aware locations, and pick the oldest stock first across every store and DC.",
    aiDescription:
      "Smart Receiving uses Gemini-powered OCR & NLP to parse delivery notes into structured batch + expiry + quantity data in seconds. AI Putaway analyses live stock to recommend the optimal pickface vs. reserve location and explains *why* — including swap suggestions when an outdated batch is blocking the pickface.",
    image: screenReceiving,
    colorVar: "--mes-color",
    impact: [
      { icon: Clock, metric: "↓ 70%", label: "Receiving Time", description: "AI parses supplier delivery notes — no manual batch keying." },
      { icon: Target, metric: "100%", label: "FEFO Compliance", description: "AI putaway places nearest-expiry stock in the pickface automatically." },
      { icon: TrendingDown, metric: "↓ 40%", label: "Pick Errors", description: "Batch-level pick slips with location guidance and oldest-first logic." },
      { icon: DollarSign, metric: "↓ 25%", label: "Stock-out Risk", description: "Real-time visibility across all stores and the central DC." },
    ],
    features: [
      { icon: PackageCheck, title: "Smart Receiving (AI Parse)", desc: "Paste a supplier delivery note or OCR scan — AI extracts batch, expiry, qty and location in one click." },
      { icon: Boxes, title: "AI FEFO Putaway", desc: "AI recommends the best location with a 'why this location' explanation and pickface swap suggestions." },
      { icon: Truck, title: "Pick Requests", desc: "FEFO-ordered pick slips with PDF export, batch numbers, and zone-coded urgency." },
      { icon: ArrowLeftRight, title: "Stock Transfers", desc: "Inter-store transfers with full batch genealogy and expiry-aware routing." },
      { icon: Sparkles, title: "Inbound & Outbound Orders", desc: "CoreERP-integrated PO and SO workflows with webhook event logs." },
      { icon: ShieldCheck, title: "Audit Trail", desc: "Every AI suggestion, prompt, confidence score and final user decision is logged for traceability." },
    ],
    screens: [
      "Receiving & Putaway","Smart Parse","Inbound Orders","Outbound Orders",
      "Pick Requests","Pick Slip PDF","Stock Transfers","Batch Details","Webhook Log","Stores","Products",
    ],
  },
  {
    id: "expiry",
    title: "Expiry Intelligence",
    subtitle: "Alerts · Forecasting · Markdowns",
    description:
      "Live near-expiry monitoring across every store, AI-driven demand & waste forecasting, and one-click markdown proposals — turning expiry pressure into recovered margin.",
    aiDescription:
      "The Demand & Waste Forecast model analyses stock depth, sell-through and expiry pressure to predict 7/14/30-day write-off risk per SKU/store. Critical-risk rows generate AI markdown proposals (with calculated discount %) and write-off tasks directly from the forecast row.",
    image: screenExpiry,
    colorVar: "--qms-color",
    impact: [
      { icon: TrendingDown, metric: "↓ 45%", label: "Food Waste", description: "Predictive risk-scoring triggers markdowns before expiry hits." },
      { icon: DollarSign, metric: "↑ 18%", label: "Margin Recovery", description: "AI-calculated discount % maximises sell-through without over-discounting." },
      { icon: Target, metric: "5-min", label: "Alert Latency", description: "Auto-refreshing zone view across all stores." },
      { icon: Clock, metric: "1-click", label: "Markdown Approval", description: "From forecast row to live in-store price in seconds." },
    ],
    features: [
      { icon: AlertTriangle, title: "Near-Expiry Alerts", desc: "Black/Red/Orange/Yellow/Green expiry zones with auto-refresh and per-store filtering." },
      { icon: TrendingUp, title: "AI Demand & Waste Forecast", desc: "7/14/30-day sell-through and write-off prediction per SKU/store with confidence scores." },
      { icon: Tag, title: "AI Markdown Proposals", desc: "Generate price-reduction proposals directly from forecast rows; AI sets the discount %." },
      { icon: Sparkles, title: "AI Expiry Assistant (Chat)", desc: "Ask natural-language questions about near-expiry stock; get batch-level answers with deep-links." },
      { icon: AlertTriangle, title: "Write-off Tasks", desc: "Critical-risk batches auto-generate write-off tasks for store managers to action." },
      { icon: ShieldCheck, title: "Markdown Approvals", desc: "Role-based approval workflow for store managers and admins." },
    ],
    screens: [
      "Dashboard","Expiry Alerts (Zones)","AI Forecast","Markdown Approvals","Write-Off Tasks",
      "AI Expiry Assistant Chat","Alert Settings","Run AI Alert Job","Batch Details","Forecast Audit Log",
    ],
  },
  {
    id: "quality",
    title: "Quality & Compliance",
    subtitle: "QC Inspection · Quarantine · Triage",
    description:
      "Inspect at receiving, isolate suspect stock in quarantine, and let AI accelerate the release/write-off decision — with a complete audit trail for every action.",
    aiDescription:
      "AI Quarantine Triage processes inspector notes and batch history to suggest severity, root cause and recommended action — RELEASE, WRITE-OFF, or RETURN-TO-SUPPLIER — with confidence scores. Bulk triage can score dozens of quarantined batches in parallel and execute the chosen action in one step.",
    image: screenQuarantine,
    colorVar: "--cms-color",
    impact: [
      { icon: Clock, metric: "↓ 80%", label: "Triage Time", description: "AI scores severity and recommends an action in seconds, not days." },
      { icon: Target, metric: "↑ 60%", label: "Right-First-Time Releases", description: "AI surfaces historical context and similar past decisions." },
      { icon: TrendingDown, metric: "↓ 35%", label: "Stock Locked-Up", description: "Bulk triage clears the quarantine queue faster." },
      { icon: ShieldCheck, metric: "100%", label: "Audit Coverage", description: "Every prompt, score and decision logged in the AI audit trail." },
    ],
    features: [
      { icon: ClipboardCheck, title: "QC Inspection", desc: "Capture receiving inspections with pass/fail + notes, attached to the batch." },
      { icon: ShieldAlert, title: "Quarantine Management", desc: "Isolate suspect batches from sale, markdown and picking until released." },
      { icon: Sparkles, title: "AI Triage (Single & Bulk)", desc: "Recommend RELEASE / WRITE-OFF / RETURN-TO-SUPPLIER with reasoning and confidence." },
      { icon: ShieldCheck, title: "Decision Audit Log", desc: "Every AI suggestion + final human decision recorded for QA and regulator review." },
      { icon: ShieldCheck, title: "Role-Based Access Control", desc: "Admin, Warehouse Clerk, QC Inspector and Store Manager roles enforced via RLS on every table." },
      { icon: ClipboardCheck, title: "User Management", desc: "Admin-controlled user provisioning with per-role page and action permissions." },
    ],
    screens: ["QC Inspection","Quarantine List","AI Triage Dialog","Bulk Triage","Decision Audit Log","User Management"],
  },
];

const ShowcaseModules = () => (
  <section className="py-16 sm:py-24 px-4 sm:px-6">
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-20">
        <h2 className="section-title mb-4">Platform Modules</h2>
        <p className="section-subtitle mx-auto">
          Three integrated modules covering the full warehouse-to-shelf lifecycle —
          every screen powered by CortaneX AI.
        </p>
      </div>

      <div className="space-y-32">
        {modules.map((mod, idx) => (
          <div key={mod.id} id={mod.id} className="scroll-mt-20">
            <div className={`flex flex-col ${idx % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"} gap-10 items-center mb-12`}>
              <div className="lg:w-3/5">
                <div className="module-card overflow-hidden">
                  <div className="p-1">
                    <img src={mod.image} alt={`${mod.title} screen`} className="w-full rounded-lg" loading="lazy" />
                  </div>
                </div>
              </div>
              <div className="lg:w-2/5">
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-4"
                  style={{
                    background: `hsl(var(${mod.colorVar}) / 0.1)`,
                    color: `hsl(var(${mod.colorVar}))`,
                    border: `1px solid hsl(var(${mod.colorVar}) / 0.25)`,
                  }}
                >
                  {mod.subtitle}
                </div>
                <h3 className="text-3xl font-bold mb-4">{mod.title}</h3>
                <p className="pp-muted-text leading-relaxed mb-4">{mod.description}</p>
                <div
                  className="p-4 rounded-lg"
                  style={{
                    background: "hsl(var(--ai-color) / 0.08)",
                    border: "1px solid hsl(var(--ai-color) / 0.25)",
                  }}
                >
                  <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "hsl(var(--ai-color))" }}>
                    🤖 AI-Powered
                  </div>
                  <p className="text-sm pp-muted-text leading-relaxed">{mod.aiDescription}</p>
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm pp-muted-text">
                  <span className="font-mono font-semibold text-foreground">{mod.screens.length}+</span> screens ·
                  <span className="font-mono font-semibold text-foreground">{mod.features.length}</span> feature areas
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {mod.impact.map((m) => (
                <div key={m.label} className="data-card text-center">
                  <div
                    className="inline-flex p-2 rounded-lg mb-3 mx-auto"
                    style={{ background: `hsl(var(${mod.colorVar}) / 0.12)` }}
                  >
                    <m.icon className="w-5 h-5" style={{ color: `hsl(var(${mod.colorVar}))` }} />
                  </div>
                  <div className="text-2xl font-bold font-mono mb-1" style={{ color: `hsl(var(${mod.colorVar}))` }}>{m.metric}</div>
                  <div className="text-sm font-semibold text-foreground mb-2">{m.label}</div>
                  <p className="text-xs pp-muted-text leading-relaxed">{m.description}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {mod.features.map((feat) => (
                <div key={feat.title} className="benefit-card group">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-md shrink-0" style={{ background: `hsl(var(${mod.colorVar}) / 0.1)` }}>
                      <feat.icon className="w-5 h-5" style={{ color: `hsl(var(${mod.colorVar}))` }} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">{feat.title}</h4>
                      <p className="text-xs pp-muted-text leading-relaxed">{feat.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="data-card">
              <h4 className="text-sm font-semibold uppercase tracking-wider pp-muted-text mb-4">Available Screens</h4>
              <div className="flex flex-wrap gap-2">
                {mod.screens.map((s) => (
                  <span key={s} className="px-3 py-1.5 rounded-md text-xs font-medium border pp-border" style={{ background: "hsl(220 22% 13% / 0.6)" }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default ShowcaseModules;
