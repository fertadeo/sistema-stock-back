# Guía Frontend: clientes, cuenta corriente, cobros y envases

Guía de integración frontend basada en lo que hoy está implementado en backend.

Este documento está pensado para uso práctico: rutas, payloads, respuestas, errores y reglas de negocio para poder implementar pantallas sin tener que inferir comportamiento desde el código del backend.

---

## 1. Alcance

Esta guía cubre:

- clientes
- zonas
- cuenta corriente
- clientes deudores
- cobros por cliente
- alta de cobros desde la ficha del cliente
- resumen e historial de envases
- movimientos de envases
- sincronización offline de alta de clientes

---

## 2. Antes de integrar

### Migraciones necesarias

Antes de probar estos flujos contra una base real, deben ejecutarse estas migraciones:

- `migrations/alter_venta_medio_pago.sql`
- `migrations/alter_movimientos_agregar_cobro_cliente.sql`
- `migrations/alter_operaciones_pendientes_agregar_nuevo_cliente.sql`

Si estas migraciones no corren, algunos endpoints pueden fallar aunque el código compile.

### Base URL

Ejemplo local:

```txt
http://localhost:8080
```

Todos los ejemplos de esta guía asumen ese host.

---

## 3. Convenciones importantes

### 3.1 Hay dos estilos de respuesta

Hoy conviven dos estilos de respuesta en backend:

#### A. Endpoints legacy

Devuelven directamente arrays u objetos, sin wrapper `success/data`.

Ejemplos:

- `GET /api/clientes`
- `GET /api/clientes/:id`
- `POST /api/clientes`
- `PUT /api/clientes/:id`
- `GET /api/clientes/zonas`

#### B. Endpoints nuevos

Devuelven wrapper estándar:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Ejemplos:

- `GET /api/clientes/deudores`
- `GET /api/clientes/:id/cuenta-corriente/resumen`
- `GET /api/clientes/:id/cuenta-corriente`
- `GET /api/clientes/:id/cobros`
- `POST /api/clientes/:id/cobros`
- `GET /api/clientes/:id/envases/resumen`
- `GET /api/clientes/:id/envases/movimientos`
- `POST /api/clientes/:id/envases/movimientos`

### 3.2 Regla para frontend

No asumir un solo envelope global. La integración debe respetar la respuesta real de cada endpoint.

### 3.3 Tipos reales a esperar

- ids de clientes: `number`
- ids de cobro: `number`
- ids de venta: `string` UUID
- montos: `number` en endpoints nuevos; algunos modelos históricos siguen persistidos como `string`
- fechas: ISO string en endpoints nuevos; en legacy puede venir serialización estándar de `Date`

---

## 4. Mapa rápido de endpoints

### Clientes y zonas

- `GET /api/clientes`
- `GET /api/clientes/:id`
- `POST /api/clientes`
- `PUT /api/clientes/:id`
- `PATCH /api/clientes/:id/estado`
- `DELETE /api/clientes/:id`
- `GET /api/clientes/zonas`

### Cuenta corriente y cobros

- `GET /api/clientes/deudores`
- `GET /api/clientes/:id/cuenta-corriente/resumen`
- `GET /api/clientes/:id/cuenta-corriente`
- `GET /api/clientes/:id/cobros`
- `POST /api/clientes/:id/cobros`

### Envases

- `GET /api/clientes/:id/envases/resumen`
- `GET /api/clientes/:id/envases/movimientos`
- `POST /api/clientes/:id/envases/movimientos`

### Legacy de envases

Siguen existiendo, pero para nuevas pantallas conviene priorizar los endpoints unificados:

- `POST /api/clientes/envases/prestar`
- `GET /api/clientes/:id/envases`

### Offline

- `POST /api/sincronizacion/operaciones`
- `GET /api/sincronizacion/estado`
- `POST /api/sincronizacion/reintentar`
- `GET /api/sincronizacion/ping`

---

## 5. Modelos recomendados para frontend

