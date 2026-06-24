import { AppDataSource } from '../config/database';
import { Clientes } from '../entities/Clientes';
import { Repartidor } from '../entities/Repartidor';
import { AuthRequest, AuthUserPayload } from '../middlewares/auth';
import { USER_ROLES } from '../constants/roles';

export class ClienteAccesoDenegadoError extends Error {
  constructor() {
    super('Sin acceso a este cliente');
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
 * undefined = admin/superadmin (sin filtro)
 * null = repartidor sin repartidor_id asignado (sin clientes)
 * string = nombre del repartidor para filtrar
 */
export const obtenerFiltroRepartidor = async (
  user?: AuthUserPayload
): Promise<string | null | undefined> => {
  if (!user || !esUsuarioRepartidor(user)) return undefined;
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

export const verificarAccesoClientePorId = async (
  req: AuthRequest,
  clienteId: number
): Promise<void> => {
  const filtroRepartidor = await obtenerFiltroRepartidor(req.user);
  if (filtroRepartidor === undefined) return;

  const cliente = await clienteRepository.findOne({
    where: { id: clienteId },
    select: ['id', 'repartidor'],
  });

  if (!cliente) {
    throw new Error('Cliente no encontrado');
  }

  if (!filtroRepartidor || !coincideRepartidorNombre(cliente.repartidor, filtroRepartidor)) {
    throw new ClienteAccesoDenegadoError();
  }
};

export const esErrorAccesoCliente = (error: unknown): error is ClienteAccesoDenegadoError =>
  error instanceof ClienteAccesoDenegadoError;
