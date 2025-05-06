import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Revendedor } from '../entities/Revendedor';

const revendedorRepository = AppDataSource.getRepository(Revendedor);

export const getRevendedores = async (req: Request, res: Response) => {
    try {
        const revendedores = await revendedorRepository.find({
            order: {
                nombre: 'ASC'
            }
        });

        res.json({
            success: true,
            revendedores
        });
    } catch (error) {
        console.error('Error al obtener revendedores:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los revendedores',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};

export const createRevendedor = async (req: Request, res: Response) => {
    try {
        const { nombre } = req.body;

        if (!nombre) {
            return res.status(400).json({
                success: false,
                message: 'El nombre del revendedor es requerido'
            });
        }

        const revendedor = new Revendedor();
        revendedor.nombre = nombre;

        const savedRevendedor = await revendedorRepository.save(revendedor);

        res.status(201).json({
            success: true,
            message: 'Revendedor creado exitosamente',
            revendedor: savedRevendedor
        });
    } catch (error) {
        console.error('Error al crear revendedor:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear el revendedor',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
}; 