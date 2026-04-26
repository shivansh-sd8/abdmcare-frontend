import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Divider,
  TextField,
  Chip,
  IconButton,
  Tab,
  Tabs,
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Download as DownloadIcon,
  Person as PersonIcon,
  LocalHospital as HospitalIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { generateOPDCardPDF } from '../utils/pdfGenerator';

interface OPDCardDialogProps {
  open: boolean;
  onClose: () => void;
  appointment: any;
  encounter?: any;
  onUpdate?: (data: any) => Promise<void>;
  readOnly?: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const OPDCardDialog: React.FC<OPDCardDialogProps> = ({
  open,
  onClose,
  appointment,
  encounter,
  onUpdate,
  readOnly = false,
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [editPatientMode, setEditPatientMode] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    chiefComplaint: '',
    diagnosis: '',
    notes: '',
    prescription: '',
    vitalSigns: {
      temperature: '',
      bloodPressure: '',
      heartRate: '',
      respiratoryRate: '',
      oxygenSaturation: '',
    },
  });

  const [patientFormData, setPatientFormData] = useState({
    mobile: '',
    email: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactMobile: '',
  });

  useEffect(() => {
    if (encounter) {
      setFormData({
        chiefComplaint: encounter.chiefComplaint || '',
        diagnosis: encounter.diagnosis || '',
        notes: encounter.notes || '',
        prescription: encounter.prescription ? JSON.stringify(encounter.prescription, null, 2) : '',
        vitalSigns: encounter.vitalSigns || {
          temperature: '',
          bloodPressure: '',
          heartRate: '',
          respiratoryRate: '',
          oxygenSaturation: '',
        },
      });
    }
  }, [encounter]);

