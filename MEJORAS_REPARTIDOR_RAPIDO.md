# Mejoras Implementadas: Operaciones Rápidas para Repartidor

## Resumen

Se ha implementado un sistema completo para que los repartidores puedan registrar de manera rápida y eficiente ventas, cobros, fiados y movimientos de envases directamente desde sus dispositivos móviles.

## Nuevas Funcionalidades

### 1. Registro Rápido de Ventas
**Endpoint:** `POST /api/repartidor-rapido/venta`

Permite registrar una venta completa con:
- Productos vendidos
- Medio de pago (efectivo, transferencia, débito, crédito)
- Forma de pago (total o parcial)
- Registro automático de envases prestados/devueltos
- Observaciones opcionales

**Ejemplo de uso:**
```json
{
  "cliente_id": 123,
  "productos": [
    {
      "producto_id": "1",
      "cantidad": 2,
      "precio_unitario": 3400
    }
  ],
  "monto_total": 6800,
  "medio_pago": "efectivo",
  "forma_pago": "total",
  "repartidor_id": 5,
  "envases_prestados": [
    {
      "producto_id": 1,
      "cantidad": 2
    }
  ],
  "envases_devueltos": [
    {
      "producto_id": 1,
      "cantidad": 1
    }
  ],
  "observaciones": "Cliente satisfecho"
}
```

### 2. Registro Rápido de Cobros
**Endpoint:** `POST /api/repartidor-rapido/cobro`

Permite registrar un cobro independiente a un cliente:
- Monto a cobrar
- Medio de pago
- Opcionalmente relacionado con una venta específica
- Observaciones

**Ejemplo de uso:**
```json
{
  "cliente_id": 123,
  "monto": 5000,
  "medio_pago": "efectivo",
  "repartidor_id": 5,
  "venta_relacionada_id": "uuid-de-venta",
  "observaciones": "Cobro parcial de fiado"
}
```

### 3. Registro Rápido de Fiados
**Endpoint:** `POST /api/repartidor-rapido/fiado`

Permite registrar una venta a crédito (fiado):
- Productos vendidos
- Registro automático como pago parcial con saldo pendiente
- Registro de envases prestados si aplica

**Ejemplo de uso:**
```json
{
  "cliente_id": 123,
  "productos": [
    {
      "producto_id": "1",
      "cantidad": 3,
      "precio_unitario": 3400
    }
  ],
  "monto_total": 10200,
  "repartidor_id": 5,
  "envases_prestados": [
    {
      "producto_id": 1,
      "cantidad": 3
    }
  ],
  "observaciones": "Cliente de confianza"
}
```

### 4. Resumen de Envases por Cliente
**Endpoint:** `GET /api/repartidor-rapido/envases/:cliente_id`

Obtiene el resumen completo de envases de un cliente:
- Envases actualmente prestados
- Historial de movimientos (préstamos y devoluciones)

### 5. Activar/Desactivar Clientes
**Endpoint:** `PATCH /api/clientes/:id/estado`

Permite activar o desactivar clientes cuando dejan de comprar o se dan de baja.

**Ejemplo de uso:**
```json
{
  "estado": false
}
```

## Nuevas Entidades

### 1. Cobro
Registra cobros independientes de ventas con:
- Cliente asociado
- Monto y medio de pago
- Repartidor que realizó el cobro
- Fecha y hora
- Relación opcional con una venta

### 2. MovimientoEnvase
Registra todos los movimientos de envases:
- Tipo: PRESTAMO, DEVOLUCION, AJUSTE
- Cliente y producto
- Cantidad (positiva para préstamos, negativa para devoluciones)
- Repartidor responsable
- Relación opcional con una venta

## Mejoras en el Sistema de Envases

### Registro Automático
- Al registrar una venta, se pueden indicar envases prestados y devueltos
- El sistema actualiza automáticamente la tabla `envases_prestados`
- Se mantiene un historial completo en `movimientos_envases`

### Trazabilidad Completa
- Cada movimiento de envase queda registrado con fecha, repartidor y venta relacionada
- Permite auditoría completa del flujo de envases
- Facilita la reconciliación de inventario

## Características Técnicas

### Transacciones
- Todas las operaciones se realizan dentro de transacciones de base de datos
- Garantiza consistencia de datos
- Rollback automático en caso de error

### Validaciones
- Verificación de existencia y estado activo del cliente
- Validación de productos y cantidades
- Validación de montos y medios de pago

