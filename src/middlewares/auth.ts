import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { UserRole, isValidRole, normalizeRole } from '../constants/roles';

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

  const queryToken = req.query?.token;
  if (typeof queryToken === 'string' && queryToken.trim()) {
    return queryToken.trim();
  }

  const cookies = cookie.parse(req.headers.cookie || '');
  return cookies.token || null;
};

const resolveRole = (user: User): UserRole => {
  if (user.role && isValidRole(user.role)) {
    return user.role;
  }
  return normalizeRole(user.nivel_usuario);
};

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ message: 'No autenticado' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;

    if (!decoded.id) {
      return res.status(401).json({ message: 'Token inválido' });
    }

    const user = await AppDataSource.getRepository(User).findOne({
      where: { id: Number(decoded.id) },
    });

    if (!user) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    const role = resolveRole(user);

    req.user = {
      id: user.id,
      email: user.email,
      role,
      repartidor_id: user.repartidor_id ? String(user.repartidor_id) : null,
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
      return res.status(403).json({
        message: 'No tiene permisos para esta acción',
        role_actual: req.user.role,
        roles_permitidos: roles,
      });
    }

    next();
  };
};

export const signUserToken = (payload: AuthUserPayload): string =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
