import jsPDF from 'jspdf';

// ─── TYPES ─────────────────────────────────────────────────────────────────

export interface HospitalInfo {
  name: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  gstNumber?: string;
}

export interface VitalsInfo {
  recordedAt?: string;
  height?: number | string;
  weight?: number | string;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  temperature?: number | string;
  bmi?: number | string;
  oxygenSaturation?: number;
  respiratoryRate?: number;
}

export interface PrescriptionItem {
  medicineName: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
}

export interface LabOrderItem {
  testName: string;
  testType?: string;
  priority?: string;
}

export interface ConsultationInfo {
  chiefComplaint?: string;
  provisionalDiagnosis?: string;
  finalDiagnosis?: string;
  notes?: string;
  followUpDate?: string;
  prescriptions?: PrescriptionItem[];
  labOrders?: LabOrderItem[];
}

export interface OPDCardData {
  opdCardNumber: string;
  issueDate: string;
  hospital: HospitalInfo;
  patient: {
    name: string;
    uhid: string;
    age: number | string;
    gender: string;
    mobile: string;
    address?: string | Record<string, any>;
    relationName?: string;
  };
  appointment: {
    doctor: string;
    doctorRegistrationNo?: string;
    doctorSignatureBase64?: string;
    department?: string;
    fees?: string;
    paymentMode?: string;
  };
  generatedBy?: string;
  vitals?: VitalsInfo;
  consultation?: ConsultationInfo;
}

// ─── CONSTANTS ─────────────────────────────────────────────────────────────

const NAVY:   [number, number, number] = [26,  60, 110];
const WHITE:  [number, number, number] = [255, 255, 255];
const LGRAY:  [number, number, number] = [245, 247, 250];
const BORDER: [number, number, number] = [190, 210, 235];
const TXTD:   [number, number, number] = [20,  20,  40];
const TXTS:   [number, number, number] = [80,  90, 110];
const FGRAY:  [number, number, number] = [130, 140, 155];
const MINT:   [number, number, number] = [235, 242, 252];

const M  = 12;
const PW = 210;
const CW = PW - M * 2;

// ─── HELPERS ───────────────────────────────────────────────────────────────

const formatAddress = (addr?: string | Record<string, any>): string => {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  return [
    (addr as any).line1 || (addr as any).addressLine1 || '',
    (addr as any).city  || '',
    (addr as any).state || '',
    (addr as any).pincode || (addr as any).zip || '',
  ].filter(Boolean).join(', ');
};

const sectionBar = (
  doc: jsPDF,
  label: string,
  y: number,
  rightLabel?: string,
  barH = 7
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

// Wrap long text into fixed-width box; returns how many mm were used
const wrappedText = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH = 4.5
): number => {
  const lines = doc.splitTextToSize(text, maxW);
  doc.text(lines, x, y);
  return lines.length * lineH;
};

// ─── MAIN GENERATOR ────────────────────────────────────────────────────────