Estos tipos representan lo que conviene modelar en frontend para la integración actual.

```ts
export type Cliente = {
  id: number;
  dni: string;
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
  latitud: number | null;
  longitud: number | null;
  fecha_alta: string;
  estado: boolean;
  repartidor: string;
  dia_reparto: string;
  zona?: number;
  envases_prestados?: EnvasePrestado[];
  historial_ventas?: VentaHistorial[];
};

export type Zona = {
  id: number;
  nombre: string;
};

export type VentaHistorial = {
  venta_id: string;
  monto_total: string;
  medio_pago: "efectivo" | "transferencia" | "debito" | "credito";
  forma_pago: "total" | "parcial";
  saldo: boolean;
  saldo_monto?: string | null;
  fecha_venta: string;
  tipo: "LOCAL" | "REPARTIDOR" | "REVENDEDOR";
  observaciones?: string | null;
};

export type Cobro = {
  id: number;
  cliente_id: number;
  nombre_cliente: string;
  monto: number;
  medio_pago: "efectivo" | "transferencia" | "debito" | "credito";
  observaciones: string | null;
  venta_relacionada_id: string | null;
  repartidor_id: number | null;
  fecha_cobro: string;
};

export type CuentaCorrienteResumen = {
  cliente: {
    id: number;
    nombre: string;
    telefono: string;
    direccion: string;
    estado: boolean;
    zona: number | null;
    repartidor: string;
    dia_reparto: string;
  };
  saldo_actual: number;
  total_debitos: number;
  total_creditos: number;
  cantidad_movimientos: number;
  ultimo_movimiento_at: string | null;
};

export type MovimientoCuentaCorriente = {
  id: string;
  fecha: string;
  tipo: "DEBITO_VENTA" | "CREDITO_COBRO";
  origen: "VENTA" | "COBRO";
  referencia_id: string;
  descripcion: string;
  debito: number;
  credito: number;
  saldo_acumulado: number;
  medio_pago: "efectivo" | "transferencia" | "debito" | "credito" | null;
  observaciones: string | null;
  venta_relacionada_id: string | null;
};

export type ClienteDeudor = {
  cliente_id: number;
  nombre: string;
  telefono: string;
  direccion: string;
  estado: boolean;
  zona: number | null;
  repartidor: string;
  dia_reparto: string;
  saldo_actual: number;
  total_debitos: number;
  total_creditos: number;
  cantidad_movimientos: number;
  ultimo_movimiento_at: string | null;
};

export type EnvasePrestado = {
  id?: number;
  cliente_id?: number;
  producto_id: number;
  producto_nombre: string;
  capacidad: number;
  cantidad: number;
  fecha_prestamo?: string;
};

export type ResumenEnvases = {
  cliente_id: number;
  saldo_actual: Array<{
    producto_id: number;
    producto_nombre: string;
    capacidad: number;
    cantidad: number;
  }>;
  cantidad_total: number;
  ultimo_movimiento_at: string | null;
};

export type MovimientoEnvase = {
  id: number;
  cliente_id: number;
  producto_id: number;
  producto_nombre: string;
  capacidad: number;
  tipo: "PRESTAMO" | "DEVOLUCION" | "AJUSTE";
  cantidad: number;
  observaciones: string | null;
  repartidor_id: number | null;
  venta_relacionada_id: string | null;
  fecha_movimiento: string;
};
```

---

## 6. Clientes

## `GET /api/clientes`

### Uso

Lista clientes. Si se envía `search` con 2 o más caracteres, hace búsqueda por relevancia.

### Query params

- `search?: string`

### Ejemplo

```http
GET /api/clientes?search=juan
```

### Respuesta real

Este endpoint es legacy: devuelve un array directo.

