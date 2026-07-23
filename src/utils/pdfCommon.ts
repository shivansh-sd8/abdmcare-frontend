/**
 * Shared PDF primitives — EHR-style standardised layout
 * All document generators should use these helpers for a consistent look.
 */
import jsPDF from 'jspdf';
import { format } from 'date-fns';

// ─── Base64 helper (jsPDF v4 dropped 'base64' output type) ──────────────────

export function pdfToBase64(doc: jsPDF): string {
  const dataUri = doc.output('datauristring');
  return dataUri.split(',')[1] || '';
}

// ─── Layout constants (A4) ──────────────────────────────────────────────────

export const M   = 14;          // left / right margin
export const PW  = 210;         // page width  (A4)
export const CW  = PW - M * 2;  // content width = 182
export const PH  = 297;         // page height (A4)
export const BOT = PH - 14;     // bottom margin y

// ─── Colour palette ─────────────────────────────────────────────────────────

export const C = {
  navy:     [26,  60, 110] as [number, number, number],
  navyDark: [14,  44,  85] as [number, number, number],
  teal:     [22, 160, 133] as [number, number, number],
  amber:    [211,132,   0] as [number, number, number],
  purple:   [142, 68, 173] as [number, number, number],
  green:    [39, 174,  96] as [number, number, number],
  red:      [192, 57,  43] as [number, number, number],
  slate:    [127,140, 141] as [number, number, number],
  lightBg:  [248,250, 252] as [number, number, number],
  stripBg:  [240,244, 248] as [number, number, number],
  ruleLine: [220,226, 234] as [number, number, number],
  border:   [190,210, 235] as [number, number, number],
  white:    [255,255, 255] as [number, number, number],
  black:    [30,  30,  30] as [number, number, number],
  txtSec:   [80,  90, 110] as [number, number, number],
  fgray:    [130,140, 155] as [number, number, number],
};

export type RGB = [number, number, number];

// ─── Low-level helpers ───────────────────────────────────────────────────────

export function rgb(doc: jsPDF, col: RGB, kind: 'fill' | 'draw' | 'text' = 'fill'): void {
  if (kind === 'fill') doc.setFillColor(col[0], col[1], col[2]);
  else if (kind === 'draw') doc.setDrawColor(col[0], col[1], col[2]);
  else doc.setTextColor(col[0], col[1], col[2]);
}

export function rule(doc: jsPDF, y: number, color: RGB = C.ruleLine): void {
  rgb(doc, color, 'draw');
  doc.setLineWidth(0.25);
  doc.line(M, y, M + CW, y);
}

// ─── Section band (coloured bar with white uppercase title) ──────────────────

export function sectionBand(doc: jsPDF, y: number, title: string, color: RGB = C.navy, rightLabel?: string): number {
  rgb(doc, color, 'fill');
  doc.rect(M, y, CW, 7, 'F');
  rgb(doc, C.white, 'text');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), M + 3, y + 4.8);
  if (rightLabel) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(rightLabel, M + CW - 3, y + 4.8, { align: 'right' });
  }
  return y + 9;
}

// ─── Label + value helpers ───────────────────────────────────────────────────

export function label(doc: jsPDF, text: string, x: number, y: number): void {
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  rgb(doc, C.slate, 'text');
  doc.text(text.toUpperCase(), x, y);
}

export function value(doc: jsPDF, text: string, x: number, y: number, maxW?: number): number {
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  rgb(doc, C.black, 'text');
  const safe = text ?? '—';
  if (maxW) {
    const lines = doc.splitTextToSize(safe, maxW);
    doc.text(lines, x, y);
    return (lines.length - 1) * 4.5;
  }
  doc.text(safe, x, y);
  return 0;
}

export function kvPair(doc: jsPDF, lbl: string, val: string, x: number, y: number, lw = 36, vw = 50): number {
  label(doc, lbl, x, y);
  return value(doc, val || '—', x + lw, y, vw);
}

export function wrappedText(doc: jsPDF, text: string, x: number, y: number, maxW: number, lineH = 4.5): number {
  const lines = doc.splitTextToSize(text, maxW);
  doc.text(lines, x, y);
  return lines.length * lineH;
}

// ─── Hospital info interface ─────────────────────────────────────────────────

export interface PDFHospitalInfo {
  name: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  website?: string;
  registrationNumber?: string;
  gstNumber?: string;
  labName?: string;
}

