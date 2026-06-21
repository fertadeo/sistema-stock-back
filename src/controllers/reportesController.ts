import { Request, Response } from 'express';
import { ReportesService } from '../services/reportesService';

const reportesService = new ReportesService();

function parseFechas(query: Request['query']): { inicio: Date; fin: Date } | null {
    const { fechaInicio, fechaFin } = query;

    if (!fechaInicio || !fechaFin) {
        return null;
    }

    const inicio = new Date(fechaInicio as string);
    const fin = new Date(fechaFin as string);

    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
        return null;
    }

    return { inicio, fin };
}

function fechasPorDefecto(): { inicio: Date; fin: Date } {
    const fin = new Date();
    const inicio = new Date(fin);
    inicio.setDate(inicio.getDate() - 29);
    return { inicio, fin };
}

export const reportesController = {
    obtenerReporte: async (req: Request, res: Response) => {
        try {
            const fechas = parseFechas(req.query) ?? fechasPorDefecto();
            const reporte = await reportesService.obtenerReporteCompleto(fechas.inicio, fechas.fin);

            res.json({ success: true, ...reporte });
        } catch (error) {
            console.error('Error al obtener reporte:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener el reporte',
                error: error instanceof Error ? error.message : 'Error desconocido',
            });
        }
    },
};
