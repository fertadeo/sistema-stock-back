import { AppDataSource } from '../config/database';
import { RepartidorRutaParada } from '../entities/RepartidorRutaParada';
import { PushSubscription } from '../entities/PushSubscription';
import { Clientes } from '../entities/Clientes';
import { pushNotificationService } from './pushNotificationService';

export interface CrearParadaInput {
  cliente_id: number;
  comentario?: string | null;
  hora_alerta?: string | null;
  fecha?: string;
}

export interface ActualizarParadaInput {
  comentario?: string | null;
  hora_alerta?: string | null;
  visitado?: boolean;
  orden?: number;
}

function fechaHoy(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const ultimoAvisoSinPush = new Map<string, number>();
const AVISO_SIN_PUSH_MS = 5 * 60 * 1000;

function avisarSinPushUnaVez(paradaId: number, userId: number) {
  const clave = `${paradaId}:${userId}`;
  const ahora = Date.now();
  const ultimo = ultimoAvisoSinPush.get(clave) ?? 0;
  if (ahora - ultimo < AVISO_SIN_PUSH_MS) return;
  ultimoAvisoSinPush.set(clave, ahora);
  console.warn(`[ruta-alertas] No se pudo enviar push parada ${paradaId} usuario ${userId} (sin suscripción activa)`);
}

function normalizarHora(hora: string | null | undefined): string | null {
  if (!hora || !hora.trim()) return null;
  const partes = hora.trim().split(':');
  if (partes.length < 2) return null;
  const h = partes[0].padStart(2, '0');
  const min = partes[1].padStart(2, '0');
  return `${h}:${min}:00`;
}

function mapParada(parada: RepartidorRutaParada) {
  const cliente = parada.cliente;
  return {
    id: parada.id,
    user_id: parada.user_id,
    cliente_id: parada.cliente_id,
    comentario: parada.comentario,
    hora_alerta: parada.hora_alerta ? String(parada.hora_alerta).slice(0, 5) : null,
    fecha: parada.fecha,
    alerta_enviada: Boolean(parada.alerta_enviada),
    visitado: Boolean(parada.visitado),
    orden: parada.orden,
    creado_at: parada.creado_at,
    cliente: cliente
      ? {
          id: cliente.id,
          nombre: cliente.nombre,
          telefono: cliente.telefono,
          direccion: cliente.direccion,
          piso: cliente.piso,
          departamento: cliente.departamento,
          latitud: cliente.latitud,
          longitud: cliente.longitud,
        }
      : null,
  };
}

export class RepartidorRutaService {
  private paradaRepo = AppDataSource.getRepository(RepartidorRutaParada);
  private clienteRepo = AppDataSource.getRepository(Clientes);
  private pushRepo = AppDataSource.getRepository(PushSubscription);

  async listarParadas(userId: number, fecha?: string) {
    const fechaConsulta = fecha || fechaHoy();
    const paradas = await this.paradaRepo.find({
      where: { user_id: userId, fecha: fechaConsulta },
      order: { orden: 'ASC', hora_alerta: 'ASC', id: 'ASC' },
    });
    return paradas.map(mapParada);
  }

  async crearParada(userId: number, input: CrearParadaInput) {
    const cliente = await this.clienteRepo.findOne({ where: { id: input.cliente_id } });
    if (!cliente) {
      throw new Error('Cliente no encontrado');
    }

    const fecha = input.fecha || fechaHoy();
    const existente = await this.paradaRepo.findOne({
      where: { user_id: userId, cliente_id: input.cliente_id, fecha },
    });
    if (existente) {
      throw new Error('Este cliente ya está en la ruta de hoy');
    }

    const maxOrden = await this.paradaRepo
      .createQueryBuilder('p')
      .select('MAX(p.orden)', 'max')
      .where('p.user_id = :userId AND p.fecha = :fecha', { userId, fecha })
      .getRawOne();

    const parada = this.paradaRepo.create({
      user_id: userId,
      cliente_id: input.cliente_id,
      comentario: input.comentario?.trim() || null,
      hora_alerta: normalizarHora(input.hora_alerta),
      fecha,
      alerta_enviada: false,
      visitado: false,
      orden: Number(maxOrden?.max ?? 0) + 1,
    });

    const guardada = await this.paradaRepo.save(parada);
    const conCliente = await this.paradaRepo.findOne({
      where: { id: guardada.id },
    });
    return mapParada(conCliente!);
  }

  async actualizarParada(userId: number, paradaId: number, input: ActualizarParadaInput) {
    const parada = await this.paradaRepo.findOne({ where: { id: paradaId, user_id: userId } });
    if (!parada) {
      throw new Error('Parada no encontrada');
    }

    if (input.comentario !== undefined) {
      parada.comentario = input.comentario?.trim() || null;
    }
    if (input.hora_alerta !== undefined) {
      parada.hora_alerta = normalizarHora(input.hora_alerta);
      parada.alerta_enviada = false;
    }
    if (input.visitado !== undefined) {
      parada.visitado = input.visitado;
    }
    if (input.orden !== undefined) {
      parada.orden = input.orden;
    }

    await this.paradaRepo.save(parada);
    const actualizada = await this.paradaRepo.findOne({ where: { id: paradaId } });
    return mapParada(actualizada!);
  }

  async eliminarParada(userId: number, paradaId: number) {
    const parada = await this.paradaRepo.findOne({ where: { id: paradaId, user_id: userId } });
    if (!parada) {
      throw new Error('Parada no encontrada');
    }
    await this.paradaRepo.remove(parada);
    return { ok: true };
  }

  async marcarAlertaEnviada(paradaId: number, userId: number) {
    const parada = await this.paradaRepo.findOne({ where: { id: paradaId, user_id: userId } });
    if (!parada) return;
    parada.alerta_enviada = true;
    await this.paradaRepo.save(parada);
  }

  async guardarPushSubscription(
    userId: number,
    data: { endpoint: string; keys: { p256dh: string; auth: string } }
  ) {
    const existente = await this.pushRepo.findOne({ where: { endpoint: data.endpoint } });
    if (existente) {
      existente.user_id = userId;
      existente.p256dh = data.keys.p256dh;
      existente.auth = data.keys.auth;
      const guardada = await this.pushRepo.save(existente);
      console.log(`[push] Suscripción actualizada usuario ${userId}`);
      return guardada;
    }

    const sub = this.pushRepo.create({
      user_id: userId,
      endpoint: data.endpoint,
      p256dh: data.keys.p256dh,
      auth: data.keys.auth,
    });
    const guardada = await this.pushRepo.save(sub);
    console.log(`[push] Suscripción nueva guardada usuario ${userId}`);
    return guardada;
  }

  async eliminarPushSubscription(userId: number, endpoint: string) {
    await this.pushRepo.delete({ user_id: userId, endpoint });
  }

  async procesarAlertasPendientes() {
    if (!pushNotificationService.estaConfigurado()) {
      return { procesadas: 0, omitido: 'VAPID no configurado' };
    }

    const hoy = fechaHoy();
    const ahora = new Date();
    const horaActual = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}:00`;
    const frontendUrl = (process.env.FRONTEND_URL || 'https://sistema.soderiadonjavier.com').replace(/\/+$/, '');

    const paradas = await this.paradaRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.cliente', 'cliente')
      .where('p.fecha = :hoy', { hoy })
      .andWhere('p.hora_alerta IS NOT NULL')
      .andWhere('p.alerta_enviada = 0')
      .andWhere('p.visitado = 0')
      .andWhere('p.hora_alerta <= :horaActual', { horaActual })
      .getMany();

    let procesadas = 0;
    for (const parada of paradas) {
      const nombre = parada.cliente?.nombre || 'Cliente';
      const direccion = parada.cliente?.direccion || '';
      const comentario = parada.comentario ? ` — ${parada.comentario}` : '';
      const url = `${frontendUrl}/repartidor/rapido?cliente=${parada.cliente_id}`;

      const enviado = await pushNotificationService.enviarAPushUsuario(parada.user_id, {
        title: `Visita programada: ${nombre}`,
        body: `${direccion}${comentario}`.trim(),
        url,
      });

      if (enviado > 0) {
        parada.alerta_enviada = true;
        await this.paradaRepo.save(parada);
        procesadas += 1;
      } else {
        avisarSinPushUnaVez(parada.id, parada.user_id);
      }
    }

    return { procesadas };
  }

  async obtenerEstadoPush(userId: number) {
    return {
      vapid_configurado: pushNotificationService.estaConfigurado(),
      suscripcion_activa: await pushNotificationService.usuarioTieneSuscripcion(userId),
    };
  }

  async enviarPushPrueba(userId: number) {
    if (!pushNotificationService.estaConfigurado()) {
      throw new Error('VAPID no configurado en el servidor');
    }
    const enviados = await pushNotificationService.enviarPrueba(userId);
    if (enviados === 0) {
      throw new Error('No hay suscripción push en este dispositivo. Activá alertas en Ruta.');
    }
    return { enviados };
  }
}

export const repartidorRutaService = new RepartidorRutaService();
