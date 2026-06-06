// Invoice generation: builds the jsPDF invoice document for the most
// recently recorded billing entry.
import { state } from './state.js';
import { showToast } from './ui.js';

export function handleGenerateInvoiceClick() {
  try {
    if (!state.latestInvoiceEntryId) {
      showToast("Generate a bill before creating an invoice.");
      return;
    }
    const entry = state.billingHistory.find((item) => item.id === state.latestInvoiceEntryId);
    if (!entry) {
      showToast("Invoice data is missing.");
      return;
    }
    const patient = state.patients.find((p) => p.id === entry.patientId);
    if (!patient) {
      showToast("Patient data is missing.");
      return;
    }

    const invoiceNumber = `INV-${entry.id.slice(0, 8).toUpperCase()}`;
    const treatmentsForInvoice = state.treatments.filter(
      (t) => t.patientId === entry.patientId && t.date === entry.date
    );

    generate_invoice_pdf({
      invoiceNumber,
      invoiceDate: entry.date,
      patient,
      treatments: treatmentsForInvoice,
      subtotal: Number(entry.amount || 0),
      pointsEarned: Number(entry.pointsEarned || 0),
      pointsRedeemed: Number(entry.pointsRedeemed || 0),
      finalPayable: Number(entry.amount || 0)
    });
  } catch (error) {
    console.error("Invoice generation error:", error);
    showToast("Unable to generate invoice. Please try again.");
  }
}

function generate_invoice_pdf(billingData) {
  try {
    // Lightweight, text-only PDF using jsPDF.
    if (!billingData || !billingData.patient || !billingData.invoiceNumber) {
      showToast("Invoice data is missing.");
      return;
    }

    const jspdf = window.jspdf;
    if (!jspdf || !jspdf.jsPDF) {
      showToast("PDF library not loaded.");
      return;
    }

    const doc = new jspdf.jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const formatINRPlain = (value) => `INR ${Number(value || 0).toFixed(2)}`;
    const marginX = 14;
    let cursorY = 16;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Dental Clinic", marginX, cursorY);

    doc.setFontSize(12);
    doc.text("INVOICE", 150, cursorY);
    cursorY += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Invoice Number: ${billingData.invoiceNumber}`, marginX, cursorY);
    doc.text(`Invoice Date: ${billingData.invoiceDate}`, 150, cursorY);
    cursorY += 8;

    doc.line(marginX, cursorY, 200 - marginX, cursorY);
    cursorY += 6;

    doc.setFont("helvetica", "bold");
    doc.text("Patient Details", marginX, cursorY);
    cursorY += 6;

    doc.setFont("helvetica", "normal");
    doc.text(`Patient Name: ${billingData.patient.name}`, marginX, cursorY);
    doc.text(`Patient ID: ${billingData.patient.id}`, 120, cursorY);
    cursorY += 6;

    doc.text(`Date: ${billingData.invoiceDate}`, marginX, cursorY);
    doc.text(`Contact: ${billingData.patient.contact || "N/A"}`, 120, cursorY);
    cursorY += 8;

    doc.setFont("helvetica", "bold");
    doc.text("Treatment Details", marginX, cursorY);
    cursorY += 6;

    doc.setFont("helvetica", "normal");
    const startY = cursorY;
    const descX = marginX;
    const dateX = 125;
    const amountX = 190;
    doc.text("Description", descX, cursorY);
    doc.text("Date", dateX, cursorY);
    doc.text("Amount (INR)", amountX, cursorY, { align: "right" });
    cursorY += 4;
    doc.line(marginX, cursorY, 200 - marginX, cursorY);
    cursorY += 6;

    const treatments = billingData.treatments.length
      ? billingData.treatments
      : [{ description: "Treatment services", date: billingData.invoiceDate, cost: billingData.finalPayable }];

    treatments.forEach((treatment) => {
      const descriptionLines = doc.splitTextToSize(
        treatment.description || "Treatment",
        90
      );
      doc.text(descriptionLines, descX, cursorY);
      doc.text(treatment.date || billingData.invoiceDate, dateX, cursorY);
      doc.text(formatINRPlain(Number(treatment.cost || 0)), amountX, cursorY, { align: "right" });
      cursorY += 6 + (descriptionLines.length - 1) * 4;
    });

    cursorY += 4;
    doc.line(marginX, cursorY, 200 - marginX, cursorY);
    cursorY += 8;

    doc.setFont("helvetica", "bold");
    doc.text("Summary", marginX, cursorY);
    cursorY += 6;

    doc.setFont("helvetica", "normal");
    doc.text(`Subtotal: ${formatINRPlain(billingData.subtotal)}`, marginX, cursorY);
    cursorY += 5;
    doc.text(`Reward Points Earned: ${billingData.pointsEarned}`, marginX, cursorY);
    cursorY += 5;
    doc.text(`Reward Points Redeemed: ${billingData.pointsRedeemed}`, marginX, cursorY);
    cursorY += 6;

    doc.setFont("helvetica", "bold");
    doc.text(`Final Payable Amount (INR): ${formatINRPlain(billingData.finalPayable)}`, marginX, cursorY);
    cursorY += 10;

    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text("This invoice is generated electronically.", marginX, cursorY);

    const filename = `Invoice_${billingData.invoiceNumber}_${billingData.patient.id}.pdf`;
    doc.save(filename);
    showToast("Invoice generated.");
  } catch (error) {
    console.error("PDF generation error:", error);
    showToast("Unable to generate invoice. Please try again.");
  }
}
