/**
 * Lab Report PDF Generator
 * Generates an industry-grade lab investigation report (NABL-style layout).
 */
import jsPDF from 'jspdf';
import { format } from 'date-fns';

export interface LabParameter {
  name: string;
  value: string;
  unit: string;
  referenceRange: string;
  flag: 'H' | 'L' | 'N' | 'C' | string;   // High / Low / Normal / Critical / none
  method?: string;
  subGroup?: string;                    // for grouping (e.g. "CBC", "Liver Function")
}

export interface LabReportData {
  hospital: {
    name: string;
    addressLine1?: string;
    city?: string;
    state?: string;
    phone?: string;
    email?: string;
    registrationNumber?: string;
    labName?: string;
  };
  patient: {
    name: string;
    uhid: string;
    age?: string;
    gender?: string;
    mobile?: string;
  };
  doctor: {
    name: string;
    department?: string;
  };
  report: {
    reportId: string;
    testName: string;
    testType: string;
    sampleType?: string;
    orderedAt: string;
    sampleCollectedAt?: string;
    reportedAt: string;
    parameters: LabParameter[];
    labTechnicianName?: string;
    validatedBy?: string;
    notes?: string;
  };
}

const PAGE_W  = 210;
const PAGE_H  = 297;
const MARGIN  = 14;
const COL_W   = PAGE_W - MARGIN * 2;

// Color palette
const NAVY   = [26,  60, 110] as [number, number, number];
const LIGHT  = [240, 245, 255] as [number, number, number];
const GREEN  = [46, 125,  50] as [number, number, number];
const RED    = [198,  40,  40] as [number, number, number];
const ORANGE = [230, 105,   0] as [number, number, number];
const GREY   = [100, 100, 100] as [number, number, number];
const LGREY  = [245, 245, 245] as [number, number, number];
const DKGREY = [60,  60,  60]  as [number, number, number];
const WHITE  = [255, 255, 255] as [number, number, number];

function setFill(doc: jsPDF, rgb: [number, number, number]) {
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
}
function setTextColor(doc: jsPDF, rgb: [number, number, number]) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}
function setDrawColor(doc: jsPDF, rgb: [number, number, number]) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
}

function flagColor(flag: string): [number, number, number] {
  if (flag === 'H') return ORANGE;
  if (flag === 'L') return [26, 100, 190];
  if (flag === 'C') return RED;
  return GREEN;
}

