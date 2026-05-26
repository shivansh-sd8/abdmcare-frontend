/**
 * IPD Bill PDF Generator
 * Generates a detailed inpatient billing statement.
 */
import jsPDF from 'jspdf';
import { format } from 'date-fns';

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

export function generateIPDBill(data: IPDBillData): void {
  const { hospital, patient, admission, generatedBy } = data;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  const PW = 210;
  const M  = 14;
  const CW = PW - M * 2;
  const genDate = format(new Date(), 'dd MMM yyyy, hh:mm a');
  const admittedDate = format(new Date(admission.admittedAt), 'dd MMM yyyy, hh:mm a');
  const dischargedDate = admission.dischargedAt ? format(new Date(admission.dischargedAt), 'dd MMM yyyy, hh:mm a') : '—';

  let y = 0;
  const NP = () => { doc.addPage(); y = 20; };

  const checkY = (needed = 14) => { if (y + needed > 275) NP(); };

  // ── Header ───────────────────────────────────────────────────────────────
  doc.setFillColor(26, 60, 110);
  doc.rect(0, 0, PW, 32, 'F');

  const initials = hospital.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  doc.setFillColor(255, 255, 255);
  doc.circle(M + 9, 16, 8, 'F');
  doc.setTextColor(26, 60, 110);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(initials, M + 9, 18, { align: 'center' });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(hospital.name, M + 22, 13);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const addr = [hospital.addressLine1, hospital.city, hospital.state].filter(Boolean).join(', ');
  if (addr) doc.text(addr, M + 22, 19);
  const contact = [hospital.phone, hospital.email].filter(Boolean).join(' · ');
  if (contact) doc.text(contact, M + 22, 25);

  // Title
  doc.setFillColor(14, 44, 85);
  doc.rect(0, 32, PW, 9, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('INPATIENT (IPD) BILLING STATEMENT', PW / 2, 38, { align: 'center' });

  y = 47;

  // ── Admission meta (2 columns) ─────────────────────────────────────────
  doc.setFillColor(240, 244, 248);
  doc.rect(M, y, CW, 24, 'F');

  const col2 = M + CW / 2;
  const rowH = 8;

  const metaRows = [
    ['Admission No.', admission.admissionNumber, 'Ward / Bed', `${admission.wardName}${admission.bedNumber ? ` / Bed ${admission.bedNumber}` : ''}`],
    ['Admitted On',  admittedDate,               'Discharged On', dischargedDate],
    ['Days Stay',    `${admission.days} day(s)`,  'Diagnosis',  admission.diagnosis || '—'],
  ];

  doc.setFontSize(7.5);
  metaRows.forEach((row, i) => {
    const yy = y + 4 + i * rowH;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 115, 135);
    doc.text(row[0], M + 2, yy);
    doc.text(row[2], col2 + 2, yy);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(row[1], M + 2, yy + 4);
    doc.text(row[3], col2 + 2, yy + 4);
  });
  y += 27;

  // ── Patient details ──────────────────────────────────────────────────────
  y += 4;
  doc.setFillColor(26, 60, 110);
  doc.rect(M, y, CW, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('PATIENT INFORMATION', M + 2, y + 4.3);
  y += 7;

  doc.setFillColor(250, 251, 253);
  doc.rect(M, y, CW, 11, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 115, 135);
  doc.text('NAME', M + 2, y + 4);
  doc.text('UHID', col2 + 2, y + 4);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 60, 110);
  doc.text(patient.name, M + 2, y + 9);
  doc.text(patient.uhid, col2 + 2, y + 9);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 130, 145);
  if (patient.mobile) doc.text(`Mobile: ${patient.mobile}`, M + 2, y + 12.5);
  const demo = [patient.gender, patient.age].filter(Boolean).join(' · ');
  if (demo)           doc.text(demo, col2 + 2, y + 12.5);
  y += 16;

  // ── Charges table ────────────────────────────────────────────────────────
  const tableHeader = (title: string) => {
    checkY(8);
    y += 4;
    doc.setFillColor(22, 160, 133);
    doc.rect(M, y, CW, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(title, M + 2, y + 4.3);
    y += 7;
  };

  const tableRow2 = (label: string, amount: string | number, bg = false) => {
    checkY(8);
    if (bg) {
      doc.setFillColor(247, 250, 252);
      doc.rect(M, y, CW, 7, 'F');
    }
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(label, M + 4, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.text(String(amount), M + CW - 4, y + 5, { align: 'right' });
    doc.setDrawColor(220, 225, 235);
    doc.setLineWidth(0.2);
    doc.line(M, y + 7, M + CW, y + 7);
    y += 7;
  };

  // Ward charges
  tableHeader('WARD CHARGES');
  tableRow2('Ward / Bed Rent', `₹${admission.dailyCharges} × ${admission.days} day(s)`, true);
  tableRow2('', `₹${(admission.dailyCharges * admission.days).toLocaleString('en-IN')}`);

  // Consultation fee (from OPD encounter if carried over)
  if ((admission.consultationFee || 0) > 0) {
    tableHeader('CONSULTATION FEE');
    tableRow2('Doctor Consultation', `₹${admission.consultationFee!.toLocaleString('en-IN')}`, true);
  }

  // Medicines
  if (admission.medicines && admission.medicines.length > 0) {
    tableHeader('MEDICINES / PHARMACY');
    admission.medicines.forEach((m, i) => {
      tableRow2(m.name, `₹${(m.amount || 0).toLocaleString('en-IN')}`, i % 2 === 0);
    });
  }

  // Lab tests
  if (admission.labTests && admission.labTests.length > 0) {
    tableHeader('LABORATORY CHARGES');
    admission.labTests.forEach((t, i) => {
      tableRow2(t.name, `₹${(t.amount || 0).toLocaleString('en-IN')}`, i % 2 === 0);
    });
  }

  // Procedures
  if (admission.procedures && admission.procedures.length > 0) {
    tableHeader('PROCEDURES');
    admission.procedures.forEach((p, i) => {
      tableRow2(p.name, `₹${(p.amount || 0).toLocaleString('en-IN')}`, i % 2 === 0);
    });
  }

  // ── Billing summary ──────────────────────────────────────────────────────
  y += 6;
  checkY(40);

  const wardTotal   = admission.dailyCharges * admission.days;
  const consFee     = admission.consultationFee || 0;
  const medTotal    = (admission.medicines || []).reduce((s, m) => s + (m.amount || 0), 0);
  const labTotal    = (admission.labTests  || []).reduce((s, t) => s + (t.amount || 0), 0);
  const procTotal   = (admission.procedures || []).reduce((s, p) => s + (p.amount || 0), 0);
  const itemizedTotal = wardTotal + consFee + medTotal + labTotal + procTotal;
  const grossTotal  = admission.totalAmount > 0 ? admission.totalAmount : itemizedTotal;
  const balance     = Math.max(0, grossTotal - admission.advancePaid);

  doc.setFillColor(26, 60, 110);
  doc.rect(M, y, CW, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('BILLING SUMMARY', M + 2, y + 5);
  y += 8;

  const sumRows: [string, string, boolean][] = [
    ['Gross Total',    `₹${grossTotal.toLocaleString('en-IN')}`,          true],
    ['Advance Paid',   `- ₹${admission.advancePaid.toLocaleString('en-IN')}`, false],
    ['Net Payable',    `₹${balance.toLocaleString('en-IN')}`,             true],
  ];

  sumRows.forEach(([lbl, val, highlight]) => {
    checkY(10);
    if (highlight) {
      doc.setFillColor(26, 60, 110);
      doc.rect(M, y, CW, 9, 'F');
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setFillColor(240, 244, 248);
      doc.rect(M, y, CW, 9, 'F');
      doc.setTextColor(30, 30, 30);
    }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(lbl, M + 4, y + 6.3);
    doc.text(val, M + CW - 4, y + 6.3, { align: 'right' });
    y += 10;
  });

  // Notes
  if (admission.notes) {
    y += 4;
    checkY(14);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 90, 110);
    doc.text('Discharge Notes:', M, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(admission.notes, CW);
    doc.text(lines, M, y);
    y += lines.length * 5;
  }

  // ── Footer ───────────────────────────────────────────────────────────────
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(200, 210, 225);
    doc.setLineWidth(0.25);
    doc.line(M, 283, M + CW, 283);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(140, 150, 165);
    doc.text(`Generated ${genDate}${generatedBy ? ` · By: ${generatedBy}` : ''}`, M, 288);
    doc.text('This is a computer-generated bill and is valid without signature.', M, 292);
    doc.text(`Page ${i} of ${pageCount}`, M + CW, 288, { align: 'right' });
    if (hospital.registrationNumber) {
      doc.text(`Reg No: ${hospital.registrationNumber}`, M + CW, 292, { align: 'right' });
    }
  }

  const safeDate = format(new Date(admission.admittedAt), 'ddMMMyyyy');
  doc.save(`IPDBill_${patient.uhid}_${safeDate}.pdf`);
}