  useEffect(() => {
    if (appointment?.patient) {
      setPatientFormData({
        mobile: appointment.patient.mobile || '',
        email: appointment.patient.email || '',
        addressLine1: appointment.patient.address?.line1 || '',
        addressLine2: appointment.patient.address?.line2 || '',
        city: appointment.patient.address?.city || '',
        state: appointment.patient.address?.state || '',
        pincode: appointment.patient.address?.pincode || '',
        emergencyContactName: appointment.patient.emergencyContact?.name || '',
        emergencyContactRelationship: appointment.patient.emergencyContact?.relationship || '',
        emergencyContactMobile: appointment.patient.emergencyContact?.mobile || '',
      });
    }
  }, [appointment]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...(prev as any)[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleSave = async () => {
    if (!onUpdate) return;
    
    try {
      setSaving(true);
      await onUpdate(formData);
      setEditMode(false);
      toast.success('OPD Card updated successfully');
    } catch (error) {
      console.error('Error updating OPD card:', error);
      toast.error('Failed to update OPD card');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = () => {
    const age = appointment.patient?.dob 
      ? new Date().getFullYear() - new Date(appointment.patient.dob).getFullYear()
      : 0;

    const pdfData = {
      opdCardNumber: appointment.opdCardNumber,
      issueDate: format(new Date(appointment.checkedInAt || appointment.createdAt), 'PPpp'),
      patient: {
        name: `${appointment.patient?.firstName} ${appointment.patient?.lastName}`,
        uhid: appointment.patient?.uhid || 'N/A',
        age: age,
        gender: appointment.patient?.gender || 'N/A',
        bloodGroup: appointment.patient?.bloodGroup,
        mobile: appointment.patient?.mobile || 'N/A',
        email: appointment.patient?.email,
        address: `${appointment.patient?.address?.line1 || ''}, ${appointment.patient?.address?.city || ''}, ${appointment.patient?.address?.state || ''} - ${appointment.patient?.address?.pincode || ''}`,
      },
      appointment: {
        doctor: `Dr. ${appointment.doctor?.firstName} ${appointment.doctor?.lastName}`,
        specialization: appointment.doctor?.specialization || 'N/A',
        department: appointment.doctor?.department?.name,
        scheduledTime: format(new Date(appointment.scheduledAt), 'PPpp'),
        type: appointment.type,
        status: appointment.status,
      },
      emergencyContact: appointment.patient?.emergencyContact ? {
        name: appointment.patient.emergencyContact.name,
        relationship: appointment.patient.emergencyContact.relationship,
        mobile: appointment.patient.emergencyContact.mobile,
      } : undefined,
      consultation: encounter ? {
        chiefComplaint: formData.chiefComplaint || undefined,
        diagnosis: formData.diagnosis || undefined,
        notes: formData.notes || undefined,
        visitDate: encounter.visitDate ? format(new Date(encounter.visitDate), 'PPpp') : undefined,
      } : undefined,
    };

    generateOPDCardPDF(pdfData);
    toast.success('OPD Card PDF downloaded');
  };

  const calculateAge = () => {
    if (!appointment.patient?.dob) return 'N/A';
    return new Date().getFullYear() - new Date(appointment.patient.dob).getFullYear();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'primary.main', color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssignmentIcon />
          <Typography variant="h6">OPD Card - {appointment.opdCardNumber}</Typography>
        </Box>
        <Box>
          {!readOnly && !editMode && (
            <IconButton color="inherit" onClick={() => setEditMode(true)}>
              <EditIcon />
            </IconButton>
          )}
          <IconButton color="inherit" onClick={handleDownloadPDF}>
            <DownloadIcon />
          </IconButton>
          <IconButton color="inherit" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab icon={<PersonIcon />} label="Patient Info" />
          <Tab icon={<HospitalIcon />} label="Appointment" />
          <Tab icon={<AssignmentIcon />} label="Consultation" />
        </Tabs>
      </Box>

      <DialogContent dividers sx={{ minHeight: 400 }}>
        {/* Patient Information Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" color="primary" fontWeight={600}>
                  Patient Information
                </Typography>
                {!readOnly && !editPatientMode && (
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => setEditPatientMode(true)}
                    variant="outlined"
                  >
                    Edit Contact Details
                  </Button>
                )}
              </Box>
              <Divider sx={{ mt: 1, mb: 3 }} />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Name</Typography>
              <Typography variant="body1" sx={{ mt: 0.5, fontSize: '1.1rem', fontWeight: 500 }}>
                {appointment.patient?.firstName} {appointment.patient?.lastName}
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>UHID</Typography>
              <Typography variant="body1" sx={{ mt: 0.5, fontSize: '1.1rem', fontWeight: 500, color: 'primary.main' }}>{appointment.patient?.uhid}</Typography>
            </Grid>
            
            <Grid item xs={4}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Age</Typography>
              <Typography variant="body1" sx={{ mt: 0.5 }}>{calculateAge()} years</Typography>
            </Grid>
            
            <Grid item xs={4}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Gender</Typography>
              <Typography variant="body1" sx={{ mt: 0.5 }}>{appointment.patient?.gender}</Typography>
            </Grid>
            
            <Grid item xs={4}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Blood Group</Typography>
              <Chip label={appointment.patient?.bloodGroup || 'N/A'} size="small" color="error" variant="outlined" sx={{ mt: 0.5 }} />
            </Grid>
            
            <Grid item xs={12} md={6}>
              {editPatientMode ? (
                <TextField
                  fullWidth
                  label="Mobile"
                  value={patientFormData.mobile}
                  onChange={(e) => setPatientFormData({ ...patientFormData, mobile: e.target.value })}
                  size="small"
                />
              ) : (
                <>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Mobile</Typography>
                  <Typography variant="body1" sx={{ mt: 0.5 }}>{appointment.patient?.mobile}</Typography>
                </>
              )}
            </Grid>
            
            <Grid item xs={12} md={6}>
              {editPatientMode ? (
                <TextField
                  fullWidth
                  label="Email"
                  value={patientFormData.email}
                  onChange={(e) => setPatientFormData({ ...patientFormData, email: e.target.value })}
                  size="small"
                />
              ) : (
                <>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Email</Typography>
                  <Typography variant="body1" sx={{ mt: 0.5 }}>{appointment.patient?.email || 'N/A'}</Typography>
                </>
              )}
            </Grid>
            
            <Grid item xs={12}>
              {editPatientMode ? (
                <>
                  <TextField
                    fullWidth
                    label="Address Line 1"
                    value={patientFormData.addressLine1}
                    onChange={(e) => setPatientFormData({ ...patientFormData, addressLine1: e.target.value })}
                    size="small"
                    sx={{ mb: 2 }}
                  />
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="City"
                        value={patientFormData.city}
                        onChange={(e) => setPatientFormData({ ...patientFormData, city: e.target.value })}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="State"
                        value={patientFormData.state}
                        onChange={(e) => setPatientFormData({ ...patientFormData, state: e.target.value })}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Pincode"
                        value={patientFormData.pincode}
                        onChange={(e) => setPatientFormData({ ...patientFormData, pincode: e.target.value })}
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </>
              ) : (
                <>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Address</Typography>
                  <Typography variant="body1" sx={{ mt: 0.5 }}>
                    {appointment.patient?.address?.line1}, {appointment.patient?.address?.city}, {appointment.patient?.address?.state} - {appointment.patient?.address?.pincode}
                  </Typography>
                </>
              )}
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" color="primary" fontWeight={600} sx={{ mt: 2 }}>
                Emergency Contact
              </Typography>
              <Divider sx={{ mt: 1, mb: 2 }} />
            </Grid>
            
            <Grid item xs={12} md={4}>
              {editPatientMode ? (
                <TextField
                  fullWidth
                  label="Name"
                  value={patientFormData.emergencyContactName}
                  onChange={(e) => setPatientFormData({ ...patientFormData, emergencyContactName: e.target.value })}
                  size="small"
                />
              ) : (
                <>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Name</Typography>
                  <Typography variant="body1" sx={{ mt: 0.5 }}>{appointment.patient?.emergencyContact?.name || 'N/A'}</Typography>
                </>
              )}
            </Grid>
            
            <Grid item xs={12} md={4}>
              {editPatientMode ? (
                <TextField
                  fullWidth
                  label="Relationship"
                  value={patientFormData.emergencyContactRelationship}
                  onChange={(e) => setPatientFormData({ ...patientFormData, emergencyContactRelationship: e.target.value })}
                  size="small"
                />
              ) : (
                <>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Relationship</Typography>
                  <Typography variant="body1" sx={{ mt: 0.5 }}>{appointment.patient?.emergencyContact?.relationship || 'N/A'}</Typography>
                </>
              )}
            </Grid>
            
            <Grid item xs={12} md={4}>
              {editPatientMode ? (
                <TextField
                  fullWidth
                  label="Mobile"
                  value={patientFormData.emergencyContactMobile}
                  onChange={(e) => setPatientFormData({ ...patientFormData, emergencyContactMobile: e.target.value })}
                  size="small"
                />
              ) : (
                <>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Mobile</Typography>
                  <Typography variant="body1" sx={{ mt: 0.5 }}>{appointment.patient?.emergencyContact?.mobile || 'N/A'}</Typography>
                </>
              )}
            </Grid>
          </Grid>
        </TabPanel>

        {/* Appointment Details Tab */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary">
                Appointment Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">Doctor</Typography>
              <Typography variant="body1" fontWeight="bold">
                Dr. {appointment.doctor?.firstName} {appointment.doctor?.lastName}
              </Typography>
            </Grid>
            
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">Specialization</Typography>
              <Typography variant="body1">{appointment.doctor?.specialization}</Typography>
            </Grid>
            
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">Department</Typography>
              <Typography variant="body1">{appointment.doctor?.department?.name || 'N/A'}</Typography>
            </Grid>
            
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">Appointment Type</Typography>
              <Chip label={appointment.type} color="primary" size="small" />
            </Grid>
            
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">Scheduled Time</Typography>
              <Typography variant="body1">{format(new Date(appointment.scheduledAt), 'PPpp')}</Typography>
            </Grid>
            
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">Status</Typography>
              <Chip 
                label={appointment.status} 
                color={appointment.status === 'COMPLETED' ? 'success' : appointment.status === 'IN_PROGRESS' ? 'warning' : 'default'}
                size="small" 
              />
            </Grid>
            
            {appointment.checkedInAt && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">Checked In At</Typography>
                <Typography variant="body1">{format(new Date(appointment.checkedInAt), 'PPpp')}</Typography>
              </Grid>
            )}
          </Grid>
        </TabPanel>

        {/* Consultation Details Tab */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" color="primary">
                  Consultation Details
                </Typography>
                {encounter && (
                  <Chip 
                    label={encounter.status} 
                    color={encounter.status === 'COMPLETED' ? 'success' : 'warning'}
                    size="small" 
                  />
                )}
              </Box>
              <Divider sx={{ mb: 2 }} />
              {!editMode && !readOnly && (
                <Box sx={{ mb: 2, p: 1.5, bgcolor: 'info.lighter', borderRadius: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EditIcon fontSize="small" color="info" />
                  <Typography variant="body2" color="info.main">
                    Click the <strong>Edit icon</strong> in the header to update consultation details
                  </Typography>
                </Box>
              )}
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Chief Complaint"
                multiline
                rows={2}
                value={formData.chiefComplaint}
                onChange={(e) => handleChange('chiefComplaint', e.target.value)}
                disabled={!editMode}
                variant={editMode ? 'outlined' : 'filled'}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Diagnosis"
                multiline
                rows={3}
                value={formData.diagnosis}
                onChange={(e) => handleChange('diagnosis', e.target.value)}
                disabled={!editMode}
                variant={editMode ? 'outlined' : 'filled'}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes / Instructions"
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                disabled={!editMode}
                variant={editMode ? 'outlined' : 'filled'}
              />
            </Grid>

            {encounter?.visitDate && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">Visit Date</Typography>
                <Typography variant="body1">{format(new Date(encounter.visitDate), 'PPpp')}</Typography>
              </Grid>
            )}
          </Grid>
        </TabPanel>
      </DialogContent>

      <DialogActions>
        {editMode ? (
          <>
            <Button onClick={() => setEditMode(false)} disabled={saving}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              variant="contained" 
              startIcon={<SaveIcon />}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Consultation'}
            </Button>
          </>
        ) : editPatientMode ? (
          <>
            <Button onClick={() => setEditPatientMode(false)} disabled={saving}>
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                setSaving(true);
                toast.info('Patient info update feature coming soon!');
                setEditPatientMode(false);
                setSaving(false);
              }} 
              variant="contained" 
              startIcon={<SaveIcon />}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Patient Info'}
            </Button>
          </>
        ) : (
          <Button onClick={onClose}>Close</Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default OPDCardDialog;
