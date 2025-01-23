import { Request, Response } from "express";
import { VentaService } from "../services/ventaService";

export class VentaController {
    private ventaService = new VentaService();

    crearVenta = async (req: Request, res: Response) => {
        try {
            const ventaData = req.body;
            const nuevaVenta = await this.ventaService.crearVenta(ventaData);
            res.status(201).json(nuevaVenta);
        } catch (error) {
            res.status(500).json({ 
                message: "Error al crear la venta",
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }

    obtenerResumenVentas = async (req: Request, res: Response) => {
        try {
            const { fechaInicio, fechaFin } = req.query;
            
            const fechaInicioDate = fechaInicio ? new Date(fechaInicio as string) : undefined;
            const fechaFinDate = fechaFin ? new Date(fechaFin as string) : undefined;

            const resumen = await this.ventaService.obtenerResumenVentas(
                fechaInicioDate,
                fechaFinDate
            );

            res.json(resumen);
        } catch (error) {
            res.status(500).json({ 
                message: "Error al obtener el resumen de ventas",
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }
} 