import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';



const saltRounds = 10;

// Registrar nuevo usuario
export const registerUser = async (req: Request, res: Response) => {
  const { email, password, nivel_usuario } = req.body;

  try {
    // Verificar si el usuario ya existe
    const existingUser = await AppDataSource.getRepository(User).findOneBy({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash del password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Crear un nuevo usuario
    const newUser = new User();
    newUser.email = email;
    newUser.password = hashedPassword;
    newUser.nivel_usuario = nivel_usuario;
    await AppDataSource.getRepository(User).save(newUser);

    // Generar un JWT para el usuario recién creado
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }  // El token expira en 1 hora
    );

    // Establecer la cookie con el token
    res.setHeader('Set-Cookie', cookie.serialize('token', token, {
      httpOnly: true,       // Solo accesible desde el servidor
      secure: process.env.NODE_ENV !== 'development',  // Solo en HTTPS en producción
      maxAge: 60 * 60,      // Duración de 1 hora
      path: '/',            // Disponible en toda la aplicación
    }));

    res.status(201).json({
      message: 'User created successfully',
      token, // Esto es opcional, ya que el token también se envía como cookie
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login de usuario (nuevo método)
export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    // Buscar al usuario por su email
    const user = await AppDataSource.getRepository(User).findOneBy({ email });

    if (!user) {
      return res.status(401).json({ message: 'Email o contraseña incorrectos' });
    }

    // Verificar la contraseña
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Email o contraseña incorrectos' });
    }

    // Generar el token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }  // El token expira en 1 hora
    );

    // Establecer la cookie con el token
    res.setHeader('Set-Cookie', cookie.serialize('token', token, {
      httpOnly: true,       // Solo accesible desde el servidor
      secure: process.env.NODE_ENV !== 'development',  // Solo en HTTPS en producción
      maxAge: 60 * 60,      // Duración de 1 hora
      path: '/',            // Disponible en toda la aplicación
    }));

    // Respuesta exitosa con el token en la cookie
    res.status(200).json({
      message: 'Login successful',
      token,  // Puedes enviar el token en el cuerpo de la respuesta si lo deseas
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Obtener usuarios
export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await AppDataSource.getRepository(User).find();
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