### Auditoría
- Todos los movimientos se registran en el sistema de auditoría
- Facilita el seguimiento y reportes
- Historial completo de operaciones

## Propuestas Adicionales

### 1. Dashboard de Repartidor
Crear un endpoint que devuelva un resumen diario para el repartidor:
- Ventas del día
- Cobros realizados
- Fiados pendientes
- Envases prestados/devueltos

### 2. Notificaciones de Fiados Pendientes
Sistema de alertas para clientes con fiados vencidos o montos altos pendientes.

### 3. Reportes de Envases
- Reporte de envases prestados por cliente
- Reporte de envases faltantes
- Reconciliación de inventario de envases

### 4. Optimización de Consultas
- Cache de clientes activos frecuentes
- Índices adicionales en tablas según uso real
- Paginación en listados grandes

### 5. Integración con Geolocalización
- Registrar ubicación GPS al momento de la venta/cobro
- Validar que el repartidor esté en la zona del cliente
- Optimización de rutas

### 6. Modo Offline ✅ IMPLEMENTADO
- Sincronización automática cuando se recupere la conexión
- Almacenamiento local de operaciones pendientes
- Validación de datos antes de sincronizar
- Detección de duplicados
- Reintento automático de operaciones fallidas
- Alta offline inicial de clientes nuevos mediante `NUEVO_CLIENTE`
- Ver más detalles en `GUIA_MODO_OFFLINE.md`

## Instalación

1. Ejecutar los scripts SQL de migración:
```bash
# Tablas principales
mysql -u usuario -p nombre_base_datos < migrations/crear_tablas_repartidor_rapido.sql

# Tabla de operaciones pendientes (modo offline)
mysql -u usuario -p nombre_base_datos < migrations/crear_tabla_operaciones_pendientes.sql
```

2. Las nuevas rutas estarán disponibles automáticamente en:
- `/api/repartidor-rapido/*` - Operaciones rápidas
- `/api/clientes/:id/estado` - Gestión de estado de clientes
- `/api/sincronizacion/*` - Sincronización offline

## Notas Importantes

- Los clientes desactivados no pueden recibir nuevas ventas (se valida automáticamente)
- Los movimientos de envases se registran automáticamente al crear ventas
- Todos los endpoints incluyen manejo de errores y validaciones
- Las transacciones garantizan la integridad de los datos

## Modo Offline

El sistema ahora soporta modo offline completo. Los repartidores pueden:
- Registrar ventas, cobros y fiados sin conexión
- Las operaciones se almacenan localmente en el dispositivo
- Sincronización automática cuando se recupera la conexión
- Detección y manejo de duplicados
- Reintento automático de operaciones fallidas

---

# 📱 Guía de Implementación Frontend - Next.js

## Instalación de Dependencias

```bash
npm install idb uuid
# o
yarn add idb uuid
```

**Dependencias necesarias:**
- `idb`: Para IndexedDB (almacenamiento offline robusto)
- `uuid`: Para generar IDs únicos de operaciones

## Estructura de Archivos Recomendada

```
lib/
  ├── services/
  │   ├── offlineStorage.ts      # Almacenamiento local
  │   ├── syncService.ts         # Servicio de sincronización
  │   └── connectionManager.ts   # Gestión de conexión
  ├── hooks/
  │   ├── useOffline.ts          # Hook para modo offline
  │   └── useSync.ts             # Hook para sincronización
  └── utils/
      └── uuid.ts                # Utilidad para generar UUIDs

components/
  ├── OfflineIndicator.tsx       # Indicador de estado offline
  └── SyncStatus.tsx             # Estado de sincronización
```

## 1. Configuración de Almacenamiento Local (IndexedDB)

**`lib/services/offlineStorage.ts`**

