import React from 'react';
import { useRolePermissions } from '../../hooks/useRolePermissions';
import { UserRole } from '../../config/rolePermissions';

interface PermissionGuardProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
  fallback?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  requiredRoles,
  fallback = null,
}) => {
  const { role } = useRolePermissions();

  if (!requiredRoles || requiredRoles.length === 0) {
    return <>{children}</>;
  }

  const hasPermission = requiredRoles.includes(role);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

interface ConditionalRenderProps {
  children: React.ReactNode;
  condition: boolean;
  fallback?: React.ReactNode;
}

export const ConditionalRender: React.FC<ConditionalRenderProps> = ({
  children,
  condition,
  fallback = null,
}) => {
  return condition ? <>{children}</> : <>{fallback}</>;
};
