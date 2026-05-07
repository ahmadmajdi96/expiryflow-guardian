import { Factory, Shield, FileCheck, Tablet, ArrowRight } from "lucide-react";

const layers = [
  {
    title: "Enterprise Layer",
    subtitle: "Strategic Management & Analytics",
    systems: [
      { name: "MES", desc: "Manufacturing Execution System", icon: Factory, color: "210 100% 56%" },
      { name: "QMS", desc: "Quality Management System", icon: Shield, color: "142 71% 45%" },
      { name: "CMS", desc: "Compliance Management System", icon: FileCheck, color: "280 67% 60%" },
    ],
  },
  {
    title: "Edge Layer",
    subtitle: "Factory Floor Applications",
    systems: [
      { name: "MES Edge Apps", desc: "5 Operator/Supervisor/Maintenance Apps", icon: Tablet, color: "210 100% 56%" },
      { name: "QMS Edge Apps", desc: "4 Technician/Manager/Kiosk/Auditor Apps", icon: Tablet, color: "142 71% 45%" },
      { name: "CMS Edge Apps", desc: "4 Regulatory/Recall/Export/Sustainability Apps", icon: Tablet, color: "280 67% 60%" },
    ],
  },
];

const ShowcaseArchitecture = () => (
  <section className="py-16 sm:py-24 px-4 sm:px-6">
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">System Architecture</h2>
        <p className="text-lg text-[hsl(215,12%,50%)] max-w-3xl mx-auto">
          Built on ISA-95 standards with a two-tier architecture — enterprise platforms for management
          and lightweight edge apps for the factory floor.
        </p>
      </div>

      <div className="space-y-8">
        {layers.map((layer, idx) => (
          <div key={layer.title}>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-[hsl(220,14%,18%)]" />
              <div className="px-4 py-1.5 rounded-full border border-[hsl(220,14%,18%)] bg-[hsl(220,16%,16%)]/50 text-sm font-medium text-[hsl(215,12%,50%)]">
                {layer.title}
              </div>
              <div className="h-px flex-1 bg-[hsl(220,14%,18%)]" />
            </div>
            <p className="text-center text-sm text-[hsl(215,12%,50%)] mb-6">{layer.subtitle}</p>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
              {layer.systems.map((sys) => (
                <div key={sys.name} className="bg-[hsl(220,18%,10%)] border border-[hsl(220,14%,18%)] rounded-lg p-6 flex items-start gap-4 transition-all duration-300 hover:border-[hsl(210,100%,56%)]/40 hover:-translate-y-0.5">
                  <div className="p-3 rounded-lg shrink-0" style={{ background: `hsl(${sys.color} / 0.1)`, border: `1px solid hsl(${sys.color} / 0.2)` }}>
                    <sys.icon className="w-6 h-6" style={{ color: `hsl(${sys.color})` }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[hsl(210,20%,90%)] mb-1">{sys.name}</h3>
                    <p className="text-sm text-[hsl(215,12%,50%)]">{sys.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {idx === 0 && (
              <div className="flex justify-center my-6">
                <div className="flex flex-col items-center gap-1 text-[hsl(215,12%,50%)]/40">
                  <ArrowRight className="w-5 h-5 rotate-90" />
                  <span className="text-xs uppercase tracking-wider">Data Flow</span>
                  <ArrowRight className="w-5 h-5 rotate-90" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default ShowcaseArchitecture;