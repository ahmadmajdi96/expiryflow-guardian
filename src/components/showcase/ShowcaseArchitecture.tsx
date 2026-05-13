import { Boxes, AlertTriangle, ShieldAlert, ArrowDown, Brain, Sparkles, Layers, ArrowRight, Database, Cloud } from "lucide-react";
import screenDashboard from "@/assets/screen-dashboard.png";

const Pill = ({ label, colorVar = "--pp-border" }: { label: string; colorVar?: string }) => (
  <div
    className="px-4 py-1.5 rounded-full border text-xs sm:text-sm font-semibold uppercase tracking-wider"
    style={{
      background: `hsl(var(${colorVar}) / 0.08)`,
      color: `hsl(var(${colorVar}))`,
      borderColor: `hsl(var(${colorVar}) / 0.3)`,
    }}
  >
    {label}
  </div>
);

const FlowArrow = ({ label }: { label: string }) => (
  <div className="flex justify-center my-4">
    <div className="flex flex-col items-center gap-1 pp-muted-text">
      <ArrowDown className="w-5 h-5 opacity-60" />
      <span className="text-[10px] uppercase tracking-widest opacity-70">{label}</span>
    </div>
  </div>
);

const operations = [
  { name: "FEFO Operations", desc: "Receiving · Putaway · Picking · Transfers", icon: Boxes, colorVar: "--mes-color" },
  { name: "Expiry Intelligence", desc: "Alerts · Forecasting · Markdowns", icon: AlertTriangle, colorVar: "--qms-color" },
  { name: "Quality & Compliance", desc: "QC Inspection · Quarantine · Triage", icon: ShieldAlert, colorVar: "--cms-color" },
];

const data = [
  { name: "CoreERP Integration", desc: "PO/SO webhooks, inbound/outbound order sync, batch genealogy", icon: Database, colorVar: "--mes-color" },
  { name: "Lovable Cloud Backend", desc: "Postgres + RLS, Edge Functions, realtime alerts, full audit log", icon: Cloud, colorVar: "--cms-color" },
];

const ShowcaseArchitecture = () => (
  <section id="architecture" className="py-16 sm:py-24 px-4 sm:px-6 scroll-mt-20">
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-14">
        <h2 className="section-title mb-4">System Architecture</h2>
        <p className="section-subtitle mx-auto">
          A unified WMS for batch-level inventory, FEFO execution and expiry intelligence —
          every operation enriched by CortaneX AI.
        </p>
      </div>

      <div className="module-card overflow-hidden mb-10">
        <div className="p-1">
          <img src={screenDashboard} alt="CORTA WMS live dashboard" className="w-full rounded-lg" loading="lazy" />
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1 bg-border" />
        <Pill label="Operations Layer — Warehouse Execution" colorVar="--mes-color" />
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {operations.map((s) => (
          <div key={s.name} className="data-card flex items-start gap-4">
            <div
              className="p-3 rounded-lg shrink-0"
              style={{
                background: `hsl(var(${s.colorVar}) / 0.1)`,
                border: `1px solid hsl(var(${s.colorVar}) / 0.25)`,
              }}
            >
              <s.icon className="w-6 h-6" style={{ color: `hsl(var(${s.colorVar}))` }} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">{s.name}</h3>
              <p className="text-sm pp-muted-text">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <FlowArrow label="Live event stream" />

      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1 bg-border" />
        <Pill label="CortaneX AI Engine" colorVar="--ai-color" />
        <div className="h-px flex-1 bg-border" />
      </div>
      <div
        className="rounded-2xl border p-5 sm:p-6 flex items-center gap-4"
        style={{
          background: "linear-gradient(135deg, hsl(var(--ai-color) / 0.12), hsl(var(--mes-color) / 0.08))",
          borderColor: "hsl(var(--ai-color) / 0.35)",
          boxShadow: "0 0 32px hsl(var(--ai-color) / 0.10)",
        }}
      >
        <div
          className="p-3 rounded-lg shrink-0"
          style={{
            background: "hsl(var(--ai-color) / 0.18)",
            border: "1px solid hsl(var(--ai-color) / 0.35)",
          }}
        >
          <Brain className="w-6 h-6" style={{ color: "hsl(var(--ai-color))" }} />
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground">CortaneX AI</h3>
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border pp-border pp-muted-text">
              Forecasting · NLP · OCR · Decision Support
            </span>
          </div>
          <p className="text-sm pp-muted-text">
            Smart Receiving · AI FEFO Putaway · Demand &amp; Waste Forecast · AI Quarantine Triage ·
            AI Markdown Proposals · Expiry Assistant Chat — every recommendation captured in the audit log.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1 pp-muted-text">
          <Sparkles className="w-4 h-4" style={{ color: "hsl(var(--ai-color))" }} />
          <span className="text-xs">Always-on copilot</span>
        </div>
      </div>

      <FlowArrow label="Persistence & integration" />

      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1 bg-border" />
        <Pill label="Data & Integration Layer" colorVar="--edge-color" />
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        {data.map((s) => (
          <div key={s.name} className="data-card flex items-start gap-4">
            <div
              className="p-3 rounded-lg shrink-0"
              style={{
                background: `hsl(var(${s.colorVar}) / 0.1)`,
                border: `1px solid hsl(var(${s.colorVar}) / 0.25)`,
              }}
            >
              <s.icon className="w-6 h-6" style={{ color: `hsl(var(${s.colorVar}))` }} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">{s.name}</h3>
              <p className="text-sm pp-muted-text">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-center gap-2 pp-muted-text text-xs">
        <Layers className="w-3.5 h-3.5" />
        <span>One batch model · Every event auditable · AI everywhere</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </div>
    </div>
  </section>
);

export default ShowcaseArchitecture;
