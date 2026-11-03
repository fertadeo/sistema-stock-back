import { Response } from 'express';
import { CuentaCorrienteService } from '../services/cuentaCorrienteService';
import { AuthRequest } from '../middlewares/auth';
import {
  esErrorAccesoCliente,
  filtrarClientesPorRepartidor,
  obtenerFiltroRepartidor,
  verificarAccesoClientePorId,
} from '../utils/repartidorClienteAccess';

const cuentaCorrienteService = new CuentaCorrienteService();

const parseClienteId = (clienteIdParam: string): number => {
  const clienteId = parseInt(clienteIdParam, 10);

  if (Number.isNaN(clienteId)) {
    throw new Error('ID de cliente inválido');
  }

  return clienteId;
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

const parsePagination = (req: AuthRequest) => {
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
    if (error.message === 'Cliente no encontrado') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (
      error.message === 'Sin acceso a este cliente'
    ) {
      return res.status(403).json({
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

  const err = error as { code?: string; errno?: number; message?: string };
  const msg = String(err?.message ?? '').toLowerCase();
  const saturado =
    err?.code === 'ER_CON_COUNT_ERROR' ||
    err?.errno === 1040 ||
    msg.includes('too many connections') ||
    msg.includes('queue limit reached') ||
    msg.includes('acquire timeout') ||
    msg.includes('connection acquisition timeout');

  if (saturado) {
    console.error(`[CuentaCorrienteController] ${mensajePorDefecto}: MySQL/pool saturado`);
    return res.status(503).json({
      success: false,
      message: 'Base de datos saturada. Reintentá en unos segundos.',
      error: 'Database busy'
    });
  }

  console.error(`[CuentaCorrienteController] ${mensajePorDefecto}:`, error);

  return res.status(500).json({
    success: false,
    message: mensajePorDefecto,
    error: error instanceof Error ? error.message : 'Error desconocido'
  });
};

export const getCuentaCorrienteResumen = async (req: AuthRequest, res: Response) => {
  try {
    const clienteId = parseClienteId(req.params.id);
    await verificarAccesoClientePorId(req, clienteId);
    const resumen = await cuentaCorrienteService.obtenerResumenPorCliente(clienteId);

    res.json({
      success: true,
      data: resumen
    });
  } catch (error) {
    responderError(res, error, 'Error al obtener el resumen de cuenta corriente');
  }
};

export const createCobroPorCliente = async (req: AuthRequest, res: Response) => {
  try {
    const clienteId = parseClienteId(req.params.id);
    await verificarAccesoClientePorId(req, clienteId);
    const {
      monto,
      medio_pago,
      observaciones,
      venta_relacionada_id,
      repartidor_id,
      cobrado_por_repartidor_id,
      cobrado_por_nombre,
      historico,
    } = req.body;

    const operadorId =
      cobrado_por_repartidor_id != null
        ? Number(cobrado_por_repartidor_id)
        : req.user?.repartidor_id
          ? Number(req.user.repartidor_id)
          : null;

    const duenoId =
      repartidor_id != null
        ? Number(repartidor_id)
        : historico
          ? null
          : operadorId;

    const resultado = await cuentaCorrienteService.crearCobroParaCliente({
      cliente_id: clienteId,
      monto,
      medio_pago,
      observaciones,
      venta_relacionada_id,
      repartidor_id: duenoId,
      cobrado_por_repartidor_id: operadorId,
      cobrado_por_nombre:
        typeof cobrado_por_nombre === 'string'
          ? cobrado_por_nombre
          : req.user?.email || null,
    });

    res.status(201).json({
      success: true,
      data: resultado
    });
  } catch (error) {
    responderError(res, error, 'Error al registrar el cobro del cliente');
  }
};

export const getCuentaCorriente = async (req: AuthRequest, res: Response) => {
  try {
    const clienteId = parseClienteId(req.params.id);
    await verificarAccesoClientePorId(req, clienteId);
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

export const getCobrosPorCliente = async (req: AuthRequest, res: Response) => {
  try {
    const clienteId = parseClienteId(req.params.id);
    await verificarAccesoClientePorId(req, clienteId);
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

export const getClientesDeudores = async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit } = parsePagination(req);
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const filtroRepartidor = await obtenerFiltroRepartidor(req.user);

    const resultado = await cuentaCorrienteService.obtenerClientesDeudores({
      page,
      limit,
      search
    });

    const deudores = filtrarClientesPorRepartidor(resultado.deudores, filtroRepartidor);

    res.json({
      success: true,
      data: deudores,
      meta: {
        ...resultado.paginacion,
        total: deudores.length,
      }
    });
  } catch (error) {
    responderError(res, error, 'Error al obtener los clientes deudores');
  }
};

export const postDeudasDelegacion = async (req: AuthRequest, res: Response) => {
  try {
    const rawIds = Array.isArray(req.body?.cliente_ids) ? req.body.cliente_ids : [];
    const clienteIds = rawIds.map((id: unknown) => Number(id)).filter((id: number) => id > 0);
    if (clienteIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debés enviar al menos un cliente_id',
      });
    }
    if (clienteIds.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Máximo 2000 clientes por consulta',
      });
    }

    const data = await cuentaCorrienteService.obtenerDeudasDelegacion(clienteIds);
    res.json({ success: true, data });
  } catch (error) {
    responderError(res, error, 'Error al obtener deudas para delegación');
  }
};

export const getCarterasDeudores = async (req: AuthRequest, res: Response) => {
  try {
    const { obtenerRepartidorNombreDeUsuario } = await import(
      '../utils/repartidorClienteAccess'
    );
    const { AppDataSource } = await import('../config/database');
    const { Repartidor } = await import('../entities/Repartidor');
    const { USER_ROLES } = await import('../constants/roles');

    let repartidorId: number | null = null;
    let repartidorNombre: string | null = null;

    if (req.user?.role === USER_ROLES.REPARTIDOR && req.user.repartidor_id) {
      repartidorId = Number(req.user.repartidor_id);
      repartidorNombre = await obtenerRepartidorNombreDeUsuario(req.user);
    } else if (typeof req.query.repartidor_id === 'string' && req.query.repartidor_id) {
      repartidorId = Number(req.query.repartidor_id);
      const rep = await AppDataSource.getRepository(Repartidor).findOne({
        where: { id: repartidorId },
      });
      repartidorNombre = rep?.nombre || null;
    }

    if (!repartidorId || !repartidorNombre) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un repartidor (sesión o query repartidor_id)',
      });
    }

    const data = await cuentaCorrienteService.obtenerCarterasDeudores(
      repartidorId,
      repartidorNombre
    );

    res.json({ success: true, data });
  } catch (error) {
    responderError(res, error, 'Error al obtener carteras de deudores');
  }
};

