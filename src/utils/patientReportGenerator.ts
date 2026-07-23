/**
 * Comprehensive Patient Health Record PDF Generator
 * ABDM-aligned format — multi-page A4, sections: demographics,
 * vitals history, consultations (with Rx + labs), investigations, payments.
 */
import jsPDF from 'jspdf';
import { differenceInYears, format } from 'date-fns';
import { pdfToBase64 } from './pdfCommon';

// ─── Public interface ─────────────────────────────────────────────────────────

export interface ReportHospitalInfo {
  name: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  website?: string;
  registrationNumber?: string;
  gstNumber?: string;
}

export interface ReportPatient {
  firstName: string;
  lastName: string;
  uhid: string;
  dob?: string;
  gender?: string;
  mobile?: string;
  email?: string;
  bloodGroup?: string;
  address?: any;
  createdAt: string;
  abhaRecord?: { abhaAddress?: string; abhaNumber?: string };
}

export interface ReportSummary {
  totalAppointments:   number;
  totalEncounters:     number;
  totalPrescriptions:  number;
  totalVitals:         number;
  totalInvestigations: number;
  totalLabOrders:      number;
  totalPayments:       number;
  lastVisit:           string | null;
}

export interface ReportTimelineEvent {
  id:          string;
  type:        string;
  date:        string;
  title:       string;
  description: string;
  status?:     string;
  data:        any;
}

export interface PatientReportData {
  hospital:    ReportHospitalInfo;
  patient:     ReportPatient;
  timeline:    ReportTimelineEvent[];
  summary:     ReportSummary;
  generatedBy?: string;
}

// ─── Layout constants ─────────────────────────────────────────────────────────

const M   = 14;          // left / right margin
const PW  = 210;         // page width (A4)
const CW  = PW - M * 2; // content width  = 182
const PH  = 297;         // page height (A4)
const BOT = PH - 14;     // bottom margin y

// ─── Colour palette ───────────────────────────────────────────────────────────
const C = {
  navy:     [26,  60, 110] as [number,number,number],
  teal:     [22, 160, 133] as [number,number,number],
  amber:    [211,132,  0 ] as [number,number,number],
  purple:   [142, 68, 173] as [number,number,number],
  green:    [39, 174,  96] as [number,number,number],
  red:      [192, 57,  43] as [number,number,number],
  slate:    [127,140, 141] as [number,number,number],
  lightBg:  [248,250,252] as [number,number,number],
  stripBg:  [240,244,248] as [number,number,number],
  ruleLine: [220,226,234] as [number,number,number],
  white:    [255,255,255] as [number,number,number],
  black:    [30,  30,  30] as [number,number,number],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rgb(doc: jsPDF, col: [number,number,number], kind: 'fill'|'draw'|'text' = 'fill') {
  if (kind === 'fill') doc.setFillColor(col[0], col[1], col[2]);
  else if (kind === 'draw') doc.setDrawColor(col[0], col[1], col[2]);
  else doc.setTextColor(col[0], col[1], col[2]);
}

function rule(doc: jsPDF, y: number, color = C.ruleLine) {
  rgb(doc, color, 'draw');
  doc.setLineWidth(0.25);
  doc.line(M, y, M + CW, y);
}

function sectionBand(doc: jsPDF, y: number, title: string, color: [number,number,number] = C.navy): number {
  rgb(doc, color, 'fill');
  doc.setFillColor(color[0], color[1], color[2]);
  doc.rect(M, y, CW, 7, 'F');
  rgb(doc, C.white, 'text');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), M + 3, y + 4.8);
  return y + 9;
}

function label(doc: jsPDF, text: string, x: number, y: number) {
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  rgb(doc, C.slate, 'text');
  doc.text(text.toUpperCase(), x, y);
}

