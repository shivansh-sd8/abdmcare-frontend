import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface OPDCardData {
  opdCardNumber: string;
  issueDate: string;
  patient: {
    name: string;
    uhid: string;
    age: number;
    gender: string;
    bloodGroup?: string;
    mobile: string;
    email?: string;
    address: string;
  };
  appointment: {
    doctor: string;
    specialization: string;
    department?: string;
    scheduledTime: string;
    type: string;
    status: string;
  };
  emergencyContact?: {
    name: string;
    relationship: string;
    mobile: string;
  };
  consultation?: {
    chiefComplaint?: string;
    diagnosis?: string;
    notes?: string;
    visitDate?: string;
  };
}

export const generateOPDCardPDF = (data: OPDCardData): void => {
  const doc = new jsPDF();
  
  // Colors
  const primaryColor: [number, number, number] = [41, 128, 185]; // Blue
  const secondaryColor: [number, number, number] = [52, 73, 94]; // Dark gray
  const lightGray: [number, number, number] = [236, 240, 241];
  
  let yPosition = 20;
  
  // Header - Hospital Name
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('OPD CARD', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('HOSPITAL MANAGEMENT SYSTEM', 105, 30, { align: 'center' });
  
  yPosition = 50;
  
  // OPD Card Number and Issue Date
  doc.setTextColor(...secondaryColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`OPD Card Number: ${data.opdCardNumber}`, 20, yPosition);
  doc.text(`Issue Date: ${data.issueDate}`, 150, yPosition, { align: 'right' });
  
  yPosition += 10;
  
  // Divider
  doc.setDrawColor(...lightGray);
  doc.setLineWidth(0.5);
  doc.line(20, yPosition, 190, yPosition);
  
  yPosition += 10;
  
  // Patient Information Section
  doc.setFillColor(...lightGray);
  doc.rect(20, yPosition, 170, 8, 'F');
  doc.setTextColor(...primaryColor);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('PATIENT INFORMATION', 22, yPosition + 6);
  
  yPosition += 15;
  
  // Patient Details
  doc.setTextColor(...secondaryColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const patientInfo = [
    ['Name', data.patient.name],
    ['UHID', data.patient.uhid],
    ['Age', `${data.patient.age} years`],
    ['Gender', data.patient.gender],
    ['Blood Group', data.patient.bloodGroup || 'N/A'],
    ['Mobile', data.patient.mobile],
    ['Email', data.patient.email || 'N/A'],
    ['Address', data.patient.address],
  ];
  
  patientInfo.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, 25, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 70, yPosition);
    yPosition += 7;
  });
  
  yPosition += 5;
  
  // Appointment Details Section
  doc.setFillColor(...lightGray);
  doc.rect(20, yPosition, 170, 8, 'F');
  doc.setTextColor(...primaryColor);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('APPOINTMENT DETAILS', 22, yPosition + 6);
  
  yPosition += 15;
  
  // Appointment Info
  doc.setTextColor(...secondaryColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const appointmentInfo = [
    ['Doctor', data.appointment.doctor],
    ['Specialization', data.appointment.specialization],
    ['Department', data.appointment.department || 'N/A'],
    ['Scheduled Time', data.appointment.scheduledTime],
    ['Appointment Type', data.appointment.type],
    ['Status', data.appointment.status],
  ];
  
  appointmentInfo.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, 25, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 70, yPosition);
    yPosition += 7;
  });
  
  yPosition += 5;
  
  // Emergency Contact Section
  if (data.emergencyContact) {
    doc.setFillColor(...lightGray);
    doc.rect(20, yPosition, 170, 8, 'F');
    doc.setTextColor(...primaryColor);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('EMERGENCY CONTACT', 22, yPosition + 6);
    
    yPosition += 15;
    
    doc.setTextColor(...secondaryColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const emergencyInfo = [
      ['Name', data.emergencyContact.name],
      ['Relationship', data.emergencyContact.relationship],
      ['Mobile', data.emergencyContact.mobile],
    ];
    
    emergencyInfo.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, 25, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 70, yPosition);
      yPosition += 7;
    });
    
    yPosition += 5;
  }
  
  // Consultation Details Section (if available)
  if (data.consultation && (data.consultation.diagnosis || data.consultation.chiefComplaint)) {
    // Check if we need a new page
    if (yPosition > 240) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFillColor(...lightGray);
    doc.rect(20, yPosition, 170, 8, 'F');
    doc.setTextColor(...primaryColor);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CONSULTATION DETAILS', 22, yPosition + 6);
    
    yPosition += 15;
    
    doc.setTextColor(...secondaryColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    if (data.consultation.chiefComplaint) {
      doc.setFont('helvetica', 'bold');
      doc.text('Chief Complaint:', 25, yPosition);
      doc.setFont('helvetica', 'normal');
      const complaintLines = doc.splitTextToSize(data.consultation.chiefComplaint, 120);
      doc.text(complaintLines, 25, yPosition + 7);
      yPosition += 7 + (complaintLines.length * 5);
    }
    
    if (data.consultation.diagnosis) {
      doc.setFont('helvetica', 'bold');
      doc.text('Diagnosis:', 25, yPosition);
      doc.setFont('helvetica', 'normal');
      const diagnosisLines = doc.splitTextToSize(data.consultation.diagnosis, 120);
      doc.text(diagnosisLines, 25, yPosition + 7);
      yPosition += 7 + (diagnosisLines.length * 5);
    }
    
    if (data.consultation.notes) {
      doc.setFont('helvetica', 'bold');
      doc.text('Notes:', 25, yPosition);
      doc.setFont('helvetica', 'normal');
      const notesLines = doc.splitTextToSize(data.consultation.notes, 120);
      doc.text(notesLines, 25, yPosition + 7);
      yPosition += 7 + (notesLines.length * 5);
    }
    
    if (data.consultation.visitDate) {
      doc.setFont('helvetica', 'bold');
      doc.text('Visit Date:', 25, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(data.consultation.visitDate, 70, yPosition);
      yPosition += 7;
    }
    
    yPosition += 5;
  }
  
  // Footer - Important Instructions
  if (yPosition > 240) {
    doc.addPage();
    yPosition = 20;
  }
  
  doc.setFillColor(...lightGray);
  doc.rect(20, yPosition, 170, 8, 'F');
  doc.setTextColor(...primaryColor);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('IMPORTANT INSTRUCTIONS', 22, yPosition + 6);
  
  yPosition += 15;
  
  doc.setTextColor(...secondaryColor);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  const instructions = [
    '1. Please carry this OPD card for all future visits',
    '2. Arrive 15 minutes before your scheduled appointment',
    '3. Bring all previous medical records and prescriptions',
    '4. Follow doctor\'s advice and prescribed medications',
    '5. For emergencies, contact hospital emergency number',
  ];
  
  instructions.forEach((instruction) => {
    doc.text(instruction, 25, yPosition);
    yPosition += 6;
  });
  
  yPosition += 10;
  
  // Bottom Footer
  doc.setDrawColor(...lightGray);
  doc.line(20, yPosition, 190, yPosition);
  yPosition += 7;
  
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, yPosition, { align: 'center' });
  yPosition += 5;
  doc.text('System: ABDM Care - Hospital Management System', 105, yPosition, { align: 'center' });
  
  // Save the PDF
  doc.save(`OPD-Card-${data.opdCardNumber}.pdf`);
};
