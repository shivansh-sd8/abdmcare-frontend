import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Business,
  Search,
  Public,
  Done,
  ArrowDropDown,
  Refresh,
  ErrorOutline,
  Insights as InsightsIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { setSelectedHospitalId } from '../../store/slices/uiSlice';
import hospitalService from '../../services/hospitalService';

interface HospitalRow {
  id: string;
  name: string;
  code?: string;
  city?: string;
  state?: string;
  status?: string;
}

/**
 * Global "viewing as <hospital>" picker for Super Admins.
 *
 * Sits in the top app bar. When a hospital is selected, every API call across
 * the app gets `?hospitalId=<id>` injected by the axios interceptor so all
 * lists, dashboards, and charts pivot to that hospital. Selecting "All
 * hospitals" clears the scope and returns to the platform-wide view.
 *
 * Renders nothing for non-SUPER_ADMIN users.
 */
const HospitalScopeSelector: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const selectedHospitalId = useAppSelector((s) => s.ui.selectedHospitalId);

  const userRole = useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? (JSON.parse(raw)?.role as string) : null;
    } catch { return null; }
  }, []);

  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [hospitals, setHospitals] = useState<HospitalRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [search, setSearch] = useState('');

  // ── Hooks must run unconditionally — keep this above any early return.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return hospitals;
    return hospitals.filter((h) =>
      h.name?.toLowerCase().includes(q) ||
      h.code?.toLowerCase().includes(q) ||
      h.city?.toLowerCase().includes(q) ||
      h.state?.toLowerCase().includes(q),
    );
  }, [hospitals, search]);

  const fetchHospitals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp: any = await hospitalService.getAllHospitals({ limit: 200 });
      // api.get unwraps to { success, message, data: { hospitals, pagination } }
      const list: any[] =
        resp?.data?.hospitals
        || resp?.data?.data?.hospitals
        || resp?.hospitals
        || (Array.isArray(resp?.data) ? resp.data : [])
        || [];
      setHospitals(
        list.map((h: any) => ({
          id: h.id,
          name: h.name,
          code: h.code,
          city: h.city,
          state: h.state,
          status: h.status,
        })),
      );
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load hospitals');
      setHospitals([]);
    } finally {
      setLoading(false);
      setHasFetched(true);
    }
  }, []);

  // Fetch eagerly on mount for SUPER_ADMIN so the dropdown is hot when opened.
  useEffect(() => {
    if (userRole !== 'SUPER_ADMIN') return;
    fetchHospitals();
  }, [userRole, fetchHospitals]);

  if (userRole !== 'SUPER_ADMIN') return null;

  const selected = hospitals.find((h) => h.id === selectedHospitalId) || null;

  const handleSelect = (id: string | null) => {
    dispatch(setSelectedHospitalId(id));
    setAnchor(null);
    setSearch('');
  };

  // Re-trigger a fetch every time the user opens the dropdown if the previous
  // attempt failed or returned nothing — much friendlier than an infinite spinner.
  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    setAnchor(e.currentTarget);
    if (!loading && (error || hospitals.length === 0)) {
      fetchHospitals();
    }
  };

  const triggerLabel = selected ? selected.name : 'All hospitals';
  const triggerSub  = selected
    ? [selected.city, selected.state].filter(Boolean).join(', ')
    : 'Platform-wide view';

  const accent = selected ? theme.palette.primary.main : theme.palette.text.secondary;

  return (
    <>
      <Tooltip title="Switch hospital scope" placement="bottom">
        <Button
          onClick={handleOpen}
          startIcon={selected ? <Business sx={{ fontSize: 16 }} /> : <Public sx={{ fontSize: 16 }} />}
          endIcon={<ArrowDropDown sx={{ fontSize: 18 }} />}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            fontSize: compact ? '0.78rem' : '0.82rem',
            px: 1.25,
            py: 0.6,
            borderRadius: 2,
            color: accent,
            border: `1px solid ${alpha(accent, 0.25)}`,
            background: alpha(accent, 0.06),
            maxWidth: { xs: 180, sm: 240, md: 300 },
            '&:hover': {
              background: alpha(accent, 0.12),
              borderColor: alpha(accent, 0.45),
            },
            '& .MuiButton-startIcon': { marginRight: 0.75 },
          }}
        >
          <Box sx={{ minWidth: 0, textAlign: 'left' }}>
            <Typography
              component="span"
              sx={{
                display: 'block',
                fontSize: compact ? '0.78rem' : '0.82rem',
                fontWeight: 700,
                lineHeight: 1.1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: { xs: 130, sm: 180, md: 220 },
              }}
            >
              {triggerLabel}
            </Typography>
            {!compact && (
              <Typography
                component="span"
                sx={{
                  display: { xs: 'none', md: 'block' },
                  fontSize: '0.62rem',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: 'text.secondary',
                  lineHeight: 1.1,
                  mt: 0.1,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 220,
                }}
              >
                {triggerSub}
              </Typography>
            )}
          </Box>
        </Button>
      </Tooltip>

      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{
          sx: {
            mt: 0.75,
            width: 360,
            maxHeight: 480,
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            overflow: 'hidden',
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.25 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="subtitle2" fontWeight={800} sx={{ flex: 1 }}>
              Hospital scope
            </Typography>
            {selected && (
              <Chip
                size="small"
                label="Scoped"
                color="primary"
                sx={{ height: 20, fontSize: '0.62rem', fontWeight: 700 }}
              />
            )}
            <Tooltip title="Refresh hospital list">
              <span>
                <Button
                  size="small"
                  onClick={fetchHospitals}
                  disabled={loading}
                  sx={{ minWidth: 0, p: 0.5, color: 'text.secondary' }}
                >
                  {loading ? <CircularProgress size={14} /> : <Refresh sx={{ fontSize: 16 }} />}
                </Button>
              </span>
            </Tooltip>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            All lists, charts, and detail pages will show only the selected hospital.
          </Typography>
        </Box>

        <Box sx={{ px: 2, pb: 1 }}>
          <TextField
            size="small"
            fullWidth
            autoFocus
            placeholder="Search by name, code, city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: <Search sx={{ fontSize: 16, color: 'text.secondary', mr: 0.75 }} />,
            }}
          />
        </Box>

        <Divider />

        {/* All hospitals row */}
        <MenuItem
          onClick={() => handleSelect(null)}
          sx={{
            py: 1.25,
            px: 2,
            background: !selected ? alpha(theme.palette.primary.main, 0.06) : undefined,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.25} sx={{ flex: 1 }}>
            <Public sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight={700}>All hospitals</Typography>
              <Typography variant="caption" color="text.secondary">
                Platform-wide view (default)
              </Typography>
            </Box>
            {!selected && <Done sx={{ fontSize: 18, color: 'primary.main' }} />}
          </Stack>
        </MenuItem>

        <Divider />

        {/* Hospital rows */}
        <Box sx={{ maxHeight: 280, overflowY: 'auto' }}>
          {loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, py: 3 }}>
              <CircularProgress size={16} />
              <Typography variant="caption" color="text.secondary">Loading hospitals…</Typography>
            </Box>
          )}
          {!loading && error && (
            <Box sx={{ textAlign: 'center', py: 2.5, px: 2 }}>
              <ErrorOutline sx={{ fontSize: 22, color: 'error.main', mb: 0.5 }} />
              <Typography variant="caption" sx={{ display: 'block', color: 'error.main', fontWeight: 700 }}>
                Couldn't load hospitals
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 1 }}>
                {error}
              </Typography>
              <Button size="small" startIcon={<Refresh />} onClick={fetchHospitals} sx={{ textTransform: 'none', fontWeight: 700 }}>
                Retry
              </Button>
            </Box>
          )}
          {!loading && !error && hasFetched && hospitals.length === 0 && (
            <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', py: 3, color: 'text.secondary' }}>
              No hospitals onboarded yet.
            </Typography>
          )}
          {!loading && !error && hospitals.length > 0 && filtered.length === 0 && (
            <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', py: 3, color: 'text.secondary' }}>
              No hospitals match "{search}".
            </Typography>
          )}
          {!loading && !error && filtered.map((h) => {
            const isSel = h.id === selectedHospitalId;
            return (
              <MenuItem
                key={h.id}
                onClick={() => handleSelect(h.id)}
                sx={{
                  py: 1.25,
                  px: 2,
                  background: isSel ? alpha(theme.palette.primary.main, 0.06) : undefined,
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1.25} sx={{ flex: 1, minWidth: 0 }}>
                  <Box
                    sx={{
                      width: 28, height: 28, borderRadius: 1.25,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: alpha(theme.palette.primary.main, 0.12),
                      color: 'primary.main',
                      flexShrink: 0,
                    }}
                  >
                    <Business sx={{ fontSize: 16 }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700} noWrap>
                      {h.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {[h.code, h.city, h.state].filter(Boolean).join(' · ') || '—'}
                    </Typography>
                  </Box>
                  {h.status && h.status !== 'ACTIVE' && (
                    <Chip
                      size="small"
                      label={h.status}
                      sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700 }}
                    />
                  )}
                  {isSel && <Done sx={{ fontSize: 18, color: 'primary.main' }} />}
                </Stack>
              </MenuItem>
            );
          })}
        </Box>

        {selected && (
          <>
            <Divider />
            <Box sx={{ p: 1 }}>
              <Button
                fullWidth
                size="small"
                variant="contained"
                startIcon={<InsightsIcon />}
                onClick={() => {
                  setAnchor(null);
                  navigate(`/app/hospitals/${selected.id}/performance`);
                }}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                Open hospital performance
              </Button>
            </Box>
          </>
        )}
      </Menu>
    </>
  );
};

export default HospitalScopeSelector;
