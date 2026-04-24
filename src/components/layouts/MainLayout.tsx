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
  Favorite,
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
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';
  const userRole = (user.role || 'DOCTOR') as UserRole;
  
  // Get menu items based on user role
  const roleBasedMenuItems = getMenuItemsForRole(userRole);
  
  // Map menu items to include icons
  const menuItems = roleBasedMenuItems.map(item => ({
    text: item.text,
    icon: getIconComponent(item.icon),
    path: item.path,
    badge: item.badge,
  }));

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
        background: 'linear-gradient(180deg, #1976d2 0%, #1565c0 100%)',
        color: 'white',
      }}
    >
      <Box sx={{ p: 3, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1976d2',
            }}
          >
            <Favorite sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight="700" sx={{ lineHeight: 1.2 }}>
              ABDM Care
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '0.75rem' }}>
              ABDM Integrated
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
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              sx={{
                width: 48,
                height: 48,
                bgcolor: 'white',
                color: '#1976d2',
                fontWeight: 'bold',
              }}
            >
              {userName.substring(0, 2).toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight="600" noWrap>
                {userName}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }} noWrap>
                {userRole}
              </Typography>
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
        <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', textAlign: 'center' }}>
          v1.0.0 • ABDM Certified
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', width: '100%', minHeight: '100vh', bgcolor: '#f8f9fa' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          bgcolor: 'white',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ justifyContent: 'flex-end' }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ display: { sm: 'none' }, mr: 'auto' }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton 
              size="large"
              onClick={() => navigate('/notifications')}
            >
              <Badge badgeContent={3} color="error">
                <Notifications />
              </Badge>
            </IconButton>
            <IconButton 
              size="large"
              onClick={() => navigate('/settings')}
            >
              <Settings />
            </IconButton>
            <IconButton 
              size="large"
              onClick={() => navigate('/profile')}
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
              boxShadow: '4px 0 24px rgba(0,0,0,0.08)',
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
          p: 3,
          pt: 0,
          minHeight: '100vh',
          bgcolor: '#f8f9fa',
          width: '100%',
        }}
      >
        <Toolbar />
        <Box sx={{ mt: 2, width: '100%' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout;
