import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Alert, Chip, Grid, Divider,
  CircularProgress, Avatar, Paper, IconButton, TextField, InputAdornment,
  Tabs, Tab, alpha,
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
          <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5, letterSpacing: '-0.01em' }}>
            Scan & Share
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Scan a patient's ABHA QR for instant check-in, or share your facility's QR for patients to scan.
          </Typography>
        </Box>
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
        <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 }, borderRadius: 2.5, textAlign: 'center' }}>
          <Box sx={{
            display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between', gap: 1.5, mb: 3,
            flexDirection: { xs: 'column', sm: 'row' }, textAlign: 'left',
          }}>
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: '-0.01em' }}>
                Health Facility QR
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Display this at reception. Patients scan it with their ABHA PHR app to share their profile with your facility.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Refresh />}
                onClick={loadFacilityQr}
                sx={{ textTransform: 'none', borderRadius: 1.75 }}
              >
                Refresh
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={!facilityQr?.shareProfileUrl && !facilityQr?.scanAndShareUrl}
                onClick={() => {
                  const svg = document.querySelector<SVGSVGElement>('#facility-qr-svg');
                  if (!svg) { toast.error('QR not ready yet'); return; }
                  const xml = new XMLSerializer().serializeToString(svg);
                  const img = new Image();
                  img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = 600; canvas.height = 600;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return;
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(0, 0, 600, 600);
                    ctx.drawImage(img, 0, 0, 600, 600);
                    const a = document.createElement('a');
                    a.download = `facility-qr-${facilityQr?.hfrFacilityId || facilityQr?.hipId || 'abdm'}.png`;
                    a.href = canvas.toDataURL('image/png');
                    a.click();
                  };
                  img.onerror = () => toast.error('Could not export QR');
                  img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(xml)))}`;
                }}
                sx={{ textTransform: 'none', borderRadius: 1.75 }}
              >
                Download
              </Button>
              <Button
                size="small"
                variant="contained"
                disabled={!facilityQr?.shareProfileUrl && !facilityQr?.scanAndShareUrl}
                onClick={() => {
                  const svg = document.querySelector<SVGSVGElement>('#facility-qr-svg');
                  if (!svg || !facilityQr) { toast.error('QR not ready yet'); return; }
                  const xml = new XMLSerializer().serializeToString(svg);
                  const w = window.open('', '_blank', 'width=720,height=900');
                  if (!w) { toast.warning('Pop-up blocked. Allow pop-ups to print.'); return; }
                  w.document.write(`<!doctype html><html><head><title>Facility QR · ${facilityQr.hipName || ''}</title>
                    <style>
                      body{margin:0;padding:48px;font-family:Inter,Arial,sans-serif;color:#0f172a;text-align:center}
                      h1{margin:0 0 8px;font-size:22px}
                      p{margin:0 0 24px;color:#64748b}
                      .qr{display:inline-block;padding:24px;border:1px solid #e2e8f0;border-radius:12px}
                      .meta{margin-top:24px;font-size:12px;color:#64748b}
                      @media print{body{padding:24px}}
                    </style></head><body>
                    <h1>Scan to share your ABHA</h1>
                    <p>${facilityQr.hipName || ''}</p>
                    <div class="qr">${xml.replace(/width="\d+"/, 'width="380"').replace(/height="\d+"/, 'height="380"')}</div>
                    <div class="meta">HFR ID · ${facilityQr.hfrFacilityId || facilityQr.hipId || '—'}</div>
                    <script>window.print();</script>
                  </body></html>`);
                  w.document.close();
                }}
                sx={{ textTransform: 'none', borderRadius: 1.75, fontWeight: 700 }}
              >
                Print
              </Button>
            </Box>
          </Box>

          {facilityQr ? (
            facilityQr.shareProfileUrl || facilityQr.scanAndShareUrl ? (
              <>
                <Box
                  sx={{
                    display: 'inline-block', p: 3,
                    border: '1px solid', borderColor: 'divider',
                    borderRadius: 3, bgcolor: 'white', mb: 3,
                    boxShadow: (t) => `0 8px 28px ${alpha(t.palette.primary.main, 0.08)}`,
                  }}
                >
                  {/*
                    ABDM expects the QR contents to be a plain URL of the form
                      https://phrsbx.abdm.gov.in/share-profile?hip-id=…&counter-id=…
                    Anything else (e.g. JSON) makes the ABHA / PHR app reject it
                    as "invalid QR code". Render the URL string verbatim.
                  */}
                  <QRCodeSVG
                    id="facility-qr-svg"
                    value={facilityQr.shareProfileUrl || facilityQr.scanAndShareUrl}
                    size={240}
                    level="M"
                    includeMargin={false}
                  />
                </Box>

                <Grid container spacing={1.5} sx={{ maxWidth: 640, mx: 'auto', textAlign: 'left' }}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{
                      p: 1.25, borderRadius: 2,
                      border: '1px solid', borderColor: 'divider',
                      bgcolor: (t) => alpha(t.palette.primary.main, 0.03),
                    }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.06em' }}>
                        HFR ID (HIP)
                      </Typography>
                      <Typography fontWeight={700} sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                        {facilityQr.hfrFacilityId || facilityQr.hipId || '—'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{
                      p: 1.25, borderRadius: 2,
                      border: '1px solid', borderColor: 'divider',
                      bgcolor: (t) => alpha(t.palette.primary.main, 0.03),
                    }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.06em' }}>
                        Facility name
                      </Typography>
                      <Typography fontWeight={700} sx={{ fontSize: 13 }} noWrap title={facilityQr.hipName || ''}>
                        {facilityQr.hipName || '—'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{
                      p: 1.25, borderRadius: 2,
                      border: '1px solid', borderColor: 'divider',
                      bgcolor: (t) => alpha(t.palette.primary.main, 0.03),
                      display: 'flex', alignItems: 'center', gap: 1,
                    }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.06em' }}>
                          QR contents (URL)
                        </Typography>
                        <Typography sx={{ fontSize: 12, fontFamily: 'monospace', wordBreak: 'break-all', color: 'text.secondary' }}>
                          {facilityQr.shareProfileUrl || facilityQr.scanAndShareUrl}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => {
                          navigator.clipboard.writeText(facilityQr.shareProfileUrl || facilityQr.scanAndShareUrl);
                          toast.success('Copied');
                        }}
                      >
                        <ContentCopy fontSize="small" />
                      </IconButton>
                    </Box>
                  </Grid>
                </Grid>

                <Alert
                  severity="info"
                  icon={<HealthAndSafety fontSize="small" />}
                  sx={{ mt: 3, textAlign: 'left', borderRadius: 2 }}
                >
                  When a patient scans this QR with their ABHA / PHR app, their profile is shared with your facility and lands under <strong>Received shares</strong>.
                </Alert>
              </>
            ) : (
              <Alert
                severity="warning"
                sx={{ textAlign: 'left', borderRadius: 2 }}
              >
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                  Facility not registered with HFR yet
                </Typography>
                <Typography variant="body2">
                  This hospital doesn't have an HFR Facility ID configured, so a Scan-and-Share QR can't be generated. Ask an admin to add the HFR ID under <strong>Hospitals → Edit → ABDM</strong>.
                </Typography>
              </Alert>
            )
          ) : (
            <Box sx={{ py: 6 }}>
              <CircularProgress size={28} />
              <Typography variant="body2" sx={{ mt: 1.5 }} color="text.secondary">
                Loading facility QR…
              </Typography>
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
            <Paper
              sx={{
                p: 4,
                textAlign: 'center',
                height: '100%',
                minHeight: 360,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: (t) => alpha(t.palette.primary.main, 0.02),
                border: (t) => `1px dashed ${alpha(t.palette.primary.main, 0.25)}`,
              }}
            >
              <Box
                sx={{
                  width: 80, height: 80, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
                  mb: 2,
                }}
              >
                <QrCodeScanner sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Waiting for an ABHA scan
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 320, mt: 0.75 }}>
                Click <strong>Start Camera</strong> on the left, or paste an ABHA number / address into the manual field — patient details will appear here.
              </Typography>
              <Box sx={{ mt: 2.5, display: 'flex', gap: 0.75, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Chip size="small" label="14-digit ABHA #" variant="outlined" />
                <Chip size="small" label="name@abdm" variant="outlined" />
                <Chip size="small" label="Live QR scan" variant="outlined" />
              </Box>
            </Paper>
          )}
        </Grid>
      </Grid>}
    </Box>
  );
};

export default ScanAndShare;