export const generateOPDCardPDF = (data: OPDCardData): void => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const cx = M + CW / 2;

  // Track position
  let y = 10;

  // ── 1. COMPACT HEADER ──────────────────────────────────────────────────────
  // One-line: badge + hospital name + contact in one row
  const badgeR  = 10;
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

  // Hospital name
  const nameX = M + badgeR * 2 + 4;
  const nameW = CW - badgeR * 2 - 4;
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text(data.hospital.name, nameX + nameW / 2, y + 7, { align: 'center' });

  // Address row
  const addrStr = [
    data.hospital.addressLine1, data.hospital.city,
    data.hospital.state, data.hospital.country,
  ].filter(Boolean).join(', ');
  if (addrStr) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TXTS);
    doc.text(addrStr, nameX + nameW / 2, y + 12.5, { align: 'center', maxWidth: nameW });
  }

  // Contact row (phone | email | website | gst)
  const contact = [
    data.hospital.phone,
    data.hospital.email,
    data.hospital.website,
    data.hospital.gstNumber ? `GST: ${data.hospital.gstNumber}` : '',
  ].filter(Boolean).join('  ·  ');
  if (contact) {
    doc.setFontSize(7);
    doc.setTextColor(...TXTS);
    doc.text(contact, nameX + nameW / 2, y + 17, { align: 'center', maxWidth: nameW });
  }

  y += badgeR * 2 + 5;

  // ── 2. DIVIDER + TITLE ─────────────────────────────────────────────────────
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.8);
  doc.line(M, y, M + CW, y);
  y += 1;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text('OPD CARD', cx, y + 5, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TXTS);
  doc.text(`Card No: ${data.opdCardNumber}`, M, y + 5);
  doc.text(`Date: ${data.issueDate}`, M + CW, y + 5, { align: 'right' });

  y += 8;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.8);
  doc.line(M, y, M + CW, y);
  y += 4;

  // ── 3. PATIENT INFORMATION (compact 2-row layout) ──────────────────────────
  sectionBar(doc, 'PATIENT INFORMATION', y);
  y += 8;

  const ROW_H = 7;
  const LW    = 28;
  const c1x   = M;
  const c2x   = M + LW;
  const c3x   = M + CW / 2;
  const c4x   = M + CW / 2 + LW;
  const c2w   = CW / 2 - LW;
  const c4w   = CW / 2 - LW;

  const patientRows = [
    ['UHID',          data.patient.uhid || '—',       'Date',         data.issueDate],
    ['Name',          data.patient.name || '—',        'Contact',      data.patient.mobile || '—'],
    ['Age / Gender',  `${data.patient.age ?? '—'} / ${data.patient.gender || '—'}`,
     'Address',       formatAddress(data.patient.address)],
    ['Doctor',        data.appointment.doctor || '—',  'Department',   data.appointment.department || '—'],
    ['Fees',          data.appointment.fees || '₹0',   'Mode',         data.appointment.paymentMode || '—'],
    ['Generated By',  data.generatedBy || 'System',    'Relation',     data.patient.relationName || '—'],
  ];

  const tableStart = y;
  patientRows.forEach((row, idx) => {
    const ry = y + idx * ROW_H;
    if (idx % 2 === 0) {
      doc.setFillColor(...LGRAY);
      doc.rect(M, ry, CW, ROW_H, 'F');
    }

    // Left label
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TXTS);
    doc.text(row[0], c1x + 2, ry + ROW_H - 2.5);

    // Left value
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TXTD);
    const lv = doc.splitTextToSize(row[1], c2w + 5);
    doc.text(lv[0], c2x + 2, ry + ROW_H - 2.5);

    // Mid divider
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(c3x, ry, c3x, ry + ROW_H);

    // Right label
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TXTS);
    doc.text(row[2], c3x + 2, ry + ROW_H - 2.5);

    // Right value
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TXTD);
    const rv = doc.splitTextToSize(row[3], c4w - 2);
    doc.text(rv[0], c4x + 2, ry + ROW_H - 2.5);

    // Row bottom border
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.15);
    doc.line(M, ry + ROW_H, M + CW, ry + ROW_H);
  });

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  doc.rect(M, tableStart, CW, patientRows.length * ROW_H);
  y += patientRows.length * ROW_H + 4;

  // ── 4. OPD TIMING — right after patient info ──────────────────────────────
  doc.setFillColor(...MINT);
  doc.rect(M, y, CW, 7.5, 'F');
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.25);
  doc.rect(M, y, CW, 7.5);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text('OPD TIMING:', M + 3, y + 5.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TXTS);
  doc.text('MON – SAT  |  09:00 AM – 06:00 PM', M + 30, y + 5.2);
  y += 11;

  // ── 5. VITALS (if present) ─────────────────────────────────────────────────
  if (data.vitals) {
    const recLabel = data.vitals.recordedAt ? `Recorded: ${data.vitals.recordedAt}` : '';
    sectionBar(doc, 'VITALS', y, recLabel);
    y += 8;

    const vItems: [string, string][] = [];
    if (data.vitals.height != null)       vItems.push(['Height',       `${data.vitals.height} ft`]);
    if (data.vitals.weight != null)       vItems.push(['Weight',       `${data.vitals.weight} kg`]);
    if (data.vitals.bloodPressureSystolic != null)
      vItems.push(['BP', `${data.vitals.bloodPressureSystolic}/${data.vitals.bloodPressureDiastolic} mmHg`]);
    if (data.vitals.heartRate != null)    vItems.push(['Pulse',        `${data.vitals.heartRate} bpm`]);
    if (data.vitals.temperature != null)  vItems.push(['Temperature',  `${data.vitals.temperature} °F`]);
    if (data.vitals.bmi != null)          vItems.push(['BMI',          `${data.vitals.bmi}`]);
    if (data.vitals.oxygenSaturation != null) vItems.push(['O₂ Sat',   `${data.vitals.oxygenSaturation}%`]);
    if (data.vitals.respiratoryRate != null)  vItems.push(['Resp Rate', `${data.vitals.respiratoryRate}/min`]);

    if (vItems.length > 0) {
      const VCOLS = 4;
      const CELL_W = CW / VCOLS;
      const CELL_H = 10;
      const vRows = Math.ceil(vItems.length / VCOLS);
      const vStart = y;

      vItems.forEach(([lbl, val], idx) => {
        const col = idx % VCOLS;
        const row = Math.floor(idx / VCOLS);
        const cx2 = M + col * CELL_W;
        const cy2 = y + row * CELL_H;

        if ((row + col) % 2 === 0) {
          doc.setFillColor(...LGRAY);
          doc.rect(cx2, cy2, CELL_W, CELL_H, 'F');
        }
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...TXTS);
        doc.text(lbl, cx2 + 2, cy2 + 4);

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...NAVY);
        doc.text(val, cx2 + 2, cy2 + 8.5);

        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.2);
        doc.rect(cx2, cy2, CELL_W, CELL_H);
      });

      // Empty padding cells
      for (let idx = vItems.length; idx < vRows * VCOLS; idx++) {
        const col = idx % VCOLS;
        const row = Math.floor(idx / VCOLS);
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.2);
        doc.rect(M + col * CELL_W, y + row * CELL_H, CELL_W, CELL_H);
      }

      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.4);
      doc.rect(M, vStart, CW, vRows * CELL_H);
      y += vRows * CELL_H + 5;
    }
  }

  // ── 6. CHIEF COMPLAINT — always shown; pre-filled or blank for handwriting ──
  const c = data.consultation;
  sectionBar(doc, 'CHIEF COMPLAINT / SYMPTOMS', y);
  y += 8;

  const chiefComplaintText = c?.chiefComplaint?.trim() || '';
  if (chiefComplaintText) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TXTD);
    const lines = doc.splitTextToSize(chiefComplaintText, CW - 6);
    const textH = lines.length * 5;
    const boxH  = Math.max(textH + 6, 22);
    doc.setFillColor(...LGRAY);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.rect(M, y, CW, boxH, 'FD');
    doc.text(lines, M + 3, y + 6);
    y += boxH + 5;
  } else {
    // Empty box for receptionist / doctor to write
    doc.setFillColor(252, 254, 255);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.rect(M, y, CW, 28, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(200, 210, 220);
    doc.text('(To be filled by the doctor / receptionist)', M + 3, y + 8);
    y += 33;
  }

  // ── 7. DIAGNOSIS ──────────────────────────────────────────────────────────
  if (c?.provisionalDiagnosis || c?.finalDiagnosis) {
    sectionBar(doc, 'DIAGNOSIS', y);
    y += 8;
    if (c.provisionalDiagnosis) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...TXTS);
      doc.text('Provisional:', M + 2, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TXTD);
      const pvLines = doc.splitTextToSize(c.provisionalDiagnosis, CW - 30);
      doc.text(pvLines[0], M + 28, y);
      y += 6;
    }
    if (c.finalDiagnosis) {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY);
      doc.text('Final Diagnosis:', M + 2, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TXTD);
      const fdLines = doc.splitTextToSize(c.finalDiagnosis, CW - 38);
      doc.text(fdLines[0], M + 36, y);
      y += 6;
    }
    y += 2;
  }

  // ── 8. PRESCRIPTION ───────────────────────────────────────────────────────
  if (c?.prescriptions && c.prescriptions.length > 0) {
    sectionBar(doc, `PRESCRIPTION  (${c.prescriptions.length} Medicine${c.prescriptions.length > 1 ? 's' : ''})`, y);
    y += 8;

    const colWidths = [8, 60, 22, 28, 22, CW - 8 - 60 - 22 - 28 - 22];
    const colX = colWidths.reduce<number[]>((acc, _w) => {
      acc.push((acc[acc.length - 1] ?? M) + (acc.length > 0 ? colWidths[acc.length - 1] : 0));
      return acc;
    }, []);
    colX.unshift(M);
    colX.pop();

    const headers = ['#', 'Medicine Name', 'Dosage', 'Frequency', 'Duration', 'Instructions'];
    const RX_H = 8;

    doc.setFillColor(230, 238, 252);
    doc.rect(M, y, CW, RX_H, 'F');
    headers.forEach((h, i) => {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY);
      doc.text(h, colX[i] + 2, y + RX_H - 2.5);
    });
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(M, y + RX_H, M + CW, y + RX_H);
    y += RX_H;

    c.prescriptions.forEach((rx, idx) => {
      const ry = y;
      if (idx % 2 === 0) {
        doc.setFillColor(...LGRAY);
        doc.rect(M, ry, CW, RX_H, 'F');
      }
      const cells = [
        `${idx + 1}`,
        rx.medicineName || '—',
        rx.dosage || '—',
        rx.frequency || '—',
        rx.duration || '—',
        rx.instructions || '—',
      ];
      cells.forEach((cell, i) => {
        doc.setFontSize(8);
        doc.setFont('helvetica', i === 1 ? 'bold' : 'normal');
        doc.setTextColor(...TXTD);
        const truncated = doc.splitTextToSize(cell, colWidths[i] - 3)[0];
        doc.text(truncated, colX[i] + 2, ry + RX_H - 2.5);
      });
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.15);
      doc.line(M, ry + RX_H, M + CW, ry + RX_H);
      y += RX_H;
    });

    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.4);
    doc.rect(M, y - c.prescriptions.length * RX_H - RX_H, CW, (c.prescriptions.length + 1) * RX_H);
    y += 5;
  }

  // ── 9. INVESTIGATIONS ─────────────────────────────────────────────────────
  if (c?.labOrders && c.labOrders.length > 0) {
    sectionBar(doc, `INVESTIGATIONS  (${c.labOrders.length})`, y);
    y += 8;

    const perCol = Math.ceil(c.labOrders.length / 2);
    const half   = Math.ceil(c.labOrders.length / 2);
    const colX2  = [M + 2, M + CW / 2 + 2];

    for (let i = 0; i < perCol; i++) {
      const leftItem  = c.labOrders[i];
      const rightItem = c.labOrders[i + half];
      if (leftItem) {
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...TXTD);
        doc.text(`${i + 1}. ${leftItem.testName}`, colX2[0], y);
      }
      if (rightItem) {
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...TXTD);
        doc.text(`${i + half + 1}. ${rightItem.testName}`, colX2[1], y);
      }
      y += 5;
    }
    y += 3;
  }

  // ── 10. FOLLOW-UP ─────────────────────────────────────────────────────────
  if (c?.followUpDate) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text('Follow-up Date:', M + 2, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TXTD);
    doc.text(
      new Date(c.followUpDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      M + 34, y
    );
    y += 7;
  }

  // ── 11. NOTES ─────────────────────────────────────────────────────────────
  if (c?.notes) {
    sectionBar(doc, 'NOTES / INSTRUCTIONS', y);
    y += 8;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TXTD);
    const used = wrappedText(doc, c.notes, M + 2, y, CW - 4);
    y += Math.max(used, 4) + 5;
  }

  // ── 7. DOCTOR SIGNATURE — always at very bottom ───────────────────────────
  // Reserve footer space: footer at 280, signature block needs ~40mm
  const sigAreaBottom = 278;
  const sigAreaTop    = sigAreaBottom - 42;

  // Draw signature block at fixed bottom position
  const sigBoxW = 60;
  const sigBoxH = 26;
  const sigX    = M + CW - sigBoxW;
  const sigY    = sigAreaTop + 5;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TXTS);
  doc.text('Authorised Signature', sigX + sigBoxW / 2, sigY - 1, { align: 'center' });

  // Signature box
  doc.setFillColor(250, 252, 255);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.5);
  doc.rect(sigX, sigY, sigBoxW, sigBoxH, 'FD');

  if (data.appointment.doctorSignatureBase64) {
    try {
      doc.addImage(
        data.appointment.doctorSignatureBase64,
        'PNG',
        sigX + 2,
        sigY + 1,
        sigBoxW - 4,
        sigBoxH - 4
      );
    } catch (_) {
      // silently skip bad image
    }
  }

  const nameY = sigY + sigBoxH + 4;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text(data.appointment.doctor, sigX + sigBoxW / 2, nameY, { align: 'center' });

  if (data.appointment.doctorRegistrationNo) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TXTS);
    doc.text(
      `Reg. No: ${data.appointment.doctorRegistrationNo}`,
      sigX + sigBoxW / 2,
      nameY + 4,
      { align: 'center' }
    );
  }

  // ── 8. FOOTER ─────────────────────────────────────────────────────────────
  const footerY = 283;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  doc.line(M, footerY, M + CW, footerY);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...FGRAY);
  doc.text(
    'This document is computer generated. No manual signature required unless specified.',
    cx, footerY + 3.5, { align: 'center' }
  );
  doc.text(
    `Generated: ${new Date().toLocaleString('en-IN')}   ·   OPD Card: ${data.opdCardNumber}`,
    cx, footerY + 7, { align: 'center' }
  );

  doc.save(`OPD-Card-${data.opdCardNumber}.pdf`);
};

