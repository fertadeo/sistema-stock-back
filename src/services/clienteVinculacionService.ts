import { AppDataSource } from '../config/database';
import { Clientes } from '../entities/Clientes';
import { CuentaCorrienteService } from './cuentaCorrienteService';

const clienteRepository = AppDataSource.getRepository(Clientes);
const cuentaCorrienteService = new CuentaCorrienteService();

export interface ClienteVinculadoResumen {
  id: number;
  nombre: string;
  telefono: string;
  direccion: string;
  saldo_actual: number;
}

export interface ResumenDomicilio {
  clientes: ClienteVinculadoResumen[];
  saldo_total: number;
}

const normalizarDireccion = (direccion: string): string =>
  direccion.trim().toLowerCase().replace(/\s+/g, ' ');

async function obtenerSaldoCliente(clienteId: number): Promise<number> {
  try {
    const resumen = await cuentaCorrienteService.obtenerResumenPorCliente(clienteId);
    return resumen.saldo_actual;
  } catch {
    return 0;
  }
}

async function mapearClienteVinculado(cliente: Clientes): Promise<ClienteVinculadoResumen> {
  return {
    id: cliente.id,
    nombre: cliente.nombre,
    telefono: cliente.telefono,
    direccion: cliente.direccion,
    saldo_actual: await obtenerSaldoCliente(cliente.id)
  };
}

export const clienteVinculacionService = {
  async obtenerVinculado(clienteId: number): Promise<ClienteVinculadoResumen | null> {
    const cliente = await clienteRepository.findOne({
      where: { id: clienteId },
      relations: ['cliente_vinculado']
    });

    if (!cliente?.cliente_vinculado) {
      return null;
    }

    return mapearClienteVinculado(cliente.cliente_vinculado);
  },

  async obtenerResumenDomicilio(clienteId: number): Promise<ResumenDomicilio | null> {
    const vinculado = await this.obtenerVinculado(clienteId);
    if (!vinculado) {
      return null;
    }

    const cliente = await clienteRepository.findOne({ where: { id: clienteId } });
    if (!cliente) {
      return null;
    }

    const actual = await mapearClienteVinculado(cliente);

    return {
      clientes: [actual, vinculado],
      saldo_total: actual.saldo_actual + vinculado.saldo_actual
    };
  },

  async vincular(clienteId: number, otroClienteId: number): Promise<ResumenDomicilio> {
    if (clienteId === otroClienteId) {
      throw new Error('Un cliente no puede vincularse consigo mismo');
    }

    const [clienteA, clienteB] = await Promise.all([
      clienteRepository.findOne({ where: { id: clienteId } }),
      clienteRepository.findOne({ where: { id: otroClienteId } })
    ]);

    if (!clienteA || !clienteB) {
      throw new Error('Uno o ambos clientes no existen');
    }

    if (clienteA.cliente_vinculado_id && clienteA.cliente_vinculado_id !== otroClienteId) {
      throw new Error(`${clienteA.nombre} ya está vinculado a otro cliente. Desvincule primero.`);
    }

    if (clienteB.cliente_vinculado_id && clienteB.cliente_vinculado_id !== clienteId) {
      throw new Error(`${clienteB.nombre} ya está vinculado a otro cliente. Desvincule primero.`);
    }

    const dirA = normalizarDireccion(clienteA.direccion);
    const dirB = normalizarDireccion(clienteB.direccion);
    if (dirA && dirB && dirA !== dirB) {
      throw new Error('Los clientes tienen direcciones distintas. Verifique que pertenezcan al mismo domicilio.');
    }

    clienteA.cliente_vinculado_id = otroClienteId;
    clienteB.cliente_vinculado_id = clienteId;

    await clienteRepository.save([clienteA, clienteB]);

    const resumen = await this.obtenerResumenDomicilio(clienteId);
    if (!resumen) {
      throw new Error('No se pudo obtener el resumen del domicilio');
    }

    return resumen;
  },

  async desvincular(clienteId: number): Promise<void> {
    const cliente = await clienteRepository.findOne({ where: { id: clienteId } });
    if (!cliente) {
      throw new Error('Cliente no encontrado');
    }

    const otroId = cliente.cliente_vinculado_id;
    if (!otroId) {
      throw new Error('El cliente no tiene vinculación activa');
    }

    const otroCliente = await clienteRepository.findOne({ where: { id: otroId } });

    cliente.cliente_vinculado_id = null;
    await clienteRepository.save(cliente);

    if (otroCliente) {
      otroCliente.cliente_vinculado_id = null;
      await clienteRepository.save(otroCliente);
    }
  }
};
