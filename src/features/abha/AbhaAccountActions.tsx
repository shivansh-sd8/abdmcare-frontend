import React, { useState } from 'react';
import {
  Box, Typography, Button, TextField, Alert, Divider, Stack,
  ToggleButtonGroup, ToggleButton, CircularProgress,
} from '@mui/material';
import {
  Email, Fingerprint, PauseCircleOutline, DeleteForever,
} from '@mui/icons-material';
import abhaService from '../../services/abhaService';
import { getAbhaErrorMessage } from './abhaErrors';
import { useInlineNotice } from '../../hooks/useInlineNotice';

interface Props {
  /** Authenticated ABHA profile session token (from a completed verify flow). */
  xToken: string;
  /** ABHA number of the verified profile, for display/confirmation. */
  abhaNumber?: string;
  /** Called after the ABHA has been deleted so the parent can reset state. */
  onDeleted?: () => void;
}

/**
 * M1 (optional) ABHA account-management actions that operate on an already
 * authenticated profile session (X-token): send email verification link,
 * initiate Re-KYC, deactivate, and delete the ABHA. Each action is a
 * self-contained inline flow with its own OTP handling where required — all
 * ABDM scopes are encapsulated server-side.
 */
const AbhaAccountActions: React.FC<Props> = ({ xToken, abhaNumber, onDeleted }) => {
  const notice = useInlineNotice();
  const [busy, setBusy] = useState<string | null>(null);

  // Re-KYC method selector.
  const [reKycMethod, setReKycMethod] = useState<'aadhaar' | 'mobile'>('aadhaar');

  // Delete flow: request OTP → confirm with OTP.
  const [deleteTxnId, setDeleteTxnId] = useState<string | null>(null);
  const [deleteOtp, setDeleteOtp] = useState('');

  const handleVerifyEmail = async () => {
    setBusy('email');
    notice.clear();
    try {
      const res: any = await abhaService.requestEmailVerification(xToken);
      notice.notify('success', res?.data?.message || res?.message || 'Email verification link sent.');
    } catch (e: any) {
      notice.notify('error', getAbhaErrorMessage(e, 'We couldn’t send the email verification link. Please try again.'));
    } finally { setBusy(null); }
  };

  const handleReKyc = async () => {
    setBusy('rekyc');
    notice.clear();
    try {
      const res: any = await abhaService.requestReKyc(reKycMethod, xToken);
      const msg = res?.data?.message || res?.message
        || `Re-KYC OTP sent to your ${reKycMethod === 'aadhaar' ? 'Aadhaar-linked' : 'registered'} mobile. Complete the verification in your ABHA app.`;
      notice.notify('success', msg);
    } catch (e: any) {
      notice.notify('error', getAbhaErrorMessage(e, 'We couldn’t start Re-KYC. Please try again.'));
    } finally { setBusy(null); }
  };

  const handleDeactivate = async () => {
    if (!window.confirm('Deactivate this ABHA? The account will be suspended until it is reactivated.')) return;
    setBusy('deactivate');
    notice.clear();
    try {
      await abhaService.deactivateAbha(xToken, 'User requested deactivation');
      notice.notify('warning', 'ABHA deactivated. It can be reactivated later using the ABHA number and an OTP.');
    } catch (e: any) {
      notice.notify('error', getAbhaErrorMessage(e, 'We couldn’t deactivate this ABHA. Please try again.'));
    } finally { setBusy(null); }
  };

  const handleDeleteRequestOtp = async () => {
    setBusy('delete');
    notice.clear();
    try {
      const res: any = await abhaService.deleteAbhaRequestOtp(xToken);
      const txn = res?.data?.txnId || res?.txnId;
      setDeleteTxnId(txn || '');
      notice.notify('info', 'An OTP has been sent to the ABHA-linked mobile to confirm deletion.');
    } catch (e: any) {
      notice.notify('error', getAbhaErrorMessage(e, 'We couldn’t start ABHA deletion. Please try again.'));
    } finally { setBusy(null); }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTxnId || deleteOtp.length < 4) return;
    if (!window.confirm('Permanently delete this ABHA? This cannot be undone.')) return;
    setBusy('delete-confirm');
    notice.clear();
    try {
      await abhaService.deleteAbhaConfirm(deleteTxnId, deleteOtp, xToken);
      notice.notify('success', 'ABHA deleted successfully.');
      setDeleteTxnId(null);
      setDeleteOtp('');
      onDeleted?.();
    } catch (e: any) {
      notice.notify('error', getAbhaErrorMessage(e, 'The OTP is incorrect or expired. Please try again.'));
    } finally { setBusy(null); }
  };

  return (
    <Box>
      <Divider sx={{ my: 2 }}>
        <Typography variant="caption" color="text.secondary">Manage ABHA Account</Typography>
      </Divider>

      {notice.notice && (
        <Alert severity={notice.notice.severity} onClose={() => notice.clear()} sx={{ mb: 2 }}>
          {notice.notice.message}
        </Alert>
      )}

      <Stack spacing={2}>
        {/* Email verification */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined" size="small" startIcon={busy === 'email' ? <CircularProgress size={16} /> : <Email />}
            disabled={!!busy} onClick={handleVerifyEmail}
          >
            Verify Email
          </Button>
          <Typography variant="caption" color="text.secondary">
            Sends a verification link to your ABHA-registered email.
          </Typography>
        </Box>

        {/* Re-KYC */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <ToggleButtonGroup
            size="small" exclusive value={reKycMethod}
            onChange={(_, v) => v && setReKycMethod(v)}
          >
            <ToggleButton value="aadhaar">Aadhaar</ToggleButton>
            <ToggleButton value="mobile">Mobile</ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="outlined" size="small" startIcon={busy === 'rekyc' ? <CircularProgress size={16} /> : <Fingerprint />}
            disabled={!!busy} onClick={handleReKyc}
          >
            Start Re-KYC
          </Button>
          <Typography variant="caption" color="text.secondary">
            Re-verify KYC using an OTP on your {reKycMethod === 'aadhaar' ? 'Aadhaar-linked' : 'registered'} mobile.
          </Typography>
        </Box>

        {/* Deactivate */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined" size="small" color="warning"
            startIcon={busy === 'deactivate' ? <CircularProgress size={16} /> : <PauseCircleOutline />}
            disabled={!!busy} onClick={handleDeactivate}
          >
            Deactivate ABHA
          </Button>
          <Typography variant="caption" color="text.secondary">
            Temporarily suspend this ABHA. It can be reactivated later.
          </Typography>
        </Box>

        {/* Delete */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Button
              variant="outlined" size="small" color="error"
              startIcon={busy === 'delete' ? <CircularProgress size={16} /> : <DeleteForever />}
              disabled={!!busy || deleteTxnId !== null} onClick={handleDeleteRequestOtp}
            >
              Delete ABHA
            </Button>
            <Typography variant="caption" color="text.secondary">
              Permanently delete this ABHA{abhaNumber ? ` (${abhaNumber})` : ''}. This cannot be undone.
            </Typography>
          </Box>

          {deleteTxnId !== null && (
            <Box sx={{ display: 'flex', gap: 1.5, mt: 1.5, alignItems: 'center' }}>
              <TextField
                size="small" placeholder="Enter OTP" value={deleteOtp}
                onChange={(e) => setDeleteOtp(e.target.value.replace(/\D/g, ''))}
                inputProps={{ maxLength: 6 }} sx={{ maxWidth: 160 }}
              />
              <Button
                variant="contained" size="small" color="error"
                disabled={busy === 'delete-confirm' || deleteOtp.length < 4}
                onClick={handleDeleteConfirm}
              >
                {busy === 'delete-confirm' ? 'Deleting…' : 'Confirm Delete'}
              </Button>
              <Button size="small" onClick={() => { setDeleteTxnId(null); setDeleteOtp(''); }}>
                Cancel
              </Button>
            </Box>
          )}
        </Box>
      </Stack>
    </Box>
  );
};

export default AbhaAccountActions;