```typescript
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';

interface OperacionPendiente {
  operacion_id: string;
  tipo: 'VENTA_RAPIDA' | 'COBRO_RAPIDO' | 'FIADO_RAPIDO' | 'MOVIMIENTO_ENVASE';
  datos_operacion: Record<string, any>;
  fecha_operacion_local: string;
  sincronizado: boolean;
}

interface SoderiaDB extends DBSchema {
  operaciones_pendientes: {
    key: string;
    value: OperacionPendiente;
    indexes: { 'por-tipo': string; 'por-fecha': string };
  };
}

class OfflineStorage {
  private db: IDBPDatabase<SoderiaDB> | null = null;
  private dbName = 'soderia-offline-db';
  private version = 1;

  async inicializar(): Promise<void> {
    this.db = await openDB<SoderiaDB>(this.dbName, this.version, {
      upgrade(db) {
        // Crear store de operaciones pendientes
        if (!db.objectStoreNames.contains('operaciones_pendientes')) {
          const store = db.createObjectStore('operaciones_pendientes', {
            keyPath: 'operacion_id',
          });
          store.createIndex('por-tipo', 'tipo');
          store.createIndex('por-fecha', 'fecha_operacion_local');
        }
      },
    });
  }

  async guardarOperacion(
    tipo: OperacionPendiente['tipo'],
    datosOperacion: Record<string, any>
  ): Promise<string> {
    if (!this.db) {
      await this.inicializar();
    }

    const operacion: OperacionPendiente = {
      operacion_id: uuidv4(),
      tipo,
      datos_operacion: datosOperacion,
      fecha_operacion_local: new Date().toISOString(),
      sincronizado: false,
    };

    await this.db!.put('operaciones_pendientes', operacion);
    return operacion.operacion_id;
  }

  async obtenerOperacionesPendientes(): Promise<OperacionPendiente[]> {
    if (!this.db) {
      await this.inicializar();
    }

    const tx = this.db!.transaction('operaciones_pendientes', 'readonly');
    const store = tx.objectStore('operaciones_pendientes');
    const operaciones = await store.getAll();
    
    return operaciones.filter(op => !op.sincronizado);
  }

  async eliminarOperacion(operacion_id: string): Promise<void> {
    if (!this.db) {
      await this.inicializar();
    }

    await this.db!.delete('operaciones_pendientes', operacion_id);
  }

  async marcarComoSincronizado(operacion_id: string): Promise<void> {
    if (!this.db) {
      await this.inicializar();
    }

    const operacion = await this.db!.get('operaciones_pendientes', operacion_id);
    if (operacion) {
      operacion.sincronizado = true;
      await this.db!.put('operaciones_pendientes', operacion);
    }
  }

  async contarOperacionesPendientes(): Promise<number> {
    const operaciones = await this.obtenerOperacionesPendientes();
    return operaciones.length;
  }
}

export const offlineStorage = new OfflineStorage();
export type { OperacionPendiente };
```

## 2. Gestión de Conexión

**`lib/services/connectionManager.ts`**

```typescript
import { useEffect, useState } from 'react';

class ConnectionManager {
  private isOnline: boolean = true;
  private listeners: Array<(isOnline: boolean) => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;
      this.setupListeners();
    }
  }

  private setupListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners();
    });
  }

  isConnected(): boolean {
    return this.isOnline;
  }

  onConnectionChange(callback: (isOnline: boolean) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => callback(this.isOnline));
  }

  async verificarConectividad(): Promise<boolean> {
    try {
      const response = await fetch('/api/sincronizacion/ping', {
        method: 'GET',
        cache: 'no-store',
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const connectionManager = new ConnectionManager();
```

## 3. Servicio de Sincronización

**`lib/services/syncService.ts`**

