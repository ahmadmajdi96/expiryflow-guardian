const standards = [
  { name: "ISA-95", desc: "Enterprise-Control Integration" },
  { name: "BRCGS v9", desc: "Global Food Safety Standard" },
  { name: "SQF", desc: "Safe Quality Food Certification" },
  { name: "FSSC 22000", desc: "Food Safety System Certification" },
  { name: "HACCP", desc: "Hazard Analysis & Critical Control" },
  { name: "FSMA 204", desc: "FDA Traceability Rule" },
  { name: "EU 1169/2011", desc: "Food Information Regulation" },
  { name: "GMP", desc: "Good Manufacturing Practices" },
  { name: "MESA-11", desc: "MES Functional Model" },
  { name: "ISO 22000", desc: "Food Safety Management" },
];

const ShowcaseStandards = () => (
  <section className="py-16 sm:py-24 px-4 sm:px-6 border-t border-[hsl(220,14%,18%)]">
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Industry Standards Compliance</h2>
        <p className="text-lg text-[hsl(215,12%,50%)] max-w-3xl mx-auto">
          Built to meet and exceed the requirements of global food safety and manufacturing standards.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
        {standards.map((std) => (
          <div key={std.name} className="bg-[hsl(220,18%,10%)] border border-[hsl(220,14%,18%)] rounded-lg p-6 text-center transition-all duration-300 hover:border-[hsl(210,100%,56%)]/40 hover:-translate-y-0.5">
            <div className="font-mono font-bold text-[hsl(210,100%,56%)] text-lg mb-1">{std.name}</div>
            <div className="text-xs text-[hsl(215,12%,50%)]">{std.desc}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default ShowcaseStandards;