# Guía de Implementación: Modo Offline para Repartidores

## Descripción General

El sistema de modo offline permite que los repartidores continúen trabajando incluso cuando no tienen conexión a internet. Las operaciones se almacenan localmente en el dispositivo y se sincronizan automáticamente cuando se recupera la conexión.

## Arquitectura

### Flujo de Operación Offline

1. **Detección de Conexión**: La app móvil detecta si hay conexión a internet
2. **Almacenamiento Local**: Si no hay conexión, las operaciones se guardan localmente
3. **Sincronización**: Cuando se recupera la conexión, las operaciones se envían al servidor
4. **Procesamiento**: El servidor procesa las operaciones y devuelve resultados
5. **Actualización Local**: La app actualiza el estado local según los resultados

## Endpoints del Servidor

### 1. Verificar Conectividad
**GET** `/api/sincronizacion/ping`

Verifica si el servidor está disponible.

**Respuesta:**
```json
{
  "success": true,
  "message": "Servidor disponible",
  "timestamp": "2025-02-13T10:30:00.000Z",
  "servidor": "online"
}
```

### 2. Sincronizar Operaciones Pendientes
**POST** `/api/sincronizacion/operaciones`

Envía un lote de operaciones pendientes para sincronizar.

**Request Body:**
```json
{
  "operaciones": [
    {
      "operacion_id": "uuid-generado-en-cliente",
      "tipo": "VENTA_RAPIDA",
      "datos_operacion": {
        "cliente_id": 123,
        "productos": [...],
        "monto_total": 6800,
        "medio_pago": "efectivo",
        "forma_pago": "total",
        "repartidor_id": 5,
        "envases_prestados": [...],
        "observaciones": "..."
      },
      "repartidor_id": 5,
      "dispositivo_id": "device-uuid-unico",
      "fecha_operacion_local": "2025-02-13T10:25:00.000Z"
    }
  ]
}
```

**Tipos de Operación:**
- `VENTA_RAPIDA`: Venta completa con productos y pagos
- `COBRO_RAPIDO`: Cobro independiente
- `FIADO_RAPIDO`: Venta a crédito
- `MOVIMIENTO_ENVASE`: Movimiento independiente de envases

**Respuesta:**
```json
{
  "success": true,
  "message": "Procesadas 3 operaciones",
  "resumen": {
    "total": 3,
    "sincronizadas": 2,
    "errores": 1,
    "duplicadas": 0
  },
  "resultados": [
    {
      "operacion_id": "uuid-1",
      "estado": "sincronizado",
      "mensaje": "Operación procesada exitosamente",
      "resultado_id": "venta-uuid",
      "datos": {...}
    },
    {
      "operacion_id": "uuid-2",
      "estado": "error",
      "mensaje": "Cliente no encontrado",
      "error": "Cliente no encontrado"
    },
    {
      "operacion_id": "uuid-3",
      "estado": "duplicado",
      "mensaje": "Operación ya sincronizada",
      "resultado_id": "venta-uuid-existente"
    }
  ]
}
```

### 3. Obtener Estado de Sincronización
**GET** `/api/sincronizacion/estado?repartidor_id=5&dispositivo_id=device-uuid`

Obtiene el estado de sincronización de operaciones.

**Query Parameters:**
- `repartidor_id` (opcional): Filtrar por repartidor
- `dispositivo_id` (opcional): Filtrar por dispositivo

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "total": 10,
    "pendientes": 2,
    "sincronizadas": 7,
    "errores": 1,
    "duplicadas": 0,
    "operaciones": [...]
  }
}
```

### 4. Reintentar Operaciones con Error
**POST** `/api/sincronizacion/reintentar`

Reintenta sincronizar operaciones que fallaron.

**Request Body:**
```json
{
  "repartidor_id": 5,
  "dispositivo_id": "device-uuid",
  "max_intentos": 5
}
```

## Implementación en el Cliente Móvil

### 1. Detección de Conexión

```javascript
// Ejemplo en React Native
import NetInfo from '@react-native-community/netinfo';

class ConnectionManager {
  constructor() {
    this.isOnline = true;
    this.listeners = [];
    
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected && state.isInternetReachable;
      this.notifyListeners();
    });
  }

  isConnected() {
    return this.isOnline;
  }

  onConnectionChange(callback) {
    this.listeners.push(callback);
  }

  notifyListeners() {
    this.listeners.forEach(cb => cb(this.isOnline));
  }
}
```

### 2. Almacenamiento Local

#### Opción A: AsyncStorage (React Native)
```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