// ─── PRESCRIPTION PDF TYPES ───────────────────────────────────────────────

export interface PrescriptionPDFData {
  hospital: HospitalInfo;
  patient: { name: string; uhid: string; age: string | number; gender: string; mobile: string };
  doctor: { name: string; specialization?: string; registrationNo?: string; department?: string; signatureBase64?: string };
  diagnosis?: string;
  prescriptions: PrescriptionItem[];
  notes?: string;
  followUpDate?: string;
  date: string;
}

// ─── PRESCRIPTION PDF GENERATOR ───────────────────────────────────────────

export const generatePrescriptionPDF = (data: PrescriptionPDFData): void => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const cx = M + CW / 2;
  let y = 10;

  const checkPage = (needed = 14) => { if (y + needed > 270) { doc.addPage(); y = 15; } };

  // ── Hospital Header ────────────────────────────────────────────────────
  const badgeR = 10;
  const badgeCX = M + badgeR;
  const badgeCY = y + badgeR;

  doc.setFillColor(...NAVY);
  doc.circle(badgeCX, badgeCY, badgeR, 'F');
  doc.setFillColor(...WHITE);
  doc.circle(badgeCX, badgeCY, badgeR - 2, 'F');

  const initials = data.hospital.name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
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

  const addrStr = [data.hospital.addressLine1, data.hospital.city, data.hospital.state, data.hospital.country].filter(Boolean).join(', ');
  if (addrStr) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TXTS);
    doc.text(addrStr, nameX + nameW / 2, y + 12.5, { align: 'center', maxWidth: nameW });
  }

  const contact = [data.hospital.phone, data.hospital.email, data.hospital.website].filter(Boolean).join('  ·  ');
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
  doc.text('PRESCRIPTION', cx, y + 5, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TXTS);
  doc.text(`Date: ${data.date}`, M + CW, y + 5, { align: 'right' });

  y += 8;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.8);
  doc.line(M, y, M + CW, y);
  y += 4;

  // ── Patient Info ───────────────────────────────────────────────────────
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
    ['Age / Gender', `${data.patient.age ?? '—'} / ${data.patient.gender || '—'}`, 'Contact', data.patient.mobile || '—'],
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

  // ── Doctor Info ────────────────────────────────────────────────────────
  sectionBar(doc, 'DOCTOR INFORMATION', y);
  y += 8;

  const drRows = [
    ['Doctor', data.doctor.name || '—', 'Department', data.doctor.department || '—'],
    ['Specialization', data.doctor.specialization || '—', 'Reg. No', data.doctor.registrationNo || '—'],
  ];

  const drStart = y;
  drRows.forEach((row, idx) => {
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
  doc.rect(M, drStart, CW, drRows.length * ROW_H);
  y += drRows.length * ROW_H + 4;

  // ── Diagnosis ──────────────────────────────────────────────────────────
  if (data.diagnosis) {
    checkPage(20);
    sectionBar(doc, 'DIAGNOSIS', y);
    y += 8;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TXTD);
    const dLines = doc.splitTextToSize(data.diagnosis, CW - 6);
    const dBoxH = Math.max(dLines.length * 5 + 6, 14);
    doc.setFillColor(...LGRAY);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.rect(M, y, CW, dBoxH, 'FD');
    doc.text(dLines, M + 3, y + 6);
    y += dBoxH + 4;
  }

  // ── Prescription Table ─────────────────────────────────────────────────
  checkPage(20);
  sectionBar(doc, `PRESCRIPTION  (${data.prescriptions.length} Medicine${data.prescriptions.length > 1 ? 's' : ''})`, y);
  y += 8;

  const colWidths = [8, 60, 22, 28, 22, CW - 8 - 60 - 22 - 28 - 22];
  const colX = colWidths.reduce<number[]>((acc, _w) => {
    acc.push((acc[acc.length - 1] ?? M) + (acc.length > 0 ? colWidths[acc.length - 1] : 0));
    return acc;
  }, []);
  colX.unshift(M);
  colX.pop();

  const headers = ['#', 'Medicine Name', 'Dosage', 'Frequency', 'Duration', 'Instructions'];
  const RX_H = 8;

  doc.setFillColor(230, 238, 252);
  doc.rect(M, y, CW, RX_H, 'F');
  headers.forEach((h, i) => {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text(h, colX[i] + 2, y + RX_H - 2.5);
  });
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.2);
  doc.line(M, y + RX_H, M + CW, y + RX_H);
  y += RX_H;

  data.prescriptions.forEach((rx, idx) => {
    checkPage(RX_H);
    const ry = y;
    if (idx % 2 === 0) {
      doc.setFillColor(...LGRAY);
      doc.rect(M, ry, CW, RX_H, 'F');
    }
    const cells = [
      `${idx + 1}`,
      rx.medicineName || '—',
      rx.dosage || '—',
      rx.frequency || '—',
      rx.duration || '—',
      rx.instructions || '—',
    ];
    cells.forEach((cell, i) => {
      doc.setFontSize(8);
      doc.setFont('helvetica', i === 1 ? 'bold' : 'normal');
      doc.setTextColor(...TXTD);
      const truncated = doc.splitTextToSize(cell, colWidths[i] - 3)[0];
      doc.text(truncated, colX[i] + 2, ry + RX_H - 2.5);
    });
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.15);
    doc.line(M, ry + RX_H, M + CW, ry + RX_H);
    y += RX_H;
  });

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  doc.rect(M, y - data.prescriptions.length * RX_H - RX_H, CW, (data.prescriptions.length + 1) * RX_H);
  y += 5;

  // ── Notes ──────────────────────────────────────────────────────────────
  if (data.notes) {
    checkPage(18);
    sectionBar(doc, 'NOTES / INSTRUCTIONS', y);
    y += 8;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TXTD);
    const used = wrappedText(doc, data.notes, M + 2, y, CW - 4);
    y += Math.max(used, 4) + 5;
  }

  // ── Follow-up ──────────────────────────────────────────────────────────
  if (data.followUpDate) {
    checkPage(10);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text('Follow-up Date:', M + 2, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TXTD);
    doc.text(
      new Date(data.followUpDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      M + 34, y
    );
    y += 7;
  }

  // ── Doctor Signature ───────────────────────────────────────────────────
  const sigAreaBottom = 278;
  const sigAreaTop = sigAreaBottom - 42;
  const sigBoxW = 60;
  const sigBoxH = 26;
  const sigX = M + CW - sigBoxW;
  const sigY = sigAreaTop + 5;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TXTS);
  doc.text('Authorised Signature', sigX + sigBoxW / 2, sigY - 1, { align: 'center' });

  doc.setFillColor(250, 252, 255);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.5);
  doc.rect(sigX, sigY, sigBoxW, sigBoxH, 'FD');

  if (data.doctor.signatureBase64) {
    try {
      doc.addImage(data.doctor.signatureBase64, 'PNG', sigX + 2, sigY + 1, sigBoxW - 4, sigBoxH - 4);
    } catch (_) { /* skip bad image */ }
  }

  const drNameY = sigY + sigBoxH + 4;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text(data.doctor.name, sigX + sigBoxW / 2, drNameY, { align: 'center' });

  if (data.doctor.registrationNo) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TXTS);
    doc.text(`Reg. No: ${data.doctor.registrationNo}`, sigX + sigBoxW / 2, drNameY + 4, { align: 'center' });
  }

  // ── Footer ─────────────────────────────────────────────────────────────
  const footerY = 283;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  doc.line(M, footerY, M + CW, footerY);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...FGRAY);
  doc.text('This document is computer generated. No manual signature required unless specified.', cx, footerY + 3.5, { align: 'center' });
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, cx, footerY + 7, { align: 'center' });

  doc.save(`Prescription-${data.patient.uhid}-${data.date}.pdf`);
};

