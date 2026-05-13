const standards = [
  { name: "FEFO", desc: "First-Expired-First-Out execution" },
  { name: "GS1", desc: "Global product & batch coding" },
  { name: "FSMA 204", desc: "FDA Food Traceability Rule" },
  { name: "HACCP", desc: "Hazard Analysis & Critical Control" },
  { name: "ISO 22000", desc: "Food Safety Management" },
  { name: "GDP", desc: "Good Distribution Practice" },
  { name: "BRCGS", desc: "Storage & Distribution Standard" },
  { name: "EU 1169/2011", desc: "Food Information to Consumers" },
  { name: "RLS", desc: "Row-level security enforced" },
  { name: "Audit Log", desc: "Full AI + user decision trail" },
];

const ShowcaseStandards = () => (
  <section id="standards" className="py-16 sm:py-24 px-4 sm:px-6 border-t pp-border scroll-mt-20">
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="section-title mb-4">Standards & Compliance</h2>
        <p className="section-subtitle mx-auto">
          Built to meet warehousing, food-safety and traceability requirements out of the box.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
        {standards.map((std) => (
          <div key={std.name} className="data-card text-center">
            <div className="font-mono font-bold pp-gradient-text text-lg mb-1">{std.name}</div>
            <div className="text-xs pp-muted-text">{std.desc}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default ShowcaseStandards;
