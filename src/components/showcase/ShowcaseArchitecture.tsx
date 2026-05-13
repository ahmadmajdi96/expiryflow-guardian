import { Factory, Shield, FileCheck, Tablet, ArrowDown, Brain, Sparkles, Layers, ArrowRight } from "lucide-react";

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

const FlowArrow = ({ label = "ISA-95 data flow" }: { label?: string }) => (
  <div className="flex justify-center my-4">
    <div className="flex flex-col items-center gap-1 pp-muted-text">
      <ArrowDown className="w-5 h-5 opacity-60" />
      <span className="text-[10px] uppercase tracking-widest opacity-70">{label}</span>
    </div>
  </div>
);

const enterprise = [
  { name: "MES", desc: "Manufacturing Execution System", icon: Factory, colorVar: "--mes-color" },
  { name: "QMS", desc: "Quality Management System", icon: Shield, colorVar: "--qms-color" },
  { name: "CMS", desc: "Compliance Management System", icon: FileCheck, colorVar: "--cms-color" },
];

const edge = [
  { name: "MES Edge Apps", desc: "5 Operator / Supervisor / Maintenance apps", icon: Tablet, colorVar: "--mes-color" },
  { name: "QMS Edge Apps", desc: "4 Technician / Manager / Kiosk / Auditor apps", icon: Tablet, colorVar: "--qms-color" },
  { name: "CMS Edge Apps", desc: "4 Regulatory / Recall / Export / Sustainability apps", icon: Tablet, colorVar: "--cms-color" },
];

const ShowcaseArchitecture = () => (
  <section id="architecture" className="py-16 sm:py-24 px-4 sm:px-6 scroll-mt-20">
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-14">
        <h2 className="section-title mb-4">System Architecture</h2>
        <p className="section-subtitle mx-auto">
          ISA-95-aligned two-tier architecture: enterprise platforms for management,
          lightweight edge apps on the factory floor — every layer fed by CortaneX AI.
        </p>
      </div>

      {/* Enterprise layer */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1 bg-border" />
        <Pill label="Enterprise Layer — Strategic Management" colorVar="--mes-color" />
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {enterprise.map((s) => (
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

      <FlowArrow />

      {/* AI Engine band */}
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
              Predictive · NLP · Computer Vision
            </span>
          </div>
          <p className="text-sm pp-muted-text">
            Cross-cutting intelligence: predictive maintenance, anomaly detection, smart scheduling,
            label vision, regulatory NLP — embedded in every screen.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1 pp-muted-text">
          <Sparkles className="w-4 h-4" style={{ color: "hsl(var(--ai-color))" }} />
          <span className="text-xs">Always-on copilot</span>
        </div>
      </div>

      <FlowArrow />

      {/* Edge layer */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1 bg-border" />
        <Pill label="Edge Layer — Factory Floor Apps" colorVar="--edge-color" />
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {edge.map((s) => (
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
        <span>One data model · Every event auditable · AI everywhere</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </div>
    </div>
  </section>
);

export default ShowcaseArchitecture;
