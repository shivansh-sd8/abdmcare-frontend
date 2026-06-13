import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, Stepper, Step, StepLabel,
  Grid, Paper, Tabs, Tab, InputAdornment, Chip, Divider, Alert, IconButton,
  CircularProgress, ToggleButtonGroup, ToggleButton, Avatar, Dialog, DialogTitle,
  DialogContent, DialogActions, List, ListItem, ListItemButton, ListItemText,
  MenuItem, Select, FormControl, FormControlLabel, Checkbox, InputLabel, alpha, useTheme,
  Tooltip,
} from '@mui/material';
import {
  Search, QrCode, Phone, CreditCard, HealthAndSafety, CheckCircle,
  ContentCopy, Download, Refresh, Person, Badge, PersonAdd, Edit,
  AlternateEmail, Close, Save, CloudDone, CloudOff,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useNavigate, useLocation } from 'react-router-dom';
import abhaService from '../../services/abhaService';
import hipService from '../../services/hipService';
import api from '../../services/api';
import ScanAndShare from './ScanAndShare';
import PatientCheckIn from './PatientCheckIn';
import { PageHeader } from '../../components/ui';

const AADHAAR_STEPS = ['Enter Aadhaar', 'Verify OTP', 'ABHA Created', 'ABHA Address', 'Complete'];
const DL_STEPS = ['Enter Mobile', 'Verify OTP', 'DL Details', 'ABHA Created', 'ABHA Address', 'Complete'];

interface TabPanelProps { children?: React.ReactNode; index: number; value: number; }
// Consistent inset for every tab panel so children don't sit flush against
// the surrounding paper border (was a long-standing visual bug — ScanAndShare
// & PatientCheckIn rendered with no horizontal padding while CreateABHA
// double-padded its own inner Box).
const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>
    {value === index && (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>{children}</Box>
    )}
  </div>
);

type VerifyMethod = 'abha-number' | 'mobile' | 'aadhaar' | 'abha-address';

