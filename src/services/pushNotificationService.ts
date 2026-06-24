import webpush from 'web-push';
import colors from 'colors';
import { AppDataSource } from '../config/database';
import { PushSubscription } from '../entities/PushSubscription';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export interface VapidEstado {
  configurado: boolean;
  publicKeyPresente: boolean;
  privateKeyPresente: boolean;
  subject: string;
  mensaje: string;
  error?: string;
}

function enmascararClave(key: string): string {
  if (key.length <= 8) return '***';
  return `${key.slice(0, 8)}...${key.slice(-6)} (${key.length} caracteres)`;
}

function esPlaceholder(valor: string): boolean {
  const lower = valor.toLowerCase();
  return (
    lower.includes('tu_vapid') ||
    lower.includes('your_') ||
    lower.includes('changeme') ||
    lower.includes('example')
  );
}

class PushNotificationService {
  private configurado = false;
  private ultimoEstado: VapidEstado | null = null;

  constructor() {
    this.ultimoEstado = this.evaluarConfiguracionVapid(false);
  }

  private evaluarConfiguracionVapid(emitirLogs: boolean): VapidEstado {
    const publicKey = process.env.VAPID_PUBLIC_KEY?.trim() || '';
    const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() || '';
    const subject = process.env.VAPID_SUBJECT?.trim() || 'https://sistema.soderiadonjavier.com';

    const log = (msg: string) => {
      if (emitirLogs) console.log(msg);
    };
    const warn = (msg: string) => {
      if (emitirLogs) console.warn(colors.yellow(msg));
    };
    const ok = (msg: string) => {
      if (emitirLogs) console.log(colors.green(msg));
    };
    const fail = (msg: string) => {
      if (emitirLogs) console.error(colors.red(msg));
    };

    log('[vapid] Verificando claves Web Push (alertas módulo Ruta)...');
    log(
      `[vapid] Entorno: NODE_ENV=${process.env.NODE_ENV ?? '(no definido)'} | PM2=${process.env.pm_id !== undefined ? 'sí' : 'no'}`
    );

    if (!publicKey && !privateKey) {
      const estado: VapidEstado = {
        configurado: false,
        publicKeyPresente: false,
        privateKeyPresente: false,
        subject,
        mensaje: 'Faltan VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY',
      };
      warn('[vapid] NO CONFIGURADO — faltan VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY');
      warn(
        '[vapid] Si usás PM2 con env_production, reiniciá con: pm2 restart ecosystem.config.js --env production --update-env'
      );
      warn('[vapid] O mové las variables al bloque "env" en ecosystem.config.js');
      warn('[vapid] Las alertas con la app cerrada en Android no funcionarán hasta configurarlas.');
      warn('[vapid] Generar claves: npx web-push generate-vapid-keys');
      this.configurado = false;
      return estado;
    }

    if (!publicKey) {
      const estado: VapidEstado = {
        configurado: false,
        publicKeyPresente: false,
        privateKeyPresente: true,
        subject,
        mensaje: 'Falta VAPID_PUBLIC_KEY',
      };
      fail('[vapid] INCOMPLETO — falta VAPID_PUBLIC_KEY');
      this.configurado = false;
      return estado;
    }

    if (!privateKey) {
      const estado: VapidEstado = {
        configurado: false,
        publicKeyPresente: true,
        privateKeyPresente: false,
        subject,
        mensaje: 'Falta VAPID_PRIVATE_KEY',
      };
      fail('[vapid] INCOMPLETO — falta VAPID_PRIVATE_KEY');
      this.configurado = false;
      return estado;
    }

    if (esPlaceholder(publicKey) || esPlaceholder(privateKey)) {
      const estado: VapidEstado = {
        configurado: false,
        publicKeyPresente: true,
        privateKeyPresente: true,
        subject,
        mensaje: 'Las claves parecen placeholders de ejemplo',
      };
      fail('[vapid] INVÁLIDO — reemplazá las claves de ejemplo en ecosystem.config.js');
      this.configurado = false;
      return estado;
    }

    if (publicKey.length < 60 || privateKey.length < 40) {
      const estado: VapidEstado = {
        configurado: false,
        publicKeyPresente: true,
        privateKeyPresente: true,
        subject,
        mensaje: 'Longitud de claves sospechosa (formato VAPID incorrecto)',
      };
      fail('[vapid] INVÁLIDO — longitud de claves incorrecta para VAPID');
      log(`[vapid] Public key: ${enmascararClave(publicKey)}`);
      log(`[vapid] Private key: ${enmascararClave(privateKey)}`);
      this.configurado = false;
      return estado;
    }

    try {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.configurado = true;
      const estado: VapidEstado = {
        configurado: true,
        publicKeyPresente: true,
        privateKeyPresente: true,
        subject,
        mensaje: 'Claves VAPID válidas — push habilitado',
      };
      ok('[vapid] OK — claves VAPID configuradas correctamente');
      log(`[vapid] Subject: ${subject}`);
      log(`[vapid] Public key: ${enmascararClave(publicKey)}`);
      log(`[vapid] Private key: ${enmascararClave(privateKey)}`);
      return estado;
    } catch (error: unknown) {
      const mensajeError = error instanceof Error ? error.message : String(error);
      const estado: VapidEstado = {
        configurado: false,
        publicKeyPresente: true,
        privateKeyPresente: true,
        subject,
        mensaje: 'web-push rechazó el par de claves',
        error: mensajeError,
      };
      fail(`[vapid] INVÁLIDO — web-push rechazó las claves: ${mensajeError}`);
      this.configurado = false;
      return estado;
    }
  }

