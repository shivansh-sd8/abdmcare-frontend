/**
 * Advance Payment Slip PDF Generator
 * A compact single-page receipt for advance payments.
 */
import jsPDF from 'jspdf';
import { format } from 'date-fns';

export interface AdvanceSlipData {
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
    age?: string | number;
  };
  payment: {
    receiptNumber?: string;
    amount: number;
    paymentMethod?: string;
    description?: string;
    paidAt?: string;
    transactionId?: string;
    purpose?: string;     // e.g. "OPD Advance", "IPD Advance", "Consultation"
    balanceDue?: number;
  };
  generatedBy?: string;
}

export function generateAdvanceSlip(data: AdvanceSlipData): void {
  const { hospital, patient, payment, generatedBy } = data;
  const doc = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'portrait' });

  const PW = 148; // A5 width
  const M  = 12;
  const CW = PW - M * 2;
  const genDate = format(new Date(), 'dd MMM yyyy, hh:mm a');
  const paidDate = payment.paidAt
    ? format(new Date(payment.paidAt), 'dd MMM yyyy, hh:mm a')
    : genDate;

  let y = 0;

  // ── Hospital header band ────────────────────────────────────────────────
  doc.setFillColor(26, 60, 110);
  doc.rect(0, 0, PW, 28, 'F');

  const initials = hospital.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  doc.setFillColor(255, 255, 255);
  doc.circle(M + 7, 14, 6, 'F');
  doc.setTextColor(26, 60, 110);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(initials, M + 7, 16, { align: 'center' });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(hospital.name, M + 18, 11);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  const addr = [hospital.addressLine1, hospital.city, hospital.state].filter(Boolean).join(', ');
  doc.text(addr, M + 18, 16.5);
  if (hospital.phone) doc.text(hospital.phone, M + 18, 21);

  // Title strip
  doc.setFillColor(14, 44, 85);
  doc.rect(0, 28, PW, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('ADVANCE PAYMENT RECEIPT', PW / 2, 33.5, { align: 'center' });

  y = 42;

  // ── Receipt meta ────────────────────────────────────────────────────────
  doc.setFillColor(240, 244, 248);
  doc.rect(M, y, CW, 18, 'F');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 110, 125);

  const halfW = CW / 2;

  doc.text('RECEIPT NO', M + 2, y + 5);
  doc.text('DATE & TIME', M + halfW + 2, y + 5);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(payment.receiptNumber || 'AUTO', M + 2, y + 11.5);
  doc.text(paidDate, M + halfW + 2, y + 11.5);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 110, 125);
  doc.text('PAYMENT MODE', M + 2, y + 16);
  if (payment.transactionId) doc.text('TRANSACTION ID', M + halfW + 2, y + 16);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  doc.text(payment.paymentMethod || 'CASH', M + 2, y + 21.5);
  if (payment.transactionId) doc.text(payment.transactionId, M + halfW + 2, y + 21.5);

  y += 22;

  // ── Patient details ─────────────────────────────────────────────────────
  y += 4;
  doc.setFillColor(26, 60, 110);
  doc.rect(M, y, CW, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('PATIENT DETAILS', M + 2, y + 4.3);
  y += 7;

  doc.setFillColor(248, 250, 252);
  doc.rect(M, y, CW, 16, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 110, 125);
  doc.text('NAME', M + 2, y + 5);
  doc.text('UHID', M + halfW + 2, y + 5);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(patient.name, M + 2, y + 11);
  doc.text(patient.uhid, M + halfW + 2, y + 11);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 110, 125);
  if (patient.mobile) doc.text(`Mobile: ${patient.mobile}`, M + 2, y + 15.5);
  if (patient.gender || patient.age) {
    doc.text(`${patient.gender ?? ''} ${patient.age ? `· Age: ${patient.age}` : ''}`.trim(), M + halfW + 2, y + 15.5);
  }
  y += 19;

  // ── Payment details ─────────────────────────────────────────────────────
  y += 3;
  doc.setFillColor(22, 160, 133);
  doc.rect(M, y, CW, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT DETAILS', M + 2, y + 4.3);
  y += 7;

  doc.setFillColor(230, 248, 244);
  doc.rect(M, y, CW, 8, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 110, 125);
  doc.text('PURPOSE / DESCRIPTION', M + 2, y + 5);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  doc.text(payment.purpose || payment.description || 'Advance Payment', M + 2, y + 11);
  y += 13;

  // Amount box
  doc.setFillColor(26, 60, 110);
  doc.rect(M, y, CW, 16, 'F');
  doc.setTextColor(200, 215, 240);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('AMOUNT RECEIVED', PW / 2, y + 5, { align: 'center' });
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(`₹ ${payment.amount.toLocaleString('en-IN')}`, PW / 2, y + 13.5, { align: 'center' });
  y += 18;

  if (payment.balanceDue !== undefined) {
    doc.setFillColor(255, 240, 220);
    doc.rect(M, y, CW, 7, 'F');
    doc.setTextColor(160, 80, 0);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`Balance Due: ₹ ${payment.balanceDue.toLocaleString('en-IN')}`, PW / 2, y + 5, { align: 'center' });
    y += 9;
  }

  // ── Footer ───────────────────────────────────────────────────────────────
  y += 6;
  doc.setDrawColor(200, 210, 225);
  doc.setLineWidth(0.25);
  doc.line(M, y, M + CW, y);
  y += 4;
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(140, 150, 165);
  doc.text(`Generated on ${genDate}${generatedBy ? ` · By: ${generatedBy}` : ''}`, M, y);
  doc.text('This is a computer-generated receipt and is valid without signature.', M, y + 4);
  if (hospital.registrationNumber) {
    doc.text(`Reg No: ${hospital.registrationNumber}`, PW - M, y, { align: 'right' });
  }

  const filename = `AdvanceSlip_${patient.uhid}_${format(new Date(), 'ddMMMyyyy')}.pdf`;
  doc.save(filename);
}