export function generateLabReport(data: LabReportData): void {
  const doc  = new jsPDF({ unit: 'mm', format: 'a4' });
  const { hospital, patient, doctor, report } = data;
  let y = 0;

  // ─── HEADER BAND ─────────────────────────────────────────────────────────
  setFill(doc, NAVY);
  doc.rect(0, 0, PAGE_W, 30, 'F');

  // Lab / hospital name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  setTextColor(doc, WHITE);
  doc.text(hospital.labName || `${hospital.name} — Pathology Laboratory`, MARGIN, 11);

  // Address & contact
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const addr = [hospital.addressLine1, hospital.city, hospital.state].filter(Boolean).join(', ');
  doc.text(addr || '', MARGIN, 17);
  const contact = [hospital.phone && `Ph: ${hospital.phone}`, hospital.email].filter(Boolean).join('   ');
  doc.text(contact, MARGIN, 21.5);

  // Report label (right side)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('LAB REPORT', PAGE_W - MARGIN, 12, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Report ID: ${report.reportId.slice(0, 8).toUpperCase()}`, PAGE_W - MARGIN, 18, { align: 'right' });
  if (hospital.registrationNumber) {
    doc.text(`Reg: ${hospital.registrationNumber}`, PAGE_W - MARGIN, 23, { align: 'right' });
  }

  y = 34;

  // ─── PATIENT + TEST INFO BLOCK ────────────────────────────────────────────
  setFill(doc, LIGHT);
  setDrawColor(doc, NAVY);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, y, COL_W, 28, 2, 2, 'FD');

  const col1 = MARGIN + 4;
  const col2 = MARGIN + COL_W * 0.35 + 4;
  const col3 = MARGIN + COL_W * 0.68 + 4;

  const infoRow = (label: string, value: string, x: number, iy: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    setTextColor(doc, GREY);
    doc.text(label, x, iy);
    doc.setFont('helvetica', 'normal');
    setTextColor(doc, DKGREY);
    doc.setFontSize(9);
    doc.text(value || '—', x, iy + 4.5);
  };

  const row1 = y + 7;
  const row2 = y + 18;

  infoRow('PATIENT NAME', patient.name, col1, row1);
  infoRow('AGE / GENDER', `${patient.age || '—'} / ${patient.gender || '—'}`, col2, row1);
  infoRow('UHID', patient.uhid, col3, row1);

  infoRow('REFERRING DOCTOR', `Dr. ${doctor.name}`, col1, row2);
  infoRow('DEPARTMENT', doctor.department || '—', col2, row2);
  infoRow('MOBILE', patient.mobile || '—', col3, row2);

  y += 32;

  // ─── TEST DETAILS STRIP ───────────────────────────────────────────────────
  setFill(doc, NAVY);
  doc.rect(MARGIN, y, COL_W, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  setTextColor(doc, WHITE);
  doc.text(report.testName.toUpperCase(), col1, y + 5.5);

  const dateInfo = [
    report.sampleCollectedAt
      ? `Sample: ${format(new Date(report.sampleCollectedAt), 'dd/MM/yyyy HH:mm')}`
      : null,
    `Reported: ${format(new Date(report.reportedAt), 'dd/MM/yyyy HH:mm')}`,
    report.sampleType ? `Sample Type: ${report.sampleType}` : null,
  ].filter(Boolean).join('   ');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(dateInfo, PAGE_W - MARGIN, y + 5.5, { align: 'right' });

  y += 11;

  // ─── RESULTS TABLE ────────────────────────────────────────────────────────
  const colWidths = [70, 28, 20, 42, 22] as const;  // Name | Result | Unit | Ref Range | Flag
  const headers   = ['TEST PARAMETER', 'RESULT', 'UNIT', 'REFERENCE RANGE', 'FLAG'];

  // Table header row
  setFill(doc, [220, 230, 245] as [number, number, number]);
  doc.rect(MARGIN, y, COL_W, 7, 'F');
  setDrawColor(doc, [180, 200, 230] as [number, number, number]);
  doc.setLineWidth(0.2);

  let xOff = MARGIN;
  headers.forEach((h, i) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    setTextColor(doc, NAVY);
    doc.text(h, xOff + 2, y + 4.8);
    if (i < headers.length - 1) doc.line(xOff + colWidths[i], y, xOff + colWidths[i], y + 7);
    xOff += colWidths[i];
  });

  y += 7;
  let lastSubGroup = '';

  report.parameters.forEach((param, idx) => {
    // Sub-group header
    if (param.subGroup && param.subGroup !== lastSubGroup) {
      lastSubGroup = param.subGroup;
      setFill(doc, [230, 238, 255] as [number, number, number]);
      doc.rect(MARGIN, y, COL_W, 5.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      setTextColor(doc, NAVY);
      doc.text(param.subGroup.toUpperCase(), MARGIN + 3, y + 4);
      y += 5.5;
    }

    // Check page overflow
    if (y > PAGE_H - 45) {
      doc.addPage();
      y = 14;
    }

    const rowH = 7;
    // Alternating row bg
    setFill(doc, idx % 2 === 0 ? WHITE : LGREY);
    doc.rect(MARGIN, y, COL_W, rowH, 'F');

    // Highlight abnormal rows
    const isAbnormal = param.flag === 'H' || param.flag === 'L' || param.flag === 'C';
    if (isAbnormal) {
      setFill(doc, param.flag === 'C'
        ? [255, 235, 235] as [number, number, number]
        : [255, 248, 225] as [number, number, number]);
      doc.rect(MARGIN, y, COL_W, rowH, 'F');
    }

    // Border
    setDrawColor(doc, [220, 220, 220] as [number, number, number]);
    doc.setLineWidth(0.15);
    doc.rect(MARGIN, y, COL_W, rowH, 'S');

    xOff = MARGIN;
    const textY = y + 4.8;

    // Parameter name
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    setTextColor(doc, DKGREY);
    doc.text(param.name, xOff + 2, textY);
    xOff += colWidths[0];

    // Result value (bold, colored if abnormal)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    setTextColor(doc, isAbnormal ? flagColor(param.flag) : DKGREY);
    doc.text(param.value, xOff + 2, textY);
    xOff += colWidths[1];

    // Unit
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setTextColor(doc, GREY);
    doc.text(param.unit, xOff + 2, textY);
    xOff += colWidths[2];

    // Reference range
    setTextColor(doc, DKGREY);
    doc.text(param.referenceRange, xOff + 2, textY);
    xOff += colWidths[3];

    // Flag badge
    if (param.flag && param.flag !== 'N' && param.flag !== '') {
      const fc = flagColor(param.flag);
      setFill(doc, fc);
      doc.roundedRect(xOff + 1.5, y + 1.5, 14, 4, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      setTextColor(doc, WHITE);
      const flagLabel = param.flag === 'H' ? 'HIGH' : param.flag === 'L' ? 'LOW' : 'CRIT';
      doc.text(flagLabel, xOff + 8.5, y + 4.8, { align: 'center' });
    }

    y += rowH;
  });

  y += 4;

  // ─── LEGEND ───────────────────────────────────────────────────────────────
  setFill(doc, LGREY);
  doc.roundedRect(MARGIN, y, COL_W, 7, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  setTextColor(doc, GREY);
  doc.text('Legend:', MARGIN + 3, y + 4.5);
  const legends = [
    { flag: 'HIGH', color: ORANGE },
    { flag: 'LOW',  color: [26, 100, 190] as [number, number, number] },
    { flag: 'CRIT', color: RED },
    { flag: 'NORMAL', color: GREEN },
  ];
  let lx = MARGIN + 20;
  legends.forEach(l => {
    setFill(doc, l.color);
    doc.roundedRect(lx, y + 1.5, 14, 4, 1, 1, 'F');
    setTextColor(doc, WHITE);
    doc.text(l.flag, lx + 7, y + 4.5, { align: 'center' });
    lx += 20;
  });

  y += 11;

  // ─── NOTES ────────────────────────────────────────────────────────────────
  if (report.notes) {
    setFill(doc, [255, 253, 230] as [number, number, number]);
    setDrawColor(doc, [240, 200, 0] as [number, number, number]);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN, y, COL_W, 12, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    setTextColor(doc, [150, 100, 0] as [number, number, number]);
    doc.text('NOTES / REMARKS', MARGIN + 3, y + 5);
    doc.setFont('helvetica', 'normal');
    setTextColor(doc, DKGREY);
    doc.setFontSize(8);
    const noteLines = doc.splitTextToSize(report.notes, COL_W - 6);
    doc.text(noteLines.slice(0, 2), MARGIN + 3, y + 9.5);
    y += 16;
  }

  // ─── SIGNATURE SECTION ────────────────────────────────────────────────────
  if (y > PAGE_H - 40) { doc.addPage(); y = 14; }

  y = Math.max(y, PAGE_H - 38);

  setDrawColor(doc, [200, 210, 230] as [number, number, number]);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, MARGIN + COL_W, y);

  const sigColW = COL_W / 2;

  // Left: Lab technician
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  setTextColor(doc, NAVY);
  doc.text('Tested & Reported By', MARGIN + 2, y + 6);
  doc.setFont('helvetica', 'normal');
  setTextColor(doc, DKGREY);
  doc.setFontSize(9);
  doc.text(report.labTechnicianName || 'Lab Technician', MARGIN + 2, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  setTextColor(doc, GREY);
  doc.text('Lab Technician', MARGIN + 2, y + 17);
  // Signature line
  setDrawColor(doc, GREY);
  doc.setLineWidth(0.2);
  doc.line(MARGIN + 2, y + 23, MARGIN + sigColW - 10, y + 23);
  doc.setFontSize(7);
  doc.text('Signature', MARGIN + 2, y + 27);

  // Right: Validated by
  const rx = MARGIN + sigColW + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  setTextColor(doc, NAVY);
  doc.text('Verified / Validated By', rx, y + 6);
  doc.setFont('helvetica', 'normal');
  setTextColor(doc, DKGREY);
  doc.setFontSize(9);
  doc.text(report.validatedBy || 'Pathologist', rx, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  setTextColor(doc, GREY);
  doc.text('Pathologist / Consultant', rx, y + 17);
  setDrawColor(doc, GREY);
  doc.setLineWidth(0.2);
  doc.line(rx, y + 23, rx + sigColW - 10, y + 23);
  doc.setFontSize(7);
  doc.text('Signature', rx, y + 27);

  // ─── FOOTER ───────────────────────────────────────────────────────────────
  setFill(doc, NAVY);
  doc.rect(0, PAGE_H - 8, PAGE_W, 8, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  setTextColor(doc, [180, 195, 220] as [number, number, number]);
  doc.text(
    'This report is generated electronically and is valid without physical signature if digitally verified.',
    PAGE_W / 2, PAGE_H - 4,
    { align: 'center' }
  );

  const filename = `LabReport_${patient.uhid}_${report.testName.replace(/\s+/g, '_')}_${format(new Date(), 'ddMMyyyy')}.pdf`;
  doc.save(filename);
}