  /** Registrar en consola el estado VAPID al arrancar el servidor. */
  logEstadoInicio(): VapidEstado {
    this.ultimoEstado = this.evaluarConfiguracionVapid(true);
    return this.ultimoEstado;
  }

  obtenerEstadoVapid(): VapidEstado {
    return this.ultimoEstado ?? this.evaluarConfiguracionVapid(false);
  }

  estaConfigurado(): boolean {
    return this.configurado;
  }

  getPublicKey(): string | null {
    return process.env.VAPID_PUBLIC_KEY?.trim() || null;
  }

  async enviarAPushUsuario(userId: number, payload: PushPayload): Promise<number> {
    if (!this.configurado) {
      console.warn('[push] Envío omitido — VAPID no configurado correctamente');
      return 0;
    }

    const repo = AppDataSource.getRepository(PushSubscription);
    const subs = await repo.find({ where: { user_id: userId } });
    if (subs.length === 0) {
      console.warn(`[push] Usuario ${userId} sin suscripciones push activas`);
      return 0;
    }

    const body = JSON.stringify(payload);
    let enviados = 0;

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body
        );
        enviados += 1;
        console.log(`[push] Notificación enviada a usuario ${userId}`);
      } catch (error: unknown) {
        const status = (error as { statusCode?: number })?.statusCode;
        console.error(`[push] Error enviando a usuario ${userId}:`, status, error);
        if (status === 404 || status === 410) {
          await repo.delete({ id: sub.id });
        }
      }
    }

    return enviados;
  }

  async usuarioTieneSuscripcion(userId: number): Promise<boolean> {
    const repo = AppDataSource.getRepository(PushSubscription);
    const count = await repo.count({ where: { user_id: userId } });
    return count > 0;
  }

  async enviarPrueba(userId: number): Promise<number> {
    const frontendUrl = process.env.FRONTEND_URL || 'https://sistema.soderiadonjavier.com';
    return this.enviarAPushUsuario(userId, {
      title: 'Prueba de alertas Sodería',
      body: 'Si ves esto, las notificaciones push están funcionando.',
      url: `${frontendUrl}/repartidor/ruta`,
    });
  }
}

export const pushNotificationService = new PushNotificationService();
