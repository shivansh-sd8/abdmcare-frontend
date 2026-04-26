import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Tabs,
  Tab,
  IconButton,
  Chip,
  Grid,
  Autocomplete,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Medication as MedicationIcon,
  Science as LabIcon,
  CameraAlt as ScanIcon,
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
};

interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface LabTest {
  name: string;
  instructions: string;
}

interface Scan {
  name: string;
  type: string;
  instructions: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  encounter: any;
}

const COMMON_MEDICINES = [
  'Paracetamol 500mg',
  'Ibuprofen 400mg',
  'Amoxicillin 500mg',
  'Azithromycin 500mg',
  'Cetirizine 10mg',
  'Omeprazole 20mg',
  'Metformin 500mg',
  'Aspirin 75mg',
];

const COMMON_LAB_TESTS = [
  'Complete Blood Count (CBC)',
  'Blood Sugar (Fasting)',
  'Blood Sugar (Random)',
  'Lipid Profile',
  'Liver Function Test (LFT)',
  'Kidney Function Test (KFT)',
  'Thyroid Profile',
  'Urine Routine',
  'HbA1c',
  'Vitamin D',
  'Vitamin B12',
];

const COMMON_SCANS = [
  { name: 'X-Ray Chest', type: 'X-RAY' },
  { name: 'X-Ray Abdomen', type: 'X-RAY' },
  { name: 'Ultrasound Abdomen', type: 'ULTRASOUND' },
  { name: 'CT Scan Head', type: 'CT_SCAN' },
  { name: 'MRI Brain', type: 'MRI' },
  { name: 'ECG', type: 'ECG' },
  { name: 'Echo', type: 'ECHO' },
];

