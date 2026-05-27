/**
 * Admission Summary PDF Generator
 * Generates a summary document when a patient is admitted to IPD.
 */
import jsPDF from 'jspdf';
import { format } from 'date-fns';

export interface AdmissionSummaryData {
  hospital: {
    name: string;
    addressLine1?: string;
    city?: string;
    state?: string;
    phone?: string;
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
}

export function generateAdmissionSummary(data: AdmissionSummaryData): string {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Hospital Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(data.hospital.name, pageWidth / 2, y, { align: 'center' });
  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const addrParts = [data.hospital.addressLine1, data.hospital.city, data.hospital.state].filter(Boolean);
  if (addrParts.length) {
    doc.text(addrParts.join(', '), pageWidth / 2, y, { align: 'center' });
    y += 4;
  }
  if (data.hospital.phone) {
    doc.text(`Phone: ${data.hospital.phone}`, pageWidth / 2, y, { align: 'center' });
    y += 4;
  }

  // Title
  y += 4;
  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(0.5);
  doc.line(15, y, pageWidth - 15, y);
  y += 6;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(41, 128, 185);
  doc.text('ADMISSION SUMMARY', pageWidth / 2, y, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  y += 4;
  doc.line(15, y, pageWidth - 15, y);
  y += 8;

  const addRow = (label: string, value: string, xLabel = 15, xValue = 65) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(label, xLabel, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value || '—', xValue, y);
    y += 6;
  };

  // Patient Details
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Patient Details', 15, y);
  y += 6;

  addRow('Name:', data.patient.name);
  addRow('UHID:', data.patient.uhid);
  if (data.patient.gender || data.patient.age) {
    addRow('Gender / Age:', `${data.patient.gender || '—'} / ${data.patient.age || '—'}`);
  }
  if (data.patient.mobile) addRow('Mobile:', data.patient.mobile);
  if (data.patient.bloodGroup) addRow('Blood Group:', data.patient.bloodGroup);
  if (data.patient.address) addRow('Address:', data.patient.address);

  y += 4;

  // Admission Details
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Admission Details', 15, y);
  y += 6;

  addRow('Admission No:', data.admission.admissionNumber);
  addRow('Admitted On:', format(new Date(data.admission.admittedAt), 'dd MMM yyyy, hh:mm a'));
  if (data.admission.admittedBy) addRow('Admitted By:', data.admission.admittedBy);
  addRow('Ward:', data.admission.wardName);
  if (data.admission.bedNumber) addRow('Bed:', data.admission.bedNumber);
  addRow('Daily Charges:', `Rs. ${data.admission.dailyCharges.toLocaleString('en-IN')}`);

  if (data.doctor) {
    addRow('Treating Doctor:', `${data.doctor.name}${data.doctor.specialization ? ` (${data.doctor.specialization})` : ''}`);
  }

  y += 4;

  // Clinical Details
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Clinical Details', 15, y);
  y += 6;

  if (data.admission.admissionReason) addRow('Reason:', data.admission.admissionReason);
  if (data.admission.diagnosis) addRow('Diagnosis:', data.admission.diagnosis);
  if (data.admission.notes) addRow('Notes:', data.admission.notes);

  y += 4;

  // Payment Details
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Details', 15, y);
  y += 6;

  addRow('Advance Paid:', `Rs. ${data.admission.advancePaid.toLocaleString('en-IN')}`);

  // Footer
  y += 10;
  doc.setDrawColor(200, 200, 200);
  doc.line(15, y, pageWidth - 15, y);
  y += 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(`Generated on ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, 15, y);
  doc.text('This is a computer-generated document.', pageWidth - 15, y, { align: 'right' });

  const base64 = doc.output('base64');
  doc.save(`Admission_Summary_${data.admission.admissionNumber}.pdf`);
  return base64;
}
