import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Clientes } from '../entities/Clientes';
import { MovimientoService } from '../services/movimientoService';

const clientesRepository = AppDataSource.getRepository(Clientes);
const movimientoService = new MovimientoService();

export const clientesController = {
    // ... otros métodos ...

    crear: async (req: Request, res: Response) => {
        try {
            const cliente = clientesRepository.create(req.body);
            const clienteGuardado = await clientesRepository.save(cliente);
            const clienteCompleto = await clientesRepository.findOneByOrFail({ id: (clienteGuardado as any).id });

            // Registrar el movimiento
            await movimientoService.registrarNuevoCliente(
                clienteCompleto.nombre,
                {
                    cliente_id: clienteCompleto.id,
                    direccion: clienteCompleto.direccion,
                    telefono: clienteCompleto.telefono
                }
            );

            res.status(201).json({
                success: true,
                message: 'Cliente creado exitosamente',
                cliente: clienteCompleto
            });
        } catch (error) {
            console.error('Error al crear cliente:', error);
            res.status(500).json({
                success: false,
                message: 'Error al crear el cliente',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    },

    // ... resto del código ...
}; 