const CompleteConsultationDialog: React.FC<Props> = ({ open, onClose, onSubmit }) => {
  const [tabValue, setTabValue] = useState(0);
  const [saving, setSaving] = useState(false);
  
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [followUpDays, setFollowUpDays] = useState('');
  
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);

  const addMedicine = () => {
    setMedicines([...medicines, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
  };

  const removeMedicine = (index: number) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const updateMedicine = (index: number, field: keyof Medicine, value: string) => {
    const updated = [...medicines];
    updated[index][field] = value;
    setMedicines(updated);
  };

  const addLabTest = () => {
    setLabTests([...labTests, { name: '', instructions: '' }]);
  };

  const removeLabTest = (index: number) => {
    setLabTests(labTests.filter((_, i) => i !== index));
  };

  const updateLabTest = (index: number, field: keyof LabTest, value: string) => {
    const updated = [...labTests];
    updated[index][field] = value;
    setLabTests(updated);
  };

  const addScan = () => {
    setScans([...scans, { name: '', type: '', instructions: '' }]);
  };

  const removeScan = (index: number) => {
    setScans(scans.filter((_, i) => i !== index));
  };

  const updateScan = (index: number, field: keyof Scan, value: string) => {
    const updated = [...scans];
    updated[index][field] = value;
    setScans(updated);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const followUpDate = followUpDays ? new Date(Date.now() + parseInt(followUpDays) * 24 * 60 * 60 * 1000) : null;
      
      await onSubmit({
        diagnosis,
        notes,
        followUpDate,
        prescription: medicines.length > 0 ? medicines : null,
        labTestsOrdered: labTests.length > 0 ? labTests : null,
        scansOrdered: scans.length > 0 ? scans : null,
      });
      onClose();
    } catch (error) {
      console.error('Error completing consultation:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Complete Consultation</Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="Diagnosis & Notes" />
          <Tab icon={<MedicationIcon />} label="Prescription" iconPosition="start" />
          <Tab icon={<LabIcon />} label="Lab Tests" iconPosition="start" />
          <Tab icon={<ScanIcon />} label="Scans/Imaging" iconPosition="start" />
        </Tabs>
      </Box>

      <DialogContent>
        {/* Diagnosis Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Diagnosis *"
                multiline
                rows={3}
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="Enter diagnosis..."
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes / Instructions"
                multiline
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes, instructions for patient..."
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Follow-up After (days)"
                type="number"
                value={followUpDays}
                onChange={(e) => setFollowUpDays(e.target.value)}
                placeholder="e.g., 7 for 1 week"
              />
            </Grid>
          </Grid>
        </TabPanel>

        {/* Prescription Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>Medicines</Typography>
              <Button startIcon={<AddIcon />} onClick={addMedicine} size="small" variant="outlined">
                Add Medicine
              </Button>
            </Box>
            
            {medicines.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                No medicines prescribed. Click "Add Medicine" to prescribe.
              </Typography>
            ) : (
              medicines.map((medicine, index) => (
                <Box key={index} sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Chip label={`Medicine ${index + 1}`} size="small" color="primary" />
                    <IconButton size="small" color="error" onClick={() => removeMedicine(index)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Autocomplete
                        freeSolo
                        options={COMMON_MEDICINES}
                        value={medicine.name}
                        onChange={(_, value) => updateMedicine(index, 'name', value || '')}
                        renderInput={(params) => <TextField {...params} label="Medicine Name *" required />}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Dosage"
                        value={medicine.dosage}
                        onChange={(e) => updateMedicine(index, 'dosage', e.target.value)}
                        placeholder="e.g., 1 tablet"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Frequency"
                        value={medicine.frequency}
                        onChange={(e) => updateMedicine(index, 'frequency', e.target.value)}
                        placeholder="e.g., Twice daily"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Duration"
                        value={medicine.duration}
                        onChange={(e) => updateMedicine(index, 'duration', e.target.value)}
                        placeholder="e.g., 5 days"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Instructions"
                        value={medicine.instructions}
                        onChange={(e) => updateMedicine(index, 'instructions', e.target.value)}
                        placeholder="e.g., After meals"
                      />
                    </Grid>
                  </Grid>
                </Box>
              ))
            )}
          </Box>
        </TabPanel>

        {/* Lab Tests Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>Lab Tests</Typography>
              <Button startIcon={<AddIcon />} onClick={addLabTest} size="small" variant="outlined">
                Add Lab Test
              </Button>
            </Box>
            
            {labTests.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                No lab tests ordered. Click "Add Lab Test" to order tests.
              </Typography>
            ) : (
              labTests.map((test, index) => (
                <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Chip label={`Test ${index + 1}`} size="small" color="info" />
                    <IconButton size="small" color="error" onClick={() => removeLabTest(index)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Autocomplete
                        freeSolo
                        options={COMMON_LAB_TESTS}
                        value={test.name}
                        onChange={(_, value) => updateLabTest(index, 'name', value || '')}
                        renderInput={(params) => <TextField {...params} label="Test Name *" required />}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Special Instructions"
                        value={test.instructions}
                        onChange={(e) => updateLabTest(index, 'instructions', e.target.value)}
                        placeholder="e.g., Fasting required"
                      />
                    </Grid>
                  </Grid>
                </Box>
              ))
            )}
          </Box>
        </TabPanel>

        {/* Scans Tab */}
        <TabPanel value={tabValue} index={3}>
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>Scans / Imaging</Typography>
              <Button startIcon={<AddIcon />} onClick={addScan} size="small" variant="outlined">
                Add Scan
              </Button>
            </Box>
            
            {scans.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                No scans ordered. Click "Add Scan" to order imaging.
              </Typography>
            ) : (
              scans.map((scan, index) => (
                <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Chip label={`Scan ${index + 1}`} size="small" color="warning" />
                    <IconButton size="small" color="error" onClick={() => removeScan(index)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Autocomplete
                        freeSolo
                        options={COMMON_SCANS.map(s => s.name)}
                        value={scan.name}
                        onChange={(_, value) => {
                          updateScan(index, 'name', value || '');
                          const found = COMMON_SCANS.find(s => s.name === value);
                          if (found) updateScan(index, 'type', found.type);
                        }}
                        renderInput={(params) => <TextField {...params} label="Scan Name *" required />}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Special Instructions"
                        value={scan.instructions}
                        onChange={(e) => updateScan(index, 'instructions', e.target.value)}
                        placeholder="e.g., With contrast"
                      />
                    </Grid>
                  </Grid>
                </Box>
              ))
            )}
          </Box>
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={saving || !diagnosis}
        >
          {saving ? 'Saving...' : 'Complete Consultation'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CompleteConsultationDialog;
