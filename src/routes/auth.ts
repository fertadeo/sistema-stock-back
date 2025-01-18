
// routes/auth.ts
import { Router } from 'express';
import bcrypt from 'bcrypt';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import  jwt  from 'jsonwebtoken';

const router = Router();

router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  try {
    const userRepository = AppDataSource.getRepository(User);

    // Verificar si el usuario ya existe
    const existingUser = await userRepository.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear y guardar el usuario en la base de datos
    const newUser = userRepository.create({ email, password: hashedPassword });
    await userRepository.save(newUser);

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const userRepository = AppDataSource.getRepository(User);

    // Buscar al usuario por email
    const user = await userRepository.findOne({ where: { email } });

    if (!user) {
      return res.status(400).json({ message: 'Email o contraseña incorrectos' });
    }

    // Comparar la contraseña
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Email o contraseña incorrectos' });
    }

    // Crear el token JWT
    const token = jwt.sign({ id: user.id, email: user.email }, 'secret_key', { expiresIn: '1h' });

    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