```typescript
import { offlineStorage, OperacionPendiente } from './offlineStorage';
import { connectionManager } from './connectionManager';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface ResultadoSincronizacion {
  operacion_id: string;
  estado: 'sincronizado' | 'error' | 'duplicado';
  mensaje: string;
  resultado_id?: string;
  error?: string;
}

class SyncService {
  private sincronizando: boolean = false;
  private intervaloId: NodeJS.Timeout | null = null;

  async sincronizar(): Promise<void> {
    if (this.sincronizando || !connectionManager.isConnected()) {
      return;
    }

    // Verificar conectividad real
    const tieneConexion = await connectionManager.verificarConectividad();
    if (!tieneConexion) {
      return;
    }

    this.sincronizando = true;

    try {
      const operaciones = await offlineStorage.obtenerOperacionesPendientes();
      
      if (operaciones.length === 0) {
        return;
      }

      // Obtener datos del repartidor desde el contexto/sesión
      const repartidorId = this.getRepartidorId();
      const dispositivoId = this.getDispositivoId();

      const response = await fetch(`${API_URL}/api/sincronizacion/operaciones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operaciones: operaciones.map(op => ({
            operacion_id: op.operacion_id,
            tipo: op.tipo,
            datos_operacion: op.datos_operacion,
            repartidor_id: repartidorId,
            dispositivo_id: dispositivoId,
            fecha_operacion_local: op.fecha_operacion_local,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const resultado = await response.json();

      if (!resultado.success) {
        throw new Error(resultado.message || 'Error en sincronización');
      }

      // Procesar resultados
      for (const res of resultado.resultados as ResultadoSincronizacion[]) {
        if (res.estado === 'sincronizado' || res.estado === 'duplicado') {
          await offlineStorage.eliminarOperacion(res.operacion_id);
        }
        // Si hay error, mantener en local para reintentar después
      }

      return resultado;
    } catch (error) {
      console.error('Error en sincronización:', error);
      throw error;
    } finally {
      this.sincronizando = false;
    }
  }

  iniciarSincronizacionAutomatica(intervalo: number = 30000): void {
    // Sincronizar inmediatamente si hay conexión
    if (connectionManager.isConnected()) {
      this.sincronizar().catch(console.error);
    }

    // Escuchar cambios de conexión
    connectionManager.onConnectionChange(async (isOnline) => {
      if (isOnline) {
        await this.sincronizar();
      }
    });

    // Sincronizar periódicamente
    this.intervaloId = setInterval(() => {
      if (connectionManager.isConnected()) {
        this.sincronizar().catch(console.error);
      }
    }, intervalo);
  }

  detenerSincronizacionAutomatica(): void {
    if (this.intervaloId) {
      clearInterval(this.intervaloId);
      this.intervaloId = null;
    }
  }

  private getRepartidorId(): number | undefined {
    // Obtener del contexto de autenticación o localStorage
    if (typeof window !== 'undefined') {
      const repartidorId = localStorage.getItem('repartidor_id');
      return repartidorId ? parseInt(repartidorId) : undefined;
    }
    return undefined;
  }

  private getDispositivoId(): string {
    // Generar o obtener ID único del dispositivo
    if (typeof window !== 'undefined') {
      let dispositivoId = localStorage.getItem('dispositivo_id');
      if (!dispositivoId) {
        dispositivoId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('dispositivo_id', dispositivoId);
      }
      return dispositivoId;
    }
    return 'unknown-device';
  }
}

export const syncService = new SyncService();
```

## 4. Hooks Personalizados

**`lib/hooks/useOffline.ts`**

```typescript
import { useState, useEffect } from 'react';
import { connectionManager } from '../services/connectionManager';
import { offlineStorage } from '../services/offlineStorage';

