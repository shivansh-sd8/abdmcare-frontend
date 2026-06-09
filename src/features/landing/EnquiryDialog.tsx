// Public "Request access" dialog used on the landing page.
//
// POSTs to the backend's `/api/v1/enquiry` endpoint, which forwards the
// submission to our internal mailbox via SMTP. Designed to share the visual
// language of the landing/login pages (light teal / cream).

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
  alpha,
} from '@mui/material';
import {
  ArrowForward,
  CheckCircle,
  Close,
  Email,
  Forum,
} from '@mui/icons-material';
import axios from 'axios';

const BRAND = {
  primary:    '#0F766E',
  primary600: '#0D9488',
  accent:     '#14B8A6',
  emerald:    '#10B981',
  ink:        '#0F172A',
  ink600:     '#334155',
  ink500:     '#475569',
  surface:    '#FFFFFF',
  hairline:   '#E2E8F0',
};

const ROLE_OPTIONS = [
  'Hospital Owner',
  'Administrator',
  'Doctor',
  'IT / Technology Lead',
  'Procurement',
  'Other',
];

interface EnquiryDialogProps {
  open: boolean;
  onClose: () => void;
  /** Where on the page the user opened the form from. Sent as `source`. */
  source?: string;
  /** Optional override for the heading copy. */
  title?: string;
  subtitle?: string;
}

const apiBase = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8082';

