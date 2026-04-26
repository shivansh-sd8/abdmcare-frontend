import React from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Chip,
  useMediaQuery,
  useTheme,
  IconButton,
} from '@mui/material';
import {
  Logout,
  Settings,
  Person,
  MoreVert,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useRolePermissions } from '../../hooks/useRolePermissions';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const permissions = useRolePermissions();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [hospitalName, setHospitalName] = React.useState<string>('');
  const [userName, setUserName] = React.useState<string>('');
  const [userRole, setUserRole] = React.useState<string>('');

  React.useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setUserName(`${user.firstName || ''} ${user.lastName || ''}`.trim());
      setUserRole(user.role || '');
      
      if (user.hospitalId && !permissions.isSuperAdmin) {
        // Fetch hospital name
        const fetchHospitalName = async () => {
          try {
            const response = await fetch(`/api/v1/hospitals/${user.hospitalId}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
              },
            });
            const data = await response.json();
            setHospitalName(data.data?.name || '');
          } catch (err) {
            console.error('Error fetching hospital:', err);
          }
        };
        fetchHospitalName();
      }
    }
  }, [permissions.isSuperAdmin]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const getRoleColor = (role: string) => {
    const roleColors: { [key: string]: string } = {
      SUPER_ADMIN: '#FF6B6B',
      ADMIN: '#4A90E2',
      DOCTOR: '#50C878',
      NURSE: '#9B59B6',
      RECEPTIONIST: '#F39C12',
      LAB_TECHNICIAN: '#E74C3C',
      PHARMACIST: '#3498DB',
    };
    return roleColors[role] || '#95A5A6';
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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#f5f7fa' }}>
      {/* Header */}
      <AppBar
        position="sticky"
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', py: 1 }}>
          {/* Left side - Logo and App Name */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
              }}
            >
              🏥
            </Box>
            <Box>
              <Typography
                variant="h6"
                fontWeight="bold"
                sx={{ lineHeight: 1, mb: 0.3 }}
              >
                AbhaAyushman
              </Typography>
              <Typography
                variant="caption"
                sx={{ opacity: 0.9, fontSize: '0.7rem' }}
              >
                ABDM Integrated HIMS
              </Typography>
            </Box>
          </Box>

          {/* Center - Hospital Name (for non-super-admin) */}
          {!permissions.isSuperAdmin && hospitalName && (
            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {hospitalName}
              </Typography>
            </Box>
          )}

          {/* Right side - User Info */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Role Badge */}
            <Chip
              label={getRoleLabel(userRole)}
              size="small"
              sx={{
                backgroundColor: getRoleColor(userRole),
                color: 'white',
                fontWeight: 600,
                display: { xs: 'none', sm: 'flex' },
              }}
            />

            {/* User Avatar and Menu */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar
                sx={{
                  bgcolor: getRoleColor(userRole),
                  cursor: 'pointer',
                  width: 36,
                  height: 36,
                  fontSize: '0.9rem',
                }}
                onClick={handleMenuOpen}
              >
                {userName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()}
              </Avatar>
              {!isMobile && (
                <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    fontWeight="600"
                    sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    {userName}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    {getRoleLabel(userRole)}
                  </Typography>
                </Box>
              )}
              <IconButton
                size="small"
                onClick={handleMenuOpen}
                sx={{ color: 'white', ml: 0.5 }}
              >
                <MoreVert fontSize="small" />
              </IconButton>
            </Box>

            {/* User Menu */}
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem disabled>
                <Person fontSize="small" sx={{ mr: 1 }} />
                <Typography variant="body2">{userName}</Typography>
              </MenuItem>
              <Divider />
              <MenuItem onClick={() => { navigate('/profile'); handleMenuClose(); }}>
                <Settings fontSize="small" sx={{ mr: 1 }} />
                Profile Settings
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout} sx={{ color: '#E74C3C' }}>
                <Logout fontSize="small" sx={{ mr: 1 }} />
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          p: { xs: 2, sm: 3, md: 4 },
          maxWidth: '1400px',
          width: '100%',
          mx: 'auto',
        }}
      >
        {children}
      </Box>

      {/* Footer */}
      <Box
        sx={{
          bgcolor: '#2c3e50',
          color: 'white',
          py: 3,
          px: 4,
          textAlign: 'center',
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          AbhaAyushman HIMS v1.0.0 | ABDM Integrated Healthcare Management System
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          © 2026 MediSync. All rights reserved. | Powered by ABDM
        </Typography>
      </Box>
    </Box>
  );
};

export default MainLayout;
