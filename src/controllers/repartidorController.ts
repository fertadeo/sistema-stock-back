import { Request, Response } from "express";
import { RepartidorService } from "../services/repartidorService";

export class RepartidorController {
    private repartidorService = new RepartidorService();

     crear = async (req: Request, res: Response) => {
        try {
            const repartidor = await this.repartidorService.crearRepartidor(req.body);
            res.status(201).json(repartidor);
        } catch (error) {
            res.status(500).json({
                message: "Error al crear repartidor",
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }

     obtenerTodos = async (req: Request, res: Response) => {
        try {
            const repartidores = await this.repartidorService.obtenerRepartidores();
            res.json(repartidores);
        } catch (error) {
            res.status(500).json({
                message: "Error al obtener repartidores",
                 error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }

     obtenerPorId = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const repartidor = await this.repartidorService.obtenerRepartidorPorId(id);
            res.json(repartidor);
        } catch (error) {
            res.status(404).json({
                message: "Repartidor no encontrado",
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }

   actualizar = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const repartidor = await this.repartidorService.actualizarRepartidor(id, req.body);
            res.json(repartidor);
        } catch (error) {
            res.status(500).json({
                message: "Error al actualizar repartidor",
                 error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }

    eliminar = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            await this.repartidorService.eliminarRepartidor(id);
            res.json({ message: "Repartidor eliminado exitosamente" });
        } catch (error) {
            res.status(500).json({
                message: "Error al eliminar repartidor",
                 error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }

     obtenerPorZona = async (req: Request, res: Response) => {
        try {
            const { zona } = req.query;
            const repartidores = await this.repartidorService.obtenerRepartidoresPorZona(zona as string);
            res.json(repartidores);
        } catch (error) {
            res.status(500).json({
                message: "Error al obtener repartidores por zona",
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }
} 