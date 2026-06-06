/**
 * Admission Summary PDF Generator
 * Generates a summary document when a patient is admitted to IPD.
 */
import jsPDF from 'jspdf';
import {
  C, pdfToBase64,
  drawHeaderBand, drawControlStrip, sectionBand,
  drawInfoTable, drawFooter, formatDateTime,
  drawBillingSummaryRow, drawSignatureBlock,
} from './pdfCommon';

export interface AdmissionSummaryData {
  hospital: {
    name: string;
    addressLine1?: string;
    city?: string;
    state?: string;
    phone?: string;
    email?: string;
  };
  patient: {
    name: string;
    uhid: string;
    mobile?: string;
    gender?: string;
    age?: string;
    address?: string;
    bloodGroup?: string;
  };
  admission: {
    admissionNumber: string;
    admittedAt: string;
    admittedBy?: string;
    wardName: string;
    bedNumber?: string;
    diagnosis?: string;
    admissionReason?: string;
    dailyCharges: number;
    advancePaid: number;
    notes?: string;
  };
  doctor?: {
    name: string;
    specialization?: string;
  };
  generatedBy?: string;
}

export function generateAdmissionSummary(data: AdmissionSummaryData): string {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y: number;

  // ── Header band ───────────────────────────────────────────────────────
  y = drawHeaderBand(doc, data.hospital, 'Admission Summary');

  // ── Control strip ─────────────────────────────────────────────────────
  y = drawControlStrip(
    doc, y,
    `Admission No: ${data.admission.admissionNumber}`,
    `Admitted: ${formatDateTime(data.admission.admittedAt)}`,
  );
  y += 4;

  // ── Patient Information ───────────────────────────────────────────────
  y = sectionBand(doc, y, 'Patient Information');
  y = drawInfoTable(doc, y, [
    ['Name', data.patient.name || '—', 'UHID', data.patient.uhid || '—'],
    ['Age / Gender', `${data.patient.age || '—'} / ${data.patient.gender || '—'}`, 'Contact', data.patient.mobile || '—'],
    ['Blood Group', data.patient.bloodGroup || '—', 'Address', data.patient.address || '—'],
  ]);

  // ── Admission Details ─────────────────────────────────────────────────
  y = sectionBand(doc, y, 'Admission Details');
  y = drawInfoTable(doc, y, [
    ['Admission No', data.admission.admissionNumber, 'Ward / Bed', `${data.admission.wardName}${data.admission.bedNumber ? ` / Bed ${data.admission.bedNumber}` : ''}`],
    ['Admitted On', formatDateTime(data.admission.admittedAt), 'Admitted By', data.admission.admittedBy || '—'],
    ['Daily Charges', `₹${data.admission.dailyCharges.toLocaleString('en-IN')}`, 'Treating Doctor', data.doctor ? `${data.doctor.name}${data.doctor.specialization ? ` (${data.doctor.specialization})` : ''}` : '—'],
  ]);

  // ── Clinical Details ──────────────────────────────────────────────────
  y = sectionBand(doc, y, 'Clinical Details', C.teal);
  y += 1;
  const clinicalRows: [string, string, string, string][] = [
    ['Reason', data.admission.admissionReason || '—', 'Diagnosis', data.admission.diagnosis || '—'],
  ];
  if (data.admission.notes) {
    clinicalRows.push(['Notes', data.admission.notes, '', '']);
  }
  y = drawInfoTable(doc, y, clinicalRows);

  // ── Payment Details ───────────────────────────────────────────────────
  y = sectionBand(doc, y, 'Payment Details', C.amber);
  y = drawBillingSummaryRow(doc, y, 'Daily Charges', `₹${data.admission.dailyCharges.toLocaleString('en-IN')}`, false);
  y = drawBillingSummaryRow(doc, y, 'Advance Paid', `₹${data.admission.advancePaid.toLocaleString('en-IN')}`, true);
  y += 4;

  // ── Signature block ───────────────────────────────────────────────────
  if (data.doctor) {
    y = drawSignatureBlock(doc, y, data.doctor.name, data.doctor.specialization);
  }

  // ── Footer ────────────────────────────────────────────────────────────
  drawFooter(doc, data.generatedBy);

  const base64 = pdfToBase64(doc);
  doc.save(`Admission_Summary_${data.admission.admissionNumber}.pdf`);
  return base64;
}
