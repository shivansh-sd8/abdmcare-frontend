import React from 'react';
import { Box, Typography, Divider, Grid } from '@mui/material';
import { format } from 'date-fns';

interface Patient {
  uhid: string;
  firstName: string;
  lastName: string;
  gender: string;
  dob: string;
  mobile: string;
  address?: string;
}

interface Doctor {
  firstName: string;
  lastName: string;
  specialization?: string;
  registrationNo?: string;
}

interface Appointment {
  id: string;
  appointmentNumber: string;
  date: string;
  time: string;
  type: string;
  patient: Patient;
  doctor: Doctor;
}

interface OPDCardProps {
  appointment: Appointment;
  hospitalName?: string;
}

const OPDCard: React.FC<OPDCardProps> = ({ appointment, hospitalName = 'MediSync Hospital' }) => {
  const { patient, doctor } = appointment;

  return (
    <Box
      sx={{
        width: '210mm',
        minHeight: '148mm',
        padding: 4,
        backgroundColor: 'white',
        border: '2px solid #000',
        fontFamily: 'Arial, sans-serif',
        '@media print': {
          border: 'none',
          padding: 2,
        },
      }}
    >
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          {hospitalName}
        </Typography>
        <Typography variant="h6" sx={{ mb: 2 }}>
          OPD Registration Card
        </Typography>
        <Divider sx={{ borderWidth: 2, borderColor: '#000' }} />
      </Box>

      {/* Appointment Details */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6}>
          <Typography variant="body1">
            <strong>OPD No:</strong> {appointment.appointmentNumber}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="body1">
            <strong>Date:</strong> {format(new Date(appointment.date), 'dd/MM/yyyy')}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="body1">
            <strong>Time:</strong> {appointment.time}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="body1">
            <strong>Type:</strong> {appointment.type}
          </Typography>
        </Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      {/* Patient Details */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
          Patient Details
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="body1">
              <strong>UHID:</strong> {patient.uhid}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body1">
              <strong>Name:</strong> {patient.firstName} {patient.lastName}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body1">
              <strong>Gender:</strong> {patient.gender}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body1">
              <strong>Age:</strong>{' '}
              {new Date().getFullYear() - new Date(patient.dob).getFullYear()} years
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body1">
              <strong>Mobile:</strong> {patient.mobile}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body1">
              <strong>DOB:</strong> {format(new Date(patient.dob), 'dd/MM/yyyy')}
            </Typography>
          </Grid>
          {patient.address && (
            <Grid item xs={12}>
              <Typography variant="body1">
                <strong>Address:</strong> {patient.address}
              </Typography>
            </Grid>
          )}
        </Grid>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Doctor Details */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
          Doctor Details
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="body1">
              <strong>Name:</strong> Dr. {doctor.firstName} {doctor.lastName}
            </Typography>
          </Grid>
          {doctor.specialization && (
            <Grid item xs={6}>
              <Typography variant="body1">
                <strong>Specialization:</strong> {doctor.specialization}
              </Typography>
            </Grid>
          )}
          {doctor.registrationNo && (
            <Grid item xs={6}>
              <Typography variant="body1">
                <strong>Reg. No:</strong> {doctor.registrationNo}
              </Typography>
            </Grid>
          )}
        </Grid>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Footer */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
          Please bring this card for all future visits
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, fontSize: '0.75rem' }}>
          Generated on: {format(new Date(), 'dd/MM/yyyy HH:mm')}
        </Typography>
      </Box>
    </Box>
  );
};

export default OPDCard;
