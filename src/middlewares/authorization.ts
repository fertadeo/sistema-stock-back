import { Request, Response, NextFunction } from 'express';
import { USER_ROLES, UserRole } from '../constants/roles';

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: UserRole;
  };
}

export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'No tienes permisos para acceder a este recurso',
        required: roles,
        current: req.user.role,
      });
    }

    next();
  };
};

export const requireAdmin = requireRole(USER_ROLES.ADMIN, USER_ROLES.SUPERADMIN);

export const requireAdminOrSistema = requireRole(USER_ROLES.ADMIN, USER_ROLES.SUPERADMIN);

export const requireRepartidorOrAbove = requireRole(
  USER_ROLES.ADMIN,
  USER_ROLES.SUPERADMIN,
  USER_ROLES.REPARTIDOR
);
