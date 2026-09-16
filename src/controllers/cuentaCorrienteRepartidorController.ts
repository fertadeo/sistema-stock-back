import { Request, Response } from 'express';
import { CuentaCorrienteRepartidorService } from '../services/cuentaCorrienteRepartidorService';
import { AuthRequest } from '../middlewares/auth';

const cuentaCorrienteRepartidorService = new CuentaCorrienteRepartidorService();

const parseRepartidorId = (repartidorIdParam: string): number => {
  const repartidorId = parseInt(repartidorIdParam, 10);

  if (Number.isNaN(repartidorId)) {
    throw new Error('ID de repartidor inválido');
  }

  return repartidorId;
};

const parseQueryNumber = (valor: unknown, valorPorDefecto: number): number => {
  const valorNormalizado = Array.isArray(valor) ? valor[0] : valor;

  if (
    valorNormalizado === undefined ||
    valorNormalizado === null ||
    valorNormalizado === '' ||
    valorNormalizado === 'undefined' ||
    valorNormalizado === 'null'
  ) {
    return valorPorDefecto;
  }

  return parseInt(String(valorNormalizado), 10);
};

const parsePagination = (req: Request) => {
  const page = parseQueryNumber(req.query.page, 1);
  const limit = parseQueryNumber(req.query.limit, 20);

  if (Number.isNaN(page) || page <= 0) {
    throw new Error('El parámetro page debe ser un número mayor a 0');
  }

  if (Number.isNaN(limit) || limit <= 0 || limit > 100) {
    throw new Error('El parámetro limit debe ser un número entre 1 y 100');
  }

  return { page, limit };
};

const parseDateQuery = (valor: unknown, finDelDia: boolean): Date | undefined => {
  if (valor === undefined) {
    return undefined;
  }

  if (typeof valor !== 'string' || !valor.trim()) {
    throw new Error('Parámetro de fecha inválido');
  }

  const fechaBase = /^\d{4}-\d{2}-\d{2}$/.test(valor)
    ? `${valor}${finDelDia ? 'T23:59:59.999Z' : 'T00:00:00.000Z'}`
    : valor;

  const fecha = new Date(fechaBase);
  if (Number.isNaN(fecha.getTime())) {
    throw new Error(`Fecha inválida: ${valor}`);
  }

  return fecha;
};

const responderError = (res: Response, error: unknown, mensajePorDefecto: string) => {
  if (error instanceof Error) {
    if (error.message === 'Repartidor no encontrado') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (
      error.message === 'ID de repartidor inválido' ||
      error.message.includes('page') ||
      error.message.includes('limit') ||
      error.message.includes('Fecha inválida') ||
      error.message.includes('Parámetro de fecha inválido') ||
      error.message === 'El monto debe ser un número mayor a 0' ||
      error.message === 'Medio de pago inválido'
    ) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  console.error(`[CuentaCorrienteRepartidorController] ${mensajePorDefecto}:`, error);

  return res.status(500).json({
    success: false,
    message: mensajePorDefecto,
    error: error instanceof Error ? error.message : 'Error desconocido'
  });
};

export const getResumenCuentaCorrienteRepartidor = async (req: Request, res: Response) => {
  try {
    const repartidorId = parseRepartidorId(req.params.id);
    const resumen = await cuentaCorrienteRepartidorService.obtenerResumenPorRepartidor(repartidorId);

    res.json({
      success: true,
      data: resumen
    });
  } catch (error) {
    responderError(res, error, 'Error al obtener el resumen de cuenta corriente del repartidor');
  }
};

export const createPagoRepartidor = async (req: AuthRequest, res: Response) => {
  try {
    const repartidorId = parseRepartidorId(req.params.id);
    const {
      monto,
      medio_pago,
      observaciones
    } = req.body;

    const resultado = await cuentaCorrienteRepartidorService.crearPagoRepartidor({
      repartidor_id: repartidorId,
      monto,
      medio_pago,
      observaciones,
      usuario_registro_id: req.user?.id
    });

    res.status(201).json({
      success: true,
      message: 'Pago registrado exitosamente',
      data: resultado
    });
  } catch (error) {
    responderError(res, error, 'Error al registrar el pago del repartidor');
  }
};

export const getCuentaCorrienteRepartidor = async (req: Request, res: Response) => {
  try {
    const repartidorId = parseRepartidorId(req.params.id);
    const { page, limit } = parsePagination(req);
    const desde = parseDateQuery(req.query.desde, false);
    const hasta = parseDateQuery(req.query.hasta, true);

    const resultado = await cuentaCorrienteRepartidorService.obtenerCuentaCorrientePorRepartidor(repartidorId, {
      page,
      limit,
      desde,
      hasta
    });

    res.json({
      success: true,
      data: {
        resumen: resultado.resumen,
        movimientos: resultado.movimientos
      },
      meta: resultado.paginacion
    });
  } catch (error) {
    responderError(res, error, 'Error al obtener la cuenta corriente del repartidor');
  }
};

export const getPagosPorRepartidor = async (req: Request, res: Response) => {
  try {
    const repartidorId = parseRepartidorId(req.params.id);
    const { page, limit } = parsePagination(req);
    const desde = parseDateQuery(req.query.desde, false);
    const hasta = parseDateQuery(req.query.hasta, true);

    const resultado = await cuentaCorrienteRepartidorService.obtenerPagosPorRepartidor(repartidorId, {
      page,
      limit,
      desde,
      hasta
    });

    res.json({
      success: true,
      data: resultado.pagos,
      meta: resultado.paginacion
    });
  } catch (error) {
    responderError(res, error, 'Error al obtener los pagos del repartidor');
  }
};

export const getRepartidoresDeudores = async (req: Request, res: Response) => {
  try {
    const deudores = await cuentaCorrienteRepartidorService.obtenerRepartidoresDeudores();

    res.json({
      success: true,
      data: deudores
    });
  } catch (error) {
    responderError(res, error, 'Error al obtener los repartidores deudores');
  }
};
