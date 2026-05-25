/**
 * Gate Pass PDF Generator
 * Generates a gate pass document after patient discharge, confirming clearance for departure.
 */
import jsPDF from 'jspdf';
import { format } from 'date-fns';

export interface GatePassData {
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
}

export function generateGatePass(data: GatePassData): void {
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

  // Title with border
  y += 6;
  doc.setDrawColor(39, 174, 96);
  doc.setLineWidth(1);
  doc.line(15, y, pageWidth - 15, y);
  y += 8;
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(39, 174, 96);
  doc.text('GATE PASS', pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Patient Clearance for Departure', pageWidth / 2, y, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  y += 4;
  doc.line(15, y, pageWidth - 15, y);
  y += 10;

  const addRow = (label: string, value: string, xLabel = 20, xValue = 75) => {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(label, xLabel, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value || '—', xValue, y);
    y += 7;
  };

  // Patient Info
  addRow('Patient Name:', data.patient.name);
  addRow('UHID:', data.patient.uhid);
  if (data.patient.gender || data.patient.age) {
    addRow('Gender / Age:', `${data.patient.gender || '—'} / ${data.patient.age || '—'}`);
  }
  if (data.patient.mobile) addRow('Contact:', data.patient.mobile);

  y += 4;

  // Admission Info
  addRow('Admission No:', data.admission.admissionNumber);
  addRow('Ward / Bed:', `${data.admission.wardName}${data.admission.bedNumber ? ` / Bed ${data.admission.bedNumber}` : ''}`);
  addRow('Admitted On:', format(new Date(data.admission.admittedAt), 'dd MMM yyyy, hh:mm a'));
  addRow('Discharged On:', format(new Date(data.admission.dischargedAt), 'dd MMM yyyy, hh:mm a'));
  addRow('Duration:', `${data.admission.days} day${data.admission.days > 1 ? 's' : ''}`);
  if (data.admission.diagnosis) addRow('Diagnosis:', data.admission.diagnosis);
  if (data.doctor) addRow('Treating Doctor:', data.doctor.name);

  y += 4;

  // Payment Status
  addRow('Total Bill:', `Rs. ${data.payment.totalAmount.toLocaleString('en-IN')}`);
  addRow('Total Paid:', `Rs. ${data.payment.totalPaid.toLocaleString('en-IN')}`);
  const balance = Math.max(0, data.payment.totalAmount - data.payment.totalPaid);
  addRow('Balance Due:', balance > 0 ? `Rs. ${balance.toLocaleString('en-IN')}` : 'NIL');
  addRow('Payment Status:', data.payment.paymentStatus);

  y += 10;

  // Clearance Box
  doc.setDrawColor(39, 174, 96);
  doc.setFillColor(236, 253, 245);
  doc.roundedRect(20, y, pageWidth - 40, 25, 3, 3, 'FD');
  y += 10;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(39, 174, 96);
  doc.text('PATIENT IS CLEARED FOR DEPARTURE', pageWidth / 2, y, { align: 'center' });
  y += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Issued on ${format(new Date(), 'dd MMM yyyy at hh:mm a')}`, pageWidth / 2, y, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  y += 20;

  // Signature lines
  doc.setDrawColor(150, 150, 150);
  doc.line(20, y, 80, y);
  doc.line(pageWidth - 80, y, pageWidth - 20, y);
  y += 5;
  doc.setFontSize(9);
  doc.text('Authorized Signature', 30, y);
  doc.text('Security Gate', pageWidth - 65, y);

  // Footer
  y += 15;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(130, 130, 130);
  doc.text('This is a computer-generated gate pass. No signature required.', pageWidth / 2, y, { align: 'center' });

  doc.save(`Gate_Pass_${data.admission.admissionNumber}.pdf`);
}