```json
[
  {
    "id": 25,
    "dni": "30111222",
    "nombre": "Juan Perez",
    "email": "",
    "telefono": "3584123456",
    "direccion": "Sobremonte 123",
    "latitud": -33.12,
    "longitud": -64.34,
    "fecha_alta": "2026-05-26T17:00:00.000Z",
    "estado": true,
    "repartidor": "Pedro",
    "dia_reparto": "martes",
    "zona": 3,
    "envases_prestados": []
  }
]
```

### Notas para frontend

- `zona` viene como id numérico
- no devuelve wrapper `success/data`
- si `search` tiene menos de 2 caracteres, devuelve todos

---

## `GET /api/clientes/:id`

### Uso

Obtiene el detalle de un cliente, incluyendo ventas históricas y envases actuales.

### Ejemplo

```http
GET /api/clientes/25
```

### Respuesta real

También es endpoint legacy: devuelve el objeto directamente.

```json
{
  "id": 25,
  "dni": "30111222",
  "nombre": "Juan Perez",
  "email": "",
  "telefono": "3584123456",
  "direccion": "Sobremonte 123",
  "latitud": -33.12,
  "longitud": -64.34,
  "fecha_alta": "2026-05-26T17:00:00.000Z",
  "estado": true,
  "repartidor": "Pedro",
  "dia_reparto": "martes",
  "zona": 3,
  "envases_prestados": [],
  "historial_ventas": []
}
```

### Errores

`400`:

```json
{
  "success": false,
  "message": "ID de cliente inválido"
}
```

`404`:

```json
{
  "success": false,
  "message": "Cliente no encontrado",
  "id": 25
}
```

---

## `POST /api/clientes`

### Uso

Crea un cliente nuevo.

### Payload real esperado

```json
{
  "dni": "30111222",
  "nombre": "Juan Perez",
  "email": "",
  "telefono": "3584123456",
  "direccion": "Sobremonte 123",
  "latitud": "-33.123456",
  "longitud": "-64.123456",
  "zona": 3,
  "repartidor": "Pedro",
  "dia_reparto": "martes",
  "envases_prestados": [
    {
      "producto_id": 1,
      "producto_nombre": "Bidon 20L",
      "capacidad": 20,
      "cantidad": 2
    }
  ]
}
```

### Respuesta real

Devuelve el cliente normalizado, sin wrapper.

```json
{
  "id": 25,
  "dni": "30111222",
  "nombre": "Juan Perez",
  "email": "",
  "telefono": "3584123456",
  "direccion": "Sobremonte 123",
  "latitud": -33.123456,
  "longitud": -64.123456,
  "fecha_alta": "2026-05-26T17:00:00.000Z",
  "estado": true,
  "repartidor": "Pedro",
  "dia_reparto": "martes",
  "zona": 3,
  "envases_prestados": [
    {
      "id": 10,
      "cliente_id": 25,
      "producto_id": 1,
      "producto_nombre": "Bidon 20L",
      "capacidad": 20,
      "cantidad": 2,
      "fecha_prestamo": "2026-05-26T17:00:00.000Z"
    }
  ],
  "historial_ventas": []
}
```

### Reglas para frontend

- `zona` se envía como número
- `latitud` y `longitud` pueden enviarse como string o number, pero conviene mandarlas como string consistente con el backend actual
- si se envían `envases_prestados`, cada item debe incluir `producto_nombre` y `capacidad`

---

## `PUT /api/clientes/:id`

### Uso

Actualiza el cliente.

### Payload

Mismo formato que `POST /api/clientes`.

### Regla importante

Si se envía `envases_prestados`, el backend:

- elimina los registros previos
- crea el nuevo set completo

Por eso el frontend debe mandar el snapshot final completo, no solo un delta.

---

## `PATCH /api/clientes/:id/estado`

### Payload

```json
{
  "estado": false
}
```

### Respuesta

```json
{
  "success": true,
  "message": "Cliente desactivado exitosamente",
  "cliente": {
    "id": 25,
    "nombre": "Juan Perez",
    "estado": false
  }
}
```

### Regla

Si `estado = false`, el cliente no debería recibir nuevas ventas.

---

## `GET /api/clientes/zonas`

