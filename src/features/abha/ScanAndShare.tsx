import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Alert, Chip, Grid, Divider,
  CircularProgress, Avatar, Paper, IconButton, TextField, InputAdornment,
  Tabs, Tab,
} from '@mui/material';
import {
  QrCodeScanner, CameraAlt, Stop, CheckCircle, PersonAdd,
  ContentCopy, Refresh, HealthAndSafety, Search, Person, Visibility,
  Sms,
} from '@mui/icons-material';
import jsQR from 'jsqr';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import abhaService from '../../services/abhaService';
import hipService from '../../services/hipService';

interface ScanResult {
  hidn?: string;
  phr?: string;
  name?: string;
  gender?: string;
  dob?: string;
  mobile?: string;
  address?: string;
  [key: string]: any;
}

const ScanAndShare: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState<ScanResult | null>(null);
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [facilityQr, setFacilityQr] = useState<any>(null);
  const [receivedShares, setReceivedShares] = useState<any[]>([]);
  const [sharesLoading, setSharesLoading] = useState(false);

  const loadFacilityQr = useCallback(async () => {
    try {
      const res: any = await abhaService.getFacilityQrData();
      setFacilityQr(res?.data || res);
    } catch {}
  }, []);

  const loadReceivedShares = useCallback(async () => {
    setSharesLoading(true);
    try {
      const res: any = await abhaService.getReceivedShares();
      setReceivedShares(res?.data || res || []);
    } catch {}
    finally { setSharesLoading(false); }
  }, []);

  useEffect(() => {
    loadFacilityQr();
    loadReceivedShares();
  }, [loadFacilityQr, loadReceivedShares]);

  const parseQrData = useCallback((raw: string): ScanResult | null => {
    try { return JSON.parse(raw); } catch {}

    if (raw.includes('hidn=') || raw.includes('phr=')) {
      const params = new URLSearchParams(raw.replace(/^.*\?/, ''));
      return {
        hidn: params.get('hidn') || undefined,
        phr: params.get('phr') || undefined,
        name: params.get('name') || undefined,
        gender: params.get('gender') || undefined,
        dob: params.get('dob') || undefined,
        mobile: params.get('mobile') || undefined,
      };
    }

    const parts = raw.split('|');
    if (parts.length >= 3) {
      return {
        hidn: parts[0] || undefined, phr: parts[1] || undefined,
        name: parts[2] || undefined, gender: parts[3] || undefined,
        dob: parts[4] || undefined, mobile: parts[5] || undefined,
      };
    }

    const trimmed = raw.trim();
    if (trimmed.includes('@')) return { phr: trimmed };
    if (/^\d{14}$/.test(trimmed.replace(/-/g, ''))) return { hidn: trimmed };
    return null;
  }, []);

  const handleLookup = useCallback(async (data: ScanResult) => {
    const identifier = data.hidn || data.phr;
    if (!identifier) return;
    setLookupLoading(true);
    try {
      const res: any = await abhaService.lookupPatient(identifier);
      const result = res?.data || res;
      setLookupResult(result);
      if (result?.isReturning) {
        toast.success(`Returning patient: ${result.patient?.firstName} ${result.patient?.lastName}`);
      } else {
        toast.info('New patient — not found in system');
      }
    } catch { setLookupResult(null); }
    finally { setLookupLoading(false); }
  }, []);

  const stopCamera = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  }, []);

  const startScanning = useCallback(async () => {
    setCameraError(null);
    setScannedData(null);
    setLookupResult(null);
    stopCamera();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) throw new Error('Video element not available');
      video.srcObject = stream;

      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => { video.play().then(resolve).catch(reject); };
        setTimeout(() => reject(new Error('Camera took too long to start')), 10000);
      });

      setScanning(true);

      // jsQR-based detection — works on ALL browsers
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      intervalRef.current = setInterval(() => {
        if (!videoRef.current || !streamRef.current) return;
        if (videoRef.current.readyState < 2) return;

        const vw = videoRef.current.videoWidth;
        const vh = videoRef.current.videoHeight;
        if (!vw || !vh) return;

        canvas.width = vw;
        canvas.height = vh;
        ctx.drawImage(videoRef.current, 0, 0, vw, vh);

        const imageData = ctx.getImageData(0, 0, vw, vh);
        const code = jsQR(imageData.data, vw, vh, { inversionAttempts: 'dontInvert' });

        if (code && code.data) {
          const parsed = parseQrData(code.data);
          if (parsed) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = null;
            setScannedData(parsed);
            stopCamera();
            handleLookup(parsed);
          }
        }
      }, 400);
    } catch (err: any) {
      setCameraError(err?.message || 'Failed to access camera. Allow camera permission and try again.');
      setScanning(false);
    }
  }, [stopCamera, parseQrData, handleLookup]);

  useEffect(() => { return () => stopCamera(); }, [stopCamera]);

  const handleManualSubmit = () => {
    const trimmed = manualInput.trim();
    if (!trimmed) return;
    const parsed = parseQrData(trimmed);
    if (parsed) {
      setScannedData(parsed);
      handleLookup(parsed);
    } else {
      const isAddr = trimmed.includes('@');
      const data: ScanResult = isAddr ? { phr: trimmed } : { hidn: trimmed };
      setScannedData(data);
      handleLookup(data);
    }
  };

  const handleCopy = (text: string) => { navigator.clipboard.writeText(text); toast.success('Copied!'); };

  const handleRegisterNewPatient = () => {
    navigate('/app/patients/new', {
      state: { abhaData: { ABHANumber: scannedData?.hidn, preferredAbhaAddress: scannedData?.phr, name: scannedData?.name, gender: scannedData?.gender, mobile: scannedData?.mobile } },
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ mb: 0.5 }}>Scan & Share</Typography>
          <Typography variant="body2" color="text.secondary">
            Scan patient's ABHA QR code for quick check-in (M1 mandatory)
          </Typography>
        </Box>
        <Chip icon={<HealthAndSafety />} label="ABDM V3 M1" color="success" variant="outlined" />
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Scan Patient QR" icon={<QrCodeScanner />} iconPosition="start" />
          <Tab label="Facility QR (for patients)" icon={<Visibility />} iconPosition="start" />
          <Tab label={`Received Shares (${receivedShares.length})`} icon={<Person />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* ── Tab 1: Facility QR Display ──────────────────────────────── */}
      {activeTab === 1 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" fontWeight={600} sx={{ mb: 2 }}>Health Facility QR Code</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Display this QR at the reception counter. Patients scan it with their PHR app to share their ABHA profile with your facility.
          </Typography>
          {facilityQr ? (
            <Box>
              <Box sx={{
                display: 'inline-block', p: 4, border: '3px solid', borderColor: 'primary.main',
                borderRadius: 3, bgcolor: 'white', mb: 3,
              }}>
                <QRCodeSVG
                  value={JSON.stringify({
                    hipId: facilityQr.hipId,
                    hipName: facilityQr.hipName,
                    url: facilityQr.scanAndShareUrl,
                  })}
                  size={250}
                  level="M"
                  includeMargin={false}
                />
              </Box>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2} sx={{ maxWidth: 500, mx: 'auto', textAlign: 'left' }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">HIP ID</Typography>
                  <Typography fontWeight={600}>{facilityQr.hipId || '—'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">HIP Name</Typography>
                  <Typography fontWeight={600}>{facilityQr.hipName || '—'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Callback URL</Typography>
                  <Typography fontWeight={500} sx={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>{facilityQr.scanAndShareUrl || '—'}</Typography>
                </Grid>
              </Grid>
              <Alert severity="info" sx={{ mt: 3, textAlign: 'left' }}>
                In production, this data is encoded as a QR image registered with ABDM. Patients scan it with their PHR app, which then sends their profile to your <strong>POST /api/v3/hip/patient/share</strong> callback.
              </Alert>
            </Box>
          ) : (
            <Box sx={{ py: 4 }}>
              <CircularProgress size={24} />
              <Typography sx={{ mt: 1 }}>Loading facility data...</Typography>
            </Box>
          )}
        </Paper>
      )}

      {/* ── Tab 2: Received Shares ──────────────────────────────────── */}
      {activeTab === 2 && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Received Profile Shares</Typography>
            <Button size="small" startIcon={sharesLoading ? <CircularProgress size={16} /> : <Refresh />}
              onClick={loadReceivedShares} disabled={sharesLoading}>
              Refresh
            </Button>
          </Box>
          {receivedShares.length === 0 ? (
            <Alert severity="info">
              No profile shares received yet. When patients scan your facility QR with their PHR app, their profiles will appear here.
            </Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {receivedShares.map((share: any) => (
                <Card key={share.id} variant="outlined">
                  <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>{share.name?.[0] || 'P'}</Avatar>
                        <Box>
                          <Typography fontWeight={600}>{share.name || 'Unknown'}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            ABHA: {share.abhaNumber || '—'} | Token: {share.tokenNumber}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Chip size="small" label={new Date(share.receivedAt).toLocaleTimeString()} variant="outlined" />
                        <Button size="small" variant="contained"
                          onClick={() => { setActiveTab(0); setManualInput(share.abhaNumber || share.abhaAddress || ''); }}>
                          Look Up
                        </Button>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Paper>
      )}

      {/* ── Tab 0: Scan Patient QR ──────────────────────────────────── */}
      {activeTab === 0 && <Grid container spacing={3}>
        {/* ── Left: Scanner ─────────────────────────────────────────── */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <QrCodeScanner /> QR Code Scanner
            </Typography>

            <canvas ref={canvasRef} style={{ display: 'none' }} />

            <Box sx={{
              width: '100%', height: 350, bgcolor: 'grey.900', borderRadius: 2, mb: 2,
              overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
            }}>
              <video
                ref={videoRef}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: scanning ? 'block' : 'none' }}
                playsInline muted
              />
              {!scanning && (
                <Box sx={{ textAlign: 'center', p: 3 }}>
                  <QrCodeScanner sx={{ fontSize: 48, color: 'grey.600', mb: 1 }} />
                  <Typography color="grey.500">
                    {scannedData ? 'QR code scanned successfully' : 'Click "Start Camera" to begin scanning'}
                  </Typography>
                </Box>
              )}
              {scanning && (
                <Box sx={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 200, height: 200,
                  border: '3px solid rgba(76, 175, 80, 0.7)',
                  borderRadius: 2,
                  pointerEvents: 'none',
                }} />
              )}
            </Box>

            {cameraError && <Alert severity="error" sx={{ mb: 2 }}>{cameraError}</Alert>}

            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              {!scanning ? (
                <Button variant="contained" startIcon={<CameraAlt />} onClick={startScanning} disabled={lookupLoading} fullWidth>
                  Start Camera
                </Button>
              ) : (
                <Button variant="outlined" color="error" startIcon={<Stop />} onClick={stopCamera} fullWidth>
                  Stop Camera
                </Button>
              )}
              {scannedData && (
                <Button variant="outlined" startIcon={<Refresh />} onClick={() => { setScannedData(null); setLookupResult(null); startScanning(); }}>
                  Rescan
                </Button>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Or enter ABHA number / address manually</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth size="small"
                placeholder="e.g. 91-1234-5678-9012 or name@abdm"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
              />
              <Button variant="contained" size="small" onClick={handleManualSubmit} disabled={!manualInput.trim() || lookupLoading}>
                Look Up
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* ── Right: Results ────────────────────────────────────────── */}
        <Grid item xs={12} md={6}>
          {scannedData && (
            <Card sx={{ mb: 3, border: '2px solid', borderColor: 'primary.main' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CheckCircle color="success" sx={{ mr: 1 }} />
                  <Typography variant="h6" fontWeight={600}>Scanned ABHA Data</Typography>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Grid container spacing={2}>
                  {scannedData.hidn && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">ABHA Number</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography fontWeight={600}>{scannedData.hidn}</Typography>
                        <IconButton size="small" onClick={() => handleCopy(scannedData.hidn!)}><ContentCopy fontSize="small" /></IconButton>
                      </Box>
                    </Grid>
                  )}
                  {scannedData.phr && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">ABHA Address</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography fontWeight={600}>{scannedData.phr}</Typography>
                        <IconButton size="small" onClick={() => handleCopy(scannedData.phr!)}><ContentCopy fontSize="small" /></IconButton>
                      </Box>
                    </Grid>
                  )}
                  {scannedData.name && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">Name</Typography>
                      <Typography fontWeight={500}>{scannedData.name}</Typography>
                    </Grid>
                  )}
                  {scannedData.gender && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">Gender</Typography>
                      <Typography fontWeight={500}>
                        {scannedData.gender === 'M' ? 'Male' : scannedData.gender === 'F' ? 'Female' : scannedData.gender}
                      </Typography>
                    </Grid>
                  )}
                  {scannedData.dob && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">Date of Birth</Typography>
                      <Typography fontWeight={500}>{scannedData.dob}</Typography>
                    </Grid>
                  )}
                  {scannedData.mobile && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">Mobile</Typography>
                      <Typography fontWeight={500}>{scannedData.mobile}</Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          )}

          {lookupLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
              <CircularProgress size={24} />
              <Typography sx={{ ml: 2 }}>Looking up patient...</Typography>
            </Box>
          )}

          {lookupResult && !lookupLoading && (
            <Card sx={{ border: '2px solid', borderColor: lookupResult.isReturning ? 'success.main' : 'warning.main' }}>
              <CardContent>
                <Chip
                  label={lookupResult.isReturning ? 'RETURNING PATIENT' : 'NEW PATIENT'}
                  color={lookupResult.isReturning ? 'success' : 'warning'}
                  sx={{ fontWeight: 700, fontSize: '0.85rem', mb: 2 }}
                />

                {lookupResult.isReturning ? (
                  <>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar sx={{ width: 56, height: 56, bgcolor: 'success.main' }}>
                        {lookupResult.patient?.firstName?.[0]}{lookupResult.patient?.lastName?.[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" fontWeight={600}>
                          {lookupResult.patient?.firstName} {lookupResult.patient?.lastName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">UHID: {lookupResult.patient?.uhid}</Typography>
                      </Box>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">ABHA Number</Typography>
                        <Typography fontWeight={500}>{lookupResult.patient?.abhaNumber || '—'}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Mobile</Typography>
                        <Typography fontWeight={500}>{lookupResult.patient?.mobile || '—'}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Gender</Typography>
                        <Typography fontWeight={500}>{lookupResult.patient?.gender || '—'}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Last Visit</Typography>
                        <Typography fontWeight={500}>
                          {lookupResult.patient?.lastVisit ? new Date(lookupResult.patient.lastVisit).toLocaleDateString() : '—'}
                        </Typography>
                      </Grid>
                    </Grid>

                    {lookupResult.patient?.recentEncounters?.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Recent Encounters</Typography>
                        {lookupResult.patient.recentEncounters.map((enc: any) => (
                          <Chip key={enc.id} label={`${enc.type} — ${new Date(enc.date).toLocaleDateString()}`} size="small" sx={{ mr: 1, mb: 1 }} variant="outlined" />
                        ))}
                      </Box>
                    )}

                    <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Button variant="contained" color="success" onClick={() => navigate('/app/patients', { state: { highlightPatient: lookupResult.patient.id } })}>
                        View Patient
                      </Button>
                      <Button variant="outlined" onClick={() => navigate('/app/appointments/schedule', {
                        state: { patientId: lookupResult.patient.id, patientName: `${lookupResult.patient.firstName} ${lookupResult.patient.lastName}` }
                      })}>
                        Schedule Appointment
                      </Button>
                      {lookupResult.patient?.mobile && (
                        <Button
                          variant="outlined"
                          color="info"
                          startIcon={<Sms />}
                          onClick={async () => {
                            try {
                              await hipService.smsNotify(lookupResult.patient.mobile);
                              toast.success('ABDM deep-link SMS sent to patient');
                            } catch {
                              toast.error('Failed to send SMS notification');
                            }
                          }}
                        >
                          Send ABDM SMS
                        </Button>
                      )}
                    </Box>
                  </>
                ) : (
                  <>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      This ABHA holder has not been registered as a patient in your facility.
                    </Alert>
                    <Button variant="contained" startIcon={<PersonAdd />} onClick={handleRegisterNewPatient}>
                      Register as New Patient
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {!scannedData && !lookupLoading && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Person sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">No QR Code Scanned</Typography>
              <Typography variant="body2" color="text.secondary">
                Scan a patient's ABHA QR code or enter their ABHA number manually.
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>}
    </Box>
  );
};

export default ScanAndShare;
