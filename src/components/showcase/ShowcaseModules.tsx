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
  color: string;
  features: { icon: any; title: string; desc: string }[];
  impact: { icon: any; metric: string; label: string }[];
}

const modules: Module[] = [
  {
    id: "mes",
    title: "MES",
    subtitle: "Manufacturing Execution System",
    description: "Real-time production monitoring, OEE tracking, equipment management, and scheduling across all production lines.",
    aiDescription: "AI-powered predictive maintenance forecasts equipment failures 48hrs ahead. Machine learning optimizes scheduling by analyzing historical throughput, changeover patterns, and demand signals — reducing unplanned downtime by up to 30%.",
    image: mesDashboard,
    color: "210 100% 56%",
    impact: [
      { icon: TrendingDown, metric: "↓ 30%", label: "Downtime Reduction" },
      { icon: DollarSign, metric: "↓ 18%", label: "Operating Costs" },
      { icon: Target, metric: "↑ 25%", label: "OEE Improvement" },
      { icon: Clock, metric: "↑ 40%", label: "Faster Changeovers" },
    ],
    features: [
      { icon: Activity, title: "AI-Enhanced OEE Dashboard", desc: "Live scoring with ML-powered anomaly detection and automated root cause suggestions for the six big losses." },
      { icon: Factory, title: "Smart Line Management", desc: "AI identifies bottleneck stations and suggests rebalancing actions based on real-time throughput analysis." },
      { icon: Wrench, title: "Predictive Maintenance", desc: "Deep learning models analyze vibration, temperature, and cycle data to predict failures before they happen." },
      { icon: Package, title: "Intelligent Recipe Dispatch", desc: "AI optimizes parameter selection based on raw material batch properties and historical yield data." },
      { icon: Zap, title: "Energy Optimization AI", desc: "Neural networks model energy consumption patterns and recommend optimal run schedules to minimize kWh per unit." },
      { icon: BarChart3, title: "Automated SPC Analysis", desc: "AI-driven control chart interpretation with automated out-of-control rule detection and corrective action suggestions." },
    ],
  },
  {
    id: "qms",
    title: "QMS",
    subtitle: "Quality Management System",
    description: "Comprehensive food safety and quality management with CAPA workflows, HACCP monitoring, and full BRCGS/SQF audit support.",
    aiDescription: "Natural language processing auto-classifies complaints and deviations. AI-powered root cause analysis accelerates investigations from weeks to days, while predictive quality models flag at-risk batches before release.",
    image: qmsDashboard,
    color: "142 71% 45%",
    impact: [
      { icon: TrendingDown, metric: "↓ 65%", label: "Fewer Quality Failures" },
      { icon: DollarSign, metric: "↓ 40%", label: "Waste Reduction" },
      { icon: Target, metric: "↑ 90%", label: "First-Time Audit Pass" },
      { icon: Clock, metric: "↓ 75%", label: "Investigation Time" },
    ],
    features: [
      { icon: Shield, title: "AI CAPA Engine", desc: "Automated root cause suggestions using 5-Why and Ishikawa analysis powered by historical deviation data and NLP." },
      { icon: ClipboardCheck, title: "Intelligent HACCP Monitoring", desc: "AI continuously validates CCP data streams and auto-triggers corrective actions on deviation patterns." },
      { icon: AlertTriangle, title: "Predictive Complaint Analysis", desc: "ML models identify complaint clusters and predict emerging quality trends before they escalate." },
      { icon: Users, title: "AI Supplier Scoring", desc: "Dynamic supplier risk scoring using delivery, quality, and responsiveness data with automated qualification workflows." },
      { icon: FlaskConical, title: "Smart Environmental Monitoring", desc: "AI analyzes sampling patterns to optimize EMP schedules and predict contamination risk zones." },
    ],
  },
  {
    id: "cms",
    title: "CMS",
    subtitle: "Compliance Management System",
    description: "Regulatory intelligence, certification lifecycle management, ESG reporting, and audit evidence packaging.",
    aiDescription: "AI-driven regulatory horizon scanning monitors 50+ jurisdictions in real-time. Automated label validation uses computer vision to verify nutrition panels and allergen declarations against global regulation databases.",
    image: cmsDashboard,
    color: "280 67% 60%",
    impact: [
      { icon: TrendingDown, metric: "↓ 80%", label: "Compliance Risk" },
      { icon: DollarSign, metric: "↓ 50%", label: "Compliance Costs" },
      { icon: Target, metric: "100%", label: "Label Accuracy" },
      { icon: Clock, metric: "↓ 60%", label: "Audit Prep Time" },
    ],
    features: [
      { icon: Scale, title: "AI Regulatory Intelligence", desc: "NLP-powered scanning of regulatory changes across jurisdictions with automated impact assessment on your product portfolio." },
      { icon: Award, title: "Smart Certification Tracking", desc: "AI predicts audit readiness scores and auto-generates gap analysis reports with prioritized remediation steps." },
      { icon: FileCheck, title: "Computer Vision Label Check", desc: "Automated artwork validation using AI to verify nutrition panels, allergen declarations, and mandatory statements." },
      { icon: Leaf, title: "AI Carbon Footprint Calculator", desc: "Machine learning models calculate product carbon footprint using supply chain data with automated Scope 1/2/3 reporting." },
      { icon: Globe, title: "Intelligent Trade Compliance", desc: "AI-powered sanctions screening and denied party checks with automated export documentation generation." },
    ],
  },
];

