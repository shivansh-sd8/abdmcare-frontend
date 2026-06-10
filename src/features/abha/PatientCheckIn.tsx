import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, Alert, Chip, Grid,
  Divider, CircularProgress, Avatar, Paper, ToggleButtonGroup, ToggleButton,
  InputAdornment, IconButton,
} from '@mui/material';
import {
  Search, QrCodeScanner, PersonAdd, CheckCircle,
  ContentCopy, Person, Phone, Badge,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import abhaService from '../../services/abhaService';

type LookupMode = 'abha-number' | 'abha-address' | 'mobile';

const PatientCheckIn: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<LookupMode>('abha-number');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleLookup = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res: any = await abhaService.lookupPatient(query.trim());
      const data = res?.data || res;
      setResult(data);
      if (data?.isReturning) {
        toast.success(`Returning patient: ${data.patient?.firstName} ${data.patient?.lastName}`);
      } else {
        toast.info('New patient — not found in this facility');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Lookup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied!');
  };

  const placeholder = mode === 'mobile'
    ? 'Enter 10-digit mobile number'
    : mode === 'abha-address'
    ? 'Enter ABHA address (e.g. name@abdm)'
    : 'Enter 14-digit ABHA number';

  const startIcon = mode === 'mobile' ? <Phone /> : mode === 'abha-address' ? <Badge /> : <Search />;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 3, gap: 1.5, flexDirection: { xs: 'column', sm: 'row' } }}>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5, letterSpacing: '-0.01em' }}>
            Patient Check-In
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Look up a patient by ABHA Number, ABHA Address, or mobile to see whether they're new to this facility.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={<QrCodeScanner />}
          onClick={() => navigate('/app/scan-share')}
          sx={{ textTransform: 'none', borderRadius: 1.75, fontWeight: 600, flexShrink: 0 }}
        >
          Scan QR instead
        </Button>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Search by ABHA Identifier</Typography>

        <Box sx={{ mb: 2 }}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={mode}
            onChange={(_, v) => { if (v) { setMode(v); setQuery(''); setResult(null); } }}
          >
            <ToggleButton value="abha-number">ABHA Number</ToggleButton>
            <ToggleButton value="abha-address">ABHA Address</ToggleButton>
            <ToggleButton value="mobile">Mobile</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            fullWidth
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
            InputProps={{
              startAdornment: <InputAdornment position="start">{startIcon}</InputAdornment>,
            }}
          />
          <Button
            variant="contained"
            onClick={handleLookup}
            disabled={loading || !query.trim()}
            sx={{ minWidth: 140 }}
            startIcon={loading ? <CircularProgress size={18} /> : <Search />}
          >
            {loading ? 'Searching...' : 'Look Up'}
          </Button>
        </Box>
      </Paper>

      {result && (
        <Card sx={{ border: '2px solid', borderColor: result.isReturning ? 'success.main' : 'warning.main' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
              <Chip
                icon={result.isReturning ? <CheckCircle /> : <PersonAdd />}
                label={result.isReturning ? 'RETURNING PATIENT' : 'NEW PATIENT'}
                color={result.isReturning ? 'success' : 'warning'}
                sx={{ fontWeight: 700, fontSize: '0.85rem' }}
              />
            </Box>

            {result.isReturning ? (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Avatar sx={{ width: 56, height: 56, bgcolor: 'success.main' }}>
                    {result.patient?.firstName?.[0]}{result.patient?.lastName?.[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      {result.patient?.firstName} {result.patient?.lastName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      UHID: {result.patient?.uhid}
                    </Typography>
                  </Box>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">ABHA Number</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography fontWeight={500}>{result.patient?.abhaNumber || '—'}</Typography>
                      {result.patient?.abhaNumber && (
                        <IconButton size="small" onClick={() => handleCopy(result.patient.abhaNumber)}>
                          <ContentCopy fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">ABHA Address</Typography>
                    <Typography fontWeight={500}>{result.patient?.abhaAddress || '—'}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Mobile</Typography>
                    <Typography fontWeight={500}>{result.patient?.mobile || '—'}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Gender</Typography>
                    <Typography fontWeight={500}>{result.patient?.gender || '—'}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Date of Birth</Typography>
                    <Typography fontWeight={500}>
                      {result.patient?.dob ? new Date(result.patient.dob).toLocaleDateString() : '—'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Last Visit</Typography>
                    <Typography fontWeight={500}>
                      {result.patient?.lastVisit ? new Date(result.patient.lastVisit).toLocaleDateString() : '—'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Total Visits</Typography>
                    <Typography fontWeight={500}>{result.patient?.visitCount || 0}</Typography>
                  </Grid>
                </Grid>

                {result.patient?.recentEncounters?.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Recent Encounters</Typography>
                    {result.patient.recentEncounters.map((enc: any) => (
                      <Chip
                        key={enc.id}
                        label={`${enc.type} — ${new Date(enc.date).toLocaleDateString()}${enc.doctor ? ` (${enc.doctor})` : ''}`}
                        size="small"
                        sx={{ mr: 1, mb: 1 }}
                        variant="outlined"
                      />
                    ))}
                  </Box>
                )}

                <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button variant="contained" color="success" onClick={() => navigate('/app/patients', {
                    state: { highlightPatient: result.patient.id }
                  })}>
                    View Patient Record
                  </Button>
                  <Button variant="outlined" onClick={() => navigate('/app/appointments/schedule', {
                    state: {
                      patientId: result.patient.id,
                      patientName: `${result.patient.firstName} ${result.patient.lastName}`,
                    },
                  })}>
                    Schedule Appointment
                  </Button>
                  <Button variant="outlined" onClick={() => navigate('/app/abha', {
                    state: {
                      mode: 'link',
                      abhaNumber: result.patient.abhaNumber,
                      patientId: result.patient.id,
                      patientName: `${result.patient.firstName} ${result.patient.lastName}`,
                    },
                  })}>
                    Verify ABHA
                  </Button>
                </Box>
              </>
            ) : (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Avatar sx={{ width: 56, height: 56, bgcolor: 'warning.main' }}>
                    <Person />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={600}>Patient Not Found</Typography>
                    <Typography variant="body2" color="text.secondary">
                      No patient with this ABHA identifier exists in your facility.
                    </Typography>
                  </Box>
                </Box>

                <Alert severity="info" sx={{ mb: 2 }}>
                  You can register this person as a new patient or verify their ABHA first.
                </Alert>

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button variant="contained" startIcon={<PersonAdd />} onClick={() => navigate('/app/patients/new', {
                    state: {
                      abhaData: {
                        ABHANumber: mode === 'abha-number' ? query : undefined,
                        preferredAbhaAddress: mode === 'abha-address' ? query : undefined,
                        mobile: mode === 'mobile' ? query : undefined,
                      },
                    },
                  })}>
                    Register as New Patient
                  </Button>
                  <Button variant="outlined" onClick={() => navigate('/app/abha', {
                    state: {
                      mode: 'link',
                      abhaNumber: mode === 'abha-number' ? query : undefined,
                    },
                  })}>
                    Verify ABHA First
                  </Button>
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {!result && !loading && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Person sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>Enter an ABHA Identifier</Typography>
          <Typography variant="body2" color="text.secondary">
            Look up a patient by their ABHA number, ABHA address, or registered mobile number
            to determine if they are a new or returning patient.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default PatientCheckIn;