const EnquiryDialog: React.FC<EnquiryDialogProps> = ({
  open,
  onClose,
  source = 'landing',
  title = 'Request access',
  subtitle = 'Tell us a bit about your hospital and we will get back to you within one business day.',
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverMessage, setServerMessage] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    hospitalName: '',
    role: '',
    message: '',
    // Honeypot — bots fill it; humans can't see it (display:none).
    website: '',
  });

  // Reset state every time the dialog opens fresh.
  useEffect(() => {
    if (open) {
      setSubmitting(false);
      setSubmitted(false);
      setServerMessage('');
      setErrors({});
      setForm({
        name: '',
        email: '',
        phone: '',
        hospitalName: '',
        role: '',
        message: '',
        website: '',
      });
    }
  }, [open]);

  const update = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [k]: e.target.value }));
      if (errors[k]) setErrors((prev) => ({ ...prev, [k]: '' }));
    };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = 'Please share your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = 'Please enter a valid email address.';
    }
    if (form.message.trim().length < 10) {
      next.message = 'Tell us a bit more about what you need (at least 10 characters).';
    }
    if (form.phone && (form.phone.trim().length < 6 || form.phone.trim().length > 20)) {
      next.phone = 'Phone number looks off.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) return;

    setSubmitting(true);
    try {
      const { data } = await axios.post(
        `${apiBase}/api/v1/enquiry`,
        { ...form, source },
        { timeout: 15000 },
      );
      setSubmitted(true);
      setServerMessage(data?.message || "Thanks — we'll be in touch shortly.");
    } catch (err: any) {
      const status = err?.response?.status;
      const apiErrors = err?.response?.data?.errors;
      if (status === 422 && Array.isArray(apiErrors)) {
        const mapped: Record<string, string> = {};
        for (const e of apiErrors) {
          if (e?.field && e?.message) mapped[e.field] = e.message;
        }
        setErrors(mapped);
      } else if (status === 429) {
        setServerMessage(
          err?.response?.data?.message ||
            "Too many submissions from this network. Please try again in an hour.",
        );
      } else {
        setServerMessage(
          err?.response?.data?.message ||
            "Something went wrong sending your enquiry. Please email hello@abhaayushman.com directly.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
          border: `1px solid ${BRAND.hairline}`,
        },
      }}
    >
      {/* Branded header */}
      <Box
        sx={{
          position: 'relative',
          px: { xs: 3, md: 4 },
          py: { xs: 2.5, md: 3 },
          background: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.accent} 100%)`,
          color: 'white',
        }}
      >
        <IconButton
          onClick={onClose}
          disabled={submitting}
          aria-label="Close"
          sx={{
            position: 'absolute',
            top: 10,
            right: 10,
            color: 'white',
            opacity: 0.85,
            '&:hover': { opacity: 1, bgcolor: alpha('#FFFFFF', 0.12) },
          }}
        >
          <Close fontSize="small" />
        </IconButton>
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 0.5 }}>
          <Chip
            icon={<Forum sx={{ color: 'white !important', fontSize: '14px !important' }} />}
            label="We respond within 1 business day"
            size="small"
            sx={{
              bgcolor: alpha('#FFFFFF', 0.18),
              color: 'white',
              fontWeight: 700,
              fontSize: '0.68rem',
              border: `1px solid ${alpha('#FFFFFF', 0.25)}`,
            }}
          />
        </Stack>
        <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: '-0.5px', lineHeight: 1.2 }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: alpha('#FFFFFF', 0.9), mt: 0.5, lineHeight: 1.5 }}>
          {subtitle}
        </Typography>
      </Box>

      <DialogContent sx={{ p: { xs: 3, md: 4 }, bgcolor: BRAND.surface }}>
        {submitted ? (
          <Stack alignItems="center" textAlign="center" spacing={2} sx={{ py: 2 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: alpha(BRAND.emerald, 0.12),
                color: BRAND.emerald,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle sx={{ fontSize: 36 }} />
            </Box>
            <Typography variant="h6" fontWeight={800} sx={{ color: BRAND.ink }}>
              Got it — thank you!
            </Typography>
            <Typography variant="body2" sx={{ color: BRAND.ink500, maxWidth: 380, lineHeight: 1.7 }}>
              {serverMessage ||
                "We've received your enquiry and will reach out shortly."}
            </Typography>
            <Button
              variant="contained"
              onClick={onClose}
              sx={{
                mt: 1,
                background: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.accent} 100%)`,
                color: 'white',
                fontWeight: 700,
                px: 3,
                py: 1.1,
                borderRadius: 2,
                textTransform: 'none',
              }}
            >
              Close
            </Button>
          </Stack>
        ) : (
          <Box component="form" onSubmit={handleSubmit} noValidate>
            {/* Honeypot — hidden from humans, irresistible to bots. */}
            <Box
              sx={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}
              aria-hidden
            >
              <label>
                Website
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                />
              </label>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Your name"
                  value={form.name}
                  onChange={update('name')}
                  required
                  fullWidth
                  size="small"
                  error={!!errors.name}
                  helperText={errors.name}
                  autoFocus
                  inputProps={{ maxLength: 120 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Work email"
                  type="email"
                  value={form.email}
                  onChange={update('email')}
                  required
                  fullWidth
                  size="small"
                  error={!!errors.email}
                  helperText={errors.email}
                  inputProps={{ maxLength: 200 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Hospital / organisation"
                  value={form.hospitalName}
                  onChange={update('hospitalName')}
                  fullWidth
                  size="small"
                  error={!!errors.hospitalName}
                  helperText={errors.hospitalName}
                  inputProps={{ maxLength: 200 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Phone (optional)"
                  value={form.phone}
                  onChange={update('phone')}
                  fullWidth
                  size="small"
                  error={!!errors.phone}
                  helperText={errors.phone}
                  inputProps={{ maxLength: 20 }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  select
                  label="Your role"
                  value={form.role}
                  onChange={update('role')}
                  fullWidth
                  size="small"
                  SelectProps={{ displayEmpty: true }}
                >
                  <MenuItem value="">
                    <em>Select your role (optional)</em>
                  </MenuItem>
                  {ROLE_OPTIONS.map((r) => (
                    <MenuItem key={r} value={r}>
                      {r}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="How can we help?"
                  value={form.message}
                  onChange={update('message')}
                  required
                  fullWidth
                  multiline
                  minRows={3}
                  size="small"
                  placeholder="e.g. We are a 120-bed multispecialty in Pune looking to switch from a paper-based system this quarter."
                  error={!!errors.message}
                  helperText={errors.message || `${form.message.length}/2000`}
                  inputProps={{ maxLength: 2000 }}
                />
              </Grid>
            </Grid>

            {!!serverMessage && !submitted && (
              <Box
                sx={{
                  mt: 2,
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: alpha('#EF4444', 0.06),
                  border: `1px solid ${alpha('#EF4444', 0.25)}`,
                  color: '#991B1B',
                  fontSize: '0.85rem',
                }}
              >
                {serverMessage}
              </Box>
            )}

            <Stack
              direction={{ xs: 'column-reverse', sm: 'row' }}
              spacing={1.25}
              justifyContent="space-between"
              alignItems={{ xs: 'stretch', sm: 'center' }}
              sx={{ mt: 3 }}
            >
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: BRAND.ink500 }}>
                <Email sx={{ fontSize: 16 }} />
                <Typography variant="caption">
                  Or email us at <strong>hello@abhaayushman.com</strong>
                </Typography>
              </Stack>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={submitting}
                endIcon={submitting ? null : <ArrowForward />}
                sx={{
                  background: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.accent} 100%)`,
                  color: 'white',
                  fontWeight: 700,
                  px: 3,
                  py: 1.2,
                  borderRadius: 2,
                  textTransform: 'none',
                  minWidth: 160,
                  boxShadow: `0 6px 18px ${alpha(BRAND.primary, 0.3)}`,
                  '&:hover': { boxShadow: `0 10px 24px ${alpha(BRAND.primary, 0.4)}`, transform: 'translateY(-1px)' },
                  '&.Mui-disabled': { opacity: 0.7, color: 'white' },
                  transition: 'all 0.2s',
                }}
              >
                {submitting ? (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CircularProgress size={16} sx={{ color: 'white' }} />
                    <span>Sending…</span>
                  </Stack>
                ) : (
                  'Send enquiry'
                )}
              </Button>
            </Stack>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EnquiryDialog;