const ShowcaseModules = () => (
  <section className="py-16 sm:py-24 px-4 sm:px-6">
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-20">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Platform Modules</h2>
        <p className="text-lg text-[hsl(215,12%,50%)] max-w-3xl mx-auto">
          Each module is a fully-featured application enhanced with AI capabilities, deployable independently or as a unified suite.
        </p>
      </div>

      <div className="space-y-32">
        {modules.map((mod, idx) => (
          <div key={mod.id} id={mod.id} className="scroll-mt-8">
            <div className={`flex flex-col ${idx % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"} gap-10 items-center mb-12`}>
              <div className="lg:w-3/5">
                <div className="bg-[hsl(220,18%,10%)] border border-[hsl(220,14%,18%)] rounded-xl overflow-hidden transition-all duration-300 hover:border-[hsl(210,100%,56%)]/30">
                  <div className="p-1">
                    <img src={mod.image} alt={`${mod.title} dashboard`} className="w-full rounded-lg" loading="lazy" />
                  </div>
                </div>
              </div>

              <div className="lg:w-2/5">
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-4"
                  style={{ background: `hsl(${mod.color} / 0.1)`, color: `hsl(${mod.color})`, border: `1px solid hsl(${mod.color} / 0.25)` }}
                >
                  {mod.subtitle}
                </div>
                <h3 className="text-3xl font-bold mb-4">{mod.title}</h3>
                <p className="text-[hsl(215,12%,50%)] leading-relaxed mb-4">{mod.description}</p>
                <div className="p-4 rounded-lg border border-[hsl(210,100%,56%)]/20 bg-[hsl(210,100%,56%)]/5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(210,100%,56%)]">🤖 AI-Powered</span>
                  </div>
                  <p className="text-sm text-[hsl(215,12%,50%)] leading-relaxed">{mod.aiDescription}</p>
                </div>
              </div>
            </div>

            {/* Impact Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {mod.impact.map((m) => (
                <div key={m.label} className="bg-[hsl(220,18%,10%)] border border-[hsl(220,14%,18%)] rounded-lg p-6 text-center transition-all duration-300 hover:border-[hsl(210,100%,56%)]/30">
                  <div className="inline-flex p-2 rounded-lg mb-3 mx-auto" style={{ background: `hsl(${mod.color} / 0.1)` }}>
                    <m.icon className="w-5 h-5" style={{ color: `hsl(${mod.color})` }} />
                  </div>
                  <div className="text-2xl font-bold font-mono mb-1" style={{ color: `hsl(${mod.color})` }}>{m.metric}</div>
                  <div className="text-sm font-semibold text-[hsl(210,20%,90%)]">{m.label}</div>
                </div>
              ))}
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {mod.features.map((feat) => (
                <div key={feat.title} className="bg-[hsl(220,16%,16%)]/50 border border-[hsl(220,14%,18%)] rounded-lg p-6 backdrop-blur-sm">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-md shrink-0" style={{ background: `hsl(${mod.color} / 0.1)` }}>
                      <feat.icon className="w-5 h-5" style={{ color: `hsl(${mod.color})` }} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">{feat.title}</h4>
                      <p className="text-xs text-[hsl(215,12%,50%)] leading-relaxed">{feat.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default ShowcaseModules;