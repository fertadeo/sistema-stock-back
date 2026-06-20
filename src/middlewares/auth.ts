import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import { Request, Response, NextFunction } from 'express';
import { UserRole, isValidRole } from '../constants/roles';

export const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';

export interface AuthUserPayload {
  id: number;
  email: string;
  role: UserRole;
  repartidor_id?: string | null;
}

export interface AuthRequest extends Request {
  user?: AuthUserPayload;
}

const extractToken = (req: Request): string | null => {
  const headerToken = req.header('Authorization')?.replace(/^Bearer\s+/i, '');
  if (headerToken) {
    return headerToken;
  }

  const cookies = cookie.parse(req.headers.cookie || '');
  return cookies.token || null;
};

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ message: 'No autenticado' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;

    if (!decoded.id || !decoded.email || !decoded.role || !isValidRole(String(decoded.role))) {
      return res.status(401).json({ message: 'Token inválido' });
    }

    req.user = {
      id: Number(decoded.id),
      email: String(decoded.email),
      role: decoded.role as UserRole,
      repartidor_id: decoded.repartidor_id ? String(decoded.repartidor_id) : null,
    };

    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'No tiene permisos para esta acción' });
    }

    next();
  };
};

export const signUserToken = (payload: AuthUserPayload): string =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