### Respuesta real

Endpoint legacy: devuelve array directo.

```json
[
  {
    "id": 1,
    "nombre": "Centro"
  }
]
```

---

## 7. Cuenta corriente y deudores

## `GET /api/clientes/deudores`

### Query params

- `search?: string`
- `page?: number`
- `limit?: number`

### Ejemplo

```http
GET /api/clientes/deudores?search=juan&page=1&limit=20
```

### Respuesta

```json
{
  "success": true,
  "data": [
    {
      "cliente_id": 25,
      "nombre": "Juan Perez",
      "telefono": "3584123456",
      "direccion": "Sobremonte 123",
      "estado": true,
      "zona": 3,
      "repartidor": "Pedro",
      "dia_reparto": "martes",
      "saldo_actual": 12500,
      "total_debitos": 30000,
      "total_creditos": 17500,
      "cantidad_movimientos": 5,
      "ultimo_movimiento_at": "2026-05-26T17:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "pagina": 1,
    "porPagina": 20,
    "totalPaginas": 1
  }
}
```

### Regla clave

`saldo_actual` se calcula en backend. No recalcular en frontend.

---

## `GET /api/clientes/:id/cuenta-corriente/resumen`

### Respuesta

```json
{
  "success": true,
  "data": {
    "cliente": {
      "id": 25,
      "nombre": "Juan Perez",
      "telefono": "3584123456",
      "direccion": "Sobremonte 123",
      "estado": true,
      "zona": 3,
      "repartidor": "Pedro",
      "dia_reparto": "martes"
    },
    "saldo_actual": 12500,
    "total_debitos": 30000,
    "total_creditos": 17500,
    "cantidad_movimientos": 5,
    "ultimo_movimiento_at": "2026-05-26T17:00:00.000Z"
  }
}
```

### Uso recomendado

Úsalo para:

- header de la ficha del cliente
- badge de saldo actual
- resumen rápido antes de abrir el extracto completo

---

## `GET /api/clientes/:id/cuenta-corriente`

### Query params

- `desde?: YYYY-MM-DD`
- `hasta?: YYYY-MM-DD`
- `page?: number`
- `limit?: number`

### Ejemplo

```http
GET /api/clientes/25/cuenta-corriente?desde=2026-05-01&hasta=2026-05-31&page=1&limit=20
```

### Respuesta

```json
{
  "success": true,
  "data": {
    "resumen": {
      "cliente": {
        "id": 25,
        "nombre": "Juan Perez",
        "telefono": "3584123456",
        "direccion": "Sobremonte 123",
        "estado": true,
        "zona": 3,
        "repartidor": "Pedro",
        "dia_reparto": "martes"
      },
      "saldo_actual": 12500,
      "total_debitos": 30000,
      "total_creditos": 17500,
      "cantidad_movimientos": 5,
      "ultimo_movimiento_at": "2026-05-26T17:00:00.000Z"
    },
    "movimientos": [
      {
        "id": "cobro-18",
        "fecha": "2026-05-03T15:30:00.000Z",
        "tipo": "CREDITO_COBRO",
        "origen": "COBRO",
        "referencia_id": "18",
        "descripcion": "Cobro a Juan Perez por $5000",
        "debito": 0,
        "credito": 5000,
        "saldo_acumulado": 7000,
        "medio_pago": "efectivo",
        "observaciones": "Cobro parcial",
        "venta_relacionada_id": null
      },
      {
        "id": "venta-uuid-123",
        "fecha": "2026-05-01T10:00:00.000Z",
        "tipo": "DEBITO_VENTA",
        "origen": "VENTA",
        "referencia_id": "uuid-123",
        "descripcion": "Venta repartidor con saldo pendiente",
        "debito": 12000,
        "credito": 0,
        "saldo_acumulado": 12000,
        "medio_pago": "credito",
        "observaciones": null,
        "venta_relacionada_id": "uuid-123"
      }
    ]
  },
  "meta": {
    "total": 2,
    "pagina": 1,
    "porPagina": 20,
    "totalPaginas": 1
  }
}
```

