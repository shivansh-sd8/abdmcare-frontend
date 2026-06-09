import React, { useState, Suspense, useMemo, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Chip,
  Collapse,
  alpha,
  useTheme,
  Tooltip,
  Stack,
  Dialog,
  DialogContent,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  People,
  LocalHospital,
  CalendarToday,
  Assignment,
  Logout,
  HealthAndSafety,
  Notifications,
  Settings,
  AccountCircle,
  History,
  Business,
  ManageAccounts,
  MedicalInformation,
  Medication,
  Science,
  LocalPharmacy,
  MeetingRoom,
  Receipt,
  Inventory,
  Hotel,
  DarkMode,
  LightMode,
  ExpandLess,
  ExpandMore,
  Search,
  ArrowForward,
  KeyboardCommandKey,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useAppDispatch } from '../../hooks/redux';
import { logout } from '../../store/slices/authSlice';
import { getMenuGroupsForRole, UserRole } from '../../config/rolePermissions';
import api from '../../services/api';
import { useThemeMode } from '../../context/ThemeContext';

const drawerWidth = 264;

const ICON_MAP: Record<string, React.ReactElement> = {
  Dashboard: <Dashboard />,
  Business: <Business />,
  ManageAccounts: <ManageAccounts />,
  HealthAndSafety: <HealthAndSafety />,
  People: <People />,
  LocalHospital: <LocalHospital />,
  CalendarToday: <CalendarToday />,
  Assignment: <Assignment />,
  History: <History />,
  MedicalInformation: <MedicalInformation />,
  Medication: <Medication />,
  Science: <Science />,
  LocalPharmacy: <LocalPharmacy />,
  MeetingRoom: <MeetingRoom />,
  Receipt: <Receipt />,
  Inventory: <Inventory />,
  Hotel: <Hotel />,
};

const getIcon = (name: string) => ICON_MAP[name] || <Dashboard />;

// Single-source role accent (used as a subtle stripe on the active nav item
// and on the role chip — no longer paints the whole sidebar background).
const ROLE_ACCENT: Record<string, string> = {
  SUPER_ADMIN:    '#EF4444',
  ADMIN:          '#5B5BD6',
  DOCTOR:         '#0F9D7A',
  NURSE:          '#A855F7',
  RECEPTIONIST:   '#F59E0B',
  LAB_TECHNICIAN: '#E11D48',
  PHARMACIST:     '#0EA5E9',
};

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Hospital Admin',
  DOCTOR: 'Doctor',
  NURSE: 'Nurse',
  RECEPTIONIST: 'Receptionist',
  LAB_TECHNICIAN: 'Lab Technician',
  PHARMACIST: 'Pharmacist',
};

