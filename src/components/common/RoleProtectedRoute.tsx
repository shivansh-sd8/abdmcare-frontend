import React from 'react';
import { Navigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import { Lock } from '@mui/icons-material';
import { UserRole } from '../../config/rolePermissions';

interface RoleProtectedRouteProps {
  children: React.ReactElement;
  requiredRoles: UserRole[];
  redirectTo?: string;
}

const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ 
  children, 
  requiredRoles,
  redirectTo = '/dashboard' 
}) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = user.role as UserRole;

  if (!userRole) {
    return <Navigate to="/login" replace />;
  }

  if (!requiredRoles.includes(userRole)) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          textAlign: 'center',
          p: 4,
        }}
      >
        <Lock sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Access Denied
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 500 }}>
          You don't have permission to access this page. This area is restricted to{' '}
          {requiredRoles.join(', ')} roles only.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Your current role: <strong>{userRole}</strong>
        </Typography>
        <Button
          variant="contained"
          onClick={() => window.location.href = redirectTo}
          size="large"
        >
          Go to Dashboard
        </Button>
      </Box>
    );
  }

  return children;
};

export default RoleProtectedRoute;
