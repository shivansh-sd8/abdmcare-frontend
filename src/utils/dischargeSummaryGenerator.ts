/**
 * Discharge Summary PDF Generator
 * Generates a comprehensive clinical discharge summary for IPD patients.
 */
import jsPDF from 'jspdf';
import type { HospitalInfo } from './pdfGenerator';
import {
  M, CW, C, rgb, pdfToBase64,
  drawHeaderBand, drawControlStrip, sectionBand,
  drawInfoTable, drawBillingSummaryRow, drawMedicationTable,
  drawSignatureBlock, stampFooterAllPages,
  formatDateTime, wrappedText,
} from './pdfCommon';

// ─── TYPES ────────────────────────────────────────────────────────────────

export interface DischargeSummaryData {
  hospital: HospitalInfo;
  patient: {
    name: string;
    uhid: string;
    age: string | number;
    gender: string;
    mobile: string;
    address?: string;
    bloodGroup?: string;
  };
  admission: {
    admissionNumber: string;
    admittedAt: string;
    dischargedAt: string;
    ward: string;
    bed?: string;
    days: number;
    admissionReason?: string;
    diagnosis?: string;
  };
  doctors: Array<{ name: string; specialization?: string; role?: string }>;
  rounds: Array<{ date: string; doctor: string; notes?: string; diagnosis?: string; vitals?: string }>;
  investigations: Array<{ testName: string; result?: string; date: string; status: string }>;
  medications: Array<{ name: string; dosage: string; frequency: string; duration: string; instructions?: string }>;
  billing: {
    wardCharges: number;
    consultationFee: number;
    labCharges: number;
    medicineCharges: number;
    totalAmount: number;
    advancePaid: number;
    amountCollected: number;
    balance: number;
  };
  followUpInstructions?: string;
  generatedBy?: string;
}

// ─── GENERATOR ────────────────────────────────────────────────────────────

