import React, { useState, Suspense, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Chip,
  Collapse,
  alpha,
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
} from '@mui/icons-material';
import { useAppDispatch } from '../../hooks/redux';
import { logout } from '../../store/slices/authSlice';
import { getMenuGroupsForRole, UserRole } from '../../config/rolePermissions';
import api from '../../services/api';
import { useThemeMode } from '../../context/ThemeContext';

const drawerWidth = 260;

const getIconComponent = (iconName: string) => {
  const iconMap: Record<string, React.ReactElement> = {
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
  return iconMap[iconName] || <Dashboard />;
};

const MainLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hospitalName, setHospitalName] = useState<string>('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { mode, toggleTheme } = useThemeMode();
  const isDark = mode === 'dark';

  const user = useMemo(() => JSON.parse(localStorage.getItem('user') || '{}'), []);
  const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';
  const userRole = user.role as UserRole | undefined;

  React.useEffect(() => {
    if (user.hospitalId && userRole !== 'SUPER_ADMIN') {
      const fetchHospitalName = async () => {
        try {
          const response: any = await api.get(`/api/v1/hospitals/${user.hospitalId}`);
          const hospital = response.data || {};
          setHospitalName(hospital.name || '');
          localStorage.setItem('hospital', JSON.stringify(hospital));
        } catch (err) {
          console.error('Error fetching hospital:', err);
        }
      };
      fetchHospitalName();
    }
  }, [user.hospitalId, userRole]);

  const menuGroups = userRole ? getMenuGroupsForRole(userRole) : [];

  const toggleGroup = (label: string) => {
    setCollapsedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const getRoleColor = (role: string) => {
    const roleColors: Record<string, string> = {
      SUPER_ADMIN: 'linear-gradient(135deg, #FF6B6B 0%, #FF5252 100%)',
      ADMIN: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      DOCTOR: 'linear-gradient(135deg, #50C878 0%, #2ecc71 100%)',
      NURSE: 'linear-gradient(135deg, #9B59B6 0%, #8e44ad 100%)',
      RECEPTIONIST: 'linear-gradient(135deg, #F39C12 0%, #e67e22 100%)',
      LAB_TECHNICIAN: 'linear-gradient(135deg, #E74C3C 0%, #c0392b 100%)',
      PHARMACIST: 'linear-gradient(135deg, #3498DB 0%, #2980b9 100%)',
    };
    return roleColors[role] || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  };

  const getRoleAccent = (role: string) => {
    const map: Record<string, string> = {
      SUPER_ADMIN: '#FF6B6B',
      ADMIN: '#667eea',
      DOCTOR: '#50C878',
      NURSE: '#9B59B6',
      RECEPTIONIST: '#F39C12',
      LAB_TECHNICIAN: '#E74C3C',
      PHARMACIST: '#3498DB',
    };
    return map[role] || '#667eea';
  };

  const roleAccent = getRoleAccent(userRole || '');

  const getRoleLabel = (role: string) => {
    const roleLabels: Record<string, string> = {
      SUPER_ADMIN: 'Super Admin',
      ADMIN: 'Hospital Admin',
      DOCTOR: 'Doctor',
      NURSE: 'Nurse',
      RECEPTIONIST: 'Receptionist',
      LAB_TECHNICIAN: 'Lab Technician',
      PHARMACIST: 'Pharmacist',
    };
    return roleLabels[role] || role;
  };

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleLogout = () => { dispatch(logout()); navigate('/login'); };

  const drawer = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: isDark ? '#0d1117' : 'transparent',
        background: isDark ? 'none' : getRoleColor(userRole || ''),
        color: 'white',
        ...(isDark && { borderRight: '1px solid rgba(240,246,252,0.08)' }),
      }}
    >
      {isDark && (
        <Box sx={{ height: 3, background: `linear-gradient(90deg, ${roleAccent}, transparent)` }} />
      )}

      {/* Logo */}
      <Box sx={{ p: 2.5, pb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40, height: 40, borderRadius: 2,
              background: isDark ? alpha(roleAccent, 0.15) : 'rgba(255,255,255,0.2)',
              border: isDark ? `1px solid ${alpha(roleAccent, 0.3)}` : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22,
            }}
          >
            🏥
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight="700" sx={{ lineHeight: 1.2, color: isDark ? '#e6edf3' : 'white' }}>
              AbhaAyushman
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.55, fontSize: '0.65rem', color: isDark ? '#8b949e' : 'rgba(255,255,255,0.85)' }}>
              ABDM Integrated HIMS
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* User card */}
      <Box sx={{ px: 2, mb: 1.5 }}>
        <Box
          sx={{
            background: isDark ? alpha(roleAccent, 0.08) : alpha('#ffffff', 0.15),
            borderRadius: 2, p: 1.5,
            border: '1px solid',
            borderColor: isDark ? alpha(roleAccent, 0.2) : alpha('#ffffff', 0.2),
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              sx={{
                width: 40, height: 40,
                bgcolor: isDark ? alpha(roleAccent, 0.25) : 'rgba(255,255,255,0.3)',
                color: isDark ? roleAccent : 'white',
                fontWeight: 'bold', fontSize: '0.95rem',
                border: isDark ? `2px solid ${alpha(roleAccent, 0.4)}` : 'none',
              }}
            >
              {userName.substring(0, 2).toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight="600" noWrap sx={{ color: isDark ? '#e6edf3' : 'white', fontSize: '0.85rem' }}>
                {userName}
              </Typography>
              <Chip
                label={getRoleLabel(userRole || '')}
                size="small"
                sx={{
                  height: 18, fontSize: '0.6rem', fontWeight: 600,
                  bgcolor: isDark ? alpha(roleAccent, 0.2) : 'rgba(255,255,255,0.25)',
                  color: isDark ? roleAccent : 'white',
                  border: `1px solid ${isDark ? alpha(roleAccent, 0.35) : 'rgba(255,255,255,0.3)'}`,
                  mt: 0.3,
                }}
              />
            </Box>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ borderColor: isDark ? 'rgba(240,246,252,0.08)' : alpha('#ffffff', 0.2), mx: 2 }} />

      {/* Navigation groups */}
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 1 }}>
        {menuGroups.map((group) => {
          const isUngrouped = !group.label;
          const isCollapsed = !!collapsedGroups[group.label];

          return (
            <Box key={group.label || 'top'} sx={{ mb: 0.5 }}>
              {/* Group header (skip for ungrouped items like Dashboard) */}
              {!isUngrouped && (
                <ListItemButton
                  onClick={() => toggleGroup(group.label)}
                  sx={{
                    mx: 1.5, borderRadius: 1.5, py: 0.5, px: 1.5, mb: 0.25,
                    '&:hover': { backgroundColor: isDark ? alpha(roleAccent, 0.06) : alpha('#ffffff', 0.1) },
                  }}
                >
                  <Typography
                    variant="overline"
                    sx={{
                      flex: 1, fontSize: '0.65rem', fontWeight: 700,
                      letterSpacing: '0.08em',
                      color: isDark ? '#484f58' : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {group.label}
                  </Typography>
                  {isCollapsed
                    ? <ExpandMore sx={{ fontSize: 16, color: isDark ? '#484f58' : 'rgba(255,255,255,0.4)' }} />
                    : <ExpandLess sx={{ fontSize: 16, color: isDark ? '#484f58' : 'rgba(255,255,255,0.4)' }} />
                  }
                </ListItemButton>
              )}

              <Collapse in={isUngrouped || !isCollapsed} timeout="auto">
                <List disablePadding sx={{ px: 1.5 }}>
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <ListItem key={item.path} disablePadding sx={{ mb: 0.25 }}>
                        <ListItemButton
                          onClick={() => { navigate(item.path); setMobileOpen(false); }}
                          sx={{
                            borderRadius: 1.5, py: 0.9, px: 1.5,
                            color: isDark ? (isActive ? roleAccent : '#8b949e') : 'white',
                            transition: 'all 0.2s',
                            backgroundColor: isActive
                              ? (isDark ? alpha(roleAccent, 0.12) : alpha('#ffffff', 0.2))
                              : 'transparent',
                            '&:hover': {
                              backgroundColor: isDark ? alpha(roleAccent, 0.08) : alpha('#ffffff', 0.15),
                              color: isDark ? roleAccent : 'white',
                            },
                            position: 'relative',
                            '&:before': isActive ? {
                              content: '""', position: 'absolute', left: 0, top: '50%',
                              transform: 'translateY(-50%)', width: 3, height: '55%',
                              bgcolor: isDark ? roleAccent : 'white', borderRadius: '0 4px 4px 0',
                            } : {},
                          }}
                        >
                          <ListItemIcon
                            sx={{
                              color: isDark ? (isActive ? roleAccent : '#484f58') : 'white',
                              minWidth: 34, opacity: isActive ? 1 : (isDark ? 1 : 0.8),
                            }}
                          >
                            {React.cloneElement(getIconComponent(item.icon), { sx: { fontSize: 20 } })}
                          </ListItemIcon>
                          <ListItemText
                            primary={item.text}
                            primaryTypographyProps={{
                              fontWeight: isActive ? 600 : 500, fontSize: '0.82rem',
                              color: isDark ? (isActive ? roleAccent : '#8b949e') : 'white',
                            }}
                          />
                          {item.badge && (
                            <Chip
                              label={item.badge} size="small"
                              sx={{
                                height: 18, fontSize: '0.58rem', fontWeight: 600,
                                bgcolor: isDark ? alpha('#4caf50', 0.15) : alpha('#4caf50', 0.9),
                                color: isDark ? '#4caf50' : 'white',
                                border: isDark ? `1px solid ${alpha('#4caf50', 0.3)}` : 'none',
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

      <Divider sx={{ borderColor: isDark ? 'rgba(240,246,252,0.08)' : alpha('#ffffff', 0.2), mx: 2 }} />

      {/* Logout */}
      <List sx={{ px: 1.5, py: 1.5 }}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: 1.5, py: 0.9, px: 1.5,
              color: isDark ? '#8b949e' : 'white',
              '&:hover': {
                backgroundColor: isDark ? alpha('#f56565', 0.12) : alpha('#d32f2f', 0.3),
                color: isDark ? '#f56565' : 'white',
              },
            }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: 34 }}>
              <Logout sx={{ fontSize: 20 }} />
            </ListItemIcon>
            <ListItemText
              primary="Logout"
              primaryTypographyProps={{ fontWeight: 500, fontSize: '0.82rem', color: 'inherit' }}
            />
          </ListItemButton>
        </ListItem>
      </List>

      <Box sx={{ px: 2, pb: 1.5 }}>
        <Typography variant="caption" sx={{ opacity: 0.4, display: 'block', textAlign: 'center', fontSize: '0.6rem', color: isDark ? '#8b949e' : 'white' }}>
          AbhaAyushman v1.0.0 &middot; ABDM Certified
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', width: '100%', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider',
          boxShadow: isDark ? 'none' : '0 1px 8px rgba(0,0,0,0.06)',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 3 }, minHeight: '56px !important' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ display: { sm: 'none' } }}>
              <MenuIcon />
            </IconButton>
            {hospitalName && userRole !== 'SUPER_ADMIN' && (
              <Box
                sx={{
                  display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1,
                  px: 1.5, py: 0.5, borderRadius: 1.5,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                }}
              >
                <Typography variant="caption" fontWeight="600">{hospitalName}</Typography>
              </Box>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton size="small" onClick={toggleTheme} title={mode === 'light' ? 'Dark Mode' : 'Light Mode'} color="inherit">
              {mode === 'light' ? <DarkMode fontSize="small" /> : <LightMode fontSize="small" />}
            </IconButton>
            <IconButton size="small" onClick={() => navigate('/app/notifications')} title="Notifications">
              <Notifications fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => navigate('/app/settings')} title="Settings">
              <Settings fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => navigate('/app/profile')} title="Profile">
              <AccountCircle fontSize="small" />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary" open={mobileOpen} onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, border: 'none' } }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, border: 'none', boxShadow: isDark ? 'none' : '4px 0 24px rgba(0,0,0,0.12)' },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{ flexGrow: 1, p: { xs: 2, sm: 3, md: 4 }, pt: 0, minHeight: '100vh', bgcolor: 'background.default', width: { xs: '100%', sm: `calc(100% - ${drawerWidth}px)` }, overflow: 'hidden' }}
      >
        <Toolbar sx={{ minHeight: '56px !important' }} />
        <Box sx={{ mt: 2, width: '100%', maxWidth: '1400px', mx: 'auto' }}>
          <Suspense fallback={
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
              <Box sx={{ width: 32, height: 32, border: '3px solid', borderColor: 'divider', borderTopColor: 'primary.main', borderRadius: '50%', animation: 'spin 0.8s linear infinite', '@keyframes spin': { to: { transform: 'rotate(360deg)' } } }} />
            </Box>
          }>
            <Outlet />
          </Suspense>
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout;