// ─── RECEIPT PDF TYPES ────────────────────────────────────────────────────

export interface ReceiptPDFData {
  hospital: HospitalInfo;
  patient: { name: string; uhid: string };
  receiptNumber: string;
  date: string;
  items: Array<{ description: string; amount: number }>;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  paymentMethod: string;
  transactionRef?: string;
  generatedBy?: string;
}

// ─── RECEIPT PDF GENERATOR ────────────────────────────────────────────────

export const generateReceiptPDF = (data: ReceiptPDFData): void => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const cx = M + CW / 2;
  let y = 10;

  const checkPage = (needed = 14) => { if (y + needed > 270) { doc.addPage(); y = 15; } };

  // ── Hospital Header ────────────────────────────────────────────────────
  const badgeR = 10;
  const badgeCX = M + badgeR;
  const badgeCY = y + badgeR;

  doc.setFillColor(...NAVY);
  doc.circle(badgeCX, badgeCY, badgeR, 'F');
  doc.setFillColor(...WHITE);
  doc.circle(badgeCX, badgeCY, badgeR - 2, 'F');

  const initials = data.hospital.name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
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

  const addrStr = [data.hospital.addressLine1, data.hospital.city, data.hospital.state, data.hospital.country].filter(Boolean).join(', ');
  if (addrStr) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TXTS);
    doc.text(addrStr, nameX + nameW / 2, y + 12.5, { align: 'center', maxWidth: nameW });
  }

  const contact = [data.hospital.phone, data.hospital.email, data.hospital.website, data.hospital.gstNumber ? `GST: ${data.hospital.gstNumber}` : ''].filter(Boolean).join('  ·  ');
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
  doc.text('PAYMENT RECEIPT', cx, y + 5, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TXTS);
  doc.text(`Receipt No: ${data.receiptNumber}`, M, y + 5);
  doc.text(`Date: ${data.date}`, M + CW, y + 5, { align: 'right' });

  y += 8;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.8);
  doc.line(M, y, M + CW, y);
  y += 4;

  // ── Patient Info ───────────────────────────────────────────────────────
  sectionBar(doc, 'PATIENT INFORMATION', y);
  y += 8;

  const ROW_H = 7;
  const piStart = y;
  doc.setFillColor(...LGRAY);
  doc.rect(M, y, CW, ROW_H, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TXTS);
  doc.text('Name', M + 2, y + ROW_H - 2.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TXTD);
  doc.text(data.patient.name || '—', M + 28 + 2, y + ROW_H - 2.5);

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.2);
  doc.line(M + CW / 2, y, M + CW / 2, y + ROW_H);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TXTS);
  doc.text('UHID', M + CW / 2 + 2, y + ROW_H - 2.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TXTD);
  doc.text(data.patient.uhid || '—', M + CW / 2 + 28 + 2, y + ROW_H - 2.5);

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.15);
  doc.line(M, y + ROW_H, M + CW, y + ROW_H);

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  doc.rect(M, piStart, CW, ROW_H);
  y += ROW_H + 4;

  // ── Itemized Charges ───────────────────────────────────────────────────
  checkPage(20);
  sectionBar(doc, 'ITEMIZED CHARGES', y);
  y += 8;

  const descW = CW - 40;
  const amtW = 40;

  doc.setFillColor(230, 238, 252);
  doc.rect(M, y, CW, ROW_H, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text('Description', M + 2, y + ROW_H - 2.5);
  doc.text('Amount (₹)', M + CW - 2, y + ROW_H - 2.5, { align: 'right' });
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.2);
  doc.line(M, y + ROW_H, M + CW, y + ROW_H);
  y += ROW_H;

  const tblStart = y - ROW_H;
  data.items.forEach((item, idx) => {
    checkPage(ROW_H);
    const ry = y;
    if (idx % 2 === 0) {
      doc.setFillColor(...LGRAY);
      doc.rect(M, ry, CW, ROW_H, 'F');
    }
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TXTD);
    doc.text(doc.splitTextToSize(item.description, descW - 4)[0], M + 2, ry + ROW_H - 2.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`₹${item.amount.toLocaleString('en-IN')}`, M + CW - 2, ry + ROW_H - 2.5, { align: 'right' });
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.15);
    doc.line(M, ry + ROW_H, M + CW, ry + ROW_H);
    y += ROW_H;
  });

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  doc.rect(M, tblStart, CW, (data.items.length + 1) * ROW_H);
  y += 4;

  // ── Summary Rows ───────────────────────────────────────────────────────
  checkPage(35);

  const summaryRow = (label: string, value: string, highlight = false) => {
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

  summaryRow('Total Amount', `₹${data.totalAmount.toLocaleString('en-IN')}`, true);
  summaryRow('Amount Paid', `₹${data.amountPaid.toLocaleString('en-IN')}`, false);
  summaryRow('Balance', `₹${data.balance.toLocaleString('en-IN')}`, true);
  y += 2;

  // ── Payment Details ────────────────────────────────────────────────────
  checkPage(14);
  doc.setFillColor(...MINT);
  doc.rect(M, y, CW, 7.5, 'F');
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.25);
  doc.rect(M, y, CW, 7.5);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text('Payment Method:', M + 3, y + 5.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TXTS);
  doc.text(data.paymentMethod, M + 36, y + 5.2);
  if (data.transactionRef) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text('Txn Ref:', M + CW / 2 + 3, y + 5.2);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TXTS);
    doc.text(data.transactionRef, M + CW / 2 + 22, y + 5.2);
  }
  y += 11;

  // ── Generated By ───────────────────────────────────────────────────────
  if (data.generatedBy) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TXTS);
    doc.text(`Generated By: ${data.generatedBy}`, M + 2, y);
    y += 6;
  }

  // ── Footer ─────────────────────────────────────────────────────────────
  const footerY = 283;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  doc.line(M, footerY, M + CW, footerY);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...FGRAY);
  doc.text('This document is computer generated. No manual signature required unless specified.', cx, footerY + 3.5, { align: 'center' });
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}   ·   Receipt: ${data.receiptNumber}`, cx, footerY + 7, { align: 'center' });

  doc.save(`Receipt-${data.receiptNumber}.pdf`);
};

// ─── VISIT SUMMARY PDF TYPES ─────────────────────────────────────────────

export interface VisitSummaryData {
  hospital: HospitalInfo;
  patient: { name: string; uhid: string; age: string | number; gender: string; mobile: string };
  doctor: { name: string; specialization?: string; registrationNo?: string; signatureBase64?: string };
  visit: {
    date: string;
    department?: string;
    chiefComplaint?: string;
    diagnosis?: string;
    notes?: string;
    followUpDate?: string;
  };
  vitals?: VitalsInfo;
  prescriptions?: PrescriptionItem[];
  investigations?: Array<{ testName: string; status: string }>;
  billing?: { total: number; paid: number; balance: number; method?: string };
}

// ─── VISIT SUMMARY PDF GENERATOR ─────────────────────────────────────────

export const generateVisitSummaryPDF = (data: VisitSummaryData): void => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const cx = M + CW / 2;
  let y = 10;

  const checkPage = (needed = 14) => { if (y + needed > 270) { doc.addPage(); y = 15; } };

  // ── Hospital Header ────────────────────────────────────────────────────
  const badgeR = 10;
  const badgeCX = M + badgeR;
  const badgeCY = y + badgeR;

  doc.setFillColor(...NAVY);
  doc.circle(badgeCX, badgeCY, badgeR, 'F');
  doc.setFillColor(...WHITE);
  doc.circle(badgeCX, badgeCY, badgeR - 2, 'F');

  const initials = data.hospital.name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
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

  const addrStr = [data.hospital.addressLine1, data.hospital.city, data.hospital.state, data.hospital.country].filter(Boolean).join(', ');
  if (addrStr) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TXTS);
    doc.text(addrStr, nameX + nameW / 2, y + 12.5, { align: 'center', maxWidth: nameW });
  }

  const contact = [data.hospital.phone, data.hospital.email, data.hospital.website].filter(Boolean).join('  ·  ');
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
  doc.text('VISIT SUMMARY', cx, y + 5, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TXTS);
  doc.text(`Date: ${data.visit.date}`, M + CW, y + 5, { align: 'right' });

  y += 8;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.8);
  doc.line(M, y, M + CW, y);
  y += 4;

  // ── Patient & Visit Info ───────────────────────────────────────────────
  sectionBar(doc, 'PATIENT & VISIT DETAILS', y);
  y += 8;

  const ROW_H = 7;
  const LW = 28;
  const c1x = M;
  const c2x = M + LW;
  const c3x = M + CW / 2;
  const c4x = M + CW / 2 + LW;
  const c2w = CW / 2 - LW;
  const c4w = CW / 2 - LW;

  const infoRows = [
    ['Name', data.patient.name || '—', 'UHID', data.patient.uhid || '—'],
    ['Age / Gender', `${data.patient.age ?? '—'} / ${data.patient.gender || '—'}`, 'Contact', data.patient.mobile || '—'],
    ['Doctor', data.doctor.name || '—', 'Department', data.visit.department || '—'],
    ['Specialization', data.doctor.specialization || '—', 'Reg. No', data.doctor.registrationNo || '—'],
  ];

  const infoStart = y;
  infoRows.forEach((row, idx) => {
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
  doc.rect(M, infoStart, CW, infoRows.length * ROW_H);
  y += infoRows.length * ROW_H + 4;

  // ── Chief Complaint / Diagnosis ────────────────────────────────────────
  if (data.visit.chiefComplaint || data.visit.diagnosis) {
    checkPage(25);
    sectionBar(doc, 'CLINICAL DETAILS', y);
    y += 8;

    if (data.visit.chiefComplaint) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...TXTS);
      doc.text('Chief Complaint:', M + 2, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TXTD);
      const ccUsed = wrappedText(doc, data.visit.chiefComplaint, M + 34, y, CW - 36);
      y += Math.max(ccUsed, 5) + 2;
    }
    if (data.visit.diagnosis) {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY);
      doc.text('Diagnosis:', M + 2, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TXTD);
      const dxUsed = wrappedText(doc, data.visit.diagnosis, M + 28, y, CW - 30);
      y += Math.max(dxUsed, 5) + 2;
    }
    y += 2;
  }

  // ── Vitals ─────────────────────────────────────────────────────────────
  if (data.vitals) {
    checkPage(20);
    const recLabel = data.vitals.recordedAt ? `Recorded: ${data.vitals.recordedAt}` : '';
    sectionBar(doc, 'VITALS', y, recLabel);
    y += 8;

    const vItems: [string, string][] = [];
    if (data.vitals.height != null)       vItems.push(['Height', `${data.vitals.height} ft`]);
    if (data.vitals.weight != null)       vItems.push(['Weight', `${data.vitals.weight} kg`]);
    if (data.vitals.bloodPressureSystolic != null)
      vItems.push(['BP', `${data.vitals.bloodPressureSystolic}/${data.vitals.bloodPressureDiastolic} mmHg`]);
    if (data.vitals.heartRate != null)    vItems.push(['Pulse', `${data.vitals.heartRate} bpm`]);
    if (data.vitals.temperature != null)  vItems.push(['Temperature', `${data.vitals.temperature} °F`]);
    if (data.vitals.bmi != null)          vItems.push(['BMI', `${data.vitals.bmi}`]);
    if (data.vitals.oxygenSaturation != null) vItems.push(['O₂ Sat', `${data.vitals.oxygenSaturation}%`]);
    if (data.vitals.respiratoryRate != null)  vItems.push(['Resp Rate', `${data.vitals.respiratoryRate}/min`]);

    if (vItems.length > 0) {
      const VCOLS = 4;
      const CELL_W = CW / VCOLS;
      const CELL_H = 10;
      const vRows = Math.ceil(vItems.length / VCOLS);

      vItems.forEach(([lbl, val], idx) => {
        const col = idx % VCOLS;
        const row = Math.floor(idx / VCOLS);
        const vx = M + col * CELL_W;
        const vy = y + row * CELL_H;

        if ((row + col) % 2 === 0) {
          doc.setFillColor(...LGRAY);
          doc.rect(vx, vy, CELL_W, CELL_H, 'F');
        }
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...TXTS);
        doc.text(lbl, vx + 2, vy + 4);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...NAVY);
        doc.text(val, vx + 2, vy + 8.5);
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.2);
        doc.rect(vx, vy, CELL_W, CELL_H);
      });

      for (let idx = vItems.length; idx < vRows * VCOLS; idx++) {
        const col = idx % VCOLS;
        const row = Math.floor(idx / VCOLS);
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.2);
        doc.rect(M + col * CELL_W, y + row * CELL_H, CELL_W, CELL_H);
      }

      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.4);
      doc.rect(M, y, CW, vRows * CELL_H);
      y += vRows * CELL_H + 5;
    }
  }

  // ── Prescriptions ──────────────────────────────────────────────────────
  if (data.prescriptions && data.prescriptions.length > 0) {
    checkPage(20);
    sectionBar(doc, `PRESCRIPTION  (${data.prescriptions.length} Medicine${data.prescriptions.length > 1 ? 's' : ''})`, y);
    y += 8;

    const colWidths = [8, 60, 22, 28, 22, CW - 8 - 60 - 22 - 28 - 22];
    const colX = colWidths.reduce<number[]>((acc, _w) => {
      acc.push((acc[acc.length - 1] ?? M) + (acc.length > 0 ? colWidths[acc.length - 1] : 0));
      return acc;
    }, []);
    colX.unshift(M);
    colX.pop();

    const headers = ['#', 'Medicine Name', 'Dosage', 'Frequency', 'Duration', 'Instructions'];
    const RX_H = 8;

    doc.setFillColor(230, 238, 252);
    doc.rect(M, y, CW, RX_H, 'F');
    headers.forEach((h, i) => {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY);
      doc.text(h, colX[i] + 2, y + RX_H - 2.5);
    });
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(M, y + RX_H, M + CW, y + RX_H);
    y += RX_H;

    data.prescriptions.forEach((rx, idx) => {
      checkPage(RX_H);
      const ry = y;
      if (idx % 2 === 0) {
        doc.setFillColor(...LGRAY);
        doc.rect(M, ry, CW, RX_H, 'F');
      }
      const cells = [`${idx + 1}`, rx.medicineName || '—', rx.dosage || '—', rx.frequency || '—', rx.duration || '—', rx.instructions || '—'];
      cells.forEach((cell, i) => {
        doc.setFontSize(8);
        doc.setFont('helvetica', i === 1 ? 'bold' : 'normal');
        doc.setTextColor(...TXTD);
        doc.text(doc.splitTextToSize(cell, colWidths[i] - 3)[0], colX[i] + 2, ry + RX_H - 2.5);
      });
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.15);
      doc.line(M, ry + RX_H, M + CW, ry + RX_H);
      y += RX_H;
    });

    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.4);
    doc.rect(M, y - data.prescriptions.length * RX_H - RX_H, CW, (data.prescriptions.length + 1) * RX_H);
    y += 5;
  }

  // ── Investigations Ordered ─────────────────────────────────────────────
  if (data.investigations && data.investigations.length > 0) {
    checkPage(12);
    sectionBar(doc, `INVESTIGATIONS ORDERED  (${data.investigations.length})`, y);
    y += 8;

    const perCol = Math.ceil(data.investigations.length / 2);
    const half = perCol;
    const icx = [M + 2, M + CW / 2 + 2];

    for (let i = 0; i < perCol; i++) {
      checkPage(6);
      const left = data.investigations[i];
      const right = data.investigations[i + half];
      if (left) {
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...TXTD);
        doc.text(`${i + 1}. ${left.testName}`, icx[0], y);
        doc.setFontSize(7);
        doc.setTextColor(...TXTS);
        doc.text(`(${left.status})`, icx[0] + doc.getTextWidth(`${i + 1}. ${left.testName}`) + 2, y);
      }
      if (right) {
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...TXTD);
        doc.text(`${i + half + 1}. ${right.testName}`, icx[1], y);
        doc.setFontSize(7);
        doc.setTextColor(...TXTS);
        doc.text(`(${right.status})`, icx[1] + doc.getTextWidth(`${i + half + 1}. ${right.testName}`) + 2, y);
      }
      y += 5;
    }
    y += 3;
  }

  // ── Notes ──────────────────────────────────────────────────────────────
  if (data.visit.notes) {
    checkPage(18);
    sectionBar(doc, 'NOTES / INSTRUCTIONS', y);
    y += 8;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TXTD);
    const used = wrappedText(doc, data.visit.notes, M + 2, y, CW - 4);
    y += Math.max(used, 4) + 5;
  }

  // ── Follow-up ──────────────────────────────────────────────────────────
  if (data.visit.followUpDate) {
    checkPage(10);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text('Follow-up Date:', M + 2, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TXTD);
    doc.text(
      new Date(data.visit.followUpDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      M + 34, y
    );
    y += 7;
  }

  // ── Payment Summary ────────────────────────────────────────────────────
  if (data.billing) {
    checkPage(35);
    sectionBar(doc, 'PAYMENT SUMMARY', y);
    y += 8;

    const billingRow = (label: string, value: string, highlight = false) => {
      if (highlight) {
        doc.setFillColor(...NAVY);
        doc.rect(M, y, CW, 8, 'F');
        doc.setTextColor(...WHITE);
      } else {
        doc.setFillColor(...LGRAY);
        doc.rect(M, y, CW, 8, 'F');
        doc.setTextColor(...TXTD);
      }
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text(label, M + 4, y + 5.5);
      doc.text(value, M + CW - 4, y + 5.5, { align: 'right' });
      y += 9;
    };

    billingRow('Total Billed', `₹${data.billing.total.toLocaleString('en-IN')}`, true);
    billingRow('Amount Paid', `₹${data.billing.paid.toLocaleString('en-IN')}`, false);
    billingRow('Balance', `₹${data.billing.balance.toLocaleString('en-IN')}`, true);
    if (data.billing.method) {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TXTS);
      doc.text(`Payment Method: ${data.billing.method}`, M + 2, y + 2);
      y += 6;
    }
    y += 2;
  }

  // ── Doctor Signature ───────────────────────────────────────────────────
  const sigAreaBottom = 278;
  const sigAreaTop = sigAreaBottom - 42;
  const sigBoxW = 60;
  const sigBoxH = 26;
  const sigX = M + CW - sigBoxW;
  const sigY = sigAreaTop + 5;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TXTS);
  doc.text('Authorised Signature', sigX + sigBoxW / 2, sigY - 1, { align: 'center' });

  doc.setFillColor(250, 252, 255);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.5);
  doc.rect(sigX, sigY, sigBoxW, sigBoxH, 'FD');

  if (data.doctor.signatureBase64) {
    try {
      doc.addImage(data.doctor.signatureBase64, 'PNG', sigX + 2, sigY + 1, sigBoxW - 4, sigBoxH - 4);
    } catch (_) { /* skip bad image */ }
  }

  const sigNameY = sigY + sigBoxH + 4;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text(data.doctor.name, sigX + sigBoxW / 2, sigNameY, { align: 'center' });

  if (data.doctor.registrationNo) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TXTS);
    doc.text(`Reg. No: ${data.doctor.registrationNo}`, sigX + sigBoxW / 2, sigNameY + 4, { align: 'center' });
  }

  // ── Footer ─────────────────────────────────────────────────────────────
  const footerY = 283;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  doc.line(M, footerY, M + CW, footerY);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...FGRAY);
  doc.text('This document is computer generated. No manual signature required unless specified.', cx, footerY + 3.5, { align: 'center' });
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}   ·   Visit: ${data.visit.date}`, cx, footerY + 7, { align: 'center' });

  doc.save(`VisitSummary-${data.patient.uhid}-${data.visit.date}.pdf`);
};