export const generateDischargeSummaryPDF = (data: DischargeSummaryData): string => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y: number;
  const ROW_H = 7;

  const checkPage = (needed = 14) => {
    if (y + needed > 270) { doc.addPage(); y = 15; }
  };

  // ── Header band ────────────────────────────────────────────────────────
  y = drawHeaderBand(doc, data.hospital, 'Discharge Summary');

  // ── Control strip ──────────────────────────────────────────────────────
  y = drawControlStrip(
    doc, y,
    `Admission No: ${data.admission.admissionNumber}`,
    `Discharged: ${formatDateTime(data.admission.dischargedAt)}`,
  );
  y += 4;

  // ── Patient Information ────────────────────────────────────────────────
  y = sectionBand(doc, y, 'Patient Information');
  y = drawInfoTable(doc, y, [
    ['Name', data.patient.name || '—', 'UHID', data.patient.uhid || '—'],
    ['Age / Gender', `${data.patient.age ?? '—'} / ${data.patient.gender || '—'}`, 'Contact', data.patient.mobile || '—'],
    ['Blood Group', data.patient.bloodGroup || '—', 'Address', data.patient.address || '—'],
  ]);

  // ── Admission Details ──────────────────────────────────────────────────
  checkPage(30);
  y = sectionBand(doc, y, 'Admission Details');
  y = drawInfoTable(doc, y, [
    ['Admission No', data.admission.admissionNumber, 'Ward / Bed', `${data.admission.ward}${data.admission.bed ? ` / Bed ${data.admission.bed}` : ''}`],
    ['Admitted', formatDateTime(data.admission.admittedAt), 'Discharged', formatDateTime(data.admission.dischargedAt)],
    ['Days Stayed', `${data.admission.days} day(s)`, 'Reason', data.admission.admissionReason || '—'],
  ]);

  // ── Diagnosis ──────────────────────────────────────────────────────────
  if (data.admission.diagnosis) {
    checkPage(20);
    y = sectionBand(doc, y, 'Diagnosis', C.teal);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    rgb(doc, C.black, 'text');
    const dLines = doc.splitTextToSize(data.admission.diagnosis, CW - 6);
    const dBoxH = Math.max(dLines.length * 5 + 6, 14);
    rgb(doc, C.lightBg, 'fill');
    rgb(doc, C.border, 'draw');
    doc.setLineWidth(0.3);
    doc.rect(M, y, CW, dBoxH, 'FD');
    rgb(doc, C.black, 'text');
    doc.text(dLines, M + 3, y + 6);
    y += dBoxH + 4;
  }

  // ── Attending Doctors ──────────────────────────────────────────────────
  if (data.doctors.length > 0) {
    checkPage(12 + data.doctors.length * 6);
    y = sectionBand(doc, y, 'Attending Doctors');
    data.doctors.forEach((dr, idx) => {
      checkPage(6);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      rgb(doc, C.black, 'text');
      doc.text(`${idx + 1}. ${dr.name}`, M + 2, y);
      const meta = [dr.specialization, dr.role].filter(Boolean).join(' · ');
      if (meta) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        rgb(doc, C.txtSec, 'text');
        doc.text(`(${meta})`, M + 6 + doc.getTextWidth(`${idx + 1}. ${dr.name}`), y);
      }
      y += 6;
    });
    y += 2;
  }

  // ── Course in Hospital (Daily Rounds) ──────────────────────────────────
  if (data.rounds.length > 0) {
    checkPage(15);
    y = sectionBand(doc, y, 'Course in Hospital (Daily Rounds)', C.purple);

    data.rounds.forEach((round, idx) => {
      checkPage(18);
      // Background
      const bgShade: [number, number, number] = idx % 2 === 0 ? [250, 252, 255] : [245, 247, 250];
      doc.setFillColor(...bgShade);
      const roundStartY = y;

      // Estimate round height first, then draw bg
      let tmpY = y;
      tmpY += 5;
      if (round.vitals) tmpY += 4.5;
      if (round.diagnosis) tmpY += Math.max(doc.splitTextToSize(round.diagnosis, CW - 32).length * 4.5, 4.5);
      if (round.notes) tmpY += Math.max(doc.splitTextToSize(round.notes, CW - 24).length * 4.5, 4.5);
      doc.rect(M, roundStartY - 1, CW, tmpY - roundStartY + 3, 'F');

      // Round header
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      rgb(doc, C.navy, 'text');
      doc.text(`${round.date}  —  Dr. ${round.doctor}`, M + 3, y + 1);
      y += 5;

      if (round.vitals) {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        rgb(doc, C.txtSec, 'text');
        doc.text('Vitals:', M + 5, y);
        doc.setFont('helvetica', 'normal');
        rgb(doc, C.black, 'text');
        doc.text(round.vitals, M + 20, y);
        y += 4.5;
      }

      if (round.diagnosis) {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        rgb(doc, C.txtSec, 'text');
        doc.text('Diagnosis:', M + 5, y);
        doc.setFont('helvetica', 'normal');
        rgb(doc, C.black, 'text');
        const dxUsed = wrappedText(doc, round.diagnosis, M + 28, y, CW - 32);
        y += Math.max(dxUsed, 4.5);
      }

      if (round.notes) {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        rgb(doc, C.txtSec, 'text');
        doc.text('Notes:', M + 5, y);
        doc.setFont('helvetica', 'normal');
        rgb(doc, C.black, 'text');
        const nUsed = wrappedText(doc, round.notes, M + 20, y, CW - 24);
        y += Math.max(nUsed, 4.5);
      }

      rgb(doc, C.border, 'draw');
      doc.setLineWidth(0.15);
      doc.line(M, y, M + CW, y);
      y += 3;
    });
    y += 2;
  }

  // ── Investigations ─────────────────────────────────────────────────────
  if (data.investigations.length > 0) {
    checkPage(20);
    y = sectionBand(doc, y, `Investigations (${data.investigations.length})`);

    const invColW = [8, CW * 0.35 - 8, CW * 0.3, CW * 0.2, CW * 0.15];
    const invHeaders = ['#', 'Test Name', 'Result', 'Date', 'Status'];

    doc.setFillColor(230, 238, 252);
    doc.rect(M, y, CW, ROW_H, 'F');
    let ix = M;
    invHeaders.forEach((h, i) => {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      rgb(doc, C.navy, 'text');
      doc.text(h, ix + 2, y + ROW_H - 2.5);
      ix += invColW[i];
    });
    rgb(doc, C.border, 'draw');
    doc.setLineWidth(0.2);
    doc.line(M, y + ROW_H, M + CW, y + ROW_H);
    y += ROW_H;

    data.investigations.forEach((inv, idx) => {
      checkPage(ROW_H);
      const ry = y;
      if (idx % 2 === 0) {
        rgb(doc, C.lightBg, 'fill');
        doc.rect(M, ry, CW, ROW_H, 'F');
      }
      const cells = [`${idx + 1}`, inv.testName, inv.result || '—', inv.date, inv.status];
      let cix = M;
      cells.forEach((cell, i) => {
        doc.setFontSize(8);
        doc.setFont('helvetica', i === 1 ? 'bold' : 'normal');
        rgb(doc, C.black, 'text');
        doc.text(doc.splitTextToSize(cell, invColW[i] - 3)[0], cix + 2, ry + ROW_H - 2.5);
        cix += invColW[i];
      });
      rgb(doc, C.border, 'draw');
      doc.setLineWidth(0.15);
      doc.line(M, ry + ROW_H, M + CW, ry + ROW_H);
      y += ROW_H;
    });

    rgb(doc, C.border, 'draw');
    doc.setLineWidth(0.4);
    doc.rect(M, y - data.investigations.length * ROW_H - ROW_H, CW, (data.investigations.length + 1) * ROW_H);
    y += 5;
  }

  // ── Medications at Discharge ───────────────────────────────────────────
  if (data.medications.length > 0) {
    checkPage(20);
    y = sectionBand(doc, y, `Medications at Discharge (${data.medications.length})`, C.teal);
    y = drawMedicationTable(doc, y, data.medications, checkPage);
  }

  // ── Billing Summary ────────────────────────────────────────────────────
  checkPage(55);
  y = sectionBand(doc, y, 'Billing Summary', C.amber);
  y = drawBillingSummaryRow(doc, y, 'Ward Charges', `₹${data.billing.wardCharges.toLocaleString('en-IN')}`, false);
  y = drawBillingSummaryRow(doc, y, 'Consultation Fee', `₹${data.billing.consultationFee.toLocaleString('en-IN')}`, false);
  y = drawBillingSummaryRow(doc, y, 'Lab Charges', `₹${data.billing.labCharges.toLocaleString('en-IN')}`, false);
  y = drawBillingSummaryRow(doc, y, 'Medicine Charges', `₹${data.billing.medicineCharges.toLocaleString('en-IN')}`, false);
  y = drawBillingSummaryRow(doc, y, 'Total Amount', `₹${data.billing.totalAmount.toLocaleString('en-IN')}`, true);
  y = drawBillingSummaryRow(doc, y, 'Advance Paid', `- ₹${data.billing.advancePaid.toLocaleString('en-IN')}`, false);
  y = drawBillingSummaryRow(doc, y, 'Amount Collected', `₹${data.billing.amountCollected.toLocaleString('en-IN')}`, false);
  y = drawBillingSummaryRow(doc, y, 'Balance Due', `₹${data.billing.balance.toLocaleString('en-IN')}`, true);
  y += 4;

  // ── Follow-up Instructions ─────────────────────────────────────────────
  if (data.followUpInstructions) {
    checkPage(18);
    y = sectionBand(doc, y, 'Follow-Up Instructions', C.green);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    rgb(doc, C.black, 'text');
    const used = wrappedText(doc, data.followUpInstructions, M + 2, y, CW - 4);
    y += Math.max(used, 4) + 5;
  }

  // ── Doctor Signature ───────────────────────────────────────────────────
  checkPage(30);
  if (data.doctors.length > 0) {
    y = drawSignatureBlock(doc, y, data.doctors[0].name, data.doctors[0].specialization);
  }

  // ── Footer (all pages) ─────────────────────────────────────────────────
  stampFooterAllPages(doc, data.generatedBy);

  const base64 = pdfToBase64(doc);
  doc.save(`DischargeSummary-${data.patient.uhid}-${data.admission.admissionNumber}.pdf`);
  return base64;
};
