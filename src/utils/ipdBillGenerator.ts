/**
 * IPD Bill PDF Generator
 * Generates a detailed inpatient billing statement.
 */
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import {
  M, CW, C, rgb, pdfToBase64,
  drawHeaderBand, drawControlStrip, sectionBand,
  drawInfoTable, drawBillingSummaryRow,
  stampFooterAllPages, formatDateTime, wrappedText,
} from './pdfCommon';

export interface IPDBillData {
  hospital: {
    name: string;
    addressLine1?: string;
    city?: string;
    state?: string;
    phone?: string;
    email?: string;
    registrationNumber?: string;
  };
  patient: {
    name: string;
    uhid: string;
    mobile?: string;
    gender?: string;
    age?: string;
  };
  admission: {
    admissionNumber: string;
    admittedAt: string;
    dischargedAt?: string;
    wardName: string;
    bedNumber?: string;
    diagnosis?: string;
    admissionReason?: string;
    dailyCharges: number;
    days: number;
    advancePaid: number;
    totalAmount: number;
    notes?: string;
    consultationFee?: number;
    medicines?: Array<{ name: string; qty?: number; rate?: number; amount?: number }>;
    labTests?: Array<{ name: string; amount?: number }>;
    procedures?: Array<{ name: string; amount?: number }>;
  };
  generatedBy?: string;
}

export function generateIPDBill(data: IPDBillData): string {
  const { hospital, patient, admission, generatedBy } = data;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const dischargedDate = admission.dischargedAt ? formatDateTime(admission.dischargedAt) : '—';

  let y: number;
  const checkY = (needed = 14) => { if (y + needed > 270) { doc.addPage(); y = 15; } };

  // ── Header band ────────────────────────────────────────────────────────
  y = drawHeaderBand(doc, hospital, 'IPD Billing Statement', hospital.registrationNumber ? `Reg: ${hospital.registrationNumber}` : undefined);

  // ── Control strip ──────────────────────────────────────────────────────
  y = drawControlStrip(
    doc, y,
    `Admission No: ${admission.admissionNumber}`,
    `Admitted: ${formatDateTime(admission.admittedAt)}  ·  Discharged: ${dischargedDate}`,
  );
  y += 4;

  // ── Patient Information ────────────────────────────────────────────────
  y = sectionBand(doc, y, 'Patient Information');
  y = drawInfoTable(doc, y, [
    ['Name', patient.name || '—', 'UHID', patient.uhid || '—'],
    ['Age / Gender', `${patient.age || '—'} / ${patient.gender || '—'}`, 'Contact', patient.mobile || '—'],
  ]);

  // ── Admission Details ──────────────────────────────────────────────────
  y = sectionBand(doc, y, 'Admission Details');
  y = drawInfoTable(doc, y, [
    ['Ward / Bed', `${admission.wardName}${admission.bedNumber ? ` / Bed ${admission.bedNumber}` : ''}`, 'Days Stay', `${admission.days} day(s)`],
    ['Admitted On', formatDateTime(admission.admittedAt), 'Discharged On', dischargedDate],
    ['Diagnosis', admission.diagnosis || '—', 'Reason', admission.admissionReason || '—'],
  ]);

  // ── Charge table helper ────────────────────────────────────────────────
  const chargeTableHeader = (title: string) => {
    checkY(10);
    y = sectionBand(doc, y, title, C.teal);
  };

  const chargeRow = (lbl: string, amount: string, bg = false) => {
    checkY(8);
    if (bg) {
      rgb(doc, C.lightBg, 'fill');
      doc.rect(M, y, CW, 7, 'F');
    }
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    rgb(doc, C.black, 'text');
    doc.text(lbl, M + 4, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.text(amount, M + CW - 4, y + 5, { align: 'right' });
    rgb(doc, C.ruleLine, 'draw');
    doc.setLineWidth(0.2);
    doc.line(M, y + 7, M + CW, y + 7);
    y += 7;
  };

  // Ward charges
  chargeTableHeader('Ward Charges');
  chargeRow('Ward / Bed Rent', `₹${admission.dailyCharges} × ${admission.days} day(s)`, true);
  chargeRow('', `₹${(admission.dailyCharges * admission.days).toLocaleString('en-IN')}`);

  // Consultation fee
  if ((admission.consultationFee || 0) > 0) {
    chargeTableHeader('Consultation Fee');
    chargeRow('Doctor Consultation', `₹${admission.consultationFee!.toLocaleString('en-IN')}`, true);
  }

  // Medicines
  if (admission.medicines && admission.medicines.length > 0) {
    chargeTableHeader('Medicines / Pharmacy');
    admission.medicines.forEach((m, i) => {
      chargeRow(m.name, `₹${(m.amount || 0).toLocaleString('en-IN')}`, i % 2 === 0);
    });
  }

  // Lab tests
  if (admission.labTests && admission.labTests.length > 0) {
    chargeTableHeader('Laboratory Charges');
    admission.labTests.forEach((t, i) => {
      chargeRow(t.name, `₹${(t.amount || 0).toLocaleString('en-IN')}`, i % 2 === 0);
    });
  }

  // Procedures
  if (admission.procedures && admission.procedures.length > 0) {
    chargeTableHeader('Procedures');
    admission.procedures.forEach((p, i) => {
      chargeRow(p.name, `₹${(p.amount || 0).toLocaleString('en-IN')}`, i % 2 === 0);
    });
  }

  // ── Billing Summary ────────────────────────────────────────────────────
  y += 4;
  checkY(40);
  y = sectionBand(doc, y, 'Billing Summary');

  const wardTotal     = admission.dailyCharges * admission.days;
  const consFee       = admission.consultationFee || 0;
  const medTotal      = (admission.medicines  || []).reduce((s, m) => s + (m.amount || 0), 0);
  const labTotal      = (admission.labTests   || []).reduce((s, t) => s + (t.amount || 0), 0);
  const procTotal     = (admission.procedures || []).reduce((s, p) => s + (p.amount || 0), 0);
  const itemizedTotal = wardTotal + consFee + medTotal + labTotal + procTotal;
  const grossTotal    = admission.totalAmount > 0 ? admission.totalAmount : itemizedTotal;
  const balance       = Math.max(0, grossTotal - admission.advancePaid);

  y = drawBillingSummaryRow(doc, y, 'Gross Total', `₹${grossTotal.toLocaleString('en-IN')}`, true);
  y = drawBillingSummaryRow(doc, y, 'Advance Paid', `- ₹${admission.advancePaid.toLocaleString('en-IN')}`, false);
  y = drawBillingSummaryRow(doc, y, 'Net Payable', `₹${balance.toLocaleString('en-IN')}`, true);

  // Notes
  if (admission.notes) {
    y += 4;
    checkY(14);
    y = sectionBand(doc, y, 'Discharge Notes', C.slate);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    rgb(doc, C.black, 'text');
    const used = wrappedText(doc, admission.notes, M + 2, y, CW - 4);
    y += Math.max(used, 5) + 4;
  }

  // ── Footer (all pages) ─────────────────────────────────────────────────
  stampFooterAllPages(doc, generatedBy, hospital.registrationNumber ? `Reg: ${hospital.registrationNumber}` : undefined);

  const safeDate = format(new Date(admission.admittedAt), 'ddMMMyyyy');
  const base64 = pdfToBase64(doc);
  doc.save(`IPDBill_${patient.uhid}_${safeDate}.pdf`);
  return base64;
}