// ─── Standard header band (full-width navy + initials badge + doc type) ──────

export function drawHeaderBand(
  doc: jsPDF,
  hospital: PDFHospitalInfo,
  documentType: string,
  subtitle?: string,
): number {
  // Full-width navy band
  rgb(doc, C.navy, 'fill');
  doc.rect(0, 0, PW, 38, 'F');

  // White initials badge
  const initials = hospital.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  rgb(doc, C.white, 'fill');
  doc.circle(M + 9, 19, 8, 'F');
  rgb(doc, C.navy, 'text');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(initials, M + 9, 21.5, { align: 'center' });

  // Hospital name + address (left-aligned)
  rgb(doc, C.white, 'text');
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(hospital.name, M + 22, 16);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  const addr = [hospital.addressLine1, hospital.city, hospital.state].filter(Boolean).join(', ');
  doc.text(addr, M + 22, 21.5);
  const contact = [hospital.phone, hospital.email].filter(Boolean).join('  ·  ');
  if (contact) doc.text(contact, M + 22, 26);

  // Document type label (right-aligned)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(documentType.toUpperCase(), PW - M, 14, { align: 'right' });
  if (subtitle) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, PW - M, 19, { align: 'right' });
  }

  return 38;
}

// ─── Control strip (dark navy bar with reference numbers / dates) ────────────

export function drawControlStrip(
  doc: jsPDF,
  y: number,
  leftText: string,
  rightText?: string,
): number {
  rgb(doc, C.navyDark, 'fill');
  doc.rect(0, y, PW, 8, 'F');
  rgb(doc, C.white, 'text');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(leftText, M, y + 5.5);
  if (rightText) {
    doc.text(rightText, PW - M, y + 5.5, { align: 'right' });
  }
  return y + 8;
}

// ─── Two-column info table (key-value rows with alternating bg) ──────────────

export function drawInfoTable(
  doc: jsPDF,
  y: number,
  rows: [string, string, string, string][],  // [leftLabel, leftVal, rightLabel, rightVal]
): number {
  const ROW_H = 7;
  const LW = 28;
  const c1x = M;
  const c2x = M + LW;
  const c3x = M + CW / 2;
  const c4x = M + CW / 2 + LW;
  const c2w = CW / 2 - LW;
  const c4w = CW / 2 - LW;

  const startY = y;
  rows.forEach((row, idx) => {
    const ry = y + idx * ROW_H;
    if (idx % 2 === 0) {
      rgb(doc, C.lightBg, 'fill');
      doc.rect(M, ry, CW, ROW_H, 'F');
    }
    // Left label
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    rgb(doc, C.txtSec, 'text');
    doc.text(row[0], c1x + 2, ry + ROW_H - 2.5);
    // Left value
    doc.setFont('helvetica', 'normal');
    rgb(doc, C.black, 'text');
    doc.text(doc.splitTextToSize(row[1], c2w + 5)[0], c2x + 2, ry + ROW_H - 2.5);
    // Mid divider
    rgb(doc, C.border, 'draw');
    doc.setLineWidth(0.2);
    doc.line(c3x, ry, c3x, ry + ROW_H);
    // Right label
    doc.setFont('helvetica', 'bold');
    rgb(doc, C.txtSec, 'text');
    doc.text(row[2], c3x + 2, ry + ROW_H - 2.5);
    // Right value
    doc.setFont('helvetica', 'normal');
    rgb(doc, C.black, 'text');
    doc.text(doc.splitTextToSize(row[3], c4w - 2)[0], c4x + 2, ry + ROW_H - 2.5);
    // Row border
    rgb(doc, C.border, 'draw');
    doc.setLineWidth(0.15);
    doc.line(M, ry + ROW_H, M + CW, ry + ROW_H);
  });
  // Outer border
  rgb(doc, C.border, 'draw');
  doc.setLineWidth(0.4);
  doc.rect(M, startY, CW, rows.length * ROW_H);

  return y + rows.length * ROW_H + 4;
}

// ─── Page footer ─────────────────────────────────────────────────────────────

export function drawFooter(
  doc: jsPDF,
  generatedBy?: string,
  extraRight?: string,
): void {
  const genDate = format(new Date(), 'dd MMM yyyy, hh:mm a');
  rule(doc, BOT - 4);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  rgb(doc, C.fgray, 'text');
  doc.text(
    `Generated on ${genDate}${generatedBy ? `  ·  By: ${generatedBy}` : ''}  ·  This is a computer-generated document.`,
    M, BOT,
  );
  if (extraRight) {
    doc.text(extraRight, PW - M, BOT, { align: 'right' });
  }
}

