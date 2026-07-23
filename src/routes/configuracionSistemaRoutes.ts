import { Router } from 'express';
import {
  getConfiguracionSistema,
  putConfiguracionSistema,
} from '../controllers/configuracionSistemaController';
import { authenticateToken, requireRole } from '../middlewares/auth';
import { USER_ROLES } from '../constants/roles';

const router = Router();

router.use(authenticateToken, requireRole(USER_ROLES.ADMIN, USER_ROLES.SUPERADMIN));

router.get('/', getConfiguracionSistema);
router.put('/', putConfiguracionSistema);

export default router;
