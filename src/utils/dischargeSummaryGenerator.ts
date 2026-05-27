/**
 * Discharge Summary PDF Generator
 * Generates a comprehensive clinical discharge summary for IPD patients.
 */
import jsPDF from 'jspdf';
import type { HospitalInfo } from './pdfGenerator';

// ─── CONSTANTS (matching pdfGenerator) ────────────────────────────────────

const NAVY:   [number, number, number] = [26,  60, 110];
const WHITE:  [number, number, number] = [255, 255, 255];
const LGRAY:  [number, number, number] = [245, 247, 250];
const BORDER: [number, number, number] = [190, 210, 235];
const TXTD:   [number, number, number] = [20,  20,  40];
const TXTS:   [number, number, number] = [80,  90, 110];
const FGRAY:  [number, number, number] = [130, 140, 155];

const M  = 12;
const PW = 210;
const CW = PW - M * 2;

// ─── HELPERS ──────────────────────────────────────────────────────────────

const sectionBar = (
  doc: jsPDF,
  label: string,
  y: number,
  rightLabel?: string,
  barH = 7,
): void => {
  doc.setFillColor(...NAVY);
  doc.rect(M, y, CW, barH, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(label, M + 3, y + barH - 1.8);
  if (rightLabel) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(rightLabel, M + CW - 3, y + barH - 1.8, { align: 'right' });
  }
  doc.setTextColor(...TXTD);
};