class OfflineStorage {
  async guardarOperacion(operacion) {
    const operaciones = await this.obtenerOperacionesPendientes();
    operaciones.push({
      ...operacion,
      operacion_id: this.generarUUID(),
      fecha_operacion_local: new Date().toISOString()
    });
    await AsyncStorage.setItem('operaciones_pendientes', JSON.stringify(operaciones));
  }

  async obtenerOperacionesPendientes() {
    const data = await AsyncStorage.getItem('operaciones_pendientes');
    return data ? JSON.parse(data) : [];
  }

  async eliminarOperacion(operacion_id) {
    const operaciones = await this.obtenerOperacionesPendientes();
    const filtradas = operaciones.filter(op => op.operacion_id !== operacion_id);
    await AsyncStorage.setItem('operaciones_pendientes', JSON.stringify(filtradas));
  }

  generarUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
```

#### Opción B: SQLite (React Native)
```javascript
import SQLite from 'react-native-sqlite-storage';

class OfflineStorageSQLite {
  constructor() {
    this.db = null;
  }

  async inicializar() {
    this.db = await SQLite.openDatabase({
      name: 'SoderiaDB',
      location: 'default',
    });

    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS operaciones_pendientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operacion_id TEXT UNIQUE NOT NULL,
        tipo TEXT NOT NULL,
        datos_operacion TEXT NOT NULL,
        fecha_operacion_local TEXT NOT NULL,
        sincronizado INTEGER DEFAULT 0
      )
    `);
  }

  async guardarOperacion(operacion) {
    await this.db.executeSql(
      `INSERT INTO operaciones_pendientes 
       (operacion_id, tipo, datos_operacion, fecha_operacion_local, sincronizado)
       VALUES (?, ?, ?, ?, 0)`,
      [
        operacion.operacion_id,
        operacion.tipo,
        JSON.stringify(operacion.datos_operacion),
        operacion.fecha_operacion_local
      ]
    );
  }

  async obtenerOperacionesPendientes() {
    const [results] = await this.db.executeSql(
      'SELECT * FROM operaciones_pendientes WHERE sincronizado = 0'
    );
    
    const operaciones = [];
    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      operaciones.push({
        operacion_id: row.operacion_id,
        tipo: row.tipo,
        datos_operacion: JSON.parse(row.datos_operacion),
        fecha_operacion_local: row.fecha_operacion_local
      });
    }
    return operaciones;
  }
}
```

### 3. Servicio de Sincronización

```javascript
class SincronizacionService {
  constructor(apiUrl, storage, connectionManager) {
    this.apiUrl = apiUrl;
    this.storage = storage;
    this.connectionManager = connectionManager;
    this.sincronizando = false;
  }

  async sincronizar() {
    if (this.sincronizando || !this.connectionManager.isConnected()) {
      return;
    }

    this.sincronizando = true;

    try {
      // Verificar conectividad
      const pingResponse = await fetch(`${this.apiUrl}/api/sincronizacion/ping`);
      if (!pingResponse.ok) {
        throw new Error('Servidor no disponible');
      }

      // Obtener operaciones pendientes
      const operaciones = await this.storage.obtenerOperacionesPendientes();
      
      if (operaciones.length === 0) {
        return;
      }

      // Enviar operaciones al servidor
      const response = await fetch(`${this.apiUrl}/api/sincronizacion/operaciones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operaciones: operaciones.map(op => ({
            ...op,
            repartidor_id: this.getRepartidorId(),
            dispositivo_id: this.getDispositivoId()
          }))
        })
      });

      const resultado = await response.json();

      if (!resultado.success) {
        throw new Error(resultado.message);
      }

      // Procesar resultados
      for (const res of resultado.resultados) {
        if (res.estado === 'sincronizado' || res.estado === 'duplicado') {
          // Eliminar de almacenamiento local
          await this.storage.eliminarOperacion(res.operacion_id);
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

  async iniciarSincronizacionAutomatica(intervalo = 30000) {
    // Sincronizar inmediatamente si hay conexión
    if (this.connectionManager.isConnected()) {
      await this.sincronizar();
    }

    // Escuchar cambios de conexión
    this.connectionManager.onConnectionChange(async (isOnline) => {
      if (isOnline) {
        await this.sincronizar();
      }
    });

    // Sincronizar periódicamente
    setInterval(async () => {
      if (this.connectionManager.isConnected()) {
        await this.sincronizar();
      }
    }, intervalo);
  }

  getRepartidorId() {
    // Obtener del almacenamiento local o contexto de la app
    return 5; // Ejemplo
  }

  getDispositivoId() {
    // Generar o obtener ID único del dispositivo
    // En React Native puedes usar react-native-device-info
    return 'device-uuid-unico';
  }
}
```

### 4. Integración en la App

```javascript
// Ejemplo de uso en un componente React Native
import React, { useEffect, useState } from 'react';
import { View, Text, Button } from 'react-native';
import ConnectionManager from './services/ConnectionManager';
import OfflineStorage from './services/OfflineStorage';
import SincronizacionService from './services/SincronizacionService';

const App = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [operacionesPendientes, setOperacionesPendientes] = useState(0);

  useEffect(() => {
    const connectionManager = new ConnectionManager();
    const storage = new OfflineStorage();
    const syncService = new SincronizacionService(
      'https://tu-api.com',
      storage,
      connectionManager
    );

    connectionManager.onConnectionChange(setIsOnline);
    syncService.iniciarSincronizacionAutomatica();

    // Actualizar contador de operaciones pendientes
    const actualizarContador = async () => {
      const ops = await storage.obtenerOperacionesPendientes();
      setOperacionesPendientes(ops.length);
    };

    actualizarContador();
    const interval = setInterval(actualizarContador, 5000);

    return () => clearInterval(interval);
  }, []);

  const registrarVenta = async (datosVenta) => {
    const connectionManager = new ConnectionManager();
    const storage = new OfflineStorage();

    if (connectionManager.isConnected()) {
      // Intentar registrar directamente
      try {
        const response = await fetch('https://tu-api.com/api/repartidor-rapido/venta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(datosVenta)
        });
        
        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        console.error('Error al registrar venta:', error);
      }
    }

    // Si falla o no hay conexión, guardar localmente
    await storage.guardarOperacion({
      tipo: 'VENTA_RAPIDA',
      datos_operacion: datosVenta
    });

    setOperacionesPendientes(prev => prev + 1);
  };

  return (
    <View>
      <Text>Estado: {isOnline ? 'Online' : 'Offline'}</Text>
      <Text>Operaciones pendientes: {operacionesPendientes}</Text>
      <Button 
        title="Registrar Venta" 
        onPress={() => registrarVenta({...})} 
      />
    </View>
  );
};
```

## Mejores Prácticas

### 1. Generación de UUIDs
- Usar UUIDs únicos para cada operación
- El servidor detecta duplicados automáticamente
- Evita procesar la misma operación dos veces

### 2. Manejo de Errores
- Mantener operaciones con error en almacenamiento local
- Implementar límite de reintentos
- Notificar al usuario sobre errores persistentes

### 3. Optimización de Sincronización
- Sincronizar en lotes (no una por una)
- Sincronizar automáticamente cuando se recupera conexión
- Sincronizar periódicamente en segundo plano

### 4. Validación Local
- Validar datos antes de guardar localmente
- Verificar que el cliente existe antes de crear venta offline
- Mantener cache de datos maestros (clientes, productos)

### 5. Experiencia de Usuario
- Mostrar indicador de estado de conexión
- Mostrar contador de operaciones pendientes
- Permitir sincronización manual
- Notificar cuando se completa la sincronización

## Consideraciones de Seguridad

1. **Autenticación**: Incluir token de autenticación en todas las peticiones
2. **Validación**: El servidor valida todos los datos recibidos
3. **Límites**: Implementar límites de tamaño de lote y frecuencia
4. **Encriptación**: Considerar encriptar datos sensibles en almacenamiento local

## Testing

### Escenarios a Probar

1. **Sin Conexión Inicial**
   - Registrar venta sin conexión
   - Verificar que se guarda localmente
   - Recuperar conexión
   - Verificar sincronización automática

2. **Pérdida de Conexión Durante Operación**
   - Iniciar registro de venta
   - Perder conexión durante la petición
   - Verificar que se guarda localmente
   - Verificar sincronización posterior

3. **Operaciones Duplicadas**
   - Enviar misma operación dos veces
   - Verificar que el servidor detecta duplicado
   - Verificar que no se procesa dos veces

4. **Errores del Servidor**
   - Simular error del servidor
   - Verificar que la operación se mantiene local
   - Verificar reintento automático

## Próximos Pasos

1. Implementar cache de datos maestros (clientes, productos)
2. Agregar compresión de datos para optimizar transferencia
3. Implementar sincronización diferencial (solo cambios)
4. Agregar métricas y monitoreo de sincronización
5. Implementar notificaciones push para sincronización completa