### Regla clave

El resumen incluido en este endpoint representa el saldo global del cliente, no solo el saldo del rango filtrado.

---

## `GET /api/clientes/:id/cobros`

### Query params

- `desde?: YYYY-MM-DD`
- `hasta?: YYYY-MM-DD`
- `page?: number`
- `limit?: number`

### Respuesta

```json
{
  "success": true,
  "data": [
    {
      "id": 18,
      "cliente_id": 25,
      "nombre_cliente": "Juan Perez",
      "monto": 5000,
      "medio_pago": "efectivo",
      "observaciones": "Cobro parcial",
      "venta_relacionada_id": null,
      "repartidor_id": null,
      "fecha_cobro": "2026-05-03T15:30:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "pagina": 1,
    "porPagina": 20,
    "totalPaginas": 1
  }
}
```

### Uso recomendado

Útil para:

- pestaña “Cobros”
- historial de pagos del cliente
- conciliación visual simple en frontend

---

## `POST /api/clientes/:id/cobros`

### Payload

```json
{
  "monto": 5000,
  "medio_pago": "efectivo",
  "observaciones": "Cobro parcial",
  "venta_relacionada_id": null,
  "repartidor_id": null
}
```

### Respuesta

```json
{
  "success": true,
  "data": {
    "cobro": {
      "id": 18,
      "cliente_id": 25,
      "nombre_cliente": "Juan Perez",
      "monto": 5000,
      "medio_pago": "efectivo",
      "observaciones": "Cobro parcial",
      "venta_relacionada_id": null,
      "repartidor_id": null,
      "fecha_cobro": "2026-05-03T15:30:00.000Z"
    },
    "saldo_actual": 7000
  }
}
```

### Validaciones

- `monto` debe ser mayor a `0`
- `medio_pago` debe ser uno de:
  - `efectivo`
  - `transferencia`
  - `debito`
  - `credito`

### Flujo recomendado en frontend

1. enviar cobro
2. actualizar el resumen del cliente con `saldo_actual` de la respuesta
3. refrescar extracto y listado de cobros si la pantalla ya los muestra

---

## 8. Envases

## `GET /api/clientes/:id/envases/resumen`

### Respuesta

```json
{
  "success": true,
  "data": {
    "cliente_id": 25,
    "saldo_actual": [
      {
        "producto_id": 1,
        "producto_nombre": "Bidon 20L",
        "capacidad": 20,
        "cantidad": 2
      }
    ],
    "cantidad_total": 2,
    "ultimo_movimiento_at": "2026-05-26T17:00:00.000Z"
  }
}
```

### Uso recomendado

Úsalo para:

- resumen de envases en la ficha del cliente
- contadores rápidos
- validar si el cliente tiene saldo pendiente de envases

---

## `GET /api/clientes/:id/envases/movimientos`

### Query params

- `page?: number`
- `limit?: number`
- `tipo?: PRESTAMO | DEVOLUCION | AJUSTE`

### Respuesta

```json
{
  "success": true,
  "data": [
    {
      "id": 44,
      "cliente_id": 25,
      "producto_id": 1,
      "producto_nombre": "Bidon 20L",
      "capacidad": 20,
      "tipo": "PRESTAMO",
      "cantidad": 2,
      "observaciones": "Entrega con venta",
      "repartidor_id": 5,
      "venta_relacionada_id": "uuid-venta",
      "fecha_movimiento": "2026-05-01T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "pagina": 1,
    "porPagina": 20,
    "totalPaginas": 1
  }
}
```

### Notas

- `cantidad` en historial puede venir positiva o negativa según el tipo y cómo fue grabado el movimiento
- el frontend no debe usar este endpoint para inferir el saldo actual; para eso debe usar `envases/resumen`

---

## `POST /api/clientes/:id/envases/movimientos`

### Payload para préstamo

