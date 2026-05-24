import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, Stepper, Step, StepLabel,
  Grid, Paper, Tabs, Tab, InputAdornment, Chip, Divider, Alert, IconButton,
  CircularProgress, ToggleButtonGroup, ToggleButton, Avatar,
} from '@mui/material';
import {
  Search, QrCode, Phone, CreditCard, HealthAndSafety, CheckCircle,
  ContentCopy, Download, Refresh, Person, Badge, PersonAdd,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import abhaService from '../../services/abhaService';

const aadhaarSteps = ['Enter Aadhaar', 'Verify OTP', 'ABHA Created'];
const mobileSteps  = ['Enter Mobile', 'Verify OTP', 'ABHA Created'];

interface TabPanelProps { children?: React.ReactNode; index: number; value: number; }
const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>{value === index && <Box sx={{ pt: 3 }}>{children}</Box>}</div>
);

const AbhaManagement: React.FC = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [enrollMethod, setEnrollMethod] = useState<'aadhaar' | 'mobile'>('aadhaar');
  const [activeStep, setActiveStep] = useState(0);
  const [txnId, setTxnId] = useState('');
  const [otp, setOtp] = useState('');
  const [mobile, setMobile] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdAbha, setCreatedAbha] = useState<any>(null);
  const [xToken, setXToken] = useState('');
  const [cardImageUrl, setCardImageUrl] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  // Verification state
  const [verifyMethod, setVerifyMethod] = useState<'abha-number' | 'mobile' | 'aadhaar'>('abha-number');

  const resetFlow = () => { setActiveStep(0); setTxnId(''); setOtp(''); setMobile(''); setAadhaar(''); setCreatedAbha(null); };

  // ── Aadhaar OTP Enrollment ────────────────────────────────────────────────
  const handleGenerateAadhaarOtp = async () => {
    setLoading(true);
    try {
      const res: any = await abhaService.generateAadhaarOtp(aadhaar);
      const txn = res?.data?.txnId || res?.txnId;
      if (!txn) throw new Error('No txnId received');
      setTxnId(txn);
      setActiveStep(1);
      toast.success(res?.data?.message || 'OTP sent to Aadhaar-linked mobile');
    } catch (e: any) { toast.error(e?.response?.data?.message || e?.message || 'Failed to generate OTP. Check Aadhaar number.'); }
    finally { setLoading(false); }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      const res: any = await abhaService.resendAadhaarOtp(txnId, aadhaar);
      setTxnId(res?.data?.txnId || res?.txnId || txnId);
      toast.success('OTP resent');
    } catch { toast.error('Failed to resend OTP'); }
    finally { setLoading(false); }
  };

  const handleEnrolByAadhaar = async () => {
    setLoading(true);
    try {
      const res: any = await abhaService.enrolByAadhaar(txnId, otp, mobile);
      const data = res?.data || res;
      setCreatedAbha(data?.profile || data?.ABHAProfile || data);
      const token = data?.tokens?.token;
      if (token) {
        setXToken(token);
        try {
          const cardRes: any = await abhaService.getAbhaCard(token);
          const blob = cardRes instanceof Blob ? cardRes : new Blob([cardRes], { type: 'image/png' });
          setCardImageUrl(URL.createObjectURL(blob));
        } catch { /* card fetch is optional */ }
      }
      setActiveStep(2);
      toast.success('ABHA created successfully!');
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to create ABHA. Check OTP.'); }
    finally { setLoading(false); }
  };

  // ── Mobile OTP Enrollment (DL flow or standalone) ─────────────────────────
  const handleDlSendMobileOtp = async () => {
    setLoading(true);
    try {
      const res: any = await abhaService.dlSendMobileOtp(mobile);
      const txn = res?.data?.txnId || res?.txnId;
      if (!txn) throw new Error('No txnId received');
      setTxnId(txn);
      setActiveStep(1);
      toast.success('OTP sent to mobile');
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to send OTP'); }
    finally { setLoading(false); }
  };

  const handleDlVerifyMobileOtp = async () => {
    setLoading(true);
    try {
      const res: any = await abhaService.dlVerifyMobileOtp(txnId, otp);
      setTxnId(res?.data?.txnId || res?.txnId || txnId);
      setActiveStep(2);
      toast.success('Mobile verified — proceed with enrollment');
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Invalid OTP'); }
    finally { setLoading(false); }
  };

  // ── Search / Verification ─────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const isMobile = /^\d{10}$/.test(searchQuery);
      let res: any;
      if (isMobile) {
        res = await abhaService.findAbhaByMobile(searchQuery);
      } else {
        res = await abhaService.loginSearch(searchQuery.replace(/-/g, ''));
      }
      setSearchResult(res?.data || res);
    } catch { toast.error('No ABHA record found'); }
    finally { setSearching(false); }
  };

  // ── Verify ABHA (login flow) ──────────────────────────────────────────────
  const handleVerifyRequestOtp = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const loginHint = verifyMethod === 'mobile' ? 'mobile' : verifyMethod === 'aadhaar' ? 'aadhaar' : 'abha-number';
      const otpSystem = verifyMethod === 'aadhaar' ? 'aadhaar' : 'abdm';
      const scope = ['abha-login', verifyMethod === 'aadhaar' ? 'aadhaar-verify' : 'mobile-verify'];
      const res: any = await abhaService.loginRequestOtp({ scope, loginHint, loginId: searchQuery, otpSystem });
      const txn = res?.data?.txnId || res?.txnId;
      if (txn) setTxnId(txn);
      toast.success('Verification OTP sent');
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to send verification OTP'); }
    finally { setLoading(false); }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    try {
      const scope = ['abha-login', verifyMethod === 'aadhaar' ? 'aadhaar-verify' : 'mobile-verify'];
      const res: any = await abhaService.loginVerifyOtp(scope, txnId, otp);
      const data = res?.data || res;
      if (data?.token) setXToken(data.token);
      setSearchResult(data);
      toast.success('ABHA verified successfully!');
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Invalid OTP'); }
    finally { setLoading(false); }
  };

  // ── Download/QR ───────────────────────────────────────────────────────────
  const handleDownloadCard = async () => {
    if (!xToken) { toast.error('Please verify ABHA first to download card'); return; }
    try {
      const res: any = await abhaService.getAbhaCard(xToken);
      const blob = res instanceof Blob ? res : new Blob([res], { type: 'image/png' });
      const url = URL.createObjectURL(blob);
      setCardImageUrl(url);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'abha-card.png';
      link.click();
    } catch { toast.error('Failed to download ABHA card'); }
  };

  const handleShowCard = async () => {
    if (!xToken) { toast.error('Please verify ABHA first'); return; }
    try {
      const res: any = await abhaService.getAbhaCard(xToken);
      const blob = res instanceof Blob ? res : new Blob([res], { type: 'image/png' });
      setCardImageUrl(URL.createObjectURL(blob));
    } catch { toast.error('Failed to load ABHA card'); }
  };

  const handleViewQrCode = async () => {
    if (!xToken) { toast.error('Please verify ABHA first to view QR'); return; }
    try {
      const res: any = await abhaService.getQrCode(xToken);
      const qrData = res?.data || res;
      if (typeof qrData === 'string') window.open(`data:image/png;base64,${qrData}`, '_blank');
      else toast.info('QR code data received');
    } catch { toast.error('Failed to load QR code'); }
  };

  const handleCopy = (text: string) => { navigator.clipboard.writeText(text); toast.success('Copied!'); };

  const handleStartFresh = () => {
    setActiveStep(0);
    setTxnId('');
    setOtp('');
    setMobile('');
    setAadhaar('');
    setCreatedAbha(null);
    setXToken('');
    setCardImageUrl(null);
  };

  const steps = enrollMethod === 'aadhaar' ? aadhaarSteps : mobileSteps;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ mb: 0.5 }}>ABHA Management</Typography>
          <Typography variant="body2" color="text.secondary">Create, verify and manage ABHA numbers (ABDM V3)</Typography>
        </Box>
        <Chip icon={<HealthAndSafety />} label="ABDM V3 M1" color="success" variant="outlined" />
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Create ABHA" icon={<HealthAndSafety />} iconPosition="start" />
          <Tab label="Verify / Search" icon={<Search />} iconPosition="start" />
        </Tabs>

        {/* ── CREATE ABHA TAB ─────────────────────────────────────────────── */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">Method:</Typography>
              <ToggleButtonGroup size="small" exclusive value={enrollMethod} onChange={(_, v) => { if (v) { setEnrollMethod(v); resetFlow(); } }}>
                <ToggleButton value="aadhaar"><Badge sx={{ mr: 1 }} fontSize="small" /> Aadhaar OTP</ToggleButton>
                <ToggleButton value="mobile"><Phone sx={{ mr: 1 }} fontSize="small" /> Mobile (DL)</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Alert severity="info" sx={{ mb: 3 }}>
              {enrollMethod === 'aadhaar' ? 'OTP will be sent to Aadhaar-linked mobile. ABHA is created immediately after OTP verification.' : 'Mobile OTP for Driving License enrollment. After verification, submit DL details.'}
            </Alert>

            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
            </Stepper>

            {activeStep > 0 && (
              <Box sx={{ mb: 3 }}>
                <Button variant="outlined" color="warning" size="small" startIcon={<Refresh />} onClick={handleStartFresh}>
                  Start Fresh (New Aadhaar)
                </Button>
              </Box>
            )}

            {activeStep === 0 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  {enrollMethod === 'aadhaar' ? (
                    <TextField fullWidth label="Aadhaar Number" value={aadhaar} onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, ''))} placeholder="12-digit Aadhaar" inputProps={{ maxLength: 12 }} InputProps={{ startAdornment: <InputAdornment position="start"><CreditCard color="action" /></InputAdornment> }} helperText={`${aadhaar.length}/12`} />
                  ) : (
                    <TextField fullWidth label="Mobile Number" value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))} placeholder="10-digit mobile" inputProps={{ maxLength: 10 }} InputProps={{ startAdornment: <InputAdornment position="start"><Phone color="action" /></InputAdornment> }} helperText={`${mobile.length}/10`} />
                  )}
                </Grid>
                <Grid item xs={12}>
                  <Button variant="contained" size="large" onClick={enrollMethod === 'aadhaar' ? handleGenerateAadhaarOtp : handleDlSendMobileOtp} disabled={loading || (enrollMethod === 'aadhaar' ? aadhaar.length !== 12 : mobile.length !== 10)} startIcon={loading ? <CircularProgress size={18} /> : <Phone />}>
                    {loading ? 'Sending...' : 'Send OTP'}
                  </Button>
                </Grid>
              </Grid>
            )}

            {activeStep === 1 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Enter OTP" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="6-digit OTP" inputProps={{ maxLength: 6 }} InputProps={{ startAdornment: <InputAdornment position="start"><QrCode color="action" /></InputAdornment> }} />
                </Grid>
                {enrollMethod === 'aadhaar' && (
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth required label="Mobile Number" value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))} placeholder="10-digit mobile for ABHA communications" inputProps={{ maxLength: 10 }} InputProps={{ startAdornment: <InputAdornment position="start"><Phone color="action" /></InputAdornment> }} helperText="Required by ABDM for ABHA communications" error={mobile.length > 0 && mobile.length !== 10} />
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button variant="contained" size="large" onClick={enrollMethod === 'aadhaar' ? handleEnrolByAadhaar : handleDlVerifyMobileOtp} disabled={loading || otp.length !== 6 || (enrollMethod === 'aadhaar' && mobile.length !== 10)} startIcon={loading ? <CircularProgress size={18} /> : <CheckCircle />}>
                      {loading ? 'Processing...' : enrollMethod === 'aadhaar' ? 'Verify & Create ABHA' : 'Verify OTP'}
                    </Button>
                    <Button variant="outlined" onClick={enrollMethod === 'aadhaar' ? handleResendOtp : handleDlSendMobileOtp} disabled={loading} startIcon={<Refresh />}>Resend</Button>
                  </Box>
                </Grid>
              </Grid>
            )}

            {activeStep === 2 && createdAbha && (
              <Card sx={{ border: '2px solid', borderColor: 'success.main' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <CheckCircle color="success" sx={{ mr: 1 }} />
                    <Typography variant="h6" fontWeight={600} color="success.main">ABHA Created!</Typography>
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Grid container spacing={2}>
                    {createdAbha.profilePhoto && <Grid item xs={12}><Avatar src={`data:image/jpeg;base64,${createdAbha.profilePhoto}`} sx={{ width: 64, height: 64 }} /></Grid>}
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">ABHA Number</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6" fontWeight={600}>{createdAbha.ABHANumber || createdAbha.abhaNumber}</Typography>
                        <IconButton size="small" onClick={() => handleCopy(createdAbha.ABHANumber || createdAbha.abhaNumber)}><ContentCopy fontSize="small" /></IconButton>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">ABHA Address</Typography>
                      <Typography variant="h6" fontWeight={600}>{createdAbha.phrAddress?.[0] || createdAbha.preferredAbhaAddress || createdAbha.abhaAddress || '—'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">Name</Typography>
                      <Typography fontWeight={500}>{createdAbha.name || `${createdAbha.firstName || ''} ${createdAbha.lastName || ''}`}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">Mobile</Typography>
                      <Typography fontWeight={500}>{createdAbha.mobile || '—'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">Gender</Typography>
                      <Typography fontWeight={500}>{createdAbha.gender || '—'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">Date of Birth</Typography>
                      <Typography fontWeight={500}>{createdAbha.dayOfBirth && createdAbha.monthOfBirth && createdAbha.yearOfBirth ? `${createdAbha.dayOfBirth}/${createdAbha.monthOfBirth}/${createdAbha.yearOfBirth}` : '—'}</Typography>
                    </Grid>
                  </Grid>

                  {cardImageUrl && (
                    <Box sx={{ mt: 3, textAlign: 'center' }}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>ABHA Card</Typography>
                      <Box component="img" src={cardImageUrl} alt="ABHA Card" sx={{ maxWidth: '100%', maxHeight: 300, borderRadius: 2, border: '1px solid', borderColor: 'divider' }} />
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', gap: 2, mt: 3, flexWrap: 'wrap' }}>
                    <Button variant="outlined" startIcon={<CreditCard />} onClick={handleShowCard}>View Card</Button>
                    <Button variant="outlined" startIcon={<Download />} onClick={handleDownloadCard}>Download Card</Button>
                    <Button variant="outlined" startIcon={<QrCode />} onClick={handleViewQrCode}>QR Code</Button>
                    <Button variant="contained" color="primary" startIcon={<PersonAdd />} onClick={() => navigate('/app/patients/new', { state: { abhaData: createdAbha } })}>
                      Register as Patient
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Box>
        </TabPanel>

        {/* ── VERIFY / SEARCH TAB ─────────────────────────────────────────── */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 2 }}>
              <ToggleButtonGroup size="small" exclusive value={verifyMethod} onChange={(_, v) => { if (v) setVerifyMethod(v); }} sx={{ mb: 2 }}>
                <ToggleButton value="abha-number">ABHA Number</ToggleButton>
                <ToggleButton value="mobile">Mobile</ToggleButton>
                <ToggleButton value="aadhaar">Aadhaar</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <TextField fullWidth placeholder={verifyMethod === 'mobile' ? 'Enter 10-digit mobile' : verifyMethod === 'aadhaar' ? 'Enter 12-digit Aadhaar' : 'Enter 14-digit ABHA number'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} />
              <Button variant="contained" onClick={handleSearch} disabled={searching || !searchQuery.trim()} sx={{ minWidth: 100 }}>
                {searching ? <CircularProgress size={20} /> : 'Search'}
              </Button>
              <Button variant="outlined" onClick={handleVerifyRequestOtp} disabled={loading || !searchQuery.trim()}>
                {loading ? <CircularProgress size={20} /> : 'Send OTP'}
              </Button>
            </Box>

            {txnId && (
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <TextField fullWidth placeholder="Enter OTP" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} inputProps={{ maxLength: 6 }} />
                <Button variant="contained" color="success" onClick={handleVerifyOtp} disabled={loading || otp.length !== 6} sx={{ minWidth: 120 }}>
                  {loading ? <CircularProgress size={20} /> : 'Verify'}
                </Button>
              </Box>
            )}

            {searchResult && (
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
                    {searchResult.profilePhoto ? <Avatar src={`data:image/jpeg;base64,${searchResult.profilePhoto}`} sx={{ width: 56, height: 56 }} /> : <Avatar sx={{ width: 56, height: 56 }}><Person /></Avatar>}
                    <Box>
                      <Typography variant="h6" fontWeight={600}>{searchResult.name || searchResult.firstName || 'ABHA User'}</Typography>
                      <Chip size="small" label={searchResult.status || 'Active'} color="success" />
                    </Box>
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">ABHA Number</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography fontWeight={500}>{searchResult.ABHANumber || searchResult.abhaNumber || '—'}</Typography>
                        {(searchResult.ABHANumber || searchResult.abhaNumber) && <IconButton size="small" onClick={() => handleCopy(searchResult.ABHANumber || searchResult.abhaNumber)}><ContentCopy fontSize="small" /></IconButton>}
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">ABHA Address</Typography>
                      <Typography fontWeight={500}>{searchResult.preferredAbhaAddress || searchResult.phrAddress?.[0] || '—'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">Mobile</Typography>
                      <Typography fontWeight={500}>{searchResult.mobile || '—'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">Gender / DOB</Typography>
                      <Typography fontWeight={500}>{searchResult.gender || '—'} / {searchResult.dayOfBirth || searchResult.dob || '—'}</Typography>
                    </Grid>
                  </Grid>
                  <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                    <Button size="small" variant="outlined" startIcon={<Download />} onClick={handleDownloadCard}>Card</Button>
                    <Button size="small" variant="outlined" startIcon={<QrCode />} onClick={handleViewQrCode}>QR</Button>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default AbhaManagement;
