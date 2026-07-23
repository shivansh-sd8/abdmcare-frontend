/**
 * Gate Pass PDF Generator
 * Generates a gate pass document after patient discharge, confirming clearance for departure.
 */
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import {
  M, PW, CW, C, rgb, pdfToBase64,
  drawHeaderBand, drawControlStrip, sectionBand,
  drawInfoTable, drawBillingSummaryRow, drawFooter,
  formatDateTime,
} from './pdfCommon';

export interface GatePassData {
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
  };
  admission: {
    admissionNumber: string;
    admittedAt: string;
    dischargedAt: string;
    wardName: string;
    bedNumber?: string;
    diagnosis?: string;
    days: number;
  };
  doctor?: {
    name: string;
    specialization?: string;
  };
  payment: {
    totalAmount: number;
    totalPaid: number;
    paymentStatus: string;
  };
  generatedBy?: string;
}

export function generateGatePass(data: GatePassData): string {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y: number;
  const cx = M + CW / 2;

  // ── Header band ─────────────────────────────────────────────────────
  y = drawHeaderBand(doc, data.hospital, 'Gate Pass', 'Patient Clearance');

  // ── Control strip ───────────────────────────────────────────────────
  y = drawControlStrip(
    doc, y,
    `Admission No: ${data.admission.admissionNumber}`,
    `Discharged: ${formatDateTime(data.admission.dischargedAt)}`,
  );
  y += 4;

  // ── Patient Information ─────────────────────────────────────────────
  y = sectionBand(doc, y, 'Patient Information');
  y = drawInfoTable(doc, y, [
    ['Name', data.patient.name || '—', 'UHID', data.patient.uhid || '—'],
    ['Age / Gender', `${data.patient.age || '—'} / ${data.patient.gender || '—'}`, 'Contact', data.patient.mobile || '—'],
  ]);

  // ── Admission Details ───────────────────────────────────────────────
  y = sectionBand(doc, y, 'Admission Details');
  y = drawInfoTable(doc, y, [
    ['Ward / Bed', `${data.admission.wardName}${data.admission.bedNumber ? ` / Bed ${data.admission.bedNumber}` : ''}`, 'Duration', `${data.admission.days} day${data.admission.days > 1 ? 's' : ''}`],
    ['Admitted On', formatDateTime(data.admission.admittedAt), 'Discharged On', formatDateTime(data.admission.dischargedAt)],
    ['Diagnosis', data.admission.diagnosis || '—', 'Doctor', data.doctor ? data.doctor.name : '—'],
  ]);

  // ── Payment Status ──────────────────────────────────────────────────
  y = sectionBand(doc, y, 'Payment Status', C.amber);
  const balance = Math.max(0, data.payment.totalAmount - data.payment.totalPaid);
  y = drawBillingSummaryRow(doc, y, 'Total Bill', `₹${data.payment.totalAmount.toLocaleString('en-IN')}`, false);
  y = drawBillingSummaryRow(doc, y, 'Total Paid', `₹${data.payment.totalPaid.toLocaleString('en-IN')}`, false);
  y = drawBillingSummaryRow(doc, y, 'Balance Due', balance > 0 ? `₹${balance.toLocaleString('en-IN')}` : 'NIL', true);
  y = drawBillingSummaryRow(doc, y, 'Payment Status', data.payment.paymentStatus, false);
  y += 6;

  // ── Clearance box ───────────────────────────────────────────────────
  rgb(doc, C.green, 'draw');
  doc.setLineWidth(0.8);
  doc.setFillColor(236, 253, 245);
  doc.roundedRect(M, y, CW, 22, 2, 2, 'FD');
  rgb(doc, C.green, 'text');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('PATIENT IS CLEARED FOR DEPARTURE', cx, y + 10, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  rgb(doc, C.txtSec, 'text');
  doc.text(`Issued on ${format(new Date(), 'dd MMM yyyy \'at\' hh:mm a')}`, cx, y + 17, { align: 'center' });
  y += 28;

  // ── Signature lines ─────────────────────────────────────────────────
  rgb(doc, C.fgray, 'draw');
  doc.setLineWidth(0.3);
  doc.line(M, y, M + 60, y);
  doc.line(PW - M - 60, y, PW - M, y);
  y += 4;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  rgb(doc, C.txtSec, 'text');
  doc.text('Authorised Signature', M + 10, y);
  doc.text('Security Gate', PW - M - 45, y);

  // ── Footer ──────────────────────────────────────────────────────────
  drawFooter(doc, data.generatedBy);

  const base64 = pdfToBase64(doc);
  doc.save(`Gate_Pass_${data.admission.admissionNumber}.pdf`);
  return base64;
}