// ─── Stamped footer on all pages (for multi-page docs) ───────────────────────

export function stampFooterAllPages(
  doc: jsPDF,
  generatedBy?: string,
  extraRight?: string,
): void {
  const genDate = format(new Date(), 'dd MMM yyyy, hh:mm a');
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    rule(doc, BOT - 4);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    rgb(doc, C.fgray, 'text');
    const left = `Generated on ${genDate}${generatedBy ? `  ·  By: ${generatedBy}` : ''}  ·  This is a computer-generated document.`;
    doc.text(left, M, BOT);
    const right = [extraRight, `Page ${i} of ${pageCount}`].filter(Boolean).join('   ·   ');
    doc.text(right, PW - M, BOT, { align: 'right' });
  }
}

// ─── Page header band (thin navy bar for continuation pages) ─────────────────

export function drawPageHeader(
  doc: jsPDF,
  hospitalName: string,
  pageNum: number,
  totalPages: number,
): void {
  rgb(doc, C.navy, 'fill');
  doc.rect(0, 0, PW, 10, 'F');
  rgb(doc, C.white, 'text');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(hospitalName.toUpperCase(), M, 6.5);
  doc.text(`Page ${pageNum} / ${totalPages}`, PW - M, 6.5, { align: 'right' });
}

// ─── Signature block ─────────────────────────────────────────────────────────

export function drawSignatureBlock(
  doc: jsPDF,
  y: number,
  name: string,
  designation?: string,
  registrationNo?: string,
  signatureBase64?: string,
): number {
  const sigBoxW = 60;
  const sigBoxH = 22;
  const sigX = M + CW - sigBoxW;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  rgb(doc, C.txtSec, 'text');
  doc.text('Authorised Signature', sigX + sigBoxW / 2, y - 1, { align: 'center' });

  doc.setFillColor(250, 252, 255);
  rgb(doc, C.border, 'draw');
  doc.setLineWidth(0.5);
  doc.rect(sigX, y, sigBoxW, sigBoxH, 'FD');

  if (signatureBase64) {
    try {
      doc.addImage(signatureBase64, 'PNG', sigX + 2, y + 1, sigBoxW - 4, sigBoxH - 4);
    } catch (_) { /* skip bad image */ }
  }

  const nameY = y + sigBoxH + 4;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  rgb(doc, C.navy, 'text');
  doc.text(name, sigX + sigBoxW / 2, nameY, { align: 'center' });

  if (designation) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    rgb(doc, C.txtSec, 'text');
    doc.text(designation, sigX + sigBoxW / 2, nameY + 4, { align: 'center' });
  }

  if (registrationNo) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    rgb(doc, C.txtSec, 'text');
    doc.text(`Reg. No: ${registrationNo}`, sigX + sigBoxW / 2, nameY + (designation ? 8 : 4), { align: 'center' });
  }

  return nameY + 12;
}

// ─── Billing summary rows ────────────────────────────────────────────────────

export function drawBillingSummaryRow(
  doc: jsPDF,
  y: number,
  lbl: string,
  val: string,
  highlight: boolean,
): number {
  if (highlight) {
    rgb(doc, C.navy, 'fill');
    doc.rect(M, y, CW, 9, 'F');
    rgb(doc, C.white, 'text');
  } else {
    rgb(doc, C.lightBg, 'fill');
    doc.rect(M, y, CW, 9, 'F');
    rgb(doc, C.black, 'text');
  }
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(lbl, M + 4, y + 6.3);
  doc.text(val, M + CW - 4, y + 6.3, { align: 'right' });
  return y + 10;
}

// ─── Medication / prescription table ─────────────────────────────────────────

