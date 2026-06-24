import { Response } from 'express';
import { TipoMovimientoEnvase } from '../entities/MovimientoEnvase';
import { EnvasesClienteService } from '../services/envasesClienteService';
import { AuthRequest } from '../middlewares/auth';
import { verificarAccesoClientePorId } from '../utils/repartidorClienteAccess';

const envasesClienteService = new EnvasesClienteService();

const parseClienteId = (value: string): number => {
  const clienteId = parseInt(value, 10);
  if (Number.isNaN(clienteId)) {
    throw new Error('ID de cliente inválido');
  }

  return clienteId;
};

const parsePagination = (req: AuthRequest) => {
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

  if (Number.isNaN(page) || page <= 0) {
    throw new Error('El parámetro page debe ser un número mayor a 0');
  }

  if (Number.isNaN(limit) || limit <= 0 || limit > 100) {
    throw new Error('El parámetro limit debe ser un número entre 1 y 100');
  }

  return { page, limit };
};

const parseTipoMovimiento = (value: unknown): TipoMovimientoEnvase | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new Error('Tipo de movimiento inválido');
  }

  const tiposValidos = Object.values(TipoMovimientoEnvase);
  if (!tiposValidos.includes(value as TipoMovimientoEnvase)) {
    throw new Error('Tipo de movimiento inválido');
  }

  return value as TipoMovimientoEnvase;
};

const responderError = (res: Response, error: unknown, mensajePorDefecto: string) => {
  if (error instanceof Error) {
    if (error.message === 'Cliente no encontrado') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (error.message === 'Sin acceso a este cliente') {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    if (
      error.message === 'ID de cliente inválido' ||
      error.message === 'Tipo de movimiento inválido' ||
      error.message.includes('page') ||
      error.message.includes('limit') ||
      error.message.includes('Debe enviar al menos un item') ||
      error.message.includes('Cantidad inválida') ||
      error.message.includes('La cantidad debe ser positiva') ||
      error.message.includes('Los ajustes requieren observaciones') ||
      error.message.includes('saldo negativo') ||
      error.message.includes('Producto con ID')
    ) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  return res.status(500).json({
    success: false,
    message: mensajePorDefecto,
    error: error instanceof Error ? error.message : 'Error desconocido'
  });
};

export const getEnvasesResumenPorCliente = async (req: AuthRequest, res: Response) => {
  try {
    const clienteId = parseClienteId(req.params.id);
    await verificarAccesoClientePorId(req, clienteId);
    const resumen = await envasesClienteService.obtenerResumenPorCliente(clienteId);

    res.json({
      success: true,
      data: resumen
    });
  } catch (error) {
    responderError(res, error, 'Error al obtener el resumen de envases');
  }
};

export const getMovimientosEnvasesPorCliente = async (req: AuthRequest, res: Response) => {
  try {
    const clienteId = parseClienteId(req.params.id);
    await verificarAccesoClientePorId(req, clienteId);
    const { page, limit } = parsePagination(req);
    const tipo = parseTipoMovimiento(req.query.tipo);

    const resultado = await envasesClienteService.obtenerMovimientosPorCliente(clienteId, {
      page,
      limit,
      tipo
    });

    res.json({
      success: true,
      data: resultado.movimientos,
      meta: resultado.paginacion
    });
  } catch (error) {
    responderError(res, error, 'Error al obtener los movimientos de envases');
  }
};

export const createMovimientoEnvasesPorCliente = async (req: AuthRequest, res: Response) => {
  try {
    const clienteId = parseClienteId(req.params.id);
    await verificarAccesoClientePorId(req, clienteId);
    const tipo = parseTipoMovimiento(req.body.tipo);

    if (!tipo) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de movimiento inválido'
      });
    }

    const { items = [], observaciones, repartidor_id, venta_relacionada_id } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'Debe enviar al menos un item'
      });
    }

    const resultado = await envasesClienteService.registrarMovimientoCliente({
      cliente_id: clienteId,
      tipo,
      items,
      observaciones,
      repartidor_id,
      venta_relacionada_id
    });

    res.status(201).json({
      success: true,
      data: resultado
    });
  } catch (error) {
    responderError(res, error, 'Error al registrar el movimiento de envases');
  }
};
