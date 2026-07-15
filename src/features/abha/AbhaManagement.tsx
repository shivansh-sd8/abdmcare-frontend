import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, Stepper, Step, StepLabel,
  Grid, Paper, Tabs, Tab, InputAdornment, Chip, Divider, Alert, IconButton,
  CircularProgress, ToggleButtonGroup, ToggleButton, Avatar, Dialog, DialogTitle,
  DialogContent, DialogActions, List, ListItem, ListItemButton, ListItemText, ListItemAvatar,
  MenuItem, Select, FormControl, FormControlLabel, Checkbox, InputLabel, alpha, useTheme,
  Tooltip, Switch,
} from '@mui/material';
import {
  Search, QrCode, Phone, CreditCard, HealthAndSafety, CheckCircle,
  ContentCopy, Download, Refresh, Person, Badge, PersonAdd, Edit,
  AlternateEmail, Close, Save, CloudDone, CloudOff,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import abhaService from '../../services/abhaService';
import hipService from '../../services/hipService';
import api from '../../services/api';
import ScanAndShare from './ScanAndShare';
import PatientCheckIn from './PatientCheckIn';
import AbhaAccountActions from './AbhaAccountActions';
import { PageHeader } from '../../components/ui';
import { useOtpTimer } from '../../hooks/useOtpTimer';
import { useInlineNotice } from '../../hooks/useInlineNotice';
import { getAbhaErrorMessage } from './abhaErrors';

// ABDM ABHA Address policy (CRT_ABHA_112): 8-18 chars, at most one dot and one
// underscore, neither at the start/end, otherwise alphanumeric.
const ABHA_ADDRESS_RULES = [
  'Between 8 and 18 characters',
  'Letters and numbers allowed',
  'At most one dot (.) and one underscore (_)',
  'Dot/underscore cannot be at the start or end',
];

function validateAbhaAddress(addr: string): string | null {
  if (!addr) return null;
  if (addr.length < 8) return 'Minimum 8 characters required';
  if (addr.length > 18) return 'Maximum 18 characters allowed';
  if (!/^[a-zA-Z0-9._]+$/.test(addr)) return 'Only letters, numbers, one dot (.) and one underscore (_) are allowed';
  if (/^[._]/.test(addr) || /[._]$/.test(addr)) return 'Dot/underscore cannot be at the beginning or end';
  if ((addr.match(/\./g) || []).length > 1) return 'At most one dot (.) is allowed';
  if ((addr.match(/_/g) || []).length > 1) return 'At most one underscore (_) is allowed';
  return null;
}

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

  // Auto-share: when ON, completed visits / discharges / generated PDFs for
  // ABHA-linked patients are automatically registered as ABDM care contexts.
  const autoShareEnabled = !!hospital?.abdmAutoShare;
  const [autoShareSaving, setAutoShareSaving] = useState(false);

  const handleToggleAutoShare = async (next: boolean) => {
    if (!hospitalId) return;
    setAutoShareSaving(true);
    try {
      await api.put(`/api/v1/hospitals/${hospitalId}`, { abdmAutoShare: next });
      await loadHospital();
      pageNotice.notify(
        'success',
        next
          ? 'Auto-share ON — completed visits, discharges and generated PDFs will link to ABDM automatically.'
          : 'Auto-share OFF — link care contexts manually from each patient’s profile.',
      );
    } catch (e: any) {
      pageNotice.notify('error', getAbhaErrorMessage(e, 'Could not update the auto-share setting. Please try again.'));
    } finally {
      setAutoShareSaving(false);
    }
  };

  const handleHipRegister = async () => {
    if (!hasHipId) {
      pageNotice.notify('error', 'No HIP ID configured for this hospital. An admin needs to set it up first.');
      return;
    }
    if (abdmRegistered &&
      !window.confirm(`This hospital is already registered with ABDM${abdmRegisteredAt ? ` (since ${abdmRegisteredAt})` : ''}.\n\nRe-register now? Use this only if ABDM credentials changed.`)) {
      return;
    }
    setHipRegistering(true);
    try {
      const res = await hipService.registerHipService() as any;
      pageNotice.notify('success', res?.data?.message || 'HIP service registered with ABDM');
      // Best-effort HIU registration if a HIU id is configured. If it fails
      // we surface a non-blocking warning rather than rolling back the HIP.
      if (hasHiuId) {
        try { await hipService.registerHiuService(); }
        catch (e: any) {
          pageNotice.notify('warning', getAbhaErrorMessage(e, 'HIP registered, but HIU registration failed.'));
        }
      }
      await loadHospital();
    } catch (err: any) {
      pageNotice.notify('error', getAbhaErrorMessage(err, 'We couldn’t register this facility with ABDM. Please verify the HIP configuration and try again.'));
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
  // When a single mobile/Aadhaar is linked to multiple ABHAs, the OTP verify
  // response returns an `accounts[]` list. We hold it here so the user can
  // pick which ABHA to proceed with instead of silently taking the first.
  const [accountChoices, setAccountChoices] = useState<any[] | null>(null);
  const [accountTxnId, setAccountTxnId] = useState('');
  // Short-lived transfer token from login/verify, required as T-token when
  // selecting one of several ABHA accounts via login/verify/user.
  const [accountTransferToken, setAccountTransferToken] = useState('');
  // Mobile search returns the masked list of every ABHA linked to that number
  // (ABDM find-abha "search-abha"). When more than one is linked, we let the
  // operator pick which ABHA to receive the OTP for BEFORE sending it, instead
  // of silently defaulting to the first account.
  const [mobileAbhaChoices, setMobileAbhaChoices] = useState<any[] | null>(null);
  const [mobileSearchTxnId, setMobileSearchTxnId] = useState('');

  // Profile update state
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [profileUpdates, setProfileUpdates] = useState<Record<string, string>>({});

  // Aadhaar consent state — official NHA "Creating a nudge" consent language.
  // Declaration 1 (Aadhaar auth) + the two attestations are required to proceed;
  // the healthcare-consent declarations (3/4/5) are pre-checked per NHA guidance.
  const [consents, setConsents] = useState({
    aadhaarAuth: false,
    otherDocument: false,
    linkRecords: true,
    shareRecords: true,
    anonymized: true,
    workerConfirmed: false,
    beneficiaryConfirmed: false,
  });
  const consentAccepted =
    consents.aadhaarAuth && consents.workerConfirmed && consents.beneficiaryConfirmed;

  const workerName =
    userData?.name ||
    [userData?.firstName, userData?.lastName].filter(Boolean).join(' ') ||
    userData?.username ||
    'healthcare worker';

  // OTP resend timers (ABDM: max 2 resends, 60s cooldown) — one per OTP flow.
  const enrolTimer = useOtpTimer();
  const verifyTimer = useOtpTimer();

  // Inline, user-facing status messages (shown as Alerts on the relevant flow
  // instead of top-right toasts) — covers success/info/warning/error.
  const pageNotice = useInlineNotice();
  const createNotice = useInlineNotice();
  const verifyNotice = useInlineNotice();
  const profileNotice = useInlineNotice();
  // Profile-card actions (download/QR/link/copy) render inside whichever tab is
  // active, so their status messages go to that tab's notice.
  const activeNotice = tabValue === 1 ? verifyNotice : createNotice;

  // Live validation error for a user-typed custom ABHA address.
  const customAbhaError = validateAbhaAddress(customAbhaAddress.trim());

  // Patient linking state (from PatientList navigation)
  const linkedPatientId = routeState?.patientId;
  const linkedPatientName = routeState?.patientName;

  const steps = enrollMethod === 'aadhaar' ? AADHAAR_STEPS : DL_STEPS;

  const resetFlow = () => {
    setActiveStep(0); setTxnId(''); setOtp(''); setMobile(''); setAadhaar('');
    setCreatedAbha(null); setXToken(''); setCardImageUrl(null);
    setAccountChoices(null); setAccountTxnId(''); setAccountTransferToken('');
    setMobileAbhaChoices(null); setMobileSearchTxnId('');
    setAbhaAddressSuggestions([]); setSelectedAbhaAddress(''); setCustomAbhaAddress('');
    setDlForm({ dlNumber: '', firstName: '', middleName: '', lastName: '', dob: '', gender: '', state: '', district: '', pinCode: '' });
    setRequiresMobileVerify(false); setMobileVerifyOtp(''); setMobileVerifySent(false);
    setConsents({ aadhaarAuth: false, otherDocument: false, linkRecords: true, shareRecords: true, anonymized: true, workerConfirmed: false, beneficiaryConfirmed: false });
    enrolTimer.reset(); verifyTimer.reset();
    createNotice.clear();
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // AADHAAR OTP ENROLLMENT
  // ═══════════════════════════════════════════════════════════════════════════

  const handleGenerateAadhaarOtp = async () => {
    setLoading(true);
    createNotice.clear();
    try {
      const res: any = await abhaService.generateAadhaarOtp(aadhaar);
      const txn = res?.data?.txnId || res?.txnId;
      if (!txn) throw new Error('No txnId received');
      setTxnId(txn);
      setActiveStep(1);
      enrolTimer.startInitial();
      createNotice.notify('success', res?.data?.message || 'OTP sent to Aadhaar-linked mobile');
    } catch (e: any) { createNotice.notify('error', getAbhaErrorMessage(e, 'We couldn’t send the OTP. Please check the Aadhaar number and try again.')); }
    finally { setLoading(false); }
  };

  // Resend for the enrollment OTP step (Aadhaar or DL). Gated by the 60s
  // cooldown + 2-resend limit per ABDM spec (CRT_ABHA_106).
  const handleResendEnrolOtp = async () => {
    if (!enrolTimer.canResend) return;
    setLoading(true);
    try {
      if (enrollMethod === 'aadhaar') {
        const res: any = await abhaService.resendAadhaarOtp(txnId, aadhaar);
        setTxnId(res?.data?.txnId || res?.txnId || txnId);
      } else {
        const res: any = await abhaService.dlSendMobileOtp(mobile);
        setTxnId(res?.data?.txnId || res?.txnId || txnId);
      }
      enrolTimer.registerResend();
      createNotice.notify('success', 'OTP resent');
    } catch (e: any) { createNotice.notify('error', getAbhaErrorMessage(e, 'We couldn’t resend the OTP. Please try again.')); }
    finally { setLoading(false); }
  };

  const handleEnrolByAadhaar = async () => {
    setLoading(true);
    createNotice.clear();
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
        createNotice.notify('success', 'Existing ABHA account found — address already set');
      } else {
        createNotice.notify('success', 'ABHA created successfully!');
      }
      setActiveStep(2);
      fetchAbhaCard(token);
    } catch (e: any) { createNotice.notify('error', getAbhaErrorMessage(e, 'The OTP could not be verified. Please re-enter it or use “Resend OTP”.')); }
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
      createNotice.notify('success', 'OTP sent to mobile');
    } catch (e: any) { createNotice.notify('error', getAbhaErrorMessage(e, 'We couldn’t send the OTP to that mobile number. Please try again.')); }
    finally { setLoading(false); }
  };

  const handleVerifyMobileOtp = async () => {
    setLoading(true);
    try {
      await abhaService.verifyMobileOtp(txnId, mobileVerifyOtp);
      setRequiresMobileVerify(false);
      createNotice.notify('success', 'Mobile verified successfully');
    } catch (e: any) { createNotice.notify('error', getAbhaErrorMessage(e, 'The OTP you entered is incorrect. Please check it and try again.')); }
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
      enrolTimer.startInitial();
      createNotice.notify('success', 'OTP sent to mobile');
    } catch (e: any) { createNotice.notify('error', getAbhaErrorMessage(e, 'We couldn’t send the OTP. Please check the mobile number and try again.')); }
    finally { setLoading(false); }
  };

  const handleDlVerifyMobileOtp = async () => {
    setLoading(true);
    try {
      const res: any = await abhaService.dlVerifyMobileOtp(txnId, otp);
      setTxnId(res?.data?.txnId || res?.txnId || txnId);
      setActiveStep(2);
      createNotice.notify('success', 'Mobile verified — enter DL details');
    } catch (e: any) { createNotice.notify('error', getAbhaErrorMessage(e, 'The OTP you entered is incorrect. Please re-enter it or use “Resend”.')); }
    finally { setLoading(false); }
  };

  const handleEnrolByDL = async () => {
    if (!dlForm.dlNumber || !dlForm.firstName || !dlForm.lastName || !dlForm.dob || !dlForm.gender) {
      createNotice.notify('error', 'Please fill in all required Driving License fields (number, name, date of birth and gender).');
      return;
    }
    setLoading(true);
    createNotice.clear();
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
      createNotice.notify('success', 'ABHA created via Driving License!');
    } catch (e: any) { createNotice.notify('error', getAbhaErrorMessage(e, 'We couldn’t create the ABHA from these Driving License details. Please check them and try again.')); }
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
    } catch (e: any) { createNotice.notify('error', getAbhaErrorMessage(e, 'We couldn’t load address suggestions. You can still type a custom ABHA address below.')); }
    finally { setLoading(false); }
  };

  const handleCreateAbhaAddress = async () => {
    const address = (selectedAbhaAddress || customAbhaAddress).trim();
    if (!address) { createNotice.notify('error', 'Please enter or select an ABHA address.'); return; }
    // Only validate a user-typed custom address against the policy; system
    // suggestions are already policy-compliant.
    if (!selectedAbhaAddress) {
      const err = validateAbhaAddress(address);
      if (err) { createNotice.notify('error', err); return; }
    }
    setLoading(true);
    createNotice.clear();
    try {
      const res: any = await abhaService.createAbhaAddress(txnId, address);
      const data = res?.data || res;
      setCreatedAbha((prev: any) => ({
        ...prev,
        preferredAbhaAddress: data?.preferredAbhaAddress || address,
        abhaAddress: data?.preferredAbhaAddress || address,
      }));
      setActiveStep(abhaAddressStepIndex + 1);
      createNotice.notify('success', `ABHA address created: ${data?.preferredAbhaAddress || address}`);
    } catch (e: any) {
      const msg = e?.response?.data?.message || '';
      // ABDM returns a conflict when the chosen address is taken (CRT_ABHA_112).
      if (e?.response?.status === 409 || /exist|already|taken|use/i.test(msg)) {
        createNotice.notify('error', 'That ABHA address is already taken. Please choose one of the suggestions or try another.');
        if (abhaAddressSuggestions.length === 0) handleFetchAbhaAddressSuggestions();
      } else {
        createNotice.notify('error', getAbhaErrorMessage(e, 'We couldn’t create that ABHA address. Please try another.'));
      }
    }
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

  // Send the login OTP for one specific ABHA (by its search index) linked to a
  // mobile number. Does NOT manage `loading` — the caller owns that so this can
  // be reused from both the initial request and the chooser click. Stamps the
  // search txnId + index onto `searchResult` so the Resend handler keeps working.
  const requestMobileOtp = async (index: any, searchTxn: string, chosen?: any) => {
    const res: any = await abhaService.loginRequestOtp({
      scope: ['abha-login', 'search-abha', 'mobile-verify'],
      loginHint: 'index',
      loginId: String(index),
      otpSystem: 'abdm',
      txnId: searchTxn,
    });
    const txn = res?.data?.txnId || res?.txnId;
    if (txn) setTxnId(txn);
    setSearchResult({
      ABHANumber: chosen?.ABHANumber,
      name: chosen?.name,
      gender: chosen?.gender,
      _searchTxnId: searchTxn,
      _index: index,
      _source: 'mobile-search',
    });
    setMobileAbhaChoices(null);
    setMobileSearchTxnId(searchTxn);
    verifyTimer.startInitial();
    verifyNotice.notify('success', 'OTP sent to mobile');
  };

  // Operator picked one ABHA from the multi-account list linked to a mobile.
  const handlePickMobileAbha = async (choice: any) => {
    setLoading(true);
    verifyNotice.clear();
    try {
      await requestMobileOtp(choice.index, mobileSearchTxnId, choice);
    } catch (e: any) {
      verifyNotice.notify('error', getAbhaErrorMessage(e, 'We couldn’t send the OTP for that ABHA. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyRequestOtp = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    verifyNotice.clear();
    setSearchResult(null);
    setVerifiedProfile(null);
    setMobileAbhaChoices(null);
    try {
      // Step 1: Background search for preview (non-blocking for ABHA number & mobile)
      if (verifyMethod === 'mobile') {
        try {
          const searchRes: any = await abhaService.findAbhaByMobile(searchQuery);
          const raw = searchRes?.data || searchRes;
          const normalized = normalizeSearchResult(raw, 'mobile');
          const abhaList: any[] = normalized?._abhaList || [];
          const searchTxn: string | undefined = normalized?._searchTxnId;

          if (searchTxn && abhaList.length > 1) {
            // Multiple ABHAs linked to this mobile — let the operator choose
            // which one to receive the OTP for BEFORE sending it.
            setMobileAbhaChoices(abhaList);
            setMobileSearchTxnId(searchTxn);
            verifyNotice.notify('info', `This mobile is linked to ${abhaList.length} ABHA accounts. Select the one you want to verify — an OTP will then be sent.`);
            return;
          }
          if (searchTxn && abhaList.length === 1) {
            // Exactly one ABHA — send its OTP directly.
            await requestMobileOtp(abhaList[0].index, searchTxn, abhaList[0]);
            return;
          }
          // No searchable ABHA list — fall through to direct mobile OTP below.
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
        verifyTimer.startInitial();
        verifyNotice.notify('success', 'OTP sent for ABHA address verification');
      } else {
        const loginHint = verifyMethod === 'mobile' ? 'mobile' : verifyMethod === 'aadhaar' ? 'aadhaar' : 'abha-number';
        const otpSystem = verifyMethod === 'aadhaar' ? 'aadhaar' : 'abdm';
        const scope: string[] = ['abha-login', verifyMethod === 'aadhaar' ? 'aadhaar-verify' : 'mobile-verify'];
        const res: any = await abhaService.loginRequestOtp({ scope, loginHint, loginId: searchQuery, otpSystem });
        const txn = res?.data?.txnId || res?.txnId;
        if (txn) setTxnId(txn);
        verifyTimer.startInitial();
        verifyNotice.notify('success', 'Verification OTP sent');
      }
    } catch (e: any) { verifyNotice.notify('error', getAbhaErrorMessage(e, 'We couldn’t send the verification OTP. Please check the details and try again.')); }
    finally { setLoading(false); }
  };

  // Resend for the Verify/Search OTP step. Gated by the 60s cooldown + 2-resend
  // limit per ABDM spec (VRFY_ABHA_305 / _405).
  const handleVerifyResendOtp = async () => {
    if (!verifyTimer.canResend) return;
    setLoading(true);
    try {
      if (verifyMethod === 'abha-address') {
        const res: any = await abhaService.phrRequestOtp(searchQuery, ['abha-address-login', 'mobile-verify'], 'abdm');
        const txn = res?.data?.txnId || res?.txnId; if (txn) setTxnId(txn);
      } else if (verifyMethod === 'mobile' && searchResult?._searchTxnId && searchResult?._index != null) {
        const res: any = await abhaService.loginRequestOtp({
          scope: ['abha-login', 'search-abha', 'mobile-verify'],
          loginHint: 'index', loginId: String(searchResult._index), otpSystem: 'abdm', txnId: searchResult._searchTxnId,
        });
        const txn = res?.data?.txnId || res?.txnId; if (txn) setTxnId(txn);
      } else {
        const loginHint = verifyMethod === 'mobile' ? 'mobile' : verifyMethod === 'aadhaar' ? 'aadhaar' : 'abha-number';
        const otpSystem = verifyMethod === 'aadhaar' ? 'aadhaar' : 'abdm';
        const scope: string[] = ['abha-login', verifyMethod === 'aadhaar' ? 'aadhaar-verify' : 'mobile-verify'];
        const res: any = await abhaService.loginRequestOtp({ scope, loginHint, loginId: searchQuery, otpSystem });
        const txn = res?.data?.txnId || res?.txnId; if (txn) setTxnId(txn);
      }
      verifyTimer.registerResend();
      verifyNotice.notify('success', 'OTP resent');
    } catch (e: any) { verifyNotice.notify('error', getAbhaErrorMessage(e, 'We couldn’t resend the OTP. Please try again.')); }
    finally { setLoading(false); }
  };

  // Complete verification for a specific ABHA number selected from a
  // multi-account result. Shared by the auto-single-account path and the
  // user-driven selector.
  const proceedWithAccount = async (abhaNumber?: string, verifyTxnId?: string, transferToken?: string) => {
    if (!abhaNumber) {
      verifyNotice.notify('error', 'That account is missing an ABHA number. Please pick another.');
      return;
    }
    setLoading(true);
    try {
      const userRes: any = await abhaService.loginVerifyUser(
        abhaNumber,
        verifyTxnId || accountTxnId || txnId,
        transferToken || accountTransferToken,
      );
      const userData = userRes?.data || userRes;
      const userToken = userData?.token;
      if (userToken) {
        setXToken(userToken);
        setAccountChoices(null);
        setAccountTxnId('');
        setAccountTransferToken('');
        verifyNotice.notify('success', 'ABHA verified successfully!');
        fetchProfile(userToken);
      } else {
        verifyNotice.notify('error', 'We verified the OTP but couldn’t retrieve the ABHA profile. Please try again.');
      }
    } catch (e: any) {
      verifyNotice.notify('error', getAbhaErrorMessage(e, 'We couldn’t open that ABHA account. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    verifyNotice.clear();
    setAccountChoices(null); setAccountTransferToken('');
    setMobileAbhaChoices(null);
    try {
      if (verifyMethod === 'abha-address') {
        const scope = ['abha-address-login', 'mobile-verify'];
        const res: any = await abhaService.phrVerifyOtp(scope, txnId, otp);
        const data = res?.data || res;
        const token = data?.tokens?.token;
        if (token) setXToken(token);
        setSearchResult(data);
        verifyNotice.notify('success', 'ABHA address verified!');
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

        // IMPORTANT: mobile/Aadhaar login returns BOTH a short-lived transfer
        // `token` AND an `accounts[]` list. The transfer token is NOT a usable
        // session — it must be passed as T-token to login/verify/user for the
        // chosen ABHA. So we must inspect `accounts` BEFORE `token`, otherwise
        // we'd wrongly treat the transfer token as a session and skip account
        // selection entirely.
        if (data?.accounts?.length) {
          const verifyTxnId = data.txnId || txnId;
          const transferToken = data.token || '';
          setAccountTransferToken(transferToken);
          if (data.accounts.length === 1) {
            // Exactly one ABHA on this mobile/Aadhaar — proceed directly.
            await proceedWithAccount(data.accounts[0]?.ABHANumber, verifyTxnId, transferToken);
          } else {
            // Multiple ABHAs linked to this identifier — let the user choose.
            setAccountChoices(data.accounts);
            setAccountTxnId(verifyTxnId);
            verifyNotice.notify('info', `This number has ${data.accounts.length} ABHA accounts. Choose which one to proceed with.`);
          }
        } else if (data?.token) {
          // Direct login (e.g. ABHA-number + Aadhaar OTP) returns a usable session token.
          setXToken(data.token);
          setSearchResult(data);
          verifyNotice.notify('success', 'ABHA verified successfully!');
          fetchProfile(data.token);
        } else {
          verifyNotice.notify('success', 'ABHA verified!');
          setSearchResult(data);
        }
      }
    } catch (e: any) { verifyNotice.notify('error', getAbhaErrorMessage(e, 'The OTP you entered is incorrect. Please re-enter it or use “Resend OTP”.')); }
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
    profileNotice.clear();
    try {
      const res: any = await abhaService.updateProfile(xToken, profileUpdates);
      setVerifiedProfile((prev: any) => ({ ...prev, ...(res?.data || res) }));
      setShowProfileDialog(false);
      setProfileUpdates({});
      activeNotice.notify('success', 'Profile updated');
    } catch (e: any) { profileNotice.notify('error', getAbhaErrorMessage(e, 'We couldn’t update the profile. Please try again.')); }
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
    if (!xToken) { activeNotice.notify('error', 'Please verify ABHA first to download the card.'); return; }
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
    } catch (e: any) { activeNotice.notify('error', getAbhaErrorMessage(e, 'We couldn’t download the ABHA card. Please try again.')); }
  };

  const handleViewQrCode = async () => {
    if (!xToken) { activeNotice.notify('error', 'Please verify ABHA first.'); return; }
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
        activeNotice.notify('info', 'QR code format not supported for display.');
      }
    } catch (e: any) { activeNotice.notify('error', getAbhaErrorMessage(e, 'We couldn’t load the QR code. Please try again.')); }
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
      activeNotice.notify('success', verified ? 'ABHA verified and linked to patient' : 'ABHA linked to patient successfully');
    } catch (e: any) { activeNotice.notify('error', getAbhaErrorMessage(e, 'We couldn’t link this ABHA to the patient. Please try again.')); }
    finally { setLoading(false); }
  };

  const handleCopy = (text: string) => { navigator.clipboard.writeText(text); activeNotice.notify('success', 'Copied to clipboard'); };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const renderProfileCard = (profile: any, showActions = true) => {
    if (!profile) return null;
    const abhaNum = profile.ABHANumber || profile.abhaNumber;
    // A single ABHA account can have multiple ABHA addresses. The ABDM profile
    // returns them in `phrAddress[]`; the preferred one is `preferredAbhaAddress`.
    const preferredAddr = profile.preferredAbhaAddress || profile.abhaAddress;
    const phrList: string[] = Array.isArray(profile.phrAddress) ? profile.phrAddress : [];
    const allAddresses: string[] = Array.from(new Set([preferredAddr, ...phrList].filter(Boolean)));
    const abhaAddr = allAddresses[0]; // preferred/first — used for linking & actions
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
            {allAddresses.length <= 1 ? (
              <Grid item xs={12} sm={6}><InfoField label="ABHA Address" value={abhaAddr} copyable /></Grid>
            ) : (
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  ABHA Addresses ({allAddresses.length})
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
                  {allAddresses.map((addr) => (
                    <Box key={addr} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Typography variant="body1" fontWeight={600}>{addr}</Typography>
                      {addr === preferredAddr && (
                        <Chip label="Primary" size="small" color="primary" variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} />
                      )}
                      <IconButton size="small" onClick={() => handleCopy(addr)} sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}>
                        <ContentCopy sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              </Grid>
            )}
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
                  profileNotice.clear();
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
        error={!!customAbhaError}
        helperText={customAbhaError || 'Follow the ABHA address rules below.'}
        InputProps={{
          startAdornment: <InputAdornment position="start"><AlternateEmail /></InputAdornment>,
          endAdornment: <InputAdornment position="end">@abdm</InputAdornment>,
        }}
        sx={{ mb: 2 }}
      />

      <Box sx={{ mb: 3, pl: 0.5 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
          ABHA Address rules
        </Typography>
        {ABHA_ADDRESS_RULES.map((rule) => (
          <Typography key={rule} variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            • {rule}
          </Typography>
        ))}
      </Box>

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button variant="contained" onClick={handleCreateAbhaAddress}
          disabled={loading || (!selectedAbhaAddress && (!customAbhaAddress.trim() || !!customAbhaError))}
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

                {/* Auto-share toggle — only meaningful once the facility is
                    registered with ABDM. Turns automatic care-context linking
                    on/off for the whole hospital. */}
                {abdmRegistered && (
                  <Tooltip
                    title="When ON, completed visits, discharges and generated PDFs for ABHA-linked patients are automatically linked to ABDM as care contexts (all HI types). When OFF, staff link them manually from each patient’s profile."
                    arrow
                  >
                    <FormControlLabel
                      sx={{ ml: 0.5, mr: 0 }}
                      control={
                        <Switch
                          size="small"
                          checked={autoShareEnabled}
                          disabled={autoShareSaving}
                          onChange={(e) => handleToggleAutoShare(e.target.checked)}
                        />
                      }
                      label={
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>
                          {autoShareSaving ? 'Saving…' : 'Auto-share to ABDM'}
                        </Typography>
                      }
                    />
                  </Tooltip>
                )}
              </>
            )}
          </>
        }
      />

      {pageNotice.notice && (
        <Alert severity={pageNotice.notice.severity} onClose={() => pageNotice.clear()} sx={{ mb: 2 }}>
          {pageNotice.notice.message}
        </Alert>
      )}

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

            {createNotice.notice && (
              <Alert severity={createNotice.notice.severity} onClose={() => createNotice.clear()} sx={{ mb: 3 }}>
                {createNotice.notice.message}
              </Alert>
            )}

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
                    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.04), borderColor: alpha(theme.palette.info.main, 0.3) }}>
                      <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700 }}>
                        Consent Language — I hereby declare that:
                      </Typography>

                      {/* Declaration 1 — Aadhaar authentication (required) */}
                      <FormControlLabel
                        sx={{ alignItems: 'flex-start', mb: 1, ml: 0, mr: 0 }}
                        control={<Checkbox size="small" sx={{ pt: 0.25 }} checked={consents.aadhaarAuth} onChange={(e) => setConsents(c => ({ ...c, aadhaarAuth: e.target.checked }))} color="primary" />}
                        label={<Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                          I am voluntarily sharing my Aadhaar Number / Virtual ID issued by the Unique Identification Authority of India (<b>&ldquo;UIDAI&rdquo;</b>), and my demographic information for the purpose of creating an Ayushman Bharat Health Account number (<b>&ldquo;ABHA number&rdquo;</b>) and Ayushman Bharat Health Account address (<b>&ldquo;ABHA Address&rdquo;</b>). I authorize NHA to use my Aadhaar number / Virtual ID for performing Aadhaar based authentication with UIDAI as per the provisions of the Aadhaar (Targeted Delivery of Financial and other Subsidies, Benefits and Services) Act, 2016 for the aforesaid purpose. I understand that UIDAI will share my e-KYC details, or response of &ldquo;Yes&rdquo; with NHA upon successful authentication.
                        </Typography>}
                      />

                      {/* Declaration 2 — alternative (non-Aadhaar) ID path (informational, no checkbox) */}
                      <Box sx={{ mb: 1, pl: '30px' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                          I intend to create an ABHA number and ABHA Address using a document other than Aadhaar.{' '}
                          <Box component="span" onClick={(ev) => { ev.preventDefault(); setEnrollMethod('dl'); resetFlow(); }} sx={{ color: 'primary.main', fontWeight: 600, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>Click here to proceed further</Box>.
                        </Typography>
                      </Box>

                      {/* Declaration 3 — legacy record linking */}
                      <FormControlLabel
                        sx={{ alignItems: 'flex-start', mb: 1, ml: 0, mr: 0 }}
                        control={<Checkbox size="small" sx={{ pt: 0.25 }} checked={consents.linkRecords} onChange={(e) => setConsents(c => ({ ...c, linkRecords: e.target.checked }))} color="primary" />}
                        label={<Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                          I consent to usage of my ABHA address and ABHA number for linking of my legacy (past) government health records and those which will be generated during this encounter.
                        </Typography>}
                      />

                      {/* Declaration 4 — sharing with provider */}
                      <FormControlLabel
                        sx={{ alignItems: 'flex-start', mb: 1, ml: 0, mr: 0 }}
                        control={<Checkbox size="small" sx={{ pt: 0.25 }} checked={consents.shareRecords} onChange={(e) => setConsents(c => ({ ...c, shareRecords: e.target.checked }))} color="primary" />}
                        label={<Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                          I authorize the sharing of all my health records with healthcare provider(s) for the purpose of providing healthcare services to me during this encounter.
                        </Typography>}
                      />

                      {/* Declaration 5 — anonymized public-health use */}
                      <FormControlLabel
                        sx={{ alignItems: 'flex-start', mb: 0.5, ml: 0, mr: 0 }}
                        control={<Checkbox size="small" sx={{ pt: 0.25 }} checked={consents.anonymized} onChange={(e) => setConsents(c => ({ ...c, anonymized: e.target.checked }))} color="primary" />}
                        label={<Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                          I consent to the anonymization and subsequent use of my government health records for public health purposes.
                        </Typography>}
                      />

                      <Divider sx={{ my: 1.5 }} />

                      {/* Healthcare-worker attestation (required) */}
                      <FormControlLabel
                        sx={{ alignItems: 'flex-start', mb: 1, ml: 0, mr: 0 }}
                        control={<Checkbox size="small" sx={{ pt: 0.25 }} checked={consents.workerConfirmed} onChange={(e) => setConsents(c => ({ ...c, workerConfirmed: e.target.checked }))} color="primary" />}
                        label={<Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                          I, <b>{workerName}</b>, confirm that I have duly informed and explained the beneficiary of the contents of consent for the aforementioned purposes.
                        </Typography>}
                      />

                      {/* Beneficiary attestation (required) */}
                      <FormControlLabel
                        sx={{ alignItems: 'flex-start', ml: 0, mr: 0 }}
                        control={<Checkbox size="small" sx={{ pt: 0.25 }} checked={consents.beneficiaryConfirmed} onChange={(e) => setConsents(c => ({ ...c, beneficiaryConfirmed: e.target.checked }))} color="primary" />}
                        label={<Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                          I, <b>{linkedPatientName || 'the beneficiary'}</b>, have been explained about the consent as stated above and hereby provide my consent for the aforementioned purposes.
                        </Typography>}
                      />
                    </Paper>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontStyle: 'italic' }}>
                      Please read the consent aloud to the beneficiary in their local language before proceeding.
                    </Typography>
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
                    <Button variant="outlined" onClick={handleResendEnrolOtp}
                      disabled={loading || !enrolTimer.canResend}
                      startIcon={<Refresh />}>
                      {enrolTimer.resendsExhausted
                        ? 'Resend limit reached'
                        : enrolTimer.secondsLeft > 0
                          ? `Resend in ${enrolTimer.secondsLeft}s`
                          : 'Resend OTP'}
                    </Button>
                  </Box>
                  {!enrolTimer.resendsExhausted && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Didn't get the OTP? You can resend up to {enrolTimer.maxResends} times, 60s apart.
                    </Typography>
                  )}
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
                onChange={(_, v) => { if (v) { setVerifyMethod(v); setSearchQuery(''); setSearchResult(null); setVerifiedProfile(null); setTxnId(''); setOtp(''); setAccountChoices(null); setAccountTxnId(''); setAccountTransferToken(''); setMobileAbhaChoices(null); setMobileSearchTxnId(''); verifyTimer.reset(); verifyNotice.clear(); } }}>
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
                <Button variant="outlined" size="small" onClick={() => { setTxnId(''); setOtp(''); setSearchResult(null); setVerifiedProfile(null); setAccountChoices(null); setAccountTxnId(''); setAccountTransferToken(''); setMobileAbhaChoices(null); setMobileSearchTxnId(''); verifyTimer.reset(); verifyNotice.clear(); }}
                  startIcon={<Refresh />}>
                  Reset
                </Button>
              )}
            </Box>

            {verifyNotice.notice && (
              <Alert severity={verifyNotice.notice.severity} onClose={() => verifyNotice.clear()} sx={{ mb: 3 }}>
                {verifyNotice.notice.message}
              </Alert>
            )}

            {mobileAbhaChoices && mobileAbhaChoices.length > 1 && !txnId && !verifiedProfile && (
              <Card sx={{ mb: 3, borderColor: 'primary.main' }} variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    {mobileAbhaChoices.length} ABHA accounts linked to this mobile
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Select the account you want to verify. An OTP will be sent to the registered mobile for the chosen ABHA.
                  </Typography>
                  <List dense disablePadding>
                    {mobileAbhaChoices.map((a: any, i: number) => {
                      const abhaNum = a.ABHANumber || a.abhaNumber;
                      const label = a.name || `${a.firstName || ''} ${a.lastName || ''}`.trim() || 'ABHA Account';
                      const gender = a.gender === 'M' ? 'Male' : a.gender === 'F' ? 'Female' : a.gender;
                      return (
                        <ListItemButton
                          key={abhaNum || i} divider disabled={loading}
                          onClick={() => handlePickMobileAbha(a)}
                          sx={{ borderRadius: 1, mb: 1, border: '1px solid', borderColor: 'divider' }}
                        >
                          <ListItemAvatar><Avatar><Person /></Avatar></ListItemAvatar>
                          <ListItemText
                            primary={label}
                            secondary={
                              <>
                                {abhaNum || '—'}
                                {gender ? ` · ${gender}` : ''}
                              </>
                            }
                          />
                          {loading ? <CircularProgress size={18} /> : <Phone color="action" />}
                        </ListItemButton>
                      );
                    })}
                  </List>
                </CardContent>
              </Card>
            )}

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
                <Button variant="outlined" onClick={handleVerifyResendOtp}
                  disabled={loading || !verifyTimer.canResend} sx={{ minWidth: 140 }}
                  startIcon={<Refresh />}>
                  {verifyTimer.resendsExhausted
                    ? 'Limit reached'
                    : verifyTimer.secondsLeft > 0
                      ? `Resend in ${verifyTimer.secondsLeft}s`
                      : 'Resend OTP'}
                </Button>
              </Box>
            )}

            {accountChoices && accountChoices.length > 1 && !verifiedProfile && (
              <Card sx={{ mb: 3, borderColor: 'primary.main' }} variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Multiple ABHA accounts found ({accountChoices.length})
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    This number is linked to more than one ABHA. Select the account you want to proceed with.
                  </Typography>
                  <List dense disablePadding>
                    {accountChoices.map((a: any, i: number) => {
                      const abhaNum = a.ABHANumber || a.abhaNumber;
                      const label = a.name || a.fullName || `${a.firstName || ''} ${a.lastName || ''}`.trim() || 'ABHA Account';
                      return (
                        <ListItemButton
                          key={abhaNum || i} divider disabled={loading}
                          onClick={() => proceedWithAccount(abhaNum, accountTxnId)}
                          sx={{ borderRadius: 1, mb: 1, border: '1px solid', borderColor: 'divider' }}
                        >
                          <ListItemAvatar>
                            {a.profilePhoto
                              ? <Avatar src={`data:image/jpeg;base64,${a.profilePhoto}`} />
                              : <Avatar><Person /></Avatar>}
                          </ListItemAvatar>
                          <ListItemText
                            primary={label}
                            secondary={
                              <>
                                {abhaNum || '—'}
                                {a.preferredAbhaAddress || a.abhaAddress ? ` · ${a.preferredAbhaAddress || a.abhaAddress}` : ''}
                                {a.status ? ` · ${a.status}` : ''}
                              </>
                            }
                          />
                          {loading ? <CircularProgress size={18} /> : <CheckCircle color="action" />}
                        </ListItemButton>
                      );
                    })}
                  </List>
                </CardContent>
              </Card>
            )}

            {searchResult && !verifiedProfile && !accountChoices && (
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
          {profileNotice.notice && (
            <Alert severity={profileNotice.notice.severity} onClose={() => profileNotice.clear()} sx={{ mb: 2 }}>
              {profileNotice.notice.message}
            </Alert>
          )}
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
                  if (file.size > 100 * 1024) { profileNotice.notify('error', 'Photo must be under 100KB.'); return; }
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

          {xToken && (
            <AbhaAccountActions
              xToken={xToken}
              abhaNumber={verifiedProfile?.ABHANumber || verifiedProfile?.abhaNumber || createdAbha?.ABHANumber}
              onDeleted={() => { setShowProfileDialog(false); resetFlow(); }}
            />
          )}
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