const wrappedText = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH = 4.5,
): number => {
  const lines = doc.splitTextToSize(text, maxW);
  doc.text(lines, x, y);
  return lines.length * lineH;
};

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
  const cx = M + CW / 2;
  let y = 10;

  const checkPage = (needed = 14) => {
    if (y + needed > 270) {
      doc.addPage();
      y = 15;
    }
  };

  // ── Hospital Header ────────────────────────────────────────────────────
  const badgeR = 10;
  const badgeCX = M + badgeR;
  const badgeCY = y + badgeR;

  doc.setFillColor(...NAVY);
  doc.circle(badgeCX, badgeCY, badgeR, 'F');
  doc.setFillColor(...WHITE);
  doc.circle(badgeCX, badgeCY, badgeR - 2, 'F');

  const initials = data.hospital.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(initials, badgeCX, badgeCY + 2, { align: 'center' });

  const nameX = M + badgeR * 2 + 4;
  const nameW = CW - badgeR * 2 - 4;
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text(data.hospital.name, nameX + nameW / 2, y + 7, { align: 'center' });

  const addrStr = [
    data.hospital.addressLine1,
    data.hospital.city,
    data.hospital.state,
    data.hospital.country,
  ]
    .filter(Boolean)
    .join(', ');
  if (addrStr) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TXTS);
    doc.text(addrStr, nameX + nameW / 2, y + 12.5, { align: 'center', maxWidth: nameW });
  }

  const contact = [data.hospital.phone, data.hospital.email, data.hospital.website]
    .filter(Boolean)
    .join('  ·  ');
  if (contact) {
    doc.setFontSize(7);
    doc.setTextColor(...TXTS);
    doc.text(contact, nameX + nameW / 2, y + 17, { align: 'center', maxWidth: nameW });
  }

  y += badgeR * 2 + 5;

  // ── Title ──────────────────────────────────────────────────────────────
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.8);
  doc.line(M, y, M + CW, y);
  y += 1;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text('DISCHARGE SUMMARY', cx, y + 5, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TXTS);
  doc.text(`Admission No: ${data.admission.admissionNumber}`, M, y + 5);
  doc.text(`Discharged: ${data.admission.dischargedAt}`, M + CW, y + 5, { align: 'right' });

  y += 8;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.8);
  doc.line(M, y, M + CW, y);
  y += 4;

  // ── Patient Demographics ───────────────────────────────────────────────
  sectionBar(doc, 'PATIENT INFORMATION', y);
  y += 8;

  const ROW_H = 7;
  const LW = 28;
  const c1x = M;
  const c2x = M + LW;
  const c3x = M + CW / 2;
  const c4x = M + CW / 2 + LW;
  const c2w = CW / 2 - LW;
  const c4w = CW / 2 - LW;

  const patientRows = [
    ['Name', data.patient.name || '—', 'UHID', data.patient.uhid || '—'],
    [
      'Age / Gender',
      `${data.patient.age ?? '—'} / ${data.patient.gender || '—'}`,
      'Contact',
      data.patient.mobile || '—',
    ],
    ['Blood Group', data.patient.bloodGroup || '—', 'Address', data.patient.address || '—'],
  ];

  const ptStart = y;
  patientRows.forEach((row, idx) => {
    const ry = y + idx * ROW_H;
    if (idx % 2 === 0) {
      doc.setFillColor(...LGRAY);
      doc.rect(M, ry, CW, ROW_H, 'F');
    }
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TXTS);
    doc.text(row[0], c1x + 2, ry + ROW_H - 2.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TXTD);
    doc.text(doc.splitTextToSize(row[1], c2w + 5)[0], c2x + 2, ry + ROW_H - 2.5);

    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(c3x, ry, c3x, ry + ROW_H);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TXTS);
    doc.text(row[2], c3x + 2, ry + ROW_H - 2.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TXTD);
    doc.text(doc.splitTextToSize(row[3], c4w - 2)[0], c4x + 2, ry + ROW_H - 2.5);

    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.15);
    doc.line(M, ry + ROW_H, M + CW, ry + ROW_H);
  });

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  doc.rect(M, ptStart, CW, patientRows.length * ROW_H);
  y += patientRows.length * ROW_H + 4;

  // ── Admission Details ──────────────────────────────────────────────────
  checkPage(30);
  sectionBar(doc, 'ADMISSION DETAILS', y);
  y += 8;

  const admRows = [
    ['Admission No', data.admission.admissionNumber, 'Ward / Bed', `${data.admission.ward}${data.admission.bed ? ` / Bed ${data.admission.bed}` : ''}`],
    ['Admitted', data.admission.admittedAt, 'Discharged', data.admission.dischargedAt],
    ['Days Stayed', `${data.admission.days} day(s)`, 'Reason', data.admission.admissionReason || '—'],
  ];

  const admStart = y;
  admRows.forEach((row, idx) => {
    const ry = y + idx * ROW_H;
    if (idx % 2 === 0) {
      doc.setFillColor(...LGRAY);
      doc.rect(M, ry, CW, ROW_H, 'F');
    }
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TXTS);
    doc.text(row[0], c1x + 2, ry + ROW_H - 2.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TXTD);
    doc.text(doc.splitTextToSize(row[1], c2w + 5)[0], c2x + 2, ry + ROW_H - 2.5);

    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(c3x, ry, c3x, ry + ROW_H);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TXTS);
    doc.text(row[2], c3x + 2, ry + ROW_H - 2.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TXTD);
    doc.text(doc.splitTextToSize(row[3], c4w - 2)[0], c4x + 2, ry + ROW_H - 2.5);

    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.15);
    doc.line(M, ry + ROW_H, M + CW, ry + ROW_H);
  });

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  doc.rect(M, admStart, CW, admRows.length * ROW_H);
  y += admRows.length * ROW_H + 4;

  // ── Diagnosis ──────────────────────────────────────────────────────────
  if (data.admission.diagnosis) {
    checkPage(20);
    sectionBar(doc, 'DIAGNOSIS', y);
    y += 8;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TXTD);
    const dLines = doc.splitTextToSize(data.admission.diagnosis, CW - 6);
    const dBoxH = Math.max(dLines.length * 5 + 6, 14);
    doc.setFillColor(...LGRAY);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.rect(M, y, CW, dBoxH, 'FD');
    doc.text(dLines, M + 3, y + 6);
    y += dBoxH + 4;
  }

  // ── Attending Doctors ──────────────────────────────────────────────────
  if (data.doctors.length > 0) {
    checkPage(12 + data.doctors.length * 6);
    sectionBar(doc, 'ATTENDING DOCTORS', y);
    y += 8;

    data.doctors.forEach((dr, idx) => {
      checkPage(6);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...TXTD);
      doc.text(`${idx + 1}. ${dr.name}`, M + 2, y);
      const meta = [dr.specialization, dr.role].filter(Boolean).join(' · ');
      if (meta) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...TXTS);
        doc.text(`(${meta})`, M + 6 + doc.getTextWidth(`${idx + 1}. ${dr.name}`), y);
      }
      y += 6;
    });
    y += 2;
  }

  // ── Course in Hospital (Daily Rounds) ──────────────────────────────────
  if (data.rounds.length > 0) {
    checkPage(15);
    sectionBar(doc, 'COURSE IN HOSPITAL (DAILY ROUNDS)', y);
    y += 8;

    data.rounds.forEach((round, idx) => {
      checkPage(18);

      doc.setFillColor(idx % 2 === 0 ? 250 : 245, idx % 2 === 0 ? 252 : 247, idx % 2 === 0 ? 255 : 250);
      const roundStartY = y;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY);
      doc.text(`${round.date}  —  Dr. ${round.doctor}`, M + 3, y + 1);
      y += 5;

      if (round.vitals) {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...TXTS);
        doc.text('Vitals:', M + 5, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...TXTD);
        doc.text(round.vitals, M + 20, y);
        y += 4.5;
      }

      if (round.diagnosis) {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...TXTS);
        doc.text('Diagnosis:', M + 5, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...TXTD);
        const dxUsed = wrappedText(doc, round.diagnosis, M + 28, y, CW - 32);
        y += Math.max(dxUsed, 4.5);
      }

      if (round.notes) {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...TXTS);
        doc.text('Notes:', M + 5, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...TXTD);
        const nUsed = wrappedText(doc, round.notes, M + 20, y, CW - 24);
        y += Math.max(nUsed, 4.5);
      }

      const roundH = y - roundStartY + 2;
      doc.setFillColor(idx % 2 === 0 ? 250 : 245, idx % 2 === 0 ? 252 : 247, idx % 2 === 0 ? 255 : 250);
      doc.rect(M, roundStartY - 3, CW, roundH, 'F');

      // Re-draw text on top of background
      let ry2 = roundStartY;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY);
      doc.text(`${round.date}  —  Dr. ${round.doctor}`, M + 3, ry2 + 1);
      ry2 += 5;

      if (round.vitals) {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...TXTS);
        doc.text('Vitals:', M + 5, ry2);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...TXTD);
        doc.text(round.vitals, M + 20, ry2);
        ry2 += 4.5;
      }

      if (round.diagnosis) {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...TXTS);
        doc.text('Diagnosis:', M + 5, ry2);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...TXTD);
        wrappedText(doc, round.diagnosis, M + 28, ry2, CW - 32);
      }

      if (round.notes) {
        const nOffset = round.diagnosis
          ? Math.max(doc.splitTextToSize(round.diagnosis, CW - 32).length * 4.5, 4.5)
          : 0;
        const notesY = (round.diagnosis ? ry2 + nOffset : ry2);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...TXTS);
        doc.text('Notes:', M + 5, notesY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...TXTD);
        wrappedText(doc, round.notes, M + 20, notesY, CW - 24);
      }

      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.15);
      doc.line(M, y, M + CW, y);
      y += 3;
    });
    y += 2;
  }

  // ── Investigations ─────────────────────────────────────────────────────
  if (data.investigations.length > 0) {
    checkPage(20);
    sectionBar(doc, `INVESTIGATIONS (${data.investigations.length})`, y);
    y += 8;

    const invColW = [8, CW * 0.35 - 8, CW * 0.3, CW * 0.2, CW * 0.15];
    const invHeaders = ['#', 'Test Name', 'Result', 'Date', 'Status'];

    doc.setFillColor(230, 238, 252);
    doc.rect(M, y, CW, ROW_H, 'F');
    let ix = M;
    invHeaders.forEach((h, i) => {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY);
      doc.text(h, ix + 2, y + ROW_H - 2.5);
      ix += invColW[i];
    });
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(M, y + ROW_H, M + CW, y + ROW_H);
    y += ROW_H;

    data.investigations.forEach((inv, idx) => {
      checkPage(ROW_H);
      const ry = y;
      if (idx % 2 === 0) {
        doc.setFillColor(...LGRAY);
        doc.rect(M, ry, CW, ROW_H, 'F');
      }
      const cells = [`${idx + 1}`, inv.testName, inv.result || '—', inv.date, inv.status];
      let cix = M;
      cells.forEach((cell, i) => {
        doc.setFontSize(8);
        doc.setFont('helvetica', i === 1 ? 'bold' : 'normal');
        doc.setTextColor(...TXTD);
        doc.text(doc.splitTextToSize(cell, invColW[i] - 3)[0], cix + 2, ry + ROW_H - 2.5);
        cix += invColW[i];
      });
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.15);
      doc.line(M, ry + ROW_H, M + CW, ry + ROW_H);
      y += ROW_H;
    });

    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.4);
    doc.rect(M, y - data.investigations.length * ROW_H - ROW_H, CW, (data.investigations.length + 1) * ROW_H);
    y += 5;
  }

  // ── Medications at Discharge ───────────────────────────────────────────
  if (data.medications.length > 0) {
    checkPage(20);
    sectionBar(doc, `MEDICATIONS AT DISCHARGE  (${data.medications.length})`, y);
    y += 8;

    const medColW = [8, 50, 22, 28, 22, CW - 8 - 50 - 22 - 28 - 22];
    const medColX = medColW.reduce<number[]>((acc, _w) => {
      acc.push((acc[acc.length - 1] ?? M) + (acc.length > 0 ? medColW[acc.length - 1] : 0));
      return acc;
    }, []);
    medColX.unshift(M);
    medColX.pop();

    const medHeaders = ['#', 'Medicine', 'Dosage', 'Frequency', 'Duration', 'Instructions'];
    const MED_H = 8;

    doc.setFillColor(230, 238, 252);
    doc.rect(M, y, CW, MED_H, 'F');
    medHeaders.forEach((h, i) => {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY);
      doc.text(h, medColX[i] + 2, y + MED_H - 2.5);
    });
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(M, y + MED_H, M + CW, y + MED_H);
    y += MED_H;

    data.medications.forEach((med, idx) => {
      checkPage(MED_H);
      const ry = y;
      if (idx % 2 === 0) {
        doc.setFillColor(...LGRAY);
        doc.rect(M, ry, CW, MED_H, 'F');
      }
      const cells = [`${idx + 1}`, med.name, med.dosage, med.frequency, med.duration, med.instructions || '—'];
      cells.forEach((cell, i) => {
        doc.setFontSize(8);
        doc.setFont('helvetica', i === 1 ? 'bold' : 'normal');
        doc.setTextColor(...TXTD);
        doc.text(doc.splitTextToSize(cell, medColW[i] - 3)[0], medColX[i] + 2, ry + MED_H - 2.5);
      });
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.15);
      doc.line(M, ry + MED_H, M + CW, ry + MED_H);
      y += MED_H;
    });

    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.4);
    doc.rect(M, y - data.medications.length * MED_H - MED_H, CW, (data.medications.length + 1) * MED_H);
    y += 5;
  }

  // ── Billing Summary ────────────────────────────────────────────────────
  checkPage(55);
  sectionBar(doc, 'BILLING SUMMARY', y);
  y += 8;

  const billRow = (label: string, value: string, highlight = false) => {
    checkPage(10);
    if (highlight) {
      doc.setFillColor(...NAVY);
      doc.rect(M, y, CW, 9, 'F');
      doc.setTextColor(...WHITE);
    } else {
      doc.setFillColor(...LGRAY);
      doc.rect(M, y, CW, 9, 'F');
      doc.setTextColor(...TXTD);
    }
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(label, M + 4, y + 6.3);
    doc.text(value, M + CW - 4, y + 6.3, { align: 'right' });
    y += 10;
  };

  billRow('Ward Charges', `₹${data.billing.wardCharges.toLocaleString('en-IN')}`, false);
  billRow('Consultation Fee', `₹${data.billing.consultationFee.toLocaleString('en-IN')}`, false);
  billRow('Lab Charges', `₹${data.billing.labCharges.toLocaleString('en-IN')}`, false);
  billRow('Medicine Charges', `₹${data.billing.medicineCharges.toLocaleString('en-IN')}`, false);
  billRow('Total Amount', `₹${data.billing.totalAmount.toLocaleString('en-IN')}`, true);
  billRow('Advance Paid', `- ₹${data.billing.advancePaid.toLocaleString('en-IN')}`, false);
  billRow('Amount Collected', `₹${data.billing.amountCollected.toLocaleString('en-IN')}`, false);
  billRow('Balance Due', `₹${data.billing.balance.toLocaleString('en-IN')}`, true);
  y += 2;

  // ── Follow-up Instructions ─────────────────────────────────────────────
  if (data.followUpInstructions) {
    checkPage(18);
    sectionBar(doc, 'FOLLOW-UP INSTRUCTIONS', y);
    y += 8;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TXTD);
    const used = wrappedText(doc, data.followUpInstructions, M + 2, y, CW - 4);
    y += Math.max(used, 4) + 5;
  }

  // ── Doctor Signature ───────────────────────────────────────────────────
  checkPage(20);
  const sigBoxW = 60;
  const sigBoxH = 18;
  const sigX = M + CW - sigBoxW;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TXTS);
  doc.text('Authorised Signature', sigX + sigBoxW / 2, y - 1, { align: 'center' });

  doc.setFillColor(250, 252, 255);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.5);
  doc.rect(sigX, y, sigBoxW, sigBoxH, 'FD');
  y += sigBoxH + 4;

  if (data.doctors.length > 0) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text(data.doctors[0].name, sigX + sigBoxW / 2, y, { align: 'center' });

    if (data.doctors[0].specialization) {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TXTS);
      doc.text(data.doctors[0].specialization, sigX + sigBoxW / 2, y + 4, { align: 'center' });
    }
  }

  // ── Footer (all pages) ─────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    const footerY = 283;
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.4);
    doc.line(M, footerY, M + CW, footerY);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...FGRAY);
    doc.text(
      'This document is computer generated. No manual signature required unless specified.',
      cx,
      footerY + 3.5,
      { align: 'center' },
    );
    const footerMeta = [
      `Generated: ${new Date().toLocaleString('en-IN')}`,
      data.generatedBy ? `By: ${data.generatedBy}` : '',
      `Page ${i} of ${pageCount}`,
    ]
      .filter(Boolean)
      .join('   ·   ');
    doc.text(footerMeta, cx, footerY + 7, { align: 'center' });
  }

  const base64 = doc.output('base64');
  doc.save(`DischargeSummary-${data.patient.uhid}-${data.admission.admissionNumber}.pdf`);
  return base64;
};
