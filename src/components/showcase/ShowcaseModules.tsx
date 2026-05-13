import {
  Activity, Factory, Wrench, Package, Zap, BarChart3,
  Shield, ClipboardCheck, AlertTriangle, Users, FlaskConical,
  Scale, Leaf, Globe, Award, FileCheck,
  TrendingDown, DollarSign, Clock, Target,
} from "lucide-react";
import mesDashboard from "@/assets/mes-dashboard.jpg";
import qmsDashboard from "@/assets/qms-dashboard.jpg";
import cmsDashboard from "@/assets/cms-dashboard.jpg";

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
    id: "mes",
    title: "MES",
    subtitle: "Manufacturing Execution System",
    description: "Real-time production monitoring, OEE tracking, equipment management, and scheduling across all production lines.",
    aiDescription: "AI-powered predictive maintenance forecasts equipment failures 48hrs ahead. Machine learning optimizes scheduling by analyzing historical throughput, changeover patterns, and demand signals — reducing unplanned downtime by up to 30%.",
    image: mesDashboard,
    colorVar: "--mes-color",
    impact: [
      { icon: TrendingDown, metric: "↓ 30%", label: "Downtime Reduction", description: "Predictive maintenance and AI-optimized scheduling cut unplanned stoppages." },
      { icon: DollarSign, metric: "↓ 18%", label: "Operating Costs", description: "Energy and yield optimization across every production line." },
      { icon: Target, metric: "↑ 25%", label: "OEE Improvement", description: "Continuous loss-tree analysis surfaces the highest-leverage interventions." },
      { icon: Clock, metric: "↑ 40%", label: "Faster Changeovers", description: "AI sequences orders to minimize cleaning and setup time." },
    ],
    features: [
      { icon: Activity, title: "AI-Enhanced OEE Dashboard", desc: "Live scoring with ML anomaly detection and automated root cause suggestions for the six big losses." },
      { icon: Factory, title: "Smart Line Management", desc: "Bottleneck detection with rebalancing actions based on real-time throughput analysis." },
      { icon: Wrench, title: "Predictive Maintenance", desc: "Deep learning over vibration, temperature, and cycle data to predict failures before they happen." },
      { icon: Package, title: "Intelligent Recipe Dispatch", desc: "Optimizes parameters using raw-material batch properties and historical yield data." },
      { icon: Zap, title: "Energy Optimization AI", desc: "Neural networks recommend optimal run schedules to minimize kWh per unit." },
      { icon: BarChart3, title: "Automated SPC Analysis", desc: "AI-driven control chart interpretation with out-of-control rule detection and corrective actions." },
    ],
    screens: [
      "OEE Dashboard","Line Status","Schedule Board","Recipe Dispatch","Downtime Reasons",
      "Maintenance Plan","Predictive Alerts","Energy Monitor","SPC Charts","Shift Reports",
      "Batch Genealogy","Run History","Operator HMI","Andon Board","Tool Changeover",
    ],
  },
  {
    id: "qms",
    title: "QMS",
    subtitle: "Quality Management System",
    description: "Comprehensive food safety and quality management with CAPA workflows, HACCP monitoring, and full BRCGS/SQF audit support.",
    aiDescription: "NLP auto-classifies complaints and deviations. AI root cause analysis accelerates investigations from weeks to days, while predictive quality models flag at-risk batches before release.",
    image: qmsDashboard,
    colorVar: "--qms-color",
    impact: [
      { icon: TrendingDown, metric: "↓ 65%", label: "Quality Failures", description: "Predictive quality flags at-risk batches before release." },
      { icon: DollarSign, metric: "↓ 40%", label: "Waste Reduction", description: "Earlier intervention means less rework and write-off." },
      { icon: Target, metric: "↑ 90%", label: "First-Time Audit Pass", description: "Pre-assembled clause-mapped evidence packages." },
      { icon: Clock, metric: "↓ 75%", label: "Investigation Time", description: "AI-suggested 5-Why & Ishibawa with linked historical events." },
    ],
    features: [
      { icon: Shield, title: "AI CAPA Engine", desc: "Automated root cause suggestions using 5-Why and Ishikawa analysis powered by historical deviation data and NLP." },
      { icon: ClipboardCheck, title: "Intelligent HACCP Monitoring", desc: "Continuously validates CCP data streams and auto-triggers corrective actions on deviation patterns." },
      { icon: AlertTriangle, title: "Predictive Complaint Analysis", desc: "ML identifies complaint clusters and predicts emerging quality trends before they escalate." },
      { icon: Users, title: "AI Supplier Scoring", desc: "Dynamic supplier risk scoring with automated qualification workflows." },
      { icon: FlaskConical, title: "Smart Environmental Monitoring", desc: "Optimizes EMP schedules and predicts contamination risk zones." },
    ],
    screens: [
      "CAPA Inbox","Deviation Log","HACCP Monitor","CCP Dashboard","Audit Schedule",
      "Supplier Scorecard","EMP Planner","Complaint Analysis","Document Control","Training Matrix",
      "Internal Audits","Mock Recall","Allergen Map","Calibration Log","Lab Results",
    ],
  },
  {
    id: "cms",
    title: "CMS",
    subtitle: "Compliance Management System",
    description: "Regulatory intelligence, certification lifecycle management, ESG reporting, and audit evidence packaging.",
    aiDescription: "AI-driven regulatory horizon scanning monitors 50+ jurisdictions in real-time. Automated label validation uses computer vision to verify nutrition panels and allergen declarations against global regulation databases.",
    image: cmsDashboard,
    colorVar: "--cms-color",
    impact: [
      { icon: TrendingDown, metric: "↓ 80%", label: "Compliance Risk", description: "Continuous regulatory horizon scanning across 50+ jurisdictions." },
      { icon: DollarSign, metric: "↓ 50%", label: "Compliance Costs", description: "Reuse of certifications and pre-assembled evidence packs." },
      { icon: Target, metric: "100%", label: "Label Accuracy", description: "Computer-vision artwork validation pre-print." },
      { icon: Clock, metric: "↓ 60%", label: "Audit Prep Time", description: "AI-curated audit evidence ready in minutes, not days." },
    ],
    features: [
      { icon: Scale, title: "AI Regulatory Intelligence", desc: "NLP scans regulatory changes across jurisdictions with automated impact assessment on your portfolio." },
      { icon: Award, title: "Smart Certification Tracking", desc: "Predicts audit readiness scores and auto-generates gap analysis with prioritized remediation steps." },
      { icon: FileCheck, title: "Computer Vision Label Check", desc: "Automated artwork validation against nutrition panels, allergens, and mandatory statements." },
      { icon: Leaf, title: "AI Carbon Footprint Calculator", desc: "ML models calculate Scope 1/2/3 product carbon footprints from supply chain data." },
      { icon: Globe, title: "Intelligent Trade Compliance", desc: "AI-powered sanctions screening and denied-party checks with automated export documentation." },
    ],
    screens: [
      "Regulatory Radar","Cert Lifecycle","Label Validator","ESG Dashboard","Carbon Ledger",
      "Recall Workbench","Trade Docs","Sanctions Screen","Audit Evidence","Submission Tracker",
      "Country Matrix","Allergen Declarations","Sustainability KPIs","Corrective Filings",
    ],
  },
];

const ShowcaseModules = () => (
  <section className="py-16 sm:py-24 px-4 sm:px-6">
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-20">
        <h2 className="section-title mb-4">Platform Modules</h2>
        <p className="section-subtitle mx-auto">
          Each module is a fully-featured application enhanced with CortaneX AI — deployable
          independently or as a unified suite.
        </p>
      </div>

      <div className="space-y-32">
        {modules.map((mod, idx) => (
          <div key={mod.id} id={mod.id} className="scroll-mt-20">
            <div className={`flex flex-col ${idx % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"} gap-10 items-center mb-12`}>
              <div className="lg:w-3/5">
                <div className="module-card overflow-hidden">
                  <div className="p-1">
                    <img src={mod.image} alt={`${mod.title} dashboard`} className="w-full rounded-lg" loading="lazy" />
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

            {/* Impact metrics */}
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

            {/* Features */}
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

            {/* Screen tags */}
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
