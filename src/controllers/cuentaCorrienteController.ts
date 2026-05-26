import { Request, Response } from 'express';
import { CuentaCorrienteService } from '../services/cuentaCorrienteService';

const cuentaCorrienteService = new CuentaCorrienteService();

const parseClienteId = (clienteIdParam: string): number => {
  const clienteId = parseInt(clienteIdParam, 10);

  if (Number.isNaN(clienteId)) {
    throw new Error('ID de cliente inválido');
  }

  return clienteId;
};

const parsePagination = (req: Request) => {
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
    if (error.message === 'Cliente no encontrado') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (
      error.message === 'ID de cliente inválido' ||
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

  return res.status(500).json({
    success: false,
    message: mensajePorDefecto,
    error: error instanceof Error ? error.message : 'Error desconocido'
  });
};

export const getCuentaCorrienteResumen = async (req: Request, res: Response) => {
  try {
    const clienteId = parseClienteId(req.params.id);
    const resumen = await cuentaCorrienteService.obtenerResumenPorCliente(clienteId);

    res.json({
      success: true,
      data: resumen
    });
  } catch (error) {
    responderError(res, error, 'Error al obtener el resumen de cuenta corriente');
  }
};

export const createCobroPorCliente = async (req: Request, res: Response) => {
  try {
    const clienteId = parseClienteId(req.params.id);
    const {
      monto,
      medio_pago,
      observaciones,
      venta_relacionada_id,
      repartidor_id
    } = req.body;

    const resultado = await cuentaCorrienteService.crearCobroParaCliente({
      cliente_id: clienteId,
      monto,
      medio_pago,
      observaciones,
      venta_relacionada_id,
      repartidor_id
    });

    res.status(201).json({
      success: true,
      data: resultado
    });
  } catch (error) {
    responderError(res, error, 'Error al registrar el cobro del cliente');
  }
};

export const getCuentaCorriente = async (req: Request, res: Response) => {
  try {
    const clienteId = parseClienteId(req.params.id);
    const { page, limit } = parsePagination(req);
    const desde = parseDateQuery(req.query.desde, false);
    const hasta = parseDateQuery(req.query.hasta, true);

    const resultado = await cuentaCorrienteService.obtenerCuentaCorrientePorCliente(clienteId, {
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
    responderError(res, error, 'Error al obtener la cuenta corriente del cliente');
  }
};

export const getCobrosPorCliente = async (req: Request, res: Response) => {
  try {
    const clienteId = parseClienteId(req.params.id);
    const { page, limit } = parsePagination(req);
    const desde = parseDateQuery(req.query.desde, false);
    const hasta = parseDateQuery(req.query.hasta, true);

    const resultado = await cuentaCorrienteService.obtenerCobrosPorCliente(clienteId, {
      page,
      limit,
      desde,
      hasta
    });

    res.json({
      success: true,
      data: resultado.cobros,
      meta: resultado.paginacion
    });
  } catch (error) {
    responderError(res, error, 'Error al obtener los cobros del cliente');
  }
};

export const getClientesDeudores = async (req: Request, res: Response) => {
  try {
    const { page, limit } = parsePagination(req);
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    const resultado = await cuentaCorrienteService.obtenerClientesDeudores({
      page,
      limit,
      search
    });

    res.json({
      success: true,
      data: resultado.deudores,
      meta: resultado.paginacion
    });
  } catch (error) {
    responderError(res, error, 'Error al obtener los clientes deudores');
  }
};