```json
{
  "tipo": "PRESTAMO",
  "items": [
    {
      "producto_id": 1,
      "cantidad": 2
    }
  ],
  "observaciones": "Entrega manual",
  "repartidor_id": null,
  "venta_relacionada_id": null
}
```

### Payload para devolución

```json
{
  "tipo": "DEVOLUCION",
  "items": [
    {
      "producto_id": 1,
      "cantidad": 1
    }
  ],
  "observaciones": "Retiro en local"
}
```

### Payload para ajuste

```json
{
  "tipo": "AJUSTE",
  "items": [
    {
      "producto_id": 1,
      "cantidad": -1
    }
  ],
  "observaciones": "Corrección por diferencia de conteo"
}
```

### Respuesta

```json
{
  "success": true,
  "data": {
    "saldo_actual": [
      {
        "producto_id": 1,
        "producto_nombre": "Bidon 20L",
        "capacidad": 20,
        "cantidad": 1
      }
    ],
    "cantidad_total": 1,
    "ultimo_movimiento_at": "2026-05-26T19:00:00.000Z",
    "movimientos_creados": [
      {
        "id": 45,
        "tipo": "DEVOLUCION",
        "cantidad": -1
      }
    ]
  }
}
```

### Reglas clave

- `items` debe ser array
- para `PRESTAMO` y `DEVOLUCION`, la cantidad debe ser positiva
- para `AJUSTE`, la cantidad puede ser positiva o negativa
- `AJUSTE` requiere `observaciones`
- no se permite saldo negativo al finalizar la operación

### Recomendación de UI

En el formulario:

- usar selector de tipo de movimiento
- mostrar `observaciones` obligatorias solo si `tipo = AJUSTE`
- refrescar el resumen de envases después del `POST`

---

## 9. Offline: alta de clientes

## `POST /api/sincronizacion/operaciones`

### Operación `NUEVO_CLIENTE`

Ahora el backend acepta `NUEVO_CLIENTE` dentro del lote de sincronización.

### Payload del lote

```json
{
  "operaciones": [
    {
      "operacion_id": "uuid-generado-en-el-dispositivo",
      "tipo": "NUEVO_CLIENTE",
      "datos_operacion": {
        "dni": "30111222",
        "nombre": "Juan Perez",
        "email": "",
        "telefono": "3584123456",
        "direccion": "Sobremonte 123",
        "latitud": -33.123456,
        "longitud": -64.123456,
        "zona": 3,
        "repartidor": "Pedro",
        "dia_reparto": "martes",
        "envases_prestados": [
          {
            "producto_id": 1,
            "cantidad": 2
          }
        ]
      },
      "repartidor_id": 5,
      "dispositivo_id": "device-123",
      "fecha_operacion_local": "2026-05-26T19:00:00.000Z"
    }
  ]
}
```

### Respuesta del servidor

Se devuelve dentro del resultado global de sincronización:

```json
{
  "success": true,
  "message": "Procesadas 1 operaciones",
  "resumen": {
    "total": 1,
    "sincronizadas": 1,
    "errores": 0,
    "duplicadas": 0
  },
  "resultados": [
    {
      "operacion_id": "uuid-generado-en-el-dispositivo",
      "estado": "sincronizado",
      "mensaje": "Operación procesada exitosamente",
      "resultado_id": "25",
      "datos": {
        "id": 25,
        "nombre": "Juan Perez"
      }
    }
  ]
}
```

### Alcance actual

La alta offline hoy cubre:

- datos básicos del cliente
- validación de DNI duplicado
- validación de zona
- envases iniciales

No cubre todavía:

- geocodificación automática
- flujos complejos de conciliación
- catálogos offline enriquecidos

---

## 10. Manejo de errores

### Errores típicos de validación

#### Cuenta corriente y cobros

```json
{
  "success": false,
  "message": "El monto debe ser un número mayor a 0"
}
```

```json
{
  "success": false,
  "message": "Medio de pago inválido"
}
```

#### Envases

```json
{
  "success": false,
  "message": "Debe enviar al menos un item"
}
```

```json
{
  "success": false,
  "message": "Los ajustes requieren observaciones"
}
```

```json
{
  "success": false,
  "message": "La operación deja saldo negativo de envases para el producto Bidon 20L"
}
```

#### Cliente inexistente

```json
{
  "success": false,
  "message": "Cliente no encontrado"
}
```

### Recomendación de frontend

- si llega `400`, mostrar mensaje del backend directamente
- si llega `404`, refrescar ficha o volver al listado
- si llega `500`, mostrar mensaje genérico y registrar el error para soporte

---

## 11. Reglas de negocio para frontend

### Cuenta corriente

- el saldo siempre se toma de backend
- no recalcular en frontend
- no asumir conciliación por venta individual

### Cobros

- un cobro impacta en el saldo global del cliente
- un cobro no elimina deuda histórica del extracto
- `venta_relacionada_id` es opcional

### Envases

- el saldo actual siempre se consulta en `envases/resumen`
- el historial no reemplaza el resumen
- las devoluciones deben pasar backend, no inferirse localmente

### Clientes

- `POST` y `PUT` trabajan con `zona`, no con `zona_id`
- `envases_prestados` en alta/edición es snapshot completo, no delta

---

## 12. Sugerencia de implementación por pantalla

### Listado de clientes

Consumir:

- `GET /api/clientes`

### Alta/edición de cliente

Consumir:

- `GET /api/clientes/zonas`
- `POST /api/clientes`
- `PUT /api/clientes/:id`

### Ficha de cliente

Consumir:

- `GET /api/clientes/:id`
- `GET /api/clientes/:id/cuenta-corriente/resumen`
- `GET /api/clientes/:id/envases/resumen`

### Cuenta corriente

Consumir:

- `GET /api/clientes/:id/cuenta-corriente`
- `GET /api/clientes/:id/cobros`
- `POST /api/clientes/:id/cobros`

### Clientes deudores

Consumir:

- `GET /api/clientes/deudores`

### Gestión de envases

Consumir:

- `GET /api/clientes/:id/envases/resumen`
- `GET /api/clientes/:id/envases/movimientos`
- `POST /api/clientes/:id/envases/movimientos`

### Offline mobile

Consumir:

- `GET /api/sincronizacion/ping`
- `POST /api/sincronizacion/operaciones`
- `GET /api/sincronizacion/estado`

---

## 13. Checklist de integración frontend

- [ ] consumir `GET /api/clientes/zonas` antes de renderizar selector de zona
- [ ] usar `medio_pago` en todos los formularios nuevos
- [ ] no recalcular saldo de cuenta corriente en frontend
- [ ] no recalcular saldo actual de envases desde historial
- [ ] tratar endpoints legacy sin asumir wrapper `success/data`
- [ ] tratar endpoints nuevos con `success/data/meta`
- [ ] refrescar resumen de cuenta corriente después de crear un cobro
- [ ] refrescar resumen de envases después de registrar un movimiento
- [ ] para edición de cliente, enviar `envases_prestados` completo si se toca esa sección
- [ ] para offline, generar `operacion_id` único por operación

---

## 14. Documentos relacionados

- `docs/clientes-cuenta-corriente-envases.md`
- `GUIA_MODO_OFFLINE.md`
- `MEJORAS_REPARTIDOR_RAPIDO.md`

---

## 15. Estado actual resumido

Hoy frontend ya puede implementar sin bloqueo:

- listado y detalle de clientes
- alta y edición de clientes
- clientes deudores
- resumen y extracto de cuenta corriente
- listado y alta de cobros por cliente
- resumen e historial de envases
- préstamo, devolución y ajuste de envases
- alta offline inicial de clientes vía sincronización

La principal limitación pendiente es la conciliación fina entre cobros y ventas específicas. Mientras eso no exista, el frontend debe tratar la deuda como saldo global del cliente.
