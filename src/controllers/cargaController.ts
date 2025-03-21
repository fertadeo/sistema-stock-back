import { Request, Response } from "express";
import { CargaService } from "../services/cargaService";

export class CargaController {
    private cargaService = new CargaService();

     crear = async (req: Request, res: Response) => {
        try {
            const carga = await this.cargaService.crearCarga(req.body);
            res.status(201).json(carga);
        } catch (error) {
            res.status(500).json({
                message: "Error al crear la carga",
                error: (error as Error).message
            });
        }
    }

     obtenerPorRepartidor = async (req: Request, res: Response) => {
        try {
            const { repartidorId } = req.params;
            const cargas = await this.cargaService.obtenerCargasPorRepartidor(parseInt(repartidorId));
            res.json(cargas);
        } catch (error) {
            res.status(500).json({
                message: "Error al obtener las cargas",
                error: (error as Error).message
            });
        }
    }

     actualizarEstado = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { estado } = req.body;
            const carga = await this.cargaService.actualizarEstadoCarga(parseInt(id), estado);
            res.json(carga);
        } catch (error) {
            res.status(500).json({
                message: "Error al actualizar el estado de la carga",
                error: (error as Error).message
            });
        }
    }

    obtenerCargasPendientesPorRepartidor = async (req: Request, res: Response) => {
        try {
            const { repartidorId } = req.params;
            const cargas = await this.cargaService.obtenerCargasPendientesPorRepartidor(parseInt(repartidorId));
            res.json(cargas);
        } catch (error) {
            res.status(500).json({
                message: "Error al obtener las cargas pendientes",
                error: (error as Error).message
            });
        }
    }
} 