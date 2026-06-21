import { Router } from 'express';
import { requireRole } from '../middlewares/auth';
import { USER_ROLES } from '../constants/roles';
import { reportesController } from '../controllers/reportesController';

const router = Router();

router.use(requireRole(USER_ROLES.ADMIN, USER_ROLES.SUPERADMIN));

router.get('/', reportesController.obtenerReporte);

export default router;