export const getResumenFiadosPorFecha = async (req: AuthRequest, res: Response) => {
  try {
    const fechaRaw = Array.isArray(req.query.fecha) ? req.query.fecha[0] : req.query.fecha;
    if (typeof fechaRaw !== 'string' || !fechaRaw.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El parámetro fecha es requerido (YYYY-MM-DD)'
      });
    }

    const resumen = await cuentaCorrienteService.obtenerResumenFiadosPorFecha(fechaRaw.trim());

    res.json({
      success: true,
      data: resumen
    });
  } catch (error) {
    responderError(res, error, 'Error al obtener el resumen de fiados por fecha');
  }
};

export const editarCobro = async (req: AuthRequest, res: Response) => {
  try {
    const cobroId = parseInt(req.params.cobroId, 10);
    
    if (isNaN(cobroId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de cobro inválido'
      });
    }

    const {
      monto,
      medio_pago,
      observaciones
    } = req.body;

    const resultado = await cuentaCorrienteService.actualizarCobro(cobroId, {
      monto,
      medio_pago,
      observaciones
    });

    res.json({
      success: true,
      message: 'Cobro actualizado exitosamente',
      data: resultado
    });
  } catch (error) {
    responderError(res, error, 'Error al actualizar el cobro');
  }
};

export const eliminarCobro = async (req: AuthRequest, res: Response) => {
  try {
    const cobroId = parseInt(req.params.cobroId, 10);
    
    if (isNaN(cobroId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de cobro inválido'
      });
    }

    await cuentaCorrienteService.eliminarCobro(cobroId);

    res.json({
      success: true,
      message: 'Cobro eliminado exitosamente'
    });
  } catch (error) {
    responderError(res, error, 'Error al eliminar el cobro');
  }
};