const AbhaManagement: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const routeState = location.state as any;

  const initialTab = routeState?.mode === 'link' ? 1 : routeState?.tab === 'scan' ? 2 : routeState?.tab === 'checkin' ? 3 : 0;
  const [hipRegistering, setHipRegistering] = useState(false);

  // Check if user is admin for HIP register visibility
  const userData = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userData?.role);

  // Track hospital ABDM registration state so the button reflects reality
  // (idempotent — we re-fetch after registering so the pill flips to ✓).
  const [hospital, setHospital] = useState<any>(null);
  const [hospitalLoading, setHospitalLoading] = useState(false);
  const hospitalId: string | undefined = userData?.hospitalId;

  const loadHospital = useCallback(async () => {
    if (!hospitalId) return;
    setHospitalLoading(true);
    try {
      const resp: any = await api.get(`/api/v1/hospitals/${hospitalId}`);
      setHospital(resp?.data?.data || resp?.data || null);
    } catch {
      // Soft-fail: button just falls back to "Register HIP" affordance.
    } finally {
      setHospitalLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => { loadHospital(); }, [loadHospital]);

  const abdmRegistered = !!hospital?.abdmEnabled;
  const abdmRegisteredAt = hospital?.abdmRegisteredAt
    ? new Date(hospital.abdmRegisteredAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;
  const hasHipId = !!hospital?.hipId;
  const hasHiuId = !!hospital?.hiuId;

  const handleHipRegister = async () => {
    if (!hasHipId) {
      toast.error('No HIP ID configured for this hospital. An admin needs to set it up first.');
      return;
    }
    if (abdmRegistered &&
      !window.confirm(`This hospital is already registered with ABDM${abdmRegisteredAt ? ` (since ${abdmRegisteredAt})` : ''}.\n\nRe-register now? Use this only if ABDM credentials changed.`)) {
      return;
    }
    setHipRegistering(true);
    try {
      const res = await hipService.registerHipService() as any;
      toast.success(res?.data?.message || 'HIP service registered with ABDM');
      // Best-effort HIU registration if a HIU id is configured. If it fails
      // we surface a non-blocking warning rather than rolling back the HIP.
      if (hasHiuId) {
        try { await hipService.registerHiuService(); }
        catch (e: any) {
          toast.warning(e?.response?.data?.message || 'HIP registered, but HIU registration failed');
        }
      }
      await loadHospital();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to register HIP service');
    } finally {
      setHipRegistering(false);
    }
  };
  const [tabValue, setTabValue] = useState(initialTab);
  const [enrollMethod, setEnrollMethod] = useState<'aadhaar' | 'dl'>('aadhaar');
  const [activeStep, setActiveStep] = useState(0);
  const [txnId, setTxnId] = useState('');
  const [otp, setOtp] = useState('');
  const [mobile, setMobile] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdAbha, setCreatedAbha] = useState<any>(null);
  const [xToken, setXToken] = useState('');
  const [cardImageUrl, setCardImageUrl] = useState<string | null>(null);

  // ABHA Address creation state
  const [abhaAddressSuggestions, setAbhaAddressSuggestions] = useState<string[]>([]);
  const [selectedAbhaAddress, setSelectedAbhaAddress] = useState('');
  const [customAbhaAddress, setCustomAbhaAddress] = useState('');

  // DL details state
  const [dlForm, setDlForm] = useState({
    dlNumber: '', firstName: '', middleName: '', lastName: '',
    dob: '', gender: '', state: '', district: '', pinCode: '',
  });

  // Mobile verify state (post-enrollment)
  const [requiresMobileVerify, setRequiresMobileVerify] = useState(false);
  const [mobileVerifyOtp, setMobileVerifyOtp] = useState('');
  const [mobileVerifySent, setMobileVerifySent] = useState(false);

  // Verify / Search state
  const [searchQuery, setSearchQuery] = useState(routeState?.abhaNumber || '');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [verifyMethod, setVerifyMethod] = useState<VerifyMethod>('abha-number');
  const [verifiedProfile, setVerifiedProfile] = useState<any>(null);

  // Profile update state
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [profileUpdates, setProfileUpdates] = useState<Record<string, string>>({});

  // Aadhaar consent state
  const [consentAccepted, setConsentAccepted] = useState(false);

  // Patient linking state (from PatientList navigation)
  const linkedPatientId = routeState?.patientId;
  const linkedPatientName = routeState?.patientName;

  const steps = enrollMethod === 'aadhaar' ? AADHAAR_STEPS : DL_STEPS;

  const resetFlow = () => {
    setActiveStep(0); setTxnId(''); setOtp(''); setMobile(''); setAadhaar('');
    setCreatedAbha(null); setXToken(''); setCardImageUrl(null);
    setAbhaAddressSuggestions([]); setSelectedAbhaAddress(''); setCustomAbhaAddress('');
    setDlForm({ dlNumber: '', firstName: '', middleName: '', lastName: '', dob: '', gender: '', state: '', district: '', pinCode: '' });
    setRequiresMobileVerify(false); setMobileVerifyOtp(''); setMobileVerifySent(false);
    setConsentAccepted(false);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // AADHAAR OTP ENROLLMENT
  // ═══════════════════════════════════════════════════════════════════════════

  const handleGenerateAadhaarOtp = async () => {
    setLoading(true);
    try {
      const res: any = await abhaService.generateAadhaarOtp(aadhaar);
      const txn = res?.data?.txnId || res?.txnId;
      if (!txn) throw new Error('No txnId received');
      setTxnId(txn);
      setActiveStep(1);
      toast.success(res?.data?.message || 'OTP sent to Aadhaar-linked mobile');
    } catch (e: any) { toast.error(e?.response?.data?.message || e?.message || 'Failed to generate OTP'); }
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
      const profile = data?.profile || data?.ABHAProfile || data;
      setCreatedAbha(profile);
      const token = data?.tokens?.token;
      if (token) setXToken(token);
      if (data?.requiresMobileVerify) {
        setRequiresMobileVerify(true);
      }
      const hasExistingAddress = profile?.phrAddress?.length > 0 || profile?.preferredAbhaAddress;
      if (hasExistingAddress && !data?.isNew) {
        toast.success('Existing ABHA account found — address already set');
      } else {
        toast.success('ABHA created successfully!');
      }
      setActiveStep(2);
      fetchAbhaCard(token);
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to create ABHA'); }
    finally { setLoading(false); }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // POST-ENROLLMENT MOBILE VERIFY
  // ═══════════════════════════════════════════════════════════════════════════

  const handleSendMobileVerifyOtp = async () => {
    setLoading(true);
    try {
      const res: any = await abhaService.sendMobileVerifyOtp(txnId, mobile);
      setTxnId(res?.data?.txnId || res?.txnId || txnId);
      setMobileVerifySent(true);
      toast.success('OTP sent to mobile');
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to send mobile OTP'); }
    finally { setLoading(false); }
  };

  const handleVerifyMobileOtp = async () => {
    setLoading(true);
    try {
      await abhaService.verifyMobileOtp(txnId, mobileVerifyOtp);
      setRequiresMobileVerify(false);
      toast.success('Mobile verified successfully');
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Invalid OTP'); }
    finally { setLoading(false); }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // DRIVING LICENSE ENROLLMENT
  // ═══════════════════════════════════════════════════════════════════════════

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
      toast.success('Mobile verified — enter DL details');
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Invalid OTP'); }
    finally { setLoading(false); }
  };

  const handleEnrolByDL = async () => {
    if (!dlForm.dlNumber || !dlForm.firstName || !dlForm.lastName || !dlForm.dob || !dlForm.gender) {
      toast.error('Fill all required DL fields');
      return;
    }
    setLoading(true);
    try {
      const res: any = await abhaService.enrolByDrivingLicense({ txnId, ...dlForm });
      const data = res?.data || res;
      const profile = data?.profile || data?.ABHAProfile || data;
      setCreatedAbha(profile);
      const token = data?.tokens?.token;
      if (token) {
        setXToken(token);
        fetchAbhaCard(token);
      }
      setActiveStep(3);
      toast.success('ABHA created via Driving License!');
    } catch (e: any) { toast.error(e?.response?.data?.message || 'DL enrollment failed'); }
    finally { setLoading(false); }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ABHA ADDRESS CREATION
  // ═══════════════════════════════════════════════════════════════════════════

  const abhaAddressStepIndex = enrollMethod === 'aadhaar' ? 3 : 4;

  const handleFetchAbhaAddressSuggestions = async () => {
    setLoading(true);
    try {
      const res: any = await abhaService.getAbhaAddressSuggestions(txnId);
      const suggestions = res?.data || res;
      setAbhaAddressSuggestions(Array.isArray(suggestions) ? suggestions : []);
    } catch { toast.error('Failed to fetch ABHA address suggestions'); }
    finally { setLoading(false); }
  };

  const handleCreateAbhaAddress = async () => {
    const address = selectedAbhaAddress || customAbhaAddress;
    if (!address.trim()) { toast.error('Enter or select an ABHA address'); return; }
    setLoading(true);
    try {
      const res: any = await abhaService.createAbhaAddress(txnId, address);
      const data = res?.data || res;
      setCreatedAbha((prev: any) => ({
        ...prev,
        preferredAbhaAddress: data?.preferredAbhaAddress || address,
        abhaAddress: data?.preferredAbhaAddress || address,
      }));
      setActiveStep(abhaAddressStepIndex + 1);
      toast.success(`ABHA address created: ${data?.preferredAbhaAddress || address}`);
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to create ABHA address'); }
    finally { setLoading(false); }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // VERIFICATION / SEARCH
  // ═══════════════════════════════════════════════════════════════════════════

  const normalizeSearchResult = (raw: any, method: VerifyMethod): any => {
    if (!raw) return null;

    if (method === 'mobile') {
      const arr = Array.isArray(raw) ? raw : raw?.data ? (Array.isArray(raw.data) ? raw.data : null) : null;
      if (arr && arr.length > 0) {
        const first = arr[0];
        const abhaList = first?.ABHA || [];
        const firstAbha = abhaList[0];
        return {
          _searchTxnId: first?.txnId,
          _abhaList: abhaList,
          ABHANumber: firstAbha?.ABHANumber,
          name: firstAbha?.name,
          gender: firstAbha?.gender,
          _index: firstAbha?.index,
          _source: 'mobile-search',
        };
      }
    }

    if (method === 'abha-number') {
      return {
        ABHANumber: raw.ABHANumber,
        preferredAbhaAddress: raw.preferredAbhaAddress,
        authMethods: raw.authMethods,
        status: raw.status,
        mobile: raw.mobile,
        verificationStatus: raw.verificationStatus,
        _source: 'abha-number-search',
      };
    }

    if (method === 'abha-address') {
      return {
        authMethods: raw.authMethods,
        fullName: raw.fullName,
        abhaAddress: raw.abhaAddress,
        ABHANumber: raw.ABHANumber,
        status: raw.status,
        _source: 'abha-address-search',
      };
    }

    return raw;
  };

  const handleVerifyRequestOtp = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSearchResult(null);
    setVerifiedProfile(null);
    try {
      // Step 1: Background search for preview (non-blocking for ABHA number & mobile)
      if (verifyMethod === 'mobile') {
        try {
          const searchRes: any = await abhaService.findAbhaByMobile(searchQuery);
          const raw = searchRes?.data || searchRes;
          const normalized = normalizeSearchResult(raw, 'mobile');
          if (normalized) setSearchResult(normalized);

          if (normalized?._searchTxnId && normalized?._index != null) {
            const res: any = await abhaService.loginRequestOtp({
              scope: ['abha-login', 'search-abha', 'mobile-verify'],
              loginHint: 'index',
              loginId: String(normalized._index),
              otpSystem: 'abdm',
              txnId: normalized._searchTxnId,
            });
            const txn = res?.data?.txnId || res?.txnId;
            if (txn) setTxnId(txn);
            toast.success('OTP sent to mobile');
            return;
          }
        } catch { /* fall through to direct mobile OTP */ }
      } else if (verifyMethod === 'abha-number') {
        try {
          const searchRes: any = await abhaService.loginSearch(searchQuery.replace(/-/g, ''));
          const raw = searchRes?.data || searchRes;
          const normalized = normalizeSearchResult(raw, 'abha-number');
          if (normalized) setSearchResult(normalized);
        } catch { /* non-critical, continue to OTP */ }
      } else if (verifyMethod === 'abha-address') {
        try {
          const searchRes: any = await abhaService.phrSearch(searchQuery);
          const raw = searchRes?.data || searchRes;
          const normalized = normalizeSearchResult(raw, 'abha-address');
          if (normalized) setSearchResult(normalized);
        } catch { /* non-critical */ }
      }

      // Step 2: Send OTP
      if (verifyMethod === 'abha-address') {
        const res: any = await abhaService.phrRequestOtp(searchQuery, ['abha-address-login', 'mobile-verify'], 'abdm');
        const txn = res?.data?.txnId || res?.txnId;
        if (txn) setTxnId(txn);
        toast.success('OTP sent for ABHA address verification');
      } else {
        const loginHint = verifyMethod === 'mobile' ? 'mobile' : verifyMethod === 'aadhaar' ? 'aadhaar' : 'abha-number';
        const otpSystem = verifyMethod === 'aadhaar' ? 'aadhaar' : 'abdm';
        const scope: string[] = ['abha-login', verifyMethod === 'aadhaar' ? 'aadhaar-verify' : 'mobile-verify'];
        const res: any = await abhaService.loginRequestOtp({ scope, loginHint, loginId: searchQuery, otpSystem });
        const txn = res?.data?.txnId || res?.txnId;
        if (txn) setTxnId(txn);
        toast.success('Verification OTP sent');
      }
    } catch (e: any) { toast.error(e?.response?.data?.message || e?.message || 'Failed to send verification OTP'); }
    finally { setLoading(false); }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    try {
      if (verifyMethod === 'abha-address') {
        const scope = ['abha-address-login', 'mobile-verify'];
        const res: any = await abhaService.phrVerifyOtp(scope, txnId, otp);
        const data = res?.data || res;
        const token = data?.tokens?.token;
        if (token) setXToken(token);
        setSearchResult(data);
        toast.success('ABHA address verified!');
        if (token) fetchPhrProfile(token);
      } else {
        // ABDM v3 spec — `find-abha-number` flow:
        //   1. /profile/account/abha/search        scope: ["search-abha"]
        //   2. /profile/login/request/otp          scope: ["abha-login","search-abha","mobile-verify"]
        //   3. /profile/login/verify               scope: ["abha-login","mobile-verify"]    ← here
        // Step 3 must NOT carry "search-abha" — the gateway returns
        // "scope: Invalid Scope" if you reuse the request-otp scope here.
        // For Aadhaar verify the second slot becomes "aadhaar-verify".
        const scope: string[] = ['abha-login', verifyMethod === 'aadhaar' ? 'aadhaar-verify' : 'mobile-verify'];
        const res: any = await abhaService.loginVerifyOtp(scope, txnId, otp);
        const data = res?.data || res;

        if (data?.token) {
          setXToken(data.token);
          setSearchResult(data);
          toast.success('ABHA verified successfully!');
          fetchProfile(data.token);
        } else if (data?.accounts?.length) {
          const selectedAbha = data.accounts[0]?.ABHANumber;
          if (selectedAbha) {
            toast.info('Account found, completing verification...');
            const userRes: any = await abhaService.loginVerifyUser(selectedAbha, data.txnId || txnId);
            const userData = userRes?.data || userRes;
            const userToken = userData?.token;
            if (userToken) {
              setXToken(userToken);
              toast.success('ABHA verified successfully!');
              fetchProfile(userToken);
            } else {
              toast.error('Unable to retrieve session token');
            }
          }
        } else {
          toast.success('ABHA verified!');
          setSearchResult(data);
        }
      }
    } catch (e: any) { toast.error(e?.response?.data?.message || e?.message || 'Invalid OTP'); }
    finally { setLoading(false); }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PROFILE
  // ═══════════════════════════════════════════════════════════════════════════

  const fetchProfile = async (token: string) => {
    try {
      const res: any = await abhaService.getProfile(token);
      setVerifiedProfile(res?.data || res);
    } catch { /* non-critical */ }
  };

  const fetchPhrProfile = async (token: string) => {
    try {
      const res: any = await abhaService.phrGetProfile(token);
      setVerifiedProfile(res?.data || res);
    } catch { /* non-critical */ }
  };

  const handleUpdateProfile = async () => {
    if (!xToken || Object.keys(profileUpdates).length === 0) return;
    setLoading(true);
    try {
      const res: any = await abhaService.updateProfile(xToken, profileUpdates);
      setVerifiedProfile((prev: any) => ({ ...prev, ...(res?.data || res) }));
      setShowProfileDialog(false);
      setProfileUpdates({});
      toast.success('Profile updated');
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to update profile'); }
    finally { setLoading(false); }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CARD / QR
  // ═══════════════════════════════════════════════════════════════════════════

  const fetchAbhaCard = async (token?: string, usePhr = false) => {
    const t = token || xToken;
    if (!t) return;
    try {
      const isPhr = usePhr || (tabValue === 1 && verifyMethod === 'abha-address');
      const res: any = isPhr ? await abhaService.phrGetCard(t) : await abhaService.getAbhaCard(t);
      const blob = res instanceof Blob ? res : new Blob([res], { type: 'image/png' });
      setCardImageUrl(URL.createObjectURL(blob));
    } catch { /* optional */ }
  };

  const handleDownloadCard = async () => {
    if (!xToken) { toast.error('Please verify ABHA first to download card'); return; }
    try {
      const isPhr = tabValue === 1 && verifyMethod === 'abha-address';
      const res: any = isPhr ? await abhaService.phrGetCard(xToken) : await abhaService.getAbhaCard(xToken);
      const blob = res instanceof Blob ? res : new Blob([res], { type: 'image/png' });
      const url = URL.createObjectURL(blob);
      setCardImageUrl(url);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'abha-card.png';
      link.click();
    } catch { toast.error('Failed to download ABHA card'); }
  };

  const handleViewQrCode = async () => {
    if (!xToken) { toast.error('Please verify ABHA first'); return; }
    try {
      const res: any = await abhaService.getQrCode(xToken);
      const qrData = res?.data || res;
      if (typeof qrData === 'string' && qrData.length > 100) {
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(`<html><body style="display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f5f5f5;margin:0"><img src="data:image/png;base64,${qrData}" style="max-width:400px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.15)" /></body></html>`);
          win.document.title = 'ABHA QR Code';
        }
      } else if (qrData && typeof qrData === 'object' && qrData.pngBytes) {
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(`<html><body style="display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f5f5f5;margin:0"><img src="data:image/png;base64,${qrData.pngBytes}" style="max-width:400px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.15)" /></body></html>`);
          win.document.title = 'ABHA QR Code';
        }
      } else {
        toast.info('QR code format not supported for display');
      }
    } catch { toast.error('Failed to load QR code'); }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PATIENT LINKING
  // ═══════════════════════════════════════════════════════════════════════════

  const handleLinkToPatient = async (abhaNumber: string, patientId: string, abhaAddress?: string) => {
    setLoading(true);
    try {
      // If the operator just completed an ABDM-verified flow on this page
      // (Verify/Search → OTP → profile), tell the backend so it can mark
      // the AbhaRecord as KYC=VERIFIED instead of leaving it PENDING.
      const verified = !!(xToken && verifiedProfile);
      await abhaService.linkToPatient(
        abhaNumber,
        patientId,
        abhaAddress,
        verified ? { verified: true, profile: verifiedProfile } : undefined,
      );
      toast.success(verified ? 'ABHA verified and linked to patient' : 'ABHA linked to patient successfully');
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to link ABHA'); }
    finally { setLoading(false); }
  };

  const handleCopy = (text: string) => { navigator.clipboard.writeText(text); toast.success('Copied!'); };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const renderProfileCard = (profile: any, showActions = true) => {
    if (!profile) return null;
    const abhaNum = profile.ABHANumber || profile.abhaNumber;
    const abhaAddr = profile.preferredAbhaAddress || profile.phrAddress?.[0] || profile.abhaAddress;
    const name = profile.name || `${profile.firstName || ''} ${profile.middleName || ''} ${profile.lastName || ''}`.trim();
    const dob = profile.dayOfBirth && profile.monthOfBirth && profile.yearOfBirth
      ? `${profile.dayOfBirth}/${profile.monthOfBirth}/${profile.yearOfBirth}` : profile.dob || '—';

    const InfoField = ({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) => (
      <Box sx={{ mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="body1" fontWeight={600}>{value || '—'}</Typography>
          {copyable && value && <IconButton size="small" onClick={() => handleCopy(value)} sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}><ContentCopy sx={{ fontSize: 14 }} /></IconButton>}
        </Box>
      </Box>
    );

    return (
      <Paper elevation={0} sx={{ border: `1px solid ${alpha('#22c55e', 0.3)}`, borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ px: 3, py: 1.5, bgcolor: alpha('#22c55e', 0.06), display: 'flex', alignItems: 'center', gap: 1, borderBottom: `1px solid ${alpha('#22c55e', 0.15)}` }}>
          <CheckCircle sx={{ color: '#16a34a', fontSize: 22 }} />
          <Typography variant="subtitle1" fontWeight={700} color="#16a34a">Verified ABHA Profile</Typography>
          {profile.profilePhoto && (
            <Avatar src={`data:image/jpeg;base64,${profile.profilePhoto}`} sx={{ width: 36, height: 36, ml: 'auto' }} />
          )}
        </Box>
        <Box sx={{ p: 3 }}>
          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={6}><InfoField label="ABHA Number" value={abhaNum} copyable /></Grid>
            <Grid item xs={12} sm={6}><InfoField label="ABHA Address" value={abhaAddr} copyable /></Grid>
            <Grid item xs={12} sm={6}><InfoField label="Name" value={name} /></Grid>
            <Grid item xs={12} sm={6}><InfoField label="Mobile" value={profile.mobile} /></Grid>
            <Grid item xs={12} sm={6}><InfoField label="Gender" value={profile.gender === 'M' ? 'Male' : profile.gender === 'F' ? 'Female' : profile.gender === 'O' ? 'Other' : profile.gender} /></Grid>
            <Grid item xs={12} sm={6}><InfoField label="Date of Birth" value={dob} /></Grid>
            {profile.email && <Grid item xs={12} sm={6}><InfoField label="Email" value={profile.email} /></Grid>}
            {profile.address && <Grid item xs={12}><InfoField label="Address" value={profile.address} /></Grid>}
          </Grid>

          {cardImageUrl && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, textAlign: 'center' }}>ABHA Card</Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                {/* Front — top half of the image */}
                <Box sx={{
                  width: 380, height: 240, borderRadius: 2, overflow: 'hidden',
                  border: '1px solid', borderColor: 'divider', flexShrink: 0,
                }}>
                  <Box component="img" src={cardImageUrl} alt="ABHA Card Front"
                    sx={{ width: '100%', height: '200%', objectFit: 'cover', objectPosition: 'top' }} />
                </Box>
                {/* Back — bottom half of the image, shift up by container height */}
                <Box sx={{
                  width: 380, height: 240, borderRadius: 2, overflow: 'hidden',
                  border: '1px solid', borderColor: 'divider', flexShrink: 0,
                }}>
                  <Box component="img" src={cardImageUrl} alt="ABHA Card Back"
                    sx={{ width: '100%', height: '200%', objectFit: 'cover', objectPosition: 'top', marginTop: '-240px' }} />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 8, mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary">Front</Typography>
                <Typography variant="caption" color="text.secondary">Back</Typography>
              </Box>
            </Box>
          )}

          {showActions && (
            <Divider sx={{ my: 2.5 }} />
          )}
          {showActions && (
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <Button variant="outlined" size="small" startIcon={<CreditCard />} onClick={() => fetchAbhaCard()} sx={{ borderRadius: 2 }}>View Card</Button>
              <Button variant="outlined" size="small" startIcon={<Download />} onClick={handleDownloadCard} sx={{ borderRadius: 2 }}>Download</Button>
              <Button variant="outlined" size="small" startIcon={<QrCode />} onClick={handleViewQrCode} sx={{ borderRadius: 2 }}>QR Code</Button>
              {xToken && (
                <Button variant="outlined" size="small" startIcon={<Edit />} onClick={() => {
                  setProfileUpdates({});
                  setShowProfileDialog(true);
                }} sx={{ borderRadius: 2 }}>Update Profile</Button>
              )}
              {linkedPatientId && abhaNum && (
                <Button variant="contained" size="small" color="success" startIcon={<HealthAndSafety />}
                  onClick={() => handleLinkToPatient(abhaNum, linkedPatientId, abhaAddr)} sx={{ borderRadius: 2 }}>
                  Link to {linkedPatientName || 'Patient'}
                </Button>
              )}
              <Button variant="contained" color="primary" size="small" startIcon={<PersonAdd />}
                onClick={() => navigate('/app/patients/new', { state: { abhaData: profile } })} sx={{ borderRadius: 2 }}>
                Register as Patient
              </Button>
            </Box>
          )}
        </Box>
      </Paper>
    );
  };

  const renderAbhaAddressStep = () => (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        Create an ABHA address (like an email for health records). This is your unique health ID on ABDM.
      </Alert>

      <Box sx={{ mb: 2 }}>
        <Button variant="outlined" size="small" onClick={handleFetchAbhaAddressSuggestions} disabled={loading} startIcon={loading ? <CircularProgress size={16} /> : <Refresh />}>
          Get Suggestions
        </Button>
      </Box>

      {abhaAddressSuggestions.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Suggested Addresses</Typography>
          <List dense sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, maxHeight: 200, overflow: 'auto' }}>
            {abhaAddressSuggestions.map((addr) => (
              <ListItem key={addr} disablePadding>
                <ListItemButton selected={selectedAbhaAddress === addr} onClick={() => { setSelectedAbhaAddress(addr); setCustomAbhaAddress(''); }}>
                  <ListItemText primary={`${addr}@abdm`} />
                  {selectedAbhaAddress === addr && <CheckCircle color="success" fontSize="small" />}
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Or enter a custom address</Typography>
      <TextField fullWidth placeholder="yourname" value={customAbhaAddress}
        onChange={(e) => { setCustomAbhaAddress(e.target.value); setSelectedAbhaAddress(''); }}
        InputProps={{
          startAdornment: <InputAdornment position="start"><AlternateEmail /></InputAdornment>,
          endAdornment: <InputAdornment position="end">@abdm</InputAdornment>,
        }}
        sx={{ mb: 3 }}
      />

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button variant="contained" onClick={handleCreateAbhaAddress} disabled={loading || (!selectedAbhaAddress && !customAbhaAddress.trim())}
          startIcon={loading ? <CircularProgress size={18} /> : <CheckCircle />}>
          {loading ? 'Creating...' : 'Create ABHA Address'}
        </Button>
      </Box>
    </Box>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <Box>
      <PageHeader
        title="ABHA Management"
        subtitle={
          <Box component="span">
            Create, verify and manage Ayushman Bharat Health Accounts
            {linkedPatientName && (
              <Chip size="small" label={`Linking: ${linkedPatientName}`}
                sx={{ ml: 1, height: 20, fontSize: '0.65rem' }} color="primary" variant="outlined" />
            )}
          </Box>
        }
        icon={<HealthAndSafety />}
        actions={
          <>
            {isAdmin && hospitalId && (
              <>
                {/* Live registration status pill — flips to green ✓ once registered. */}
                <Tooltip
                  title={
                    abdmRegistered
                      ? `Connected to ABDM as HIP ${hospital?.hipId || ''}${abdmRegisteredAt ? ` · since ${abdmRegisteredAt}` : ''}`
                      : hasHipId
                        ? 'Hospital has a HIP ID but is not yet registered with ABDM. Click to register.'
                        : 'No HIP ID configured for this hospital yet.'
                  }
                  arrow
                >
                  <Chip
                    size="small"
                    icon={
                      hospitalLoading
                        ? <CircularProgress size={12} thickness={6} />
                        : abdmRegistered
                          ? <CloudDone sx={{ fontSize: 14 }} />
                          : <CloudOff  sx={{ fontSize: 14 }} />
                    }
                    label={
                      hospitalLoading
                        ? 'Checking ABDM…'
                        : abdmRegistered
                          ? 'ABDM Registered'
                          : hasHipId ? 'Not registered' : 'No HIP ID'
                    }
                    color={abdmRegistered ? 'success' : hasHipId ? 'warning' : 'default'}
                    variant={abdmRegistered ? 'filled' : 'outlined'}
                    sx={{
                      fontWeight: 700,
                      ...(abdmRegistered && { color: '#fff' }),
                    }}
                  />
                </Tooltip>

                <Button
                  variant={abdmRegistered ? 'text' : 'contained'}
                  color={abdmRegistered ? 'inherit' : 'primary'}
                  size="small"
                  onClick={handleHipRegister}
                  disabled={hipRegistering || !hasHipId}
                  startIcon={hipRegistering ? <CircularProgress size={14} /> : <HealthAndSafety />}
                  sx={{
                    textTransform: 'none', fontWeight: 700, borderRadius: 1.75,
                    ...(!abdmRegistered && hasHipId && {
                      boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.25)}`,
                    }),
                  }}
                >
                  {hipRegistering
                    ? 'Registering…'
                    : abdmRegistered ? 'Re-register' : 'Register with ABDM'}
                </Button>
              </>
            )}
          </>
        }
      />

      <Paper elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden', mb: 3 }}>
        <Tabs
          value={tabValue} onChange={(_, v) => setTabValue(v)}
          variant="scrollable" scrollButtons="auto"
          sx={{
            borderBottom: `1px solid ${theme.palette.divider}`, px: 1,
            '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minHeight: 52 },
          }}
        >
          <Tab label="Create ABHA" icon={<HealthAndSafety />} iconPosition="start" />
          <Tab label="Verify / Search" icon={<Search />} iconPosition="start" />
          <Tab label="Scan & Share" icon={<QrCode />} iconPosition="start" />
          <Tab label="Patient Check-In" icon={<PersonAdd />} iconPosition="start" />
        </Tabs>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* CREATE ABHA TAB                                                   */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <TabPanel value={tabValue} index={0}>
          <Box>
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">Method:</Typography>
              <ToggleButtonGroup size="small" exclusive value={enrollMethod} onChange={(_, v) => { if (v) { setEnrollMethod(v); resetFlow(); } }}>
                <ToggleButton value="aadhaar"><Badge sx={{ mr: 1 }} fontSize="small" /> Aadhaar OTP</ToggleButton>
                <ToggleButton value="dl"><CreditCard sx={{ mr: 1 }} fontSize="small" /> Driving License</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Alert severity="info" sx={{ mb: 3 }}>
              {enrollMethod === 'aadhaar'
                ? 'OTP will be sent to Aadhaar-linked mobile. ABHA is created immediately after OTP verification.'
                : 'Verify mobile via OTP, then submit Driving License details to create ABHA.'}
            </Alert>

            <Stepper activeStep={activeStep} sx={{ mb: 4 }} alternativeLabel>
              {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
            </Stepper>

            {activeStep > 0 && (
              <Box sx={{ mb: 3 }}>
                <Button variant="outlined" color="warning" size="small" startIcon={<Refresh />} onClick={resetFlow}>Start Over</Button>
              </Box>
            )}

            {/* ── STEP 0: Enter Aadhaar / Mobile ────────────────────────── */}
            {activeStep === 0 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  {enrollMethod === 'aadhaar' ? (
                    <TextField fullWidth label="Aadhaar Number" value={aadhaar} onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, ''))}
                      placeholder="12-digit Aadhaar" inputProps={{ maxLength: 12 }}
                      InputProps={{ startAdornment: <InputAdornment position="start"><CreditCard color="action" /></InputAdornment> }}
                      helperText={`${aadhaar.length}/12`} />
                  ) : (
                    <TextField fullWidth label="Mobile Number" value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                      placeholder="10-digit mobile" inputProps={{ maxLength: 10 }}
                      InputProps={{ startAdornment: <InputAdornment position="start"><Phone color="action" /></InputAdornment> }}
                      helperText={`${mobile.length}/10`} />
                  )}
                </Grid>

                {enrollMethod === 'aadhaar' && (
                  <Grid item xs={12}>
                    <Paper variant="outlined" sx={{ p: 2, maxHeight: 200, overflowY: 'auto', bgcolor: alpha(theme.palette.info.main, 0.04), borderColor: alpha(theme.palette.info.main, 0.3) }}>
                      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Terms & Conditions</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6, display: 'block' }}>
                        I, hereby declare that I am voluntarily sharing my Aadhaar number and demographic information issued by UIDAI, with National Health Authority (NHA) for the sole purpose of creation of ABHA number. I understand that my ABHA number can be used and shared for purposes as may be notified by ABDM from time to time including provision of healthcare services. Further, I am aware that my personal identifiable information (Name, Address, Age, Date of Birth, Gender and Photograph) may be made available to the entities working in the National Digital Health Ecosystem (NDHE) which inter alia includes stakeholders and entities such as healthcare professionals (e.g. doctors), facilities (e.g. hospitals, laboratories) and data fiduciaries (e.g. health programmes), which are registered with or linked to the Ayushman Bharat Digital Mission (ABDM), and various processes there under.
                        {' '}I authorize NHA to use my Aadhaar number for performing Aadhaar based authentication with UIDAI as per the provisions of the Aadhaar (Targeted Delivery of Financial and other Subsidies, Benefits and Services) Act, 2016 for the aforesaid purpose. I understand that UIDAI will share my e-KYC details, or response of "Yes" with NHA upon successful authentication.
                        {' '}I have been duly informed about the option of using other IDs apart from Aadhaar; however, I consciously choose to use Aadhaar number for the purpose of availing benefits across the NDHE. I am aware that my personal identifiable information excluding Aadhaar number / VID number can be used and shared for purposes as mentioned above. I reserve the right to revoke the given consent at any point of time as per provisions of Aadhaar Act and Regulations.
                      </Typography>
                    </Paper>
                    <FormControlLabel
                      sx={{ mt: 1 }}
                      control={
                        <Checkbox
                          checked={consentAccepted}
                          onChange={(e) => setConsentAccepted(e.target.checked)}
                          color="primary"
                        />
                      }
                      label={<Typography variant="body2">I have read and I agree to the above terms and conditions</Typography>}
                    />
                  </Grid>
                )}

                <Grid item xs={12}>
                  <Button variant="contained" size="large"
                    onClick={enrollMethod === 'aadhaar' ? handleGenerateAadhaarOtp : handleDlSendMobileOtp}
                    disabled={loading || (enrollMethod === 'aadhaar' ? (aadhaar.length !== 12 || !consentAccepted) : mobile.length !== 10)}
                    startIcon={loading ? <CircularProgress size={18} /> : <Phone />}>
                    {loading ? 'Sending...' : 'Send OTP'}
                  </Button>
                </Grid>
              </Grid>
            )}

            {/* ── STEP 1: Verify OTP ────────────────────────────────────── */}
            {activeStep === 1 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Enter OTP" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="6-digit OTP" inputProps={{ maxLength: 6 }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><QrCode color="action" /></InputAdornment> }} />
                </Grid>
                {enrollMethod === 'aadhaar' && (
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth required label="Mobile Number" value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                      placeholder="10-digit mobile for ABHA" inputProps={{ maxLength: 10 }}
                      InputProps={{ startAdornment: <InputAdornment position="start"><Phone color="action" /></InputAdornment> }}
                      helperText="Required by ABDM for ABHA communications"
                      error={mobile.length > 0 && mobile.length !== 10} />
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button variant="contained" size="large"
                      onClick={enrollMethod === 'aadhaar' ? handleEnrolByAadhaar : handleDlVerifyMobileOtp}
                      disabled={loading || otp.length !== 6 || (enrollMethod === 'aadhaar' && mobile.length !== 10)}
                      startIcon={loading ? <CircularProgress size={18} /> : <CheckCircle />}>
                      {loading ? 'Processing...' : enrollMethod === 'aadhaar' ? 'Verify & Create ABHA' : 'Verify OTP'}
                    </Button>
                    <Button variant="outlined" onClick={enrollMethod === 'aadhaar' ? handleResendOtp : handleDlSendMobileOtp} disabled={loading} startIcon={<Refresh />}>Resend</Button>
                  </Box>
                </Grid>
              </Grid>
            )}

            {/* ── STEP 2 (DL only): Enter DL Details ────────────────────── */}
            {enrollMethod === 'dl' && activeStep === 2 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>Driving License Details</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth required label="DL Number" value={dlForm.dlNumber}
                      onChange={(e) => setDlForm({ ...dlForm, dlNumber: e.target.value })} placeholder="e.g., DL-1420110012345" />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth required label="First Name" value={dlForm.firstName}
                      onChange={(e) => setDlForm({ ...dlForm, firstName: e.target.value })} />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth label="Middle Name" value={dlForm.middleName}
                      onChange={(e) => setDlForm({ ...dlForm, middleName: e.target.value })} />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth required label="Last Name" value={dlForm.lastName}
                      onChange={(e) => setDlForm({ ...dlForm, lastName: e.target.value })} />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth required type="date" label="Date of Birth" value={dlForm.dob}
                      onChange={(e) => setDlForm({ ...dlForm, dob: e.target.value })} InputLabelProps={{ shrink: true }} />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth required>
                      <InputLabel>Gender</InputLabel>
                      <Select value={dlForm.gender} label="Gender" onChange={(e) => setDlForm({ ...dlForm, gender: e.target.value })}>
                        <MenuItem value="M">Male</MenuItem>
                        <MenuItem value="F">Female</MenuItem>
                        <MenuItem value="O">Other</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth label="State" value={dlForm.state}
                      onChange={(e) => setDlForm({ ...dlForm, state: e.target.value })} placeholder="e.g., Delhi" />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth label="District" value={dlForm.district}
                      onChange={(e) => setDlForm({ ...dlForm, district: e.target.value })} placeholder="e.g., New Delhi" />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth label="PIN Code" value={dlForm.pinCode}
                      onChange={(e) => setDlForm({ ...dlForm, pinCode: e.target.value.replace(/\D/g, '') })} inputProps={{ maxLength: 6 }} />
                  </Grid>
                  <Grid item xs={12}>
                    <Button variant="contained" size="large" onClick={handleEnrolByDL} disabled={loading}
                      startIcon={loading ? <CircularProgress size={18} /> : <CheckCircle />}>
                      {loading ? 'Creating ABHA...' : 'Submit & Create ABHA'}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* ── STEP 2 (Aadhaar) / STEP 3 (DL): ABHA Created ─────────── */}
            {((enrollMethod === 'aadhaar' && activeStep === 2) || (enrollMethod === 'dl' && activeStep === 3)) && (
              <Box>
                {requiresMobileVerify && (
                  <Alert severity="warning" sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Mobile verification required</Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      The mobile number you provided differs from the Aadhaar-linked mobile. Verify it now.
                    </Typography>
                    {!mobileVerifySent ? (
                      <Button variant="contained" size="small" onClick={handleSendMobileVerifyOtp} disabled={loading}
                        startIcon={loading ? <CircularProgress size={16} /> : <Phone />}>
                        Send OTP to {mobile}
                      </Button>
                    ) : (
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <TextField size="small" placeholder="Enter OTP" value={mobileVerifyOtp}
                          onChange={(e) => setMobileVerifyOtp(e.target.value.replace(/\D/g, ''))} inputProps={{ maxLength: 6 }} />
                        <Button variant="contained" size="small" onClick={handleVerifyMobileOtp} disabled={loading || mobileVerifyOtp.length !== 6}>
                          Verify
                        </Button>
                      </Box>
                    )}
                  </Alert>
                )}

                {(createdAbha?.phrAddress?.length > 0 || createdAbha?.preferredAbhaAddress) && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    This person already has an ABHA address (<strong>{createdAbha?.preferredAbhaAddress || createdAbha?.phrAddress?.[0]}</strong>). No need to create a new one — you can proceed directly.
                  </Alert>
                )}

                {renderProfileCard(createdAbha, false)}

                <Box sx={{ display: 'flex', gap: 2, mt: 3, alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  {(createdAbha?.phrAddress?.length > 0 || createdAbha?.preferredAbhaAddress) && (
                    <Chip label={`ABHA Address: ${createdAbha?.preferredAbhaAddress || createdAbha?.phrAddress?.[0]}`} color="primary" variant="outlined" sx={{ fontSize: '0.9rem', py: 2, mr: 'auto' }} />
                  )}
                  <Button variant="outlined" startIcon={<Download />} onClick={handleDownloadCard} sx={{ borderRadius: 2 }}>Download Card</Button>
                  {(createdAbha?.phrAddress?.length > 0 || createdAbha?.preferredAbhaAddress) ? (
                    <Button variant="contained" onClick={() => setActiveStep(steps.length - 1)} sx={{ borderRadius: 2, px: 4 }}>
                      Continue
                    </Button>
                  ) : (
                    <Button variant="contained" onClick={() => {
                      setActiveStep(enrollMethod === 'aadhaar' ? 3 : 4);
                      handleFetchAbhaAddressSuggestions();
                    }} startIcon={<AlternateEmail />} sx={{ borderRadius: 2 }}>
                      Create ABHA Address
                    </Button>
                  )}
                </Box>
              </Box>
            )}

            {/* ── ABHA Address Step ──────────────────────────────────────── */}
            {activeStep === abhaAddressStepIndex && renderAbhaAddressStep()}

            {/* ── Final Complete Step ──────────────────────────────────────── */}
            {activeStep === steps.length - 1 && (
              <Box>
                <Alert severity="success" sx={{ mb: 3 }}>
                  ABHA enrollment complete! You can now register this person as a patient or download the ABHA card.
                </Alert>
                {renderProfileCard(createdAbha)}
              </Box>
            )}
          </Box>
        </TabPanel>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* VERIFY / SEARCH TAB                                               */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <TabPanel value={tabValue} index={1}>
          <Box>
            <Box sx={{ mb: 2 }}>
              <ToggleButtonGroup size="small" exclusive value={verifyMethod}
                onChange={(_, v) => { if (v) { setVerifyMethod(v); setSearchQuery(''); setSearchResult(null); setVerifiedProfile(null); setTxnId(''); setOtp(''); } }}>
                <ToggleButton value="abha-number">ABHA Number</ToggleButton>
                <ToggleButton value="mobile">Mobile</ToggleButton>
                <ToggleButton value="aadhaar">Aadhaar</ToggleButton>
                <ToggleButton value="abha-address">ABHA Address</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <TextField fullWidth
                placeholder={
                  verifyMethod === 'mobile' ? 'Enter 10-digit mobile number' :
                  verifyMethod === 'aadhaar' ? 'Enter 12-digit Aadhaar number' :
                  verifyMethod === 'abha-address' ? 'Enter ABHA address (e.g. name@abdm)' :
                  'Enter 14-digit ABHA number'
                }
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !txnId && handleVerifyRequestOtp()}
                disabled={!!txnId}
                InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
              />
              {!txnId ? (
                <Button variant="contained" onClick={handleVerifyRequestOtp}
                  disabled={loading || !searchQuery.trim()}
                  sx={{ minWidth: 140 }}
                  startIcon={loading ? <CircularProgress size={18} /> : <Phone />}>
                  {loading ? 'Sending...' : 'Send OTP'}
                </Button>
              ) : (
                <Button variant="outlined" size="small" onClick={() => { setTxnId(''); setOtp(''); setSearchResult(null); setVerifiedProfile(null); }}
                  startIcon={<Refresh />}>
                  Reset
                </Button>
              )}
            </Box>

            {txnId && !verifiedProfile && (
              <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
                <TextField fullWidth placeholder="Enter 6-digit OTP" value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  inputProps={{ maxLength: 6 }}
                  onKeyDown={(e) => e.key === 'Enter' && otp.length === 6 && handleVerifyOtp()}
                  InputProps={{ startAdornment: <InputAdornment position="start"><QrCode color="action" /></InputAdornment> }}
                />
                <Button variant="contained" color="success" onClick={handleVerifyOtp} disabled={loading || otp.length !== 6} sx={{ minWidth: 140 }}
                  startIcon={loading ? <CircularProgress size={18} /> : <CheckCircle />}>
                  {loading ? 'Verifying...' : 'Verify'}
                </Button>
              </Box>
            )}

            {searchResult && !verifiedProfile && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
                    {searchResult.profilePhoto ? (
                      <Avatar src={`data:image/jpeg;base64,${searchResult.profilePhoto}`} sx={{ width: 56, height: 56 }} />
                    ) : (
                      <Avatar sx={{ width: 56, height: 56 }}><Person /></Avatar>
                    )}
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        {searchResult.name || searchResult.fullName || searchResult.firstName || 'ABHA User'}
                      </Typography>
                      <Chip size="small"
                        label={searchResult.status || searchResult.verificationStatus || (searchResult.authMethods ? 'Found' : searchResult.ABHANumber ? 'Active' : 'Matched')}
                        color="success" />
                      {searchResult.authMethods && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          Auth methods: {searchResult.authMethods?.join(', ')}
                        </Typography>
                      )}
                      {searchResult.gender && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          Gender: {searchResult.gender === 'M' ? 'Male' : searchResult.gender === 'F' ? 'Female' : searchResult.gender}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">ABHA Number</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography fontWeight={500}>{searchResult.ABHANumber || searchResult.abhaNumber || '—'}</Typography>
                        {(searchResult.ABHANumber || searchResult.abhaNumber) && (
                          <IconButton size="small" onClick={() => handleCopy(searchResult.ABHANumber || searchResult.abhaNumber)}><ContentCopy fontSize="small" /></IconButton>
                        )}
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">ABHA Address</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography fontWeight={500}>
                          {searchResult.preferredAbhaAddress || searchResult.abhaAddress || searchResult.phrAddress?.[0] || '—'}
                        </Typography>
                        {(searchResult.preferredAbhaAddress || searchResult.abhaAddress) && (
                          <IconButton size="small" onClick={() => handleCopy(searchResult.preferredAbhaAddress || searchResult.abhaAddress)}><ContentCopy fontSize="small" /></IconButton>
                        )}
                      </Box>
                    </Grid>
                    {searchResult.mobile && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">Mobile</Typography>
                        <Typography fontWeight={500}>{searchResult.mobile}</Typography>
                      </Grid>
                    )}
                  </Grid>

                  {searchResult._abhaList?.length > 1 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                        Multiple ABHA accounts found ({searchResult._abhaList.length})
                      </Typography>
                      {searchResult._abhaList.map((a: any, i: number) => (
                        <Chip key={i} label={`${a.name || 'Account'} — ${a.ABHANumber}`} sx={{ mr: 1, mb: 1 }}
                          variant={i === 0 ? 'filled' : 'outlined'} color={i === 0 ? 'primary' : 'default'} />
                      ))}
                    </Box>
                  )}

                  {!searchResult.ABHANumber && !searchResult.abhaNumber && !searchResult.authMethods && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      Click "Send OTP" to verify and view full profile details.
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {verifiedProfile && renderProfileCard(verifiedProfile)}
          </Box>
        </TabPanel>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* SCAN & SHARE TAB                                                  */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <TabPanel value={tabValue} index={2}>
          <ScanAndShare />
        </TabPanel>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* PATIENT CHECK-IN TAB                                              */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <TabPanel value={tabValue} index={3}>
          <PatientCheckIn />
        </TabPanel>
      </Paper>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* PROFILE UPDATE DIALOG                                             */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <Dialog open={showProfileDialog} onClose={() => setShowProfileDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Update ABHA Profile
            <IconButton onClick={() => setShowProfileDialog(false)}><Close /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
            Only profile photo can be updated via ABDM. Name, date of birth, and gender are linked to your Aadhaar and cannot be modified here.
          </Alert>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth label="Name" value={verifiedProfile?.name || createdAbha?.name || ''} disabled
                helperText="Linked to Aadhaar — cannot be changed" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Gender"
                value={verifiedProfile?.gender === 'M' ? 'Male' : verifiedProfile?.gender === 'F' ? 'Female' : verifiedProfile?.gender || ''}
                disabled helperText="Linked to Aadhaar" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Date of Birth" value={verifiedProfile?.dob || createdAbha?.dob || ''}
                disabled helperText="Linked to Aadhaar" />
            </Grid>
            <Grid item xs={12}>
              <Button variant="outlined" component="label" fullWidth startIcon={<Edit />}>
                Upload New Profile Photo
                <input type="file" hidden accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 100 * 1024) { toast.error('Photo must be under 100KB'); return; }
                  const reader = new FileReader();
                  reader.onload = () => {
                    const base64 = (reader.result as string).split(',')[1];
                    setProfileUpdates({ profilePhoto: base64 });
                  };
                  reader.readAsDataURL(file);
                }} />
              </Button>
              {profileUpdates.profilePhoto && (
                <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
                  Photo selected — ready to upload
                </Typography>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowProfileDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateProfile} disabled={loading || Object.keys(profileUpdates).length === 0}
            startIcon={loading ? <CircularProgress size={16} /> : <Save />}>
            {loading ? 'Uploading...' : 'Update Photo'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AbhaManagement;
