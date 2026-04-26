import React, { useState } from 'react';
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
  Badge,
  Chip,
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
  MonitorHeart,
  Science,
  LocalPharmacy,
  Payment,
} from '@mui/icons-material';
import { useAppDispatch } from '../../hooks/redux';
import { logout } from '../../store/slices/authSlice';
import { getMenuItemsForRole, UserRole } from '../../config/rolePermissions';
import api from '../../services/api';

const drawerWidth = 280;

// Icon mapping function
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
    MonitorHeart: <MonitorHeart />,
    Science: <Science />,
    LocalPharmacy: <LocalPharmacy />,
    Payment: <Payment />,
  };
  return iconMap[iconName] || <Dashboard />;
};

const MainLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hospitalName, setHospitalName] = React.useState<string>('');
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';
  const userRole = (user.role || 'DOCTOR') as UserRole;

  // Fetch hospital name for non-super-admin users
  React.useEffect(() => {
    if (user.hospitalId && userRole !== 'SUPER_ADMIN') {
      const fetchHospitalName = async () => {
        try {
          const response: any = await api.get(`/api/v1/hospitals/${user.hospitalId}`);
          setHospitalName(response.data?.name || '');
        } catch (err) {
          console.error('Error fetching hospital:', err);
        }
      };
      fetchHospitalName();
    }
  }, [user.hospitalId, userRole]);
  
  // Get menu items based on user role
  const roleBasedMenuItems = getMenuItemsForRole(userRole);
  
  // Map menu items to include icons
  const menuItems = roleBasedMenuItems.map(item => ({
    text: item.text,
    icon: getIconComponent(item.icon),
    path: item.path,
    badge: item.badge,
  }));

  // Get role-specific colors
  const getRoleColor = (role: string) => {
    const roleColors: { [key: string]: string } = {
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

  const getRoleLabel = (role: string) => {
    const roleLabels: { [key: string]: string } = {
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

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const drawer = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: getRoleColor(userRole),
        color: 'white',
      }}
    >
      <Box sx={{ p: 3, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 24,
            }}
          >
            🏥
          </Box>
          <Box>
            <Typography variant="h6" fontWeight="700" sx={{ lineHeight: 1.2 }}>
              AbhaAyushman
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85, fontSize: '0.7rem' }}>
              ABDM Integrated HIMS
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ px: 2, mb: 2 }}>
        <Box
          sx={{
            background: alpha('#ffffff', 0.15),
            borderRadius: 2,
            p: 2,
            backdropFilter: 'blur(10px)',
            border: '1px solid',
            borderColor: alpha('#ffffff', 0.2),
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              sx={{
                width: 48,
                height: 48,
                bgcolor: 'rgba(255,255,255,0.3)',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '1.1rem',
              }}
            >
              {userName.substring(0, 2).toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight="600" noWrap>
                {userName}
              </Typography>
              <Chip
                label={getRoleLabel(userRole)}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  bgcolor: 'rgba(255,255,255,0.25)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  mt: 0.5,
                }}
              />
            </Box>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ borderColor: alpha('#ffffff', 0.2), mx: 2 }} />

      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <List sx={{ px: 2, py: 2 }}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => navigate(item.path)}
                  sx={{
                    borderRadius: 2,
                    py: 1.5,
                    px: 2,
                    color: 'white',
                    transition: 'all 0.2s',
                    backgroundColor: isActive ? alpha('#ffffff', 0.2) : 'transparent',
                    '&:hover': {
                      backgroundColor: alpha('#ffffff', 0.15),
                      transform: 'translateX(4px)',
                    },
                    '&:before': isActive
                      ? {
                          content: '""',
                          position: 'absolute',
                          left: 0,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: 4,
                          height: '60%',
                          bgcolor: 'white',
                          borderRadius: '0 4px 4px 0',
                        }
                      : {},
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: 'white',
                      minWidth: 40,
                      opacity: isActive ? 1 : 0.8,
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontWeight: isActive ? 600 : 500,
                      fontSize: '0.9rem',
                    }}
                  />
                  {item.badge && (
                    <Chip
                      label={item.badge}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        bgcolor: '#4caf50',
                        color: 'white',
                      }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      <Divider sx={{ borderColor: alpha('#ffffff', 0.2), mx: 2 }} />

      <List sx={{ px: 2, py: 2 }}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: 2,
              py: 1.5,
              px: 2,
              color: 'white',
              '&:hover': {
                backgroundColor: alpha('#d32f2f', 0.3),
              },
            }}
          >
            <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
              <Logout />
            </ListItemIcon>
            <ListItemText
              primary="Logout"
              primaryTypographyProps={{
                fontWeight: 500,
                fontSize: '0.9rem',
              }}
            />
          </ListItemButton>
        </ListItem>
      </List>

      <Box sx={{ p: 2, pt: 0 }}>
        <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', textAlign: 'center', mb: 0.5 }}>
          AbhaAyushman v1.0.0
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.6, display: 'block', textAlign: 'center', fontSize: '0.65rem' }}>
          ABDM Certified Healthcare
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', width: '100%', minHeight: '100vh', bgcolor: '#f5f7fa' }}>
      <AppBar
        position="fixed"
        elevation={1}
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          bgcolor: 'white',
          color: 'text.primary',
          borderBottom: '2px solid',
          borderColor: 'divider',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            {hospitalName && userRole !== 'SUPER_ADMIN' && (
              <Box 
                sx={{ 
                  display: { xs: 'none', md: 'flex' }, 
                  alignItems: 'center', 
                  gap: 1,
                  px: 2,
                  py: 0.75,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                }}
              >
                <Box sx={{ fontSize: 18 }}>🏥</Box>
                <Typography variant="body2" fontWeight="600">
                  {hospitalName}
                </Typography>
              </Box>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton 
              size="large"
              onClick={() => navigate('/notifications')}
              title="Notifications"
            >
              <Badge badgeContent={3} color="error">
                <Notifications />
              </Badge>
            </IconButton>
            <IconButton 
              size="large"
              onClick={() => navigate('/settings')}
              title="Settings"
            >
              <Settings />
            </IconButton>
            <IconButton 
              size="large"
              onClick={() => navigate('/profile')}
              title="Profile"
            >
              <AccountCircle />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              border: 'none',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              border: 'none',
              boxShadow: '4px 0 24px rgba(0,0,0,0.12)',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3, md: 4 },
          pt: 0,
          minHeight: '100vh',
          bgcolor: '#f5f7fa',
          width: '100%',
        }}
      >
        <Toolbar />
        <Box sx={{ mt: 2, width: '100%', maxWidth: '1400px', mx: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout;