export function useOffline() {
  const [isOnline, setIsOnline] = useState(true);
  const [operacionesPendientes, setOperacionesPendientes] = useState(0);

  useEffect(() => {
    setIsOnline(connectionManager.isConnected());

    const unsubscribe = connectionManager.onConnectionChange((online) => {
      setIsOnline(online);
    });

    // Actualizar contador de operaciones pendientes
    const actualizarContador = async () => {
      const count = await offlineStorage.contarOperacionesPendientes();
      setOperacionesPendientes(count);
    };

    actualizarContador();
    const interval = setInterval(actualizarContador, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return {
    isOnline,
    operacionesPendientes,
  };
}
```

**`lib/hooks/useSync.ts`**

```typescript
import { useState, useEffect, useCallback } from 'react';
import { syncService } from '../services/syncService';
import { useOffline } from './useOffline';

export function useSync(autoSync: boolean = true, intervalo: number = 30000) {
  const { isOnline } = useOffline();
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimaSincronizacion, setUltimaSincronizacion] = useState<Date | null>(null);

  const sincronizar = useCallback(async () => {
    if (sincronizando || !isOnline) {
      return;
    }

    setSincronizando(true);
    try {
      await syncService.sincronizar();
      setUltimaSincronizacion(new Date());
    } catch (error) {
      console.error('Error al sincronizar:', error);
      throw error;
    } finally {
      setSincronizando(false);
    }
  }, [isOnline, sincronizando]);

  useEffect(() => {
    if (autoSync) {
      syncService.iniciarSincronizacionAutomatica(intervalo);
      return () => {
        syncService.detenerSincronizacionAutomatica();
      };
    }
  }, [autoSync, intervalo]);

  return {
    sincronizar,
    sincronizando,
    ultimaSincronizacion,
  };
}
```

## 5. Componentes de UI

**`components/OfflineIndicator.tsx`**

```typescript
'use client';

import { useOffline } from '@/lib/hooks/useOffline';

export function OfflineIndicator() {
  const { isOnline, operacionesPendientes } = useOffline();

  if (isOnline && operacionesPendientes === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={`px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 ${
          isOnline
            ? 'bg-yellow-500 text-white'
            : 'bg-red-500 text-white'
        }`}
      >
        {isOnline ? (
          <>
            <span className="text-sm">
              {operacionesPendientes} operaciones pendientes
            </span>
          </>
        ) : (
          <>
            <span className="text-sm font-semibold">Sin conexión</span>
            {operacionesPendientes > 0 && (
              <span className="text-xs">
                ({operacionesPendientes} pendientes)
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
```

**`components/SyncStatus.tsx`**

```typescript
'use client';

import { useSync } from '@/lib/hooks/useSync';
import { useOffline } from '@/lib/hooks/useOffline';

export function SyncStatus() {
  const { isOnline, operacionesPendientes } = useOffline();
  const { sincronizar, sincronizando, ultimaSincronizacion } = useSync(false);

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold mb-2">Estado de Sincronización</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Estado:</span>
          <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Operaciones pendientes:</span>
          <span className="font-semibold">{operacionesPendientes}</span>
        </div>
        {ultimaSincronizacion && (
          <div className="flex justify-between">
            <span>Última sincronización:</span>
            <span className="text-gray-600">
              {ultimaSincronizacion.toLocaleTimeString()}
            </span>
          </div>
        )}
        <button
          onClick={sincronizar}
          disabled={!isOnline || sincronizando}
          className="w-full mt-4 px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sincronizando ? 'Sincronizando...' : 'Sincronizar Ahora'}
        </button>
      </div>
    </div>
  );
}
```

## 6. Servicio de Operaciones Rápidas

**`lib/services/repartidorRapidoService.ts`**

```typescript
import { offlineStorage } from './offlineStorage';
import { connectionManager } from './connectionManager';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface VentaRapidaData {
  cliente_id: number;
  productos: Array<{
    producto_id: string;
    cantidad: number;
    precio_unitario: number;
  }>;
  monto_total: number;
  medio_pago: 'efectivo' | 'transferencia' | 'debito' | 'credito';
  forma_pago?: 'total' | 'parcial';
  saldo_monto?: number;
  repartidor_id?: number;
  envases_prestados?: Array<{ producto_id: number; cantidad: number }>;
  envases_devueltos?: Array<{ producto_id: number; cantidad: number }>;
  observaciones?: string;
}

class RepartidorRapidoService {
  async registrarVenta(data: VentaRapidaData): Promise<any> {
    // Intentar registrar directamente si hay conexión
    if (connectionManager.isConnected()) {
      try {
        const response = await fetch(`${API_URL}/api/repartidor-rapido/venta`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        console.error('Error al registrar venta online:', error);
        // Continuar para guardar offline
      }
    }

    // Guardar localmente si no hay conexión o falló la petición
    const operacionId = await offlineStorage.guardarOperacion(
      'VENTA_RAPIDA',
      data
    );

    return {
      success: true,
      offline: true,
      operacion_id: operacionId,
      message: 'Venta guardada localmente. Se sincronizará cuando haya conexión.',
    };
  }

  async registrarCobro(data: {
    cliente_id: number;
    monto: number;
    medio_pago: 'efectivo' | 'transferencia' | 'debito' | 'credito';
    repartidor_id?: number;
    observaciones?: string;
    venta_relacionada_id?: string;
  }): Promise<any> {
    if (connectionManager.isConnected()) {
      try {
        const response = await fetch(`${API_URL}/api/repartidor-rapido/cobro`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        console.error('Error al registrar cobro online:', error);
      }
    }

    const operacionId = await offlineStorage.guardarOperacion(
      'COBRO_RAPIDO',
      data
    );

    return {
      success: true,
      offline: true,
      operacion_id: operacionId,
      message: 'Cobro guardado localmente. Se sincronizará cuando haya conexión.',
    };
  }

  async registrarFiado(data: {
    cliente_id: number;
    productos: Array<{
      producto_id: string;
      cantidad: number;
      precio_unitario: number;
    }>;
    monto_total: number;
    repartidor_id?: number;
    envases_prestados?: Array<{ producto_id: number; cantidad: number }>;
    observaciones?: string;
  }): Promise<any> {
    if (connectionManager.isConnected()) {
      try {
        const response = await fetch(`${API_URL}/api/repartidor-rapido/fiado`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        console.error('Error al registrar fiado online:', error);
      }
    }

    const operacionId = await offlineStorage.guardarOperacion(
      'FIADO_RAPIDO',
      data
    );

    return {
      success: true,
      offline: true,
      operacion_id: operacionId,
      message: 'Fiado guardado localmente. Se sincronizará cuando haya conexión.',
    };
  }
}

export const repartidorRapidoService = new RepartidorRapidoService();
```

## 7. Ejemplo de Uso en un Componente

**`app/repartidor/ventas/page.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { repartidorRapidoService } from '@/lib/services/repartidorRapidoService';
import { useOffline } from '@/lib/hooks/useOffline';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { SyncStatus } from '@/components/SyncStatus';

export default function VentasPage() {
  const { isOnline } = useOffline();
  const [loading, setLoading] = useState(false);

  const handleRegistrarVenta = async () => {
    setLoading(true);
    try {
      const resultado = await repartidorRapidoService.registrarVenta({
        cliente_id: 123,
        productos: [
          {
            producto_id: '1',
            cantidad: 2,
            precio_unitario: 3400,
          },
        ],
        monto_total: 6800,
        medio_pago: 'efectivo',
        forma_pago: 'total',
        repartidor_id: 5,
      });

      if (resultado.offline) {
        alert('Venta guardada localmente. Se sincronizará cuando haya conexión.');
      } else {
        alert('Venta registrada exitosamente');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al registrar la venta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Registro de Ventas</h1>
      
      <div className="mb-4">
        <SyncStatus />
      </div>

      <button
        onClick={handleRegistrarVenta}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {loading ? 'Registrando...' : 'Registrar Venta'}
      </button>

      <OfflineIndicator />
    </div>
  );
}
```

## 8. Configuración en `app/layout.tsx` o `_app.tsx`

```typescript
'use client';

import { useEffect } from 'react';
import { syncService } from '@/lib/services/syncService';
import { offlineStorage } from '@/lib/services/offlineStorage';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Inicializar almacenamiento offline
    offlineStorage.inicializar();

    // Iniciar sincronización automática cada 30 segundos
    syncService.iniciarSincronizacionAutomatica(30000);

    return () => {
      syncService.detenerSincronizacionAutomatica();
    };
  }, []);

  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
```

## 9. Variables de Entorno

**`.env.local`**

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## Checklist de Implementación

- [ ] Instalar dependencias (`idb`, `uuid`)
- [ ] Crear estructura de archivos según la guía
- [ ] Implementar `offlineStorage.ts` con IndexedDB
- [ ] Implementar `connectionManager.ts`
- [ ] Implementar `syncService.ts`
- [ ] Crear hooks `useOffline` y `useSync`
- [ ] Crear componentes `OfflineIndicator` y `SyncStatus`
- [ ] Implementar `repartidorRapidoService.ts`
- [ ] Configurar inicialización en `layout.tsx`
- [ ] Agregar variables de entorno
- [ ] Probar flujo offline/online
- [ ] Probar sincronización automática
- [ ] Probar manejo de errores

## Pruebas Recomendadas

1. **Modo Offline:**
   - Desactivar conexión WiFi/datos
   - Registrar una venta
   - Verificar que se guarda localmente
   - Verificar que aparece en el contador de pendientes

2. **Sincronización:**
   - Activar conexión después de operaciones offline
   - Verificar sincronización automática
   - Verificar que las operaciones desaparecen del contador

3. **Errores:**
   - Simular error del servidor
   - Verificar que las operaciones se mantienen localmente
   - Verificar reintento automático

## Notas Importantes

- **IndexedDB es asíncrono**: Siempre usar `await` al trabajar con el almacenamiento
- **Verificar `window`**: Algunas funciones solo funcionan en el cliente
- **UUIDs únicos**: Cada operación debe tener un UUID único para evitar duplicados
- **Sincronización en lotes**: El servidor procesa múltiples operaciones a la vez
- **Manejo de errores**: Las operaciones con error se mantienen para revisión manual

## Soporte

Para más detalles sobre los endpoints del servidor, consultar:
- `GUIA_MODO_OFFLINE.md` - Documentación técnica completa
- Endpoints disponibles en `/api/sincronizacion/*`

## Próximos Pasos Recomendados

1. Crear pruebas unitarias para los nuevos servicios
2. Implementar autenticación/autorización específica para repartidores
3. Crear documentación de API con Swagger/OpenAPI
4. Implementar rate limiting para prevenir abusos
5. Agregar métricas y monitoreo de uso
6. Implementar cache de datos maestros en el cliente móvil
7. Agregar compresión de datos para optimizar transferencia
