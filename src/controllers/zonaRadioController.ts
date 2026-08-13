import { Request, Response } from 'express';
import { ZonaRadioService } from '../services/zonaRadioService';

export class ZonaRadioController {
  private service = new ZonaRadioService();

  listar = async (req: Request, res: Response) => {
    try {
      const incluirInactivas =
        req.query.todos === '1' || req.query.todos === 'true';
      const zonas = await this.service.listar(incluirInactivas);
      res.json(zonas);
    } catch (error) {
      res.status(500).json({
        message: 'Error al obtener zonas',
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  };

  obtenerPorId = async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        res.status(400).json({ message: 'ID inválido' });
        return;
      }
      const zona = await this.service.obtenerPorId(id);
      res.json(zona);
    } catch (error) {
      res.status(404).json({
        message: 'Zona no encontrada',
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  };

  limitesBarrio = async (req: Request, res: Response) => {
    try {
      const barrio = String(req.body?.barrio ?? req.query?.barrio ?? '').trim();
      const resultado = await this.service.limitesBarrio(barrio);
      res.json(resultado);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      const status =
        message.includes('obligatorio') || message.includes('No se pudieron')
          ? 400
          : 500;
      res.status(status).json({
        message: 'Error al obtener límites del barrio',
        error: message,
      });
    }
  };

  crear = async (req: Request, res: Response) => {
    try {
      const zona = await this.service.crear(req.body);
      res.status(201).json(zona);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      const status =
        message.includes('obligatorio') ||
        message.includes('inválid') ||
        message.includes('radio') ||
        message.includes('polígono')
          ? 400
          : 500;
      res.status(status).json({ message: 'Error al crear zona', error: message });
    }
  };

  actualizar = async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        res.status(400).json({ message: 'ID inválido' });
        return;
      }
      const zona = await this.service.actualizar(id, req.body);
      res.json(zona);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      const status =
        message === 'Zona no encontrada'
          ? 404
          : message.includes('obligatorio') ||
              message.includes('inválid') ||
              message.includes('radio') ||
              message.includes('polígono')
            ? 400
            : 500;
      res.status(status).json({ message: 'Error al actualizar zona', error: message });
    }
  };

  eliminar = async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        res.status(400).json({ message: 'ID inválido' });
        return;
      }
      await this.service.eliminar(id);
      res.json({ message: 'Zona eliminada exitosamente' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      res.status(message === 'Zona no encontrada' ? 404 : 500).json({
        message: 'Error al eliminar zona',
        error: message,
      });
    }
  };
}
