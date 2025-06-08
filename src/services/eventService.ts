import { Response } from 'express';

class EventService {
    private clients: Set<Response> = new Set();

    // Agregar un nuevo cliente al conjunto
    addClient(res: Response) {
        try {
            console.log('Agregando nuevo cliente SSE...');
            
            if (this.clients.has(res)) {
                console.log('Cliente ya existe, actualizando...');
                this.clients.delete(res);
            }

            this.clients.add(res);
            
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

            // Enviar un evento inicial para confirmar la conexión
            console.log('Enviando evento de conexión...');
            this.sendEvent(res, 'connected', { message: 'Conexión establecida' });

            // Manejar la desconexión del cliente
            res.on('close', () => {
                console.log('Cliente desconectado, limpiando...');
                this.clients.delete(res);
                res.end();
            });

            console.log('Cliente agregado exitosamente');
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
        // Asegurar que el evento tenga el formato correcto
        const eventData = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        res.write(eventData);
    }

    // Enviar un evento a todos los clientes conectados
    broadcastEvent(event: string, data: any) {
        this.clients.forEach(client => {
            try {
                this.sendEvent(client, event, data);
            } catch (error) {
                // Si hay un error al enviar a un cliente, lo removemos
                console.error('Error al enviar evento a cliente:', error);
                this.clients.delete(client);
                client.end();
            }
        });
    }

    // Obtener el número de clientes conectados
    getClientCount() {
        return this.clients.size;
    }

    // Limpiar clientes desconectados
    cleanup() {
        this.clients.forEach(client => {
            if (!client.writable) {
                this.clients.delete(client);
                client.end();
            }
        });
    }
}

// Exportar una única instancia del servicio
export const eventService = new EventService(); 