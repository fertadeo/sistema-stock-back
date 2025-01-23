import { Request, Response } from 'express';
import { Proveedores } from '../entities/Proveedores';
import { AppDataSource } from '../config/database';

const proveedorRepository = AppDataSource.getRepository(Proveedores);

export const obtenerTodosLosProveedores = async (req: Request, res: Response) => {
  try {
    const proveedores = await proveedorRepository.find(); // Opción de usar relaciones si es necesario
    res.status(200).json(proveedores); // Devuelve los proveedores en formato JSON
  } catch (error) {
    console.error('Error al obtener todos los proveedores:', error);
    res.status(500).json({ message: 'Error al obtener todos los proveedores' });
  }
};
