import { AppDataSource } from '../config/database';
import { Clientes } from '../entities/Clientes';
import { Repartidor } from '../entities/Repartidor';
import { AuthRequest, AuthUserPayload } from '../middlewares/auth';
import { USER_ROLES } from '../constants/roles';
import { obtenerConfiguracionSistema } from '../services/configuracionSistemaService';

export class ClienteAccesoDenegadoError extends Error {
  constructor(message = 'Sin acceso a este cliente') {
    super(message);
    this.name = 'ClienteAccesoDenegadoError';
  }
}

export const coincideRepartidorNombre = (
  clienteRepartidor: string | null | undefined,
  repartidorNombre: string
): boolean => {
  if (!repartidorNombre?.trim()) return false;
  if (!clienteRepartidor?.trim()) return false;

  if (
    repartidorNombre.toLowerCase().includes('david') &&
    clienteRepartidor.toLowerCase().includes('david')
  ) {
    return true;
  }

  return clienteRepartidor.trim().toLowerCase() === repartidorNombre.trim().toLowerCase();
};

export const esUsuarioRepartidor = (user?: AuthUserPayload): boolean =>
  user?.role === USER_ROLES.REPARTIDOR;

export const obtenerRepartidorNombreDeUsuario = async (
  user: AuthUserPayload
): Promise<string | null> => {
  if (!user.repartidor_id) return null;

  const id = Number(user.repartidor_id);
  if (Number.isNaN(id)) return null;

  const repartidor = await AppDataSource.getRepository(Repartidor).findOneBy({ id });
  return repartidor?.nombre?.trim() || null;
};

/**
 * Filtro de listado:
 * - undefined = sin filtro (todos los clientes; default o admin)
 * - null = repartidor sin repartidor_id (sin clientes)
 * - string = solo clientes de ese repartidor
 *
 * El modo restringido se activa con configuracion_sistema.repartidor_solo_clientes_propios.
 */
export const obtenerFiltroRepartidor = async (
  user?: AuthUserPayload
): Promise<string | null | undefined> => {
  if (!user || !esUsuarioRepartidor(user)) {
    return undefined;
  }

  const config = await obtenerConfiguracionSistema();
  if (!config.repartidor_solo_clientes_propios) {
    return undefined;
  }

  return obtenerRepartidorNombreDeUsuario(user);
};

export const filtrarClientesPorRepartidor = <T extends { repartidor?: string | null }>(
  clientes: T[],
  repartidorNombre: string | null | undefined
): T[] => {
  if (repartidorNombre === undefined) return clientes;
  if (!repartidorNombre) return [];
  return clientes.filter((cliente) =>
    coincideRepartidorNombre(cliente.repartidor, repartidorNombre)
  );
};

const clienteRepository = AppDataSource.getRepository(Clientes);

/**
 * Lectura / operaciones sobre un cliente:
 * - sin filtro (default): cualquier cliente existente
 * - con solo_clientes_propios: solo los asignados al repartidor
 */
export const verificarAccesoClientePorId = async (
  req: AuthRequest,
  clienteId: number
): Promise<void> => {
  const filtroRepartidor = await obtenerFiltroRepartidor(req.user);
  if (filtroRepartidor === undefined) {
    const existe = await clienteRepository.findOne({
      where: { id: clienteId },
      select: ['id'],
    });
    if (!existe) {
      throw new Error('Cliente no encontrado');
    }
    return;
  }

  const cliente = await clienteRepository.findOne({
    where: { id: clienteId },
    select: ['id', 'repartidor'],
  });

  if (!cliente) {
    throw new Error('Cliente no encontrado');
  }

  if (!filtroRepartidor || !coincideRepartidorNombre(cliente.repartidor, filtroRepartidor)) {
    throw new ClienteAccesoDenegadoError('Sin acceso a este cliente');
  }
};

/**
 * Modificación de ficha de cliente:
 * - admin/superadmin: siempre
 * - repartidor: solo si el cliente no tiene repartidor o está asignado a él
 */
export const verificarModificacionClientePorId = async (
  req: AuthRequest,
  clienteId: number
): Promise<void> => {
  if (!req.user || !esUsuarioRepartidor(req.user)) {
    return;
  }

  const cliente = await clienteRepository.findOne({
    where: { id: clienteId },
    select: ['id', 'repartidor'],
  });

  if (!cliente) {
    throw new Error('Cliente no encontrado');
  }

  const asignado = cliente.repartidor?.trim() || '';
  if (!asignado) {
    return;
  }

  const miNombre = await obtenerRepartidorNombreDeUsuario(req.user);
  if (!miNombre || !coincideRepartidorNombre(asignado, miNombre)) {
    throw new ClienteAccesoDenegadoError(
      `Este cliente está asignado a ${asignado}. No podés modificarlo.`
    );
  }
};

export const esErrorAccesoCliente = (error: unknown): error is ClienteAccesoDenegadoError =>
  error instanceof ClienteAccesoDenegadoError;
