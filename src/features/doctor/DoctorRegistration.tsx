import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Typography,
  MenuItem,
  Paper,
  InputAdornment,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  PersonAdd,
  Phone,
  Email,
  LocalHospital,
  CheckCircle,
  School,
  Badge,
  Lock,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import doctorService from '../../services/doctorService';

const DoctorRegistration: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    specialization: '',
    subspecialty: '',
    qualification: '',
    registrationNo: '',
    mobile: '',
    email: '',
    password: '',
    hprId: '',
    departmentId: '',
    consultationFee: '',
  });

  useEffect(() => {
    // For now, we'll create a default department if needed
    // In production, you'd fetch departments from API
    setDepartments([
      { id: 'default-dept-id', name: 'General Medicine', code: 'GM' },
    ]);
  }, []);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.firstName || !formData.lastName || !formData.specialization || 
        !formData.qualification || !formData.registrationNo || !formData.mobile || 
        !formData.email || !formData.password) {
      toast.error('Please fill all required fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);

      const doctorData = {
        ...formData,
        departmentId: formData.departmentId || undefined,
        consultationFee: formData.consultationFee ? parseFloat(formData.consultationFee) : undefined,
      };

      await doctorService.createDoctor(doctorData);

      toast.success('✅ Doctor registered successfully!');
      navigate('/doctors');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to register doctor');
    } finally {
      setLoading(false);
    }
  };

  const specializations = [
    'Cardiology',
    'Dermatology',
    'Endocrinology',
    'Gastroenterology',
    'General Medicine',
    'Neurology',
    'Oncology',
    'Ophthalmology',
    'Orthopedics',
    'ENT (Ear, Nose & Throat)',
    'Pediatrics',
    'Psychiatry',
    'Pulmonology',
    'Radiology',
    'Surgery',
    'Urology',
    'Obstetrics & Gynaecology',
    'Nephrology',
    'Rheumatology',
    'Haematology',
  ];

  // Standard subspecialties keyed by specialization
  const subspecialtiesMap: Record<string, string[]> = {
    Ophthalmology:   ['Retina', 'Cataract', 'Squint', 'Glaucoma', 'Cornea', 'Oculoplasty', 'Neuro-Ophthalmology'],
    Cardiology:      ['Interventional Cardiology', 'Cardiac Electrophysiology', 'Heart Failure', 'Paediatric Cardiology'],
    Neurology:       ['Epilepsy', 'Stroke', 'Movement Disorders', 'Neuro-Oncology', 'Headache & Migraine'],
    Oncology:        ['Medical Oncology', 'Surgical Oncology', 'Radiation Oncology', 'Haemato-Oncology'],
    Surgery:         ['Laparoscopic Surgery', 'Vascular Surgery', 'Bariatric Surgery', 'Thoracic Surgery'],
    Orthopedics:     ['Joint Replacement', 'Spine Surgery', 'Sports Medicine', 'Paediatric Orthopaedics'],
    'ENT (Ear, Nose & Throat)': ['Rhinology', 'Otology', 'Head & Neck Surgery', 'Paediatric ENT'],
    Gastroenterology: ['Hepatology', 'Inflammatory Bowel Disease', 'Motility Disorders', 'Endoscopy'],
  };

  const selectedSpecSubspecialties = formData.specialization
    ? subspecialtiesMap[formData.specialization] ?? []
    : [];

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          borderRadius: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <PersonAdd sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" fontWeight="bold">
              New Doctor Registration
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
              Register a new healthcare professional
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Card elevation={3} sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Personal Information */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#667eea' }}>
                  <LocalHospital /> Personal Information
                </Typography>
                <Divider sx={{ mb: 3 }} />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  required
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  variant="outlined"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  required
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  variant="outlined"
                />
              </Grid>

              {/* Professional Information */}
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#667eea' }}>
                  <School /> Professional Details
                </Typography>
                <Divider sx={{ mb: 3 }} />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Specialization"
                  required
                  value={formData.specialization}
                  onChange={(e) => {
                    handleChange('specialization', e.target.value);
                    handleChange('subspecialty', ''); // reset subspecialty on spec change
                  }}
                  variant="outlined"
                >
                  {specializations.map((spec) => (
                    <MenuItem key={spec} value={spec}>
                      {spec}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Subspecialty — only shown when there are subspecialties for chosen specialization */}
              {selectedSpecSubspecialties.length > 0 && (
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    select
                    label="Subspecialty (Optional)"
                    value={formData.subspecialty}
                    onChange={(e) => handleChange('subspecialty', e.target.value)}
                    variant="outlined"
                    helperText={`Specific area within ${formData.specialization}`}
                  >
                    <MenuItem value="">— None —</MenuItem>
                    {selectedSpecSubspecialties.map((sub) => (
                      <MenuItem key={sub} value={sub}>{sub}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
              )}

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Qualification"
                  required
                  placeholder="e.g., MBBS, MD"
                  value={formData.qualification}
                  onChange={(e) => handleChange('qualification', e.target.value)}
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <School />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Registration Number"
                  required
                  placeholder="e.g., MCI-12345"
                  value={formData.registrationNo}
                  onChange={(e) => handleChange('registrationNo', e.target.value)}
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Badge />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="HPR ID (Optional)"
                  placeholder="Health Professional Registry ID"
                  value={formData.hprId}
                  onChange={(e) => handleChange('hprId', e.target.value)}
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Badge />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="OPD Consultation Fee (₹)"
                  placeholder="e.g. 500"
                  type="number"
                  value={formData.consultationFee}
                  onChange={(e) => handleChange('consultationFee', e.target.value)}
                  variant="outlined"
                  helperText="Admin can set/update this later. Falls back to hospital default if empty."
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                />
              </Grid>

              {/* Contact Information */}
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#667eea' }}>
                  <Phone /> Contact Information
                </Typography>
                <Divider sx={{ mb: 3 }} />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Mobile Number"
                  required
                  value={formData.mobile}
                  onChange={(e) => handleChange('mobile', e.target.value)}
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Phone />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  variant="outlined"
                  helperText="Required for login credentials"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  variant="outlined"
                  helperText="Minimum 6 characters. Admin will share this with the doctor."
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Department */}
              {departments.length > 0 && (
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    select
                    label="Department (Optional)"
                    value={formData.departmentId}
                    onChange={(e) => handleChange('departmentId', e.target.value)}
                    variant="outlined"
                  >
                    {departments.map((dept) => (
                      <MenuItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              )}
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4, pt: 3, borderTop: '1px solid #e0e0e0' }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/doctors')}
                sx={{ minWidth: 120 }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
                sx={{
                  minWidth: 150,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                }}
              >
                {loading ? 'Registering...' : 'Register Doctor'}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default DoctorRegistration;
