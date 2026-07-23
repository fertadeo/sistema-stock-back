import { Router } from 'express';
import bcrypt from 'bcrypt';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { Repartidor } from '../entities/Repartidor';
import {
  AuthRequest,
  authenticateToken,
  signUserToken,
} from '../middlewares/auth';
import { normalizeRole, roleLabel, USER_ROLES, UserRole } from '../constants/roles';

const router = Router();

const serializeUser = async (user: User) => {
  let repartidor_nombre: string | null = null;
  if (user.repartidor_id) {
    const id = Number(user.repartidor_id);
    if (!Number.isNaN(id)) {
      const repartidor = await AppDataSource.getRepository(Repartidor).findOneBy({ id });
      repartidor_nombre = repartidor?.nombre?.trim() || null;
    }
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    role_label: roleLabel(user.role),
    repartidor_id: user.repartidor_id,
    repartidor_nombre,
    solo_clientes_propios: Boolean(user.solo_clientes_propios),
    created_at: user.created_at,
  };
};

router.post('/register', async (req, res) => {
  const { email, password, role, repartidor_id } = req.body;

  try {
    const userRepository = AppDataSource.getRepository(User);
    const existingUser = await userRepository.findOne({ where: { email } });

    if (existingUser) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole: UserRole = role && Object.values(USER_ROLES).includes(role)
      ? role
      : USER_ROLES.ADMIN;

    const newUser = userRepository.create({
      email,
      password: hashedPassword,
      nivel_usuario: userRole === USER_ROLES.REPARTIDOR ? 1 : userRole === USER_ROLES.SUPERADMIN ? 3 : 2,
      role: userRole,
      repartidor_id: repartidor_id || null,
    });

    await userRepository.save(newUser);

    res.status(201).json({
      message: 'Usuario registrado correctamente',
      user: await serializeUser(newUser),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { email } });

    if (!user || !user.activo) {
      return res.status(400).json({ message: 'Email o contraseña incorrectos' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Email o contraseña incorrectos' });
    }

    user.last_login = new Date();
    await userRepository.save(user);

    const role = user.role || normalizeRole(user.nivel_usuario);
    const token = signUserToken({
      id: user.id,
      email: user.email,
      role,
      repartidor_id: user.repartidor_id,
      solo_clientes_propios: Boolean(user.solo_clientes_propios),
    });

    res.json({
      token,
      user: await serializeUser({ ...user, role }),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = await AppDataSource.getRepository(User).findOne({
      where: { id: req.user!.id },
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const role = user.role || normalizeRole(user.nivel_usuario);

    res.json({
      user: await serializeUser({ ...user, role }),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;
