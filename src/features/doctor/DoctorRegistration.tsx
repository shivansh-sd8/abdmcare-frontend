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
    qualification: '',
    registrationNo: '',
    mobile: '',
    email: '',
    hprId: '',
    departmentId: '',
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
        !formData.qualification || !formData.registrationNo || !formData.mobile) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      setLoading(true);

      const doctorData = {
        ...formData,
        // If no department selected, we'll let the backend create a default one
        departmentId: formData.departmentId || undefined,
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
    'Orthopedics',
    'Pediatrics',
    'Psychiatry',
    'Radiology',
    'Surgery',
    'Urology',
  ];

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
                  onChange={(e) => handleChange('specialization', e.target.value)}
                  variant="outlined"
                >
                  {specializations.map((spec) => (
                    <MenuItem key={spec} value={spec}>
                      {spec}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

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
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email />
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