export function drawMedicationTable(
  doc: jsPDF,
  y: number,
  medications: Array<{ name?: string; medicineName?: string; dosage?: string; frequency?: string; duration?: string; instructions?: string }>,
  checkPage: (needed?: number) => void,
): number {
  const colWidths = [8, 60, 22, 28, 22, CW - 8 - 60 - 22 - 28 - 22];
  const colX = colWidths.reduce<number[]>((acc, _w) => {
    acc.push((acc[acc.length - 1] ?? M) + (acc.length > 0 ? colWidths[acc.length - 1] : 0));
    return acc;
  }, []);
  colX.unshift(M);
  colX.pop();

  const headers = ['#', 'Medicine Name', 'Dosage', 'Frequency', 'Duration', 'Instructions'];
  const RX_H = 8;

  // Header row
  doc.setFillColor(230, 238, 252);
  doc.rect(M, y, CW, RX_H, 'F');
  headers.forEach((h, i) => {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    rgb(doc, C.navy, 'text');
    doc.text(h, colX[i] + 2, y + RX_H - 2.5);
  });
  rgb(doc, C.border, 'draw');
  doc.setLineWidth(0.2);
  doc.line(M, y + RX_H, M + CW, y + RX_H);
  y += RX_H;

  medications.forEach((rx, idx) => {
    checkPage(RX_H);
    const ry = y;
    if (idx % 2 === 0) {
      rgb(doc, C.lightBg, 'fill');
      doc.rect(M, ry, CW, RX_H, 'F');
    }
    const cells = [
      `${idx + 1}`,
      rx.name || rx.medicineName || '—',
      rx.dosage || '—',
      rx.frequency || '—',
      rx.duration || '—',
      rx.instructions || '—',
    ];
    cells.forEach((cell, i) => {
      doc.setFontSize(8);
      doc.setFont('helvetica', i === 1 ? 'bold' : 'normal');
      rgb(doc, C.black, 'text');
      doc.text(doc.splitTextToSize(cell, colWidths[i] - 3)[0], colX[i] + 2, ry + RX_H - 2.5);
    });
    rgb(doc, C.border, 'draw');
    doc.setLineWidth(0.15);
    doc.line(M, ry + RX_H, M + CW, ry + RX_H);
    y += RX_H;
  });

  rgb(doc, C.border, 'draw');
  doc.setLineWidth(0.4);
  doc.rect(M, y - medications.length * RX_H - RX_H, CW, (medications.length + 1) * RX_H);
  return y + 5;
}

// ─── Vitals grid ─────────────────────────────────────────────────────────────

export function drawVitalsGrid(
  doc: jsPDF,
  y: number,
  items: [string, string][],
): number {
  const VCOLS = 4;
  const CELL_W = CW / VCOLS;
  const CELL_H = 10;
  const vRows = Math.ceil(items.length / VCOLS);

  items.forEach(([lbl, val], idx) => {
    const col = idx % VCOLS;
    const row = Math.floor(idx / VCOLS);
    const vx = M + col * CELL_W;
    const vy = y + row * CELL_H;

    if ((row + col) % 2 === 0) {
      rgb(doc, C.lightBg, 'fill');
      doc.rect(vx, vy, CELL_W, CELL_H, 'F');
    }
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    rgb(doc, C.txtSec, 'text');
    doc.text(lbl, vx + 2, vy + 4);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    rgb(doc, C.navy, 'text');
    doc.text(val, vx + 2, vy + 8.5);
    rgb(doc, C.border, 'draw');
    doc.setLineWidth(0.2);
    doc.rect(vx, vy, CELL_W, CELL_H);
  });

  // Empty padding cells
  for (let idx = items.length; idx < vRows * VCOLS; idx++) {
    const col = idx % VCOLS;
    const row = Math.floor(idx / VCOLS);
    rgb(doc, C.border, 'draw');
    doc.setLineWidth(0.2);
    doc.rect(M + col * CELL_W, y + row * CELL_H, CELL_W, CELL_H);
  }

  rgb(doc, C.border, 'draw');
  doc.setLineWidth(0.4);
  doc.rect(M, y, CW, vRows * CELL_H);
  return y + vRows * CELL_H + 5;
}

// ─── Formatting helpers ──────────────────────────────────────────────────────

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try { return format(new Date(dateStr), 'dd MMM yyyy'); } catch { return dateStr; }
}

export function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try { return format(new Date(dateStr), 'dd MMM yyyy, hh:mm a'); } catch { return dateStr; }
}

export function formatAddress(addr?: string | Record<string, any>): string {
  if (!addr) return '—';
  if (typeof addr === 'string') return addr;
  return [addr.line1 || addr.addressLine1, addr.line2, addr.city, addr.state, addr.pincode || addr.zip]
    .filter(Boolean).join(', ') || '—';
}