function value(doc: jsPDF, text: string, x: number, y: number, maxW?: number) {
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

function kvPair(doc: jsPDF, lbl: string, val: string, x: number, y: number, lw = 36, vw = 50): number {
  label(doc, lbl, x, y);
  const extra = value(doc, val || '—', x + lw, y, vw);
  return extra;
}

function pill(doc: jsPDF, text: string, x: number, y: number, color: [number,number,number]) {
  const tw = doc.getTextWidth(text) + 4;
  rgb(doc, color, 'fill');
  doc.setFillColor(color[0]*0.12+243, color[1]*0.12+243, color[2]*0.12+243);
  doc.roundedRect(x, y - 3.5, tw, 5, 1.2, 1.2, 'F');
  rgb(doc, color, 'text');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text(text, x + 2, y);
  return tw + 2;
}

function pageHeader(doc: jsPDF, hospital: ReportHospitalInfo, pageNum: number, totalPages: number) {
  // Thin navy band top
  rgb(doc, C.navy, 'fill');
  doc.rect(0, 0, PW, 10, 'F');
  rgb(doc, C.white, 'text');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(hospital.name.toUpperCase(), M, 6.5);
  doc.text(`Page ${pageNum} / ${totalPages}`, PW - M, 6.5, { align: 'right' });
}

function pageFooter(doc: jsPDF, hospital: ReportHospitalInfo, generatedBy: string, genDate: string) {
  rule(doc, BOT - 4);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  rgb(doc, C.slate, 'text');
  doc.text(`Generated on ${genDate}${generatedBy ? `  ·  By: ${generatedBy}` : ''}  ·  This is a computer-generated record.`, M, BOT);
  if (hospital.registrationNumber) {
    doc.text(`Reg No: ${hospital.registrationNumber}`, PW - M, BOT, { align: 'right' });
  }
}

function formatAddress(addr: any): string {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  return [addr.line1, addr.line2, addr.city, addr.state, addr.pincode]
    .filter(Boolean).join(', ');
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try { return format(new Date(dateStr), 'dd MMM yyyy'); } catch { return dateStr; }
}

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try { return format(new Date(dateStr), 'dd MMM yyyy, hh:mm a'); } catch { return dateStr; }
}

// ─── Main generator ──────────────────────────────────────────────────────────