const MainLayout: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { mode, toggleTheme } = useThemeMode();
  const isDark = mode === 'dark';

  const [mobileOpen, setMobileOpen] = useState(false);
  const [hospitalName, setHospitalName] = useState<string>('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Profile menu
  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);

  // Command palette (Cmd-K / Ctrl-K)
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');

  const user = useMemo(() => JSON.parse(localStorage.getItem('user') || '{}'), []);
  const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';
  const userRole = user.role as UserRole | undefined;
  const userEmail = user.email || '';
  const accent = ROLE_ACCENT[userRole || ''] || theme.palette.primary.main;

  useEffect(() => {
    if (user.hospitalId && userRole !== 'SUPER_ADMIN') {
      api.get(`/api/v1/hospitals/${user.hospitalId}`)
        .then((resp: any) => {
          const hospital = resp.data || {};
          setHospitalName(hospital.name || '');
          localStorage.setItem('hospital', JSON.stringify(hospital));
        })
        .catch(() => {});
    }
  }, [user.hospitalId, userRole]);

  const menuGroups = userRole ? getMenuGroupsForRole(userRole) : [];
  const allItems = useMemo(
    () => menuGroups.flatMap(g => g.items.map(i => ({ ...i, group: g.label }))),
    [menuGroups],
  );

  // ── Cmd-K binding ──────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (e.key === 'Escape' && paletteOpen) setPaletteOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [paletteOpen]);

  const filteredCommands = useMemo(() => {
    const q = paletteQuery.trim().toLowerCase();
    if (!q) return allItems.slice(0, 8);
    return allItems.filter(i =>
      i.text.toLowerCase().includes(q) ||
      i.group?.toLowerCase().includes(q) ||
      i.path.toLowerCase().includes(q),
    ).slice(0, 12);
  }, [allItems, paletteQuery]);

  const goToCommand = useCallback((path: string) => {
    setPaletteOpen(false);
    setPaletteQuery('');
    navigate(path);
  }, [navigate]);

  const toggleGroup = (label: string) =>
    setCollapsedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  const handleDrawerToggle = () => setMobileOpen(v => !v);
  const handleLogout = () => { dispatch(logout()); navigate('/login'); };

  // ── Sidebar content ────────────────────────────────────────────────────────
  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: theme.customGradients.sidebar,
        position: 'relative',
        // Subtle role-coloured top stripe — keeps role identity without dominating.
        '&::before': {
          content: '""',
          position: 'absolute',
          insetInline: 0,
          top: 0,
          height: 3,
          background: `linear-gradient(90deg, ${accent}, ${alpha(accent, 0.4)} 60%, transparent)`,
        },
      }}
    >
      {/* Brand */}
      <Box sx={{ px: 2.25, pt: 2.5, pb: 1.5 }}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Box
            sx={{
              width: 38, height: 38, borderRadius: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: theme.customGradients.brand,
              boxShadow: `0 6px 14px ${alpha(theme.palette.primary.main, 0.32)}`,
            }}
          >
            <HealthAndSafety sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              AbhaAyushman
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', letterSpacing: '0.02em' }}>
              ABDM Integrated HIMS
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* User card (subtler) */}
      <Box sx={{ px: 1.75, mb: 1 }}>
        <Box
          sx={{
            display: 'flex', alignItems: 'center', gap: 1.25,
            px: 1.25, py: 1,
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            background: alpha(accent, isDark ? 0.06 : 0.04),
          }}
        >
          <Avatar
            sx={{
              width: 36, height: 36,
              fontSize: '0.85rem',
              bgcolor: alpha(accent, 0.18),
              color: accent,
              border: `1.5px solid ${alpha(accent, 0.35)}`,
            }}
          >
            {userName.substring(0, 2).toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700} noWrap sx={{ fontSize: '0.83rem' }}>
              {userName}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.65rem', fontWeight: 700, color: accent,
                letterSpacing: '0.04em', textTransform: 'uppercase',
              }}
            >
              {ROLE_LABEL[userRole || ''] || userRole}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Quick-search trigger */}
      <Box sx={{ px: 1.75, mb: 1 }}>
        <Box
          role="button"
          onClick={() => setPaletteOpen(true)}
          sx={{
            display: 'flex', alignItems: 'center', gap: 1,
            px: 1.25, py: 0.85,
            borderRadius: 2,
            cursor: 'pointer',
            color: 'text.secondary',
            border: `1px solid ${theme.palette.divider}`,
            background: 'transparent',
            transition: 'all 150ms ease',
            '&:hover': { borderColor: alpha(accent, 0.4), color: 'text.primary' },
          }}
        >
          <Search sx={{ fontSize: 16 }} />
          <Typography variant="caption" sx={{ flex: 1, fontWeight: 500 }}>
            Quick search
          </Typography>
          <Box
            sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.25,
              px: 0.5, py: 0.1, borderRadius: 0.75,
              fontSize: '0.6rem', fontFamily: 'monospace', fontWeight: 700,
              color: 'text.secondary',
              background: alpha(theme.palette.text.secondary, 0.10),
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            ⌘K
          </Box>
        </Box>
      </Box>

      {/* Nav */}
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 0.5 }}>
        {menuGroups.map(group => {
          const isUngrouped = !group.label;
          const isCollapsed = !!collapsedGroups[group.label];
          return (
            <Box key={group.label || 'top'} sx={{ mb: 0.25 }}>
              {!isUngrouped && (
                <ListItemButton
                  onClick={() => toggleGroup(group.label)}
                  sx={{
                    mx: 1.25, px: 1.25, py: 0.5,
                    minHeight: 'unset',
                    '&:hover': { backgroundColor: 'transparent' },
                  }}
                  disableRipple
                >
                  <Typography
                    variant="overline"
                    sx={{
                      flex: 1,
                      fontSize: '0.625rem',
                      fontWeight: 700,
                      letterSpacing: '0.10em',
                      color: 'text.disabled',
                    }}
                  >
                    {group.label}
                  </Typography>
                  {isCollapsed
                    ? <ExpandMore sx={{ fontSize: 14, color: 'text.disabled' }} />
                    : <ExpandLess sx={{ fontSize: 14, color: 'text.disabled' }} />
                  }
                </ListItemButton>
              )}

              <Collapse in={isUngrouped || !isCollapsed} timeout="auto">
                <List disablePadding sx={{ px: 1.25 }}>
                  {group.items.map(item => {
                    const isActive = location.pathname === item.path
                      || (item.path !== '/app/dashboard' && location.pathname.startsWith(item.path));
                    return (
                      <ListItem key={item.path} disablePadding sx={{ mb: 0.25 }}>
                        <ListItemButton
                          onClick={() => { navigate(item.path); setMobileOpen(false); }}
                          sx={{
                            position: 'relative',
                            py: 0.85, px: 1.25,
                            color: isActive ? accent : 'text.secondary',
                            backgroundColor: isActive ? alpha(accent, isDark ? 0.14 : 0.08) : 'transparent',
                            transition: 'background-color 150ms ease, color 150ms ease',
                            '&:hover': {
                              backgroundColor: alpha(accent, isDark ? 0.10 : 0.06),
                              color: isActive ? accent : 'text.primary',
                            },
                            '&::before': isActive ? {
                              content: '""',
                              position: 'absolute',
                              left: -2, top: '20%', bottom: '20%',
                              width: 3, borderRadius: 2,
                              background: accent,
                            } : {},
                          }}
                        >
                          <ListItemIcon
                            sx={{
                              color: 'inherit',
                              minWidth: 32,
                              opacity: isActive ? 1 : 0.85,
                            }}
                          >
                            {React.cloneElement(getIcon(item.icon), { sx: { fontSize: 19 } })}
                          </ListItemIcon>
                          <ListItemText
                            primary={item.text}
                            primaryTypographyProps={{
                              fontWeight: isActive ? 700 : 500,
                              fontSize: '0.8125rem',
                              color: 'inherit',
                            }}
                          />
                          {item.badge && (
                            <Chip
                              label={item.badge}
                              size="small"
                              sx={{
                                height: 18, fontSize: '0.58rem', fontWeight: 700,
                                bgcolor: alpha(theme.palette.primary.main, isDark ? 0.18 : 0.12),
                                color: 'primary.main',
                                border: `1px solid ${alpha(theme.palette.primary.main, 0.30)}`,
                              }}
                            />
                          )}
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>
              </Collapse>
            </Box>
          );
        })}
      </Box>

      {/* Footer */}
      <Box sx={{ p: 1.5, borderTop: `1px solid ${theme.palette.divider}` }}>
        <ListItemButton
          onClick={handleLogout}
          sx={{
            borderRadius: 1.5,
            py: 0.75, px: 1.25,
            color: 'text.secondary',
            '&:hover': {
              backgroundColor: alpha(theme.palette.error.main, 0.08),
              color: 'error.main',
            },
          }}
        >
          <ListItemIcon sx={{ color: 'inherit', minWidth: 32 }}>
            <LogoutIcon sx={{ fontSize: 19 }} />
          </ListItemIcon>
          <ListItemText
            primary="Sign out"
            primaryTypographyProps={{ fontWeight: 600, fontSize: '0.8125rem', color: 'inherit' }}
          />
        </ListItemButton>
        <Typography
          variant="caption"
          sx={{
            display: 'block', textAlign: 'center', mt: 1,
            fontSize: '0.6rem',
            color: 'text.disabled',
          }}
        >
          AbhaAyushman v1.0 · ABDM Certified
        </Typography>
      </Box>
    </Box>
  );

  // ── Topbar (glassy) ────────────────────────────────────────────────────────
  return (
    <Box sx={{ display: 'flex', width: '100%', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          color: 'text.primary',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 3 }, minHeight: '60px !important' }}>
          {/* Left */}
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <IconButton
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ display: { sm: 'none' }, color: 'text.primary' }}
            >
              <MenuIcon />
            </IconButton>
            {hospitalName && userRole !== 'SUPER_ADMIN' && (
              <Stack
                direction="row" alignItems="center" spacing={0.75}
                sx={{
                  display: { xs: 'none', md: 'inline-flex' },
                  px: 1.25, py: 0.5,
                  borderRadius: 2,
                  background: alpha(theme.palette.primary.main, 0.10),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.22)}`,
                  color: 'primary.main',
                }}
              >
                <Business sx={{ fontSize: 14 }} />
                <Typography variant="caption" fontWeight={700} sx={{ letterSpacing: '0.01em' }}>
                  {hospitalName}
                </Typography>
              </Stack>
            )}
          </Stack>

          {/* Center — global search */}
          <Box
            role="button"
            onClick={() => setPaletteOpen(true)}
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center', gap: 1,
              minWidth: 320, maxWidth: 460, mx: 'auto',
              px: 1.5, py: 0.75,
              borderRadius: 2,
              cursor: 'pointer',
              border: `1px solid ${theme.palette.divider}`,
              background: alpha(theme.palette.background.default, 0.6),
              transition: 'all 150ms ease',
              '&:hover': { borderColor: alpha(theme.palette.primary.main, 0.4) },
            }}
          >
            <Search sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
              Search patients, screens, ABDM tools…
            </Typography>
            <Box
              sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.25,
                px: 0.5, py: 0.1, borderRadius: 0.75,
                fontSize: '0.6rem', fontFamily: 'monospace', fontWeight: 700,
                color: 'text.secondary',
                background: alpha(theme.palette.text.secondary, 0.10),
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <KeyboardCommandKey sx={{ fontSize: 11 }} />K
            </Box>
          </Box>

          {/* Right */}
          <Stack direction="row" alignItems="center" spacing={0.25}>
            <Tooltip title={mode === 'light' ? 'Dark mode' : 'Light mode'}>
              <IconButton size="small" onClick={toggleTheme} sx={{ color: 'text.secondary' }}>
                {mode === 'light' ? <DarkMode fontSize="small" /> : <LightMode fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Notifications">
              <IconButton size="small" onClick={() => navigate('/app/notifications')} sx={{ color: 'text.secondary' }}>
                <Notifications fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Settings">
              <IconButton size="small" onClick={() => navigate('/app/settings')} sx={{ color: 'text.secondary' }}>
                <Settings fontSize="small" />
              </IconButton>
            </Tooltip>
            <IconButton
              size="small"
              onClick={(e) => setProfileAnchor(e.currentTarget)}
              sx={{ ml: 0.5 }}
            >
              <Avatar
                sx={{
                  width: 32, height: 32,
                  fontSize: '0.78rem',
                  bgcolor: alpha(accent, 0.16),
                  color: accent,
                  border: `1.5px solid ${alpha(accent, 0.35)}`,
                }}
              >
                {userName.substring(0, 2).toUpperCase()}
              </Avatar>
            </IconButton>

            <Menu
              anchorEl={profileAnchor}
              open={!!profileAnchor}
              onClose={() => setProfileAnchor(null)}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              PaperProps={{
                sx: {
                  mt: 0.75, minWidth: 230, borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                },
              }}
            >
              <Box sx={{ px: 2, py: 1.25 }}>
                <Typography variant="subtitle2" fontWeight={700}>{userName}</Typography>
                {userEmail && (
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                    {userEmail}
                  </Typography>
                )}
                <Chip
                  size="small"
                  label={ROLE_LABEL[userRole || ''] || userRole}
                  sx={{
                    mt: 0.75,
                    height: 20, fontSize: '0.65rem',
                    bgcolor: alpha(accent, 0.14), color: accent,
                    border: `1px solid ${alpha(accent, 0.3)}`,
                  }}
                />
              </Box>
              <Divider />
              <MenuItem onClick={() => { setProfileAnchor(null); navigate('/app/profile'); }}>
                <ListItemIcon><AccountCircle fontSize="small" /></ListItemIcon>
                My profile
              </MenuItem>
              <MenuItem onClick={() => { setProfileAnchor(null); navigate('/app/settings'); }}>
                <ListItemIcon><Settings fontSize="small" /></ListItemIcon>
                Settings
              </MenuItem>
              <Divider />
              <MenuItem onClick={() => { setProfileAnchor(null); handleLogout(); }} sx={{ color: 'error.main' }}>
                <ListItemIcon><Logout fontSize="small" sx={{ color: 'error.main' }} /></ListItemIcon>
                Sign out
              </MenuItem>
            </Menu>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { width: drawerWidth, border: 'none' },
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              borderRight: `1px solid ${theme.palette.divider}`,
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3, md: 4 },
          pt: 0,
          minHeight: '100vh',
          bgcolor: 'background.default',
          width: { xs: '100%', sm: `calc(100% - ${drawerWidth}px)` },
          overflow: 'hidden',
        }}
      >
        <Toolbar sx={{ minHeight: '60px !important' }} />
        <Box sx={{ mt: 2, width: '100%', maxWidth: '1400px', mx: 'auto' }}>
          <Suspense fallback={
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
              <Box
                sx={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: theme.customGradients.brand,
                  padding: '3px',
                  animation: 'spin 1s linear infinite',
                  '@keyframes spin': { to: { transform: 'rotate(360deg)' } },
                  '&::after': {
                    content: '""', display: 'block', width: '100%', height: '100%', borderRadius: '50%',
                    background: theme.palette.background.default,
                  },
                }}
              />
            </Box>
          }>
            <Outlet />
          </Suspense>
        </Box>
      </Box>

      {/* Command palette (Cmd-K) */}
      <Dialog
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            mt: 8,
            alignSelf: 'flex-start',
            overflow: 'hidden',
          },
        }}
      >
        <DialogContent sx={{ p: 0 }}>
          <TextField
            autoFocus
            fullWidth
            value={paletteQuery}
            onChange={(e) => setPaletteQuery(e.target.value)}
            placeholder="Search screens, ABDM tools…"
            variant="standard"
            InputProps={{
              disableUnderline: true,
              startAdornment: (
                <InputAdornment position="start" sx={{ pl: 1.5 }}>
                  <Search sx={{ fontSize: 18, color: 'text.secondary' }} />
                </InputAdornment>
              ),
              sx: {
                fontSize: '1rem',
                py: 1.75, px: 1,
                borderBottom: `1px solid ${theme.palette.divider}`,
              },
            }}
          />

          <Box sx={{ maxHeight: 340, overflowY: 'auto', py: 0.5 }}>
            {filteredCommands.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">No matches.</Typography>
              </Box>
            ) : filteredCommands.map(cmd => (
              <Box
                key={cmd.path}
                onClick={() => goToCommand(cmd.path)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  px: 2, py: 1.25,
                  cursor: 'pointer',
                  '&:hover': { background: alpha(theme.palette.primary.main, 0.08) },
                }}
              >
                <Box
                  sx={{
                    width: 30, height: 30, borderRadius: 1.5,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: alpha(theme.palette.primary.main, 0.10),
                    color: 'primary.main',
                  }}
                >
                  {React.cloneElement(getIcon(cmd.icon), { sx: { fontSize: 17 } })}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>{cmd.text}</Typography>
                  {(cmd as any).group && (
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {(cmd as any).group}
                    </Typography>
                  )}
                </Box>
                <ArrowForward sx={{ fontSize: 15, color: 'text.disabled' }} />
              </Box>
            ))}
          </Box>

          <Box
            sx={{
              display: 'flex', alignItems: 'center', gap: 1,
              px: 2, py: 1,
              borderTop: `1px solid ${theme.palette.divider}`,
              background: alpha(theme.palette.text.secondary, 0.04),
              fontSize: '0.7rem',
              color: 'text.secondary',
            }}
          >
            <Typography variant="caption" fontWeight={600}>Navigate</Typography>
            <Box
              sx={{
                px: 0.6, py: 0.05, borderRadius: 0.5,
                fontSize: '0.6rem', fontFamily: 'monospace', fontWeight: 700,
                background: alpha(theme.palette.text.secondary, 0.10),
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              ↵
            </Box>
            <Box sx={{ flex: 1 }} />
            <Typography variant="caption" fontWeight={600}>Close</Typography>
            <Box
              sx={{
                px: 0.6, py: 0.05, borderRadius: 0.5,
                fontSize: '0.6rem', fontFamily: 'monospace', fontWeight: 700,
                background: alpha(theme.palette.text.secondary, 0.10),
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              esc
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default MainLayout;
