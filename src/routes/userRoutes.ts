import { Router } from 'express';
import { createUser, getUsers, updateUser } from '../controllers/userController';
import { authenticateToken, requireRole } from '../middlewares/auth';
import { USER_ROLES } from '../constants/roles';

const router = Router();

router.use(authenticateToken, requireRole(USER_ROLES.SUPERADMIN));

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);

export default router;
