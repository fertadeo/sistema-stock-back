import { Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { Repartidor } from '../entities/Repartidor';
import bcrypt from 'bcrypt';
import { AuthRequest, AuthUserPayload } from '../middlewares/auth';
import { roleLabel, USER_ROLES, UserRole, isValidRole } from '../constants/roles';

const saltRounds = 10;

const serializeUser = (user: User) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  role_label: roleLabel(user.role),
  repartidor_id: user.repartidor_id,
  created_at: user.created_at,
});

const nivelFromRole = (role: UserRole): number => {
  if (role === USER_ROLES.REPARTIDOR) return 1;
  if (role === USER_ROLES.SUPERADMIN) return 3;
  return 2;
};

const canAssignRole = (actorRole: UserRole, targetRole: UserRole): boolean => {
  if (actorRole === USER_ROLES.SUPERADMIN) return true;
  if (actorRole === USER_ROLES.ADMIN) {
    return targetRole === USER_ROLES.ADMIN || targetRole === USER_ROLES.REPARTIDOR;
  }
  return false;
};

const canManageUser = (actor: AuthUserPayload, target: User): boolean => {
  if (actor.role === USER_ROLES.SUPERADMIN) return true;
  if (actor.role === USER_ROLES.ADMIN) {
    return target.role !== USER_ROLES.SUPERADMIN;
  }
  return false;
};

const validateRepartidorId = async (repartidorId: string | null | undefined): Promise<string | null> => {
  if (!repartidorId) return null;

  const idNumerico = Number(repartidorId);
  if (Number.isNaN(idNumerico)) {
    throw new Error('Repartidor no encontrado');
  }

  const repartidor = await AppDataSource.getRepository(Repartidor).findOneBy({
    id: idNumerico,
  });

  if (!repartidor) {
    throw new Error('Repartidor no encontrado');
  }

  return String(repartidor.id);
};

export const getUsers = async (_req: AuthRequest, res: Response) => {
  try {
    const users = await AppDataSource.getRepository(User).find({
      order: { created_at: 'DESC' },
    });

    res.status(200).json({
      success: true,
      data: users.map((user) => serializeUser(user)),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  const { email, password, role, repartidor_id } = req.body;
  const actor = req.user!;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña son obligatorios' });
    }

    if (!role || !isValidRole(role)) {
      return res.status(400).json({ message: 'Rol inválido' });
    }

    if (!canAssignRole(actor.role, role)) {
      return res.status(403).json({ message: 'No tiene permisos para asignar ese rol' });
    }

    if (role === USER_ROLES.REPARTIDOR && !repartidor_id) {
      return res.status(400).json({ message: 'Debe seleccionar un repartidor para cuentas de repartidor' });
    }

    const existingUser = await AppDataSource.getRepository(User).findOneBy({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    const repartidorIdValidado =
      role === USER_ROLES.REPARTIDOR
        ? await validateRepartidorId(repartidor_id)
        : null;

    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const newUser = AppDataSource.getRepository(User).create({
      email,
      password: hashedPassword,
      role,
      nivel_usuario: nivelFromRole(role),
      repartidor_id: repartidorIdValidado,
    });

    await AppDataSource.getRepository(User).save(newUser);

    res.status(201).json({
      success: true,
      data: serializeUser(newUser),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Repartidor no encontrado') {
      return res.status(400).json({ message: error.message });
    }
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const { role, repartidor_id, password } = req.body;
  const actor = req.user!;

  try {
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOneBy({ id });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (!canManageUser(actor, user)) {
      return res.status(403).json({ message: 'No tiene permisos para modificar este usuario' });
    }

    if (role !== undefined) {
      if (!isValidRole(role)) {
        return res.status(400).json({ message: 'Rol inválido' });
      }
      if (!canAssignRole(actor.role, role)) {
        return res.status(403).json({ message: 'No tiene permisos para asignar ese rol' });
      }
      if (actor.id === user.id && role !== user.role) {
        return res.status(400).json({ message: 'No puede cambiar su propio rol' });
      }
      user.role = role;
      user.nivel_usuario = nivelFromRole(role);
    }

    const rolFinal = user.role;

    if (repartidor_id !== undefined || role !== undefined) {
      if (rolFinal === USER_ROLES.REPARTIDOR) {
        const repartidorIdValidado = await validateRepartidorId(
          repartidor_id !== undefined ? repartidor_id : user.repartidor_id
        );
        if (!repartidorIdValidado) {
          return res.status(400).json({ message: 'Debe seleccionar un repartidor para cuentas de repartidor' });
        }
        user.repartidor_id = repartidorIdValidado;
      } else {
        user.repartidor_id = null;
      }
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
      }
      user.password = await bcrypt.hash(password, saltRounds);
    }

    if (role === undefined && repartidor_id === undefined && !password) {
      return res.status(400).json({ message: 'No hay cambios para aplicar' });
    }

    await userRepository.save(user);

    res.json({
      success: true,
      data: serializeUser(user),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Repartidor no encontrado') {
      return res.status(400).json({ message: error.message });
    }
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};
