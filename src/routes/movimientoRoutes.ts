import { Router, Response } from 'express';
import { movimientoController } from '../controllers/movimientoController';

const router = Router();

// Stream de movimientos en tiempo real (debe ir antes de /:id)
router.get('/stream', movimientoController.streamMovimientos);

// Obtener resumen de movimientos
router.get('/resumen', movimientoController.obtenerResumen);

// Obtener todos los movimientos con filtros
router.get('/', movimientoController.obtenerTodos);

// Obtener un movimiento específico
router.get('/:id', movimientoController.obtenerPorId);

// Crear un nuevo movimiento
router.post('/', movimientoController.crear);

class EventService {
    private clients: Response[] = [];
    private readonly MAX_CLIENTS = 100; // Ajusta según tus necesidades

    // Agregar un nuevo cliente al conjunto
    addClient(res: Response) {
        try {
            console.log(`Agregando nuevo cliente SSE. Clientes actuales: ${this.clients.length}`);

            // Verificar límite de clientes
            if (this.clients.length >= this.MAX_CLIENTS) {
                console.warn('Límite de clientes alcanzado');
                if (!res.headersSent) {
                    res.writeHead(503, { 'Content-Type': 'application/json' });
                    res.write(JSON.stringify({ 
                        success: false, 
                        message: 'Límite de conexiones alcanzado' 
                    }));
                }
                res.end();
                return;
            }

            // Configurar headers para SSE
            if (!res.headersSent) {
                console.log('Configurando headers SSE...');
                res.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache, no-transform',
                    'Connection': 'keep-alive',
                    'X-Accel-Buffering': 'no',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type'
                });
            }

            // Agregar el cliente a la lista
            this.clients.push(res);
            console.log(`Cliente agregado. Total de clientes: ${this.clients.length}`);

            // Enviar un evento inicial para confirmar la conexión
            this.sendEvent(res, 'connected', { 
                message: 'Conexión establecida',
                clientId: this.clients.length - 1,
                totalClients: this.clients.length
            });

            // Manejar la desconexión del cliente
            res.on('close', () => {
                console.log('Cliente desconectado, limpiando...');
                const index = this.clients.indexOf(res);
                if (index !== -1) {
                    this.clients.splice(index, 1);
                    console.log(`Cliente removido. Clientes restantes: ${this.clients.length}`);
                }
                res.end();
            });

        } catch (error) {
            console.error('Error al agregar cliente SSE:', {
                error: error instanceof Error ? error.message : 'Error desconocido',
                stack: error instanceof Error ? error.stack : undefined,
                headersSent: res.headersSent
            });

            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.write(JSON.stringify({ 
                    success: false, 
                    message: 'Error al establecer conexión SSE',
                    error: error instanceof Error ? error.message : 'Error desconocido'
                }));
            }
            res.end();
        }
    }

    // Enviar un evento a un cliente específico
    sendEvent(res: Response, event: string, data: any) {
        try {
            const eventData = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
            res.write(eventData);
        } catch (error) {
            console.error('Error al enviar evento:', error);
            // Si hay error al enviar, remover el cliente
            const index = this.clients.indexOf(res);
            if (index !== -1) {
                this.clients.splice(index, 1);
            }
        }
    }

    // Enviar un evento a todos los clientes conectados
    broadcastEvent(event: string, data: any) {
        console.log(`Broadcasting evento '${event}' a ${this.clients.length} clientes`);
        
        // Crear una copia del array para evitar problemas si se modifican las conexiones durante el broadcast
        const clientsCopy = [...this.clients];
        
        clientsCopy.forEach((client, index) => {
            try {
                this.sendEvent(client, event, data);
            } catch (error) {
                console.error(`Error al enviar evento al cliente ${index}:`, error);
                // El cliente será removido en sendEvent si hay error
            }
        });

        // Limpiar clientes desconectados
        this.cleanup();
    }

    // Obtener el número de clientes conectados
    getClientCount() {
        return this.clients.length;
    }

    // Limpiar clientes desconectados
    cleanup() {
        this.clients = this.clients.filter(client => {
            const isConnected = client.writable && !client.destroyed;
            if (!isConnected) {
                console.log('Removiendo cliente desconectado');
                client.end();
            }
            return isConnected;
        });
    }
}

// Exportar una única instancia del servicio
export const eventService = new EventService();

export default router; 