import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { PickListLine } from "./exporters";

export function generatePickSlipPdf(
  orderNumber: string,
  customerName: string,
  shipDate: string,
  pickLines: PickListLine[]
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(67, 56, 202); // indigo-700
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("PICK LIST / PACKING SLIP", 14, 14);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

  // Order info box
  doc.setTextColor(30, 30, 50);
  doc.setFontSize(10);
  const infoY = 36;
  doc.setFont("helvetica", "bold");
  doc.text("Order:", 14, infoY);
  doc.setFont("helvetica", "normal");
  doc.text(orderNumber, 35, infoY);

  doc.setFont("helvetica", "bold");
  doc.text("Customer:", 90, infoY);
  doc.setFont("helvetica", "normal");
  doc.text(customerName || "—", 115, infoY);

  doc.setFont("helvetica", "bold");
  doc.text("Ship Date:", 14, infoY + 6);
  doc.setFont("helvetica", "normal");
  doc.text(shipDate || "—", 40, infoY + 6);

  doc.setFont("helvetica", "bold");
  doc.text("Total Lines:", 90, infoY + 6);
  doc.setFont("helvetica", "normal");
  doc.text(String(pickLines.length), 115, infoY + 6);

  doc.setDrawColor(200, 200, 220);
  doc.line(14, infoY + 10, pageW - 14, infoY + 10);

  // Table
  const totalAllocated = pickLines.reduce((s, l) => s + l.allocated, 0);
  const totalPicked = pickLines.reduce((s, l) => s + l.picked, 0);

  const tableData = pickLines.map((l, i) => [
    String(i + 1),
    l.sku,
    l.productName.length > 30 ? l.productName.slice(0, 28) + "…" : l.productName,
    l.batchNumber,
    l.expiryDate,
    `${l.locationType}/${l.location}`,
    String(l.allocated),
    String(l.picked),
    l.status,
  ]);

  autoTable(doc, {
    startY: infoY + 14,
    head: [["#", "SKU", "Product", "Batch #", "Expiry", "Location", "Alloc", "Picked", "Status"]],
    body: tableData,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [67, 56, 202], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { halign: "center", cellWidth: 8 },
      1: { font: "courier", cellWidth: 22 },
      3: { font: "courier" },
      4: { cellWidth: 20 },
      6: { halign: "right", cellWidth: 14 },
      7: { halign: "right", cellWidth: 14 },
      8: { halign: "center", cellWidth: 16 },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 8) {
        const v = String(data.cell.raw);
        if (v === "PICKED") data.cell.styles.textColor = [22, 163, 74];
        else if (v === "PARTIAL") data.cell.styles.textColor = [202, 138, 4];
        else if (v === "PENDING") data.cell.styles.textColor = [156, 163, 175];
      }
    },
  });

  // Totals footer
  const finalY = (doc as any).lastAutoTable?.finalY ?? 200;
  doc.setDrawColor(67, 56, 202);
  doc.setLineWidth(0.5);
  doc.line(14, finalY + 4, pageW - 14, finalY + 4);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 50);
  doc.text(`TOTAL:  ${totalPicked} / ${totalAllocated} units`, 14, finalY + 12);

  // Signature line
  const sigY = finalY + 28;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 120);
  doc.text("Picked by: ________________________", 14, sigY);
  doc.text("Date: ________________", 120, sigY);
  doc.text("Checked by: ________________________", 14, sigY + 10);
  doc.text("Date: ________________", 120, sigY + 10);

  // Page footer
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`CORTA-Inventory — ExpirySmart WMS — Page ${i}/${pages}`, pageW / 2, doc.internal.pageSize.getHeight() - 6, { align: "center" });
  }

  doc.save(`pickslip-${orderNumber}.pdf`);
}