// routes/userRoutes.ts
import { Router } from 'express';
import { getUsers, registerUser } from '../controllers/userController';

const router = Router();

router.post('/register', registerUser);
router.get('/users', getUsers);
export default router;
