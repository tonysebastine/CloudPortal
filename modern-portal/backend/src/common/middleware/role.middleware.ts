import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware.js';

export enum UserRole {
  ADMIN = 1,
  CUSTOMER = 2,
  RESELLER = 3,
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.roleId)) {
      return res.status(403).json({
        message: 'Forbidden: Insufficient permissions for this resource',
      });
    }

    next();
  };
}