export function generatePatientReport(data: PatientReportData): string {
  const { hospital, patient, timeline, summary, generatedBy } = data;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const genDate = format(new Date(), 'dd MMM yyyy, hh:mm a');
  const age = patient.dob
    ? `${differenceInYears(new Date(), new Date(patient.dob))} yrs`
    : '—';
  const patientName = `${patient.firstName} ${patient.lastName}`.trim();

  // Group timeline events
  const vitalsEvents        = timeline.filter((e) => e.type === 'VITALS');
  const consultationEvents  = timeline.filter((e) => e.type === 'CONSULTATION');
  const prescriptionEvents  = timeline.filter((e) => e.type === 'PRESCRIPTION');
  const labOrderEvents      = timeline.filter((e) => e.type === 'LAB_ORDER');
  void labOrderEvents; // LAB_ORDER events are rendered inline inside their parent CONSULTATION block
  const investigationEvents = timeline.filter((e) => e.type === 'INVESTIGATION');
  const paymentEvents       = timeline.filter((e) => e.type === 'PAYMENT');
  const appointmentEvents   = timeline.filter((e) => e.type === 'APPOINTMENT');

  // Estimate total pages (rough)
  const estimatedPages = 2
    + (vitalsEvents.length        > 0 ? 1 : 0)
    + Math.ceil(consultationEvents.length        / 3)
    + (investigationEvents.length > 0 ? 1 : 0)
    + (paymentEvents.length       > 0 ? 1 : 0);
  let totalPages = Math.max(estimatedPages, 1);

  let pageNum = 1;
  let y = 14;

  const newPage = () => {
    pageFooter(doc, hospital, generatedBy ?? '', genDate);
    doc.addPage();
    pageNum++;
    pageHeader(doc, hospital, pageNum, totalPages);
    y = 16;
  };

  const checkY = (needed = 20) => {
    if (y + needed > BOT - 10) newPage();
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 1 — Cover + Patient Demographics
  // ══════════════════════════════════════════════════════════════════════════

  // Top navy header band
  rgb(doc, C.navy, 'fill');
  doc.rect(0, 0, PW, 38, 'F');

  // Hospital initials badge
  const initials = hospital.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  rgb(doc, C.white, 'fill');
  doc.setFillColor(255, 255, 255);
  doc.circle(M + 9, 19, 8, 'F');
  rgb(doc, C.navy, 'text');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(initials, M + 9, 21.5, { align: 'center' });

  // Hospital name + address
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

  // Document type label (right aligned)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('COMPREHENSIVE HEALTH RECORD', PW - M, 14, { align: 'right' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('ABDM Compatible Document', PW - M, 19, { align: 'right' });

  // Document control strip
  rgb(doc, [14, 44, 85], 'fill');
  doc.setFillColor(14, 44, 85);
  doc.rect(0, 30, PW, 8, 'F');
  rgb(doc, C.white, 'text');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  const regDate = formatDate(patient.createdAt);
  doc.text(`UHID: ${patient.uhid}  ·  Registered: ${regDate}  ·  Generated: ${genDate}`, M, 35.5);
  if (patient.abhaRecord?.abhaNumber) {
    doc.text(`ABHA: ${patient.abhaRecord.abhaNumber}`, PW - M, 35.5, { align: 'right' });
  }

  y = 46;

  // ── Patient Demographics ──────────────────────────────────────────────────
  y = sectionBand(doc, y, 'Patient Demographics');

  // Two-column demographics block
  rgb(doc, C.lightBg, 'fill');
  doc.setFillColor(C.lightBg[0], C.lightBg[1], C.lightBg[2]);
  doc.rect(M, y, CW, 38, 'F');

  // Left column
  const lx = M + 4;
  const rx = M + 96;
  kvPair(doc, 'Full Name',   patientName,            lx,      y + 8,  30, 60);
  kvPair(doc, 'UHID',        patient.uhid,           lx,      y + 16, 30, 60);
  kvPair(doc, 'Date of Birth', formatDate(patient.dob), lx,   y + 24, 30, 60);
  kvPair(doc, 'Age',         age,                    lx,      y + 32, 30, 60);

  // Right column
  kvPair(doc, 'Gender',      patient.gender ?? '—',  rx,      y + 8,  28, 55);
  kvPair(doc, 'Blood Group', patient.bloodGroup ?? '—', rx,   y + 16, 28, 55);
  kvPair(doc, 'Mobile',      patient.mobile ?? '—',  rx,      y + 24, 28, 55);
  kvPair(doc, 'Email',       patient.email ?? '—',   rx,      y + 32, 28, 55);

  y += 40;
  rgb(doc, C.stripBg, 'fill');
  doc.setFillColor(C.stripBg[0], C.stripBg[1], C.stripBg[2]);
  doc.rect(M, y, CW, 14, 'F');
  kvPair(doc, 'Address', formatAddress(patient.address) || '—', lx, y + 6, 20, 150);
  if (patient.abhaRecord?.abhaAddress) {
    kvPair(doc, 'ABHA Address', patient.abhaRecord.abhaAddress, lx, y + 11, 28, 140);
  }
  y += 16;

  // ── Health Summary Strip ──────────────────────────────────────────────────
  y += 4;
  y = sectionBand(doc, y, 'Health Summary at a Glance');

  const statItems = [
    { label: 'Appointments',   value: summary.totalAppointments,   col: C.amber  },
    { label: 'Consultations',  value: summary.totalEncounters,     col: C.purple },
    { label: 'Prescriptions',  value: summary.totalPrescriptions,  col: C.green  },
    { label: 'Vitals',         value: summary.totalVitals,         col: C.teal   },
    { label: 'Lab Orders',     value: summary.totalLabOrders,      col: C.red    },
    { label: 'Investigations', value: summary.totalInvestigations, col: C.slate  },
    { label: 'Payments',       value: summary.totalPayments,       col: C.navy   },
    { label: 'Last Visit',
      value: summary.lastVisit ? formatDate(summary.lastVisit) : 'N/A',
      col: C.navy },
  ];

  const boxW = CW / 4;
  const boxH = 16;
  statItems.forEach((s, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const bx  = M + col * boxW;
    const by  = y + row * (boxH + 1);

    rgb(doc, [s.col[0]*0.08+235, s.col[1]*0.08+235, s.col[2]*0.08+235] as any, 'fill');
    doc.setFillColor(
      Math.round(s.col[0] * 0.08 + 235),
      Math.round(s.col[1] * 0.08 + 235),
      Math.round(s.col[2] * 0.08 + 235)
    );
    doc.rect(bx, by, boxW - 1, boxH, 'F');

    rgb(doc, s.col, 'text');
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(String(s.value), bx + boxW / 2 - 0.5, by + 9, { align: 'center' });

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    rgb(doc, C.slate, 'text');
    doc.text(s.label, bx + boxW / 2 - 0.5, by + 14, { align: 'center' });
  });

  y += Math.ceil(statItems.length / 4) * (boxH + 1) + 6;

  // ── Appointment / Visit List ──────────────────────────────────────────────
  if (appointmentEvents.length > 0) {
    checkY(20);
    y = sectionBand(doc, y, `Visit History  (${appointmentEvents.length} appointment${appointmentEvents.length !== 1 ? 's' : ''})`);

    const cols = [26, 44, 36, 26, 50]; // Date | Doctor | Type | Status | OPD Card / Notes
    const headers = ['Date', 'Doctor', 'Type', 'Status', 'Notes'];
    const xs = [M, M + cols[0], M + cols[0] + cols[1], M + cols[0] + cols[1] + cols[2], M + cols[0] + cols[1] + cols[2] + cols[3]];

    // Header row
    rgb(doc, C.stripBg, 'fill');
    doc.setFillColor(C.stripBg[0], C.stripBg[1], C.stripBg[2]);
    doc.rect(M, y, CW, 6, 'F');
    headers.forEach((h, i) => {
      rgb(doc, C.slate, 'text');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(h.toUpperCase(), xs[i] + 1, y + 4.3);
    });
    y += 6;

    appointmentEvents.forEach((ev, idx) => {
      checkY(8);
      if (idx % 2 === 0) {
        rgb(doc, C.lightBg, 'fill');
        doc.setFillColor(C.lightBg[0], C.lightBg[1], C.lightBg[2]);
        doc.rect(M, y, CW, 6.5, 'F');
      }
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      rgb(doc, C.black, 'text');
      doc.text(formatDate(ev.date), xs[0] + 1, y + 4.3);
      const drName = ev.data?.doctor
        ? `Dr. ${ev.data.doctor.firstName} ${ev.data.doctor.lastName}`
        : '—';
      doc.text(drName, xs[1] + 1, y + 4.3);
      doc.text(ev.data?.type ?? '—', xs[2] + 1, y + 4.3);
      doc.text((ev.status ?? '—').replace(/_/g, ' '), xs[3] + 1, y + 4.3);
      doc.text((ev.data?.notes ?? '').slice(0, 28), xs[4] + 1, y + 4.3);
      y += 6.5;
    });
    y += 4;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Vitals History
  // ══════════════════════════════════════════════════════════════════════════

  if (vitalsEvents.length > 0) {
    checkY(30);
    y = sectionBand(doc, y, `Vitals History  (${vitalsEvents.length} record${vitalsEvents.length !== 1 ? 's' : ''})`, C.teal);

    const vCols = [28, 22, 22, 22, 22, 22, 22, 22];
    const vHdr  = ['Date', 'BP (mmHg)', 'Pulse', 'Temp °F', 'SpO₂ %', 'Weight', 'Height', 'BMI'];
    const vXs   = vCols.reduce<number[]>((acc, _w, i) => {
      acc.push(i === 0 ? M : acc[i - 1] + vCols[i - 1]);
      return acc;
    }, []);

    rgb(doc, C.stripBg, 'fill');
    doc.setFillColor(C.stripBg[0], C.stripBg[1], C.stripBg[2]);
    doc.rect(M, y, CW, 6, 'F');
    vHdr.forEach((h, i) => {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      rgb(doc, C.slate, 'text');
      doc.text(h, vXs[i] + 1, y + 4.3);
    });
    y += 6;

    vitalsEvents.forEach((ev, idx) => {
      checkY(7);
      if (idx % 2 === 0) {
        rgb(doc, C.lightBg, 'fill');
        doc.setFillColor(C.lightBg[0], C.lightBg[1], C.lightBg[2]);
        doc.rect(M, y, CW, 6.5, 'F');
      }
      const d = ev.data;
      const row = [
        formatDate(ev.date),
        d.bloodPressureSystolic && d.bloodPressureDiastolic
          ? `${d.bloodPressureSystolic}/${d.bloodPressureDiastolic}` : '—',
        d.heartRate        ? `${d.heartRate}` : '—',
        d.temperature      ? `${d.temperature}` : '—',
        d.oxygenSaturation ? `${d.oxygenSaturation}` : '—',
        d.weight           ? `${d.weight} kg` : '—',
        d.height           ? `${d.height} cm` : '—',
        d.bmi              ? `${d.bmi}` : '—',
      ];
      rgb(doc, C.black, 'text');
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      row.forEach((cell, i) => doc.text(cell, vXs[i] + 1, y + 4.3));
      y += 6.5;
    });
    y += 4;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Consultations (each gets its own sub-block with Rx + Labs inline)
  // ══════════════════════════════════════════════════════════════════════════

  if (consultationEvents.length > 0) {
    checkY(20);
    y = sectionBand(doc, y,
      `Consultation Records  (${consultationEvents.length} encounter${consultationEvents.length !== 1 ? 's' : ''})`,
      C.purple);

    consultationEvents.forEach((ev, cIdx) => {
      const d      = ev.data;
      const rxList: any[] = d.prescriptions ?? [];
      const loList: any[] = d.labOrders     ?? [];
      const blockH = 22
        + (d.chiefComplaint ? 8 : 0)
        + (d.finalDiagnosis || d.provisionalDiagnosis ? 8 : 0)
        + rxList.length * 6
        + loList.length * 6
        + (d.notes ? 8 : 0)
        + 4;

      checkY(blockH + 4);

      // Encounter header
      rgb(doc, [230, 235, 245] as any, 'fill');
      doc.setFillColor(230, 235, 245);
      doc.rect(M, y, CW, 8, 'F');
      rgb(doc, C.navy, 'text');
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      const drName = d.doctor ? `Dr. ${d.doctor.firstName} ${d.doctor.lastName}` : '';
      doc.text(
        `#${cIdx + 1}  ${ev.title}   ${formatDateTime(ev.date)}${drName ? `   ·   ${drName}` : ''}`,
        M + 3, y + 5.5
      );
      if (ev.status) {
        doc.setFontSize(7);
        doc.text(ev.status.replace(/_/g, ' '), M + CW - 3, y + 5.5, { align: 'right' });
      }
      y += 10;

      // Chief complaint + diagnosis
      const fields: [string, string][] = [];
      if (d.chiefComplaint)         fields.push(['Chief Complaint',       d.chiefComplaint]);
      if (d.provisionalDiagnosis)   fields.push(['Provisional Diagnosis', d.provisionalDiagnosis]);
      if (d.finalDiagnosis)         fields.push(['Final Diagnosis',       d.finalDiagnosis]);
      if (d.historyOfPresentIllness) fields.push(['History',              d.historyOfPresentIllness]);
      if (d.physicalExamination)    fields.push(['Examination',           d.physicalExamination]);

      fields.forEach(([lbl, val]) => {
        checkY(10);
        label(doc, lbl, M + 4, y + 4);
        const extra = value(doc, val, M + 46, y + 4, 130);
        y += 7 + extra;
      });

      // Prescriptions table
      if (rxList.length > 0) {
        checkY(8 + rxList.length * 6);
        rgb(doc, [235, 240, 250] as any, 'fill');
        doc.setFillColor(235, 240, 250);
        doc.rect(M + 2, y, CW - 4, 6, 'F');
        rgb(doc, C.purple, 'text');
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text(`PRESCRIPTION  (${rxList.length} medicine${rxList.length !== 1 ? 's' : ''})`, M + 5, y + 4.3);
        y += 6;

        const rxCols = [60, 22, 22, 22, 56];
        const rxHdr  = ['Medicine', 'Dosage', 'Frequency', 'Duration', 'Instructions'];
        const rxXs   = rxCols.reduce<number[]>((acc, _w, i) => {
          acc.push(i === 0 ? M + 2 : acc[i - 1] + rxCols[i - 1]);
          return acc;
        }, []);

        // col headers
        rgb(doc, C.stripBg, 'fill');
        doc.setFillColor(C.stripBg[0], C.stripBg[1], C.stripBg[2]);
        doc.rect(M + 2, y, CW - 4, 5.5, 'F');
        rxHdr.forEach((h, i) => {
          doc.setFontSize(6.5);
          doc.setFont('helvetica', 'bold');
          rgb(doc, C.slate, 'text');
          doc.text(h, rxXs[i] + 1, y + 3.8);
        });
        y += 5.5;

        rxList.forEach((rx: any, ri: number) => {
          checkY(6);
          if (ri % 2 === 0) {
            rgb(doc, C.lightBg, 'fill');
            doc.setFillColor(C.lightBg[0], C.lightBg[1], C.lightBg[2]);
            doc.rect(M + 2, y, CW - 4, 6, 'F');
          }
          const cells = [
            rx.medicineName ?? '—',
            rx.dosage       ?? '—',
            rx.frequency    ?? '—',
            rx.duration     ?? '—',
            rx.instructions ?? '',
          ];
          rgb(doc, C.black, 'text');
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'normal');
          cells.forEach((cell, ci) => doc.text(String(cell).slice(0, 30), rxXs[ci] + 1, y + 4.2));
          y += 6;
        });
      }

      // Lab orders
      if (loList.length > 0) {
        checkY(8 + loList.length * 5.5);
        y += 2;
        rgb(doc, [240, 248, 240] as any, 'fill');
        doc.setFillColor(240, 248, 240);
        doc.rect(M + 2, y, CW - 4, 6, 'F');
        rgb(doc, C.teal, 'text');
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text(`INVESTIGATIONS ORDERED  (${loList.length})`, M + 5, y + 4.3);
        y += 6;

        const loCols = [70, 36, 36, 40];
        const loHdr  = ['Test Name', 'Type', 'Priority', 'Status'];
        const loXs   = loCols.reduce<number[]>((acc, _w, i) => {
          acc.push(i === 0 ? M + 2 : acc[i - 1] + loCols[i - 1]);
          return acc;
        }, []);
        rgb(doc, C.stripBg, 'fill');
        doc.setFillColor(C.stripBg[0], C.stripBg[1], C.stripBg[2]);
        doc.rect(M + 2, y, CW - 4, 5.5, 'F');
        loHdr.forEach((h, i) => {
          doc.setFontSize(6.5);
          doc.setFont('helvetica', 'bold');
          rgb(doc, C.slate, 'text');
          doc.text(h, loXs[i] + 1, y + 3.8);
        });
        y += 5.5;
        loList.forEach((lo: any, li: number) => {
          checkY(6);
          if (li % 2 === 0) {
            rgb(doc, C.lightBg, 'fill');
            doc.setFillColor(C.lightBg[0], C.lightBg[1], C.lightBg[2]);
            doc.rect(M + 2, y, CW - 4, 5.5, 'F');
          }
          rgb(doc, C.black, 'text');
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'normal');
          doc.text(lo.testName ?? '—', loXs[0] + 1, y + 3.8);
          doc.text(lo.testType ?? '—', loXs[1] + 1, y + 3.8);
          doc.text(lo.priority ?? 'ROUTINE', loXs[2] + 1, y + 3.8);
          doc.text((lo.status  ?? 'PENDING').replace(/_/g,' '), loXs[3] + 1, y + 3.8);
          y += 5.5;
        });
      }

      // Notes + follow-up
      if (d.notes) {
        checkY(10);
        y += 2;
        label(doc, 'Notes / Instructions', M + 4, y + 4);
        const extra = value(doc, d.notes, M + 50, y + 4, 130);
        y += 7 + extra;
      }
      if (d.followUpDate) {
        checkY(8);
        label(doc, 'Follow-up Date', M + 4, y + 4);
        value(doc, formatDate(d.followUpDate), M + 50, y + 4);
        y += 7;
      }

      // Bottom separator
      rule(doc, y, [200, 210, 225]);
      y += 5;
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Standalone Prescriptions (from Prescription table)
  // ══════════════════════════════════════════════════════════════════════════

  if (prescriptionEvents.length > 0) {
    checkY(20);
    y = sectionBand(doc, y,
      `Standalone Prescriptions  (${prescriptionEvents.length})`, C.green);

    prescriptionEvents.forEach((ev, pi) => {
      const meds: any[] = ev.data?.medications ?? [];
      checkY(12 + meds.length * 6);

      rgb(doc, [235, 248, 240] as any, 'fill');
      doc.setFillColor(235, 248, 240);
      doc.rect(M, y, CW, 7, 'F');
      rgb(doc, C.green, 'text');
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      const drName = ev.data?.doctor
        ? `Dr. ${ev.data.doctor.firstName} ${ev.data.doctor.lastName}` : '';
      doc.text(`#${pi + 1}  ${formatDateTime(ev.date)}${drName ? `   ·   ${drName}` : ''}`, M + 3, y + 5);
      if (ev.data?.diagnosis) {
        doc.setFontSize(7);
        doc.text(`Dx: ${ev.data.diagnosis.slice(0, 60)}`, PW - M, y + 5, { align: 'right' });
      }
      y += 9;

      if (meds.length > 0) {
        const rxCols = [60, 22, 22, 22, 56];
        const rxXs   = rxCols.reduce<number[]>((acc, _w, i) => {
          acc.push(i === 0 ? M + 2 : acc[i - 1] + rxCols[i - 1]);
          return acc;
        }, []);
        meds.forEach((m: any, mi: number) => {
          checkY(6);
          if (mi % 2 === 0) {
            rgb(doc, C.lightBg, 'fill');
            doc.setFillColor(C.lightBg[0], C.lightBg[1], C.lightBg[2]);
            doc.rect(M + 2, y, CW - 4, 6, 'F');
          }
          rgb(doc, C.black, 'text');
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'normal');
          doc.text(String(m.name || m.medicineName || '—').slice(0, 30), rxXs[0] + 1, y + 4.2);
          doc.text(String(m.dosage ?? '—'), rxXs[1] + 1, y + 4.2);
          doc.text(String(m.frequency ?? '—'), rxXs[2] + 1, y + 4.2);
          doc.text(String(m.duration  ?? '—'), rxXs[3] + 1, y + 4.2);
          doc.text(String(m.instructions ?? '').slice(0, 28), rxXs[4] + 1, y + 4.2);
          y += 6;
        });
      }
      rule(doc, y, [200, 225, 210]);
      y += 4;
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Investigations — with full structured results if available
  // ══════════════════════════════════════════════════════════════════════════

  if (investigationEvents.length > 0) {
    checkY(20);
    y = sectionBand(doc, y,
      `Lab Investigations  (${investigationEvents.length})`, C.teal);

    investigationEvents.forEach((ev, idx) => {
      const d        = ev.data;
      const params   = (d.results as any)?.parameters ?? [];
      const hasResults = params.length > 0;
      // Estimate block height
      const blockH = 10 + (hasResults ? 8 + params.length * 6.5 + 4 : 0)
                       + (d.notes || (d.results as any)?.notes ? 8 : 0);
      checkY(blockH + 4);

      // Row header
      if (idx % 2 === 0) {
        rgb(doc, C.lightBg, 'fill');
        doc.setFillColor(C.lightBg[0], C.lightBg[1], C.lightBg[2]);
        doc.rect(M, y, CW, 8, 'F');
      }

      // Left: test name + type
      rgb(doc, C.teal, 'text');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`${d.testName ?? '—'}`, M + 3, y + 5.5);

      // Status pill
      const statusX = M + 90;
      const statusLabel = (d.status ?? 'ORDERED').replace(/_/g, ' ');
      const statusCol: [number,number,number] = d.status === 'COMPLETED' ? C.green
        : d.status === 'IN_PROGRESS' || d.status === 'SAMPLE_COLLECTED' ? C.amber : C.slate;
      pill(doc, statusLabel, statusX, y + 5.5, statusCol);

      // Right: date info
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      rgb(doc, C.slate, 'text');
      const dateStr = d.reportedAt
        ? `Reported: ${formatDate(d.reportedAt)}`
        : `Ordered: ${formatDate(ev.date)}`;
      doc.text(dateStr, PW - M - 2, y + 5.5, { align: 'right' });

      // Meta row
      y += 8;
      doc.setFontSize(7.5);
      rgb(doc, C.slate, 'text');
      const meta = [
        `Type: ${d.testType ?? '—'}`,
        `Priority: ${d.priority ?? 'ROUTINE'}`,
        d.results && (d.results as any).sampleType ? `Sample: ${(d.results as any).sampleType}` : null,
        d.results && (d.results as any).labTechnicianName ? `Tested by: ${(d.results as any).labTechnicianName}` : null,
        d.results && (d.results as any).validatedBy ? `Validated by: ${(d.results as any).validatedBy}` : null,
      ].filter(Boolean).join('   ·   ');
      doc.text(meta, M + 3, y + 3.5);
      y += 6;

      // ── Structured parameters table ────────────────────────────────────────
      if (hasResults) {
        const pCols = [64, 24, 18, 42, 16] as const;
        const pHdr  = ['Parameter', 'Result', 'Unit', 'Reference Range', 'Flag'];
        const pXs: number[] = pCols.reduce<number[]>((acc, _w, i) => {
          acc.push(i === 0 ? M + 2 : acc[i - 1] + pCols[i - 1]);
          return acc;
        }, []);

        // Table header
        rgb(doc, [210, 235, 235] as any, 'fill');
        doc.setFillColor(210, 235, 235);
        doc.rect(M + 2, y, CW - 4, 5.5, 'F');
        pHdr.forEach((h, i) => {
          doc.setFontSize(6.5);
          doc.setFont('helvetica', 'bold');
          rgb(doc, C.teal, 'text');
          doc.text(h, pXs[i] + 1, y + 3.8);
        });
        y += 5.5;

        let lastGroup = '';
        params.forEach((param: any, pi: number) => {
          checkY(6);

          // Sub-group header
          if (param.subGroup && param.subGroup !== lastGroup) {
            lastGroup = param.subGroup;
            rgb(doc, [235, 248, 248] as any, 'fill');
            doc.setFillColor(235, 248, 248);
            doc.rect(M + 2, y, CW - 4, 5, 'F');
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            rgb(doc, C.navy, 'text');
            doc.text(param.subGroup.toUpperCase(), M + 5, y + 3.5);
            y += 5;
          }

          const isAbnormal = param.flag === 'H' || param.flag === 'L' || param.flag === 'C';
          if (isAbnormal) {
            rgb(doc, param.flag === 'C' ? [255, 235, 235] as any : [255, 250, 225] as any, 'fill');
            doc.setFillColor(
              param.flag === 'C' ? 255 : 255,
              param.flag === 'C' ? 235 : 250,
              param.flag === 'C' ? 235 : 225
            );
            doc.rect(M + 2, y, CW - 4, 6, 'F');
          } else if (pi % 2 === 0) {
            rgb(doc, C.lightBg, 'fill');
            doc.setFillColor(C.lightBg[0], C.lightBg[1], C.lightBg[2]);
            doc.rect(M + 2, y, CW - 4, 6, 'F');
          }

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          rgb(doc, C.black, 'text');
          doc.text(String(param.name  ?? '—'), pXs[0] + 1, y + 4.2);

          // Result (bold + colored if abnormal)
          doc.setFont('helvetica', 'bold');
          const flagColor: [number,number,number] =
            param.flag === 'C' ? C.red :
            param.flag === 'H' ? [198, 105, 0] :
            param.flag === 'L' ? [26, 100, 190] : C.black;
          rgb(doc, flagColor, 'text');
          doc.text(String(param.value ?? '—'), pXs[1] + 1, y + 4.2);

          doc.setFont('helvetica', 'normal');
          rgb(doc, C.slate, 'text');
          doc.text(String(param.unit  ?? ''), pXs[2] + 1, y + 4.2);
          doc.text(String(param.referenceRange ?? ''), pXs[3] + 1, y + 4.2);

          // Flag label
          if (isAbnormal) {
            const flagLabel = param.flag === 'H' ? 'HIGH' : param.flag === 'L' ? 'LOW' : 'CRIT';
            rgb(doc, flagColor, 'fill');
            doc.setFillColor(flagColor[0], flagColor[1], flagColor[2]);
            doc.roundedRect(pXs[4] + 1, y + 1.2, 12, 3.5, 1, 1, 'F');
            doc.setFontSize(6.5);
            doc.setFont('helvetica', 'bold');
            rgb(doc, C.white, 'text');
            doc.text(flagLabel, pXs[4] + 7, y + 4, { align: 'center' });
          }

          y += 6;
        });

        // Notes/remarks
        const remark = (d.results as any)?.notes || d.notes;
        if (remark) {
          checkY(10);
          rgb(doc, [255, 253, 230] as any, 'fill');
          doc.setFillColor(255, 253, 230);
          doc.rect(M + 2, y, CW - 4, 8, 'F');
          label(doc, 'Remarks', M + 5, y + 4.5);
          const extra = value(doc, remark, M + 30, y + 4.5, CW - 36);
          y += 9 + extra;
        }
      } else if (d.status !== 'COMPLETED') {
        // Not yet resulted
        rgb(doc, C.slate, 'text');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text('Results pending', M + 5, y + 4);
        y += 7;
      }

      rule(doc, y, [190, 220, 220]);
      y += 4;
    });
    y += 2;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Payments
  // ══════════════════════════════════════════════════════════════════════════

  if (paymentEvents.length > 0) {
    checkY(20);
    y = sectionBand(doc, y,
      `Payment History  (${paymentEvents.length} transaction${paymentEvents.length !== 1 ? 's' : ''})`, C.slate);

    const pCols = [30, 28, 30, 28, 36, 30];
    const pHdr  = ['Date', 'Amount', 'Method', 'Status', 'Description', 'Receipt'];
    const pXs   = pCols.reduce<number[]>((acc, _w, i) => {
      acc.push(i === 0 ? M : acc[i - 1] + pCols[i - 1]);
      return acc;
    }, []);

    rgb(doc, C.stripBg, 'fill');
    doc.setFillColor(C.stripBg[0], C.stripBg[1], C.stripBg[2]);
    doc.rect(M, y, CW, 6, 'F');
    pHdr.forEach((h, i) => {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      rgb(doc, C.slate, 'text');
      doc.text(h.toUpperCase(), pXs[i] + 1, y + 4.3);
    });
    y += 6;

    let totalPaid = 0;
    paymentEvents.forEach((ev, idx) => {
      checkY(7);
      if (idx % 2 === 0) {
        rgb(doc, C.lightBg, 'fill');
        doc.setFillColor(C.lightBg[0], C.lightBg[1], C.lightBg[2]);
        doc.rect(M, y, CW, 6.5, 'F');
      }
      const d = ev.data;
      if (typeof d.amount === 'number') totalPaid += d.amount;
      rgb(doc, C.black, 'text');
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(formatDate(ev.date),                        pXs[0] + 1, y + 4.3);
      doc.text(`₹ ${d.amount ?? '—'}`,                    pXs[1] + 1, y + 4.3);
      doc.text((d.paymentMethod ?? '—').slice(0, 14),      pXs[2] + 1, y + 4.3);
      doc.text((d.status ?? '—').replace(/_/g,' '),        pXs[3] + 1, y + 4.3);
      doc.text((d.description ?? '').slice(0, 22),         pXs[4] + 1, y + 4.3);
      doc.text((d.receiptNumber ?? '').slice(0, 16),       pXs[5] + 1, y + 4.3);
      y += 6.5;
    });

    if (totalPaid > 0) {
      checkY(9);
      rgb(doc, C.stripBg, 'fill');
      doc.setFillColor(C.stripBg[0], C.stripBg[1], C.stripBg[2]);
      doc.rect(M, y, CW, 7, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      rgb(doc, C.navy, 'text');
      doc.text(`Total Payments: ₹ ${totalPaid.toLocaleString('en-IN')}`, PW - M - 4, y + 5, { align: 'right' });
      y += 9;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Final page footer + page headers on all pages
  // ══════════════════════════════════════════════════════════════════════════

  pageFooter(doc, hospital, generatedBy ?? '', genDate);

  // Stamp page header on page 1 (other pages get it via newPage())
  const totalPagesActual = (doc as any).internal.getNumberOfPages();
  for (let pg = 1; pg <= totalPagesActual; pg++) {
    doc.setPage(pg);
    pageHeader(doc, hospital, pg, totalPagesActual);
  }

  // pill summaries are unused from import — suppress lint
  void pill;

  // ── Save ──────────────────────────────────────────────────────────────────

  const fileName = `HealthRecord_${patient.uhid}_${format(new Date(), 'ddMMMyyyy')}.pdf`;
  const base64 = pdfToBase64(doc);
  doc.save(fileName);
  return base64;
}
