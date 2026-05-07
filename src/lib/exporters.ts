export const exportToCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
  const escape = (v: any) => {
    const s = v === null || v === undefined ? "" : String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export interface PickListLine {
  sku: string;
  productName: string;
  batchNumber: string;
  expiryDate: string;
  location: string;
  locationType: string;
  allocated: number;
  picked: number;
  status: string;
}

export const exportPickList = (orderNumber: string, customerName: string, pickLines: PickListLine[]) => {
  const now = new Date().toLocaleString();
  const lines = pickLines.map((l, i) =>
    `${i + 1}. ${l.sku.padEnd(16)} ${l.productName.slice(0, 28).padEnd(28)} Batch: ${l.batchNumber.padEnd(14)} Exp: ${l.expiryDate}  Loc: ${l.locationType}/${l.location}  Qty: ${l.picked}/${l.allocated}  [${l.status}]`
  );
  const totalAllocated = pickLines.reduce((s, l) => s + l.allocated, 0);
  const totalPicked = pickLines.reduce((s, l) => s + l.picked, 0);
  const text = [
    `═══════════════════════════════════════════════════════════════`,
    `  PICK LIST / PACKING SLIP`,
    `  Order: ${orderNumber}    Customer: ${customerName || "—"}`,
    `  Generated: ${now}`,
    `═══════════════════════════════════════════════════════════════`,
    ``,
    ...lines,
    ``,
    `───────────────────────────────────────────────────────────────`,
    `  TOTAL:  ${totalPicked} / ${totalAllocated} units`,
    `───────────────────────────────────────────────────────────────`,
  ].join("\n");
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = `picklist-${orderNumber}.txt`;
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
  URL.revokeObjectURL(url);
};