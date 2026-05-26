# Clientes, cuenta corriente, deuda y envases

Documento de relevamiento y propuesta para alinear backend y frontend en estos flujos:

- alta y edicion de clientes
- cuenta corriente por cliente
- deuda / fiados / cobros
- envases prestados, devueltos y ajustados

La idea de este documento es separar claramente:

1. que existe hoy y se puede consumir
2. que existe pero esta incompleto o inconsistente
3. que conviene implementar como contrato objetivo para frontend

---

## 1. Resumen ejecutivo

### Lo que ya existe

Hoy el backend ya tiene piezas importantes:

- CRUD de clientes en `/api/clientes`
- ventas con saldo pendiente en `Venta`
- cobros en `Cobro`
- flujo rapido para repartidor en `/api/repartidor-rapido`
- modo offline y sincronizacion en `/api/sincronizacion`
- snapshot de envases prestados en `EnvasesPrestados`
- historial de movimientos de envases en `MovimientoEnvase`

### Lo que todavia no existe como feature cerrada

Todavia no existe una cuenta corriente real por cliente como modulo consistente. Lo mas cercano es la combinacion de:

- `Venta.saldo` + `Venta.saldo_monto`
- `Cobro`
- `historial_ventas` devuelto por `GET /api/clientes/:id`

Eso permite registrar deuda, pero no alcanza para exponer al frontend una vista confiable de:

- saldo actual por cliente
- extracto cronologico de debitos y creditos
- deuda consolidada
- clientes deudores
- aplicacion formal de cobros a deuda
- estado completo de envases en una API uniforme

### Recomendacion principal

La forma mas rapida y menos riesgosa de llegar a una primera version usable es:

1. mantener las tablas actuales (`Clientes`, `Venta`, `Cobro`, `EnvasesPrestados`, `MovimientoEnvase`)
2. agregar una capa de lectura para cuenta corriente por cliente
3. unificar contratos para clientes, cobros y envases
4. dejar como segunda etapa la conciliacion avanzada cobro vs venta

En otras palabras: para un MVP consistente no hace falta rehacer el modelo completo, pero si hace falta crear endpoints de lectura y normalizar respuestas.

### Estado tras Fase 1

Ya quedaron implementados estos endpoints de lectura:

- `GET /api/clientes/deudores`
- `GET /api/clientes/:id/cuenta-corriente/resumen`
- `GET /api/clientes/:id/cuenta-corriente`
- `GET /api/clientes/:id/cobros`

### Estado tras Fase 2

Ya quedó implementado:

- `POST /api/clientes/:id/cobros`

La respuesta devuelve:

- el cobro creado
- el `saldo_actual` recalculado del cliente

### Estado tras Fase 3

Ya quedaron implementados estos endpoints unificados para envases:

- `GET /api/clientes/:id/envases/resumen`
- `GET /api/clientes/:id/envases/movimientos`
- `POST /api/clientes/:id/envases/movimientos`

El endpoint de escritura soporta:

- `PRESTAMO`
- `DEVOLUCION`
- `AJUSTE`

Reglas activas:

- no se permite dejar saldo negativo de envases
- `AJUSTE` requiere `observaciones`
- el snapshot actual de `EnvasesPrestados` se consolida por cliente y producto

### Estado tras Fase 4 inicial

Quedó implementado soporte inicial para sincronización offline de alta de clientes:

- `TipoOperacion.NUEVO_CLIENTE`

La sincronización ahora puede crear clientes nuevos y registrar envases iniciales si se envían en la operación offline.

Importante:

- esta versión inicial está pensada para alta base de cliente + envases iniciales
- no incorpora todavía flujos más avanzados como geocodificación, conciliaciones ni lógica adicional de negocio específica del móvil

El calculo actual se construye sobre las tablas existentes:

- debitos: ventas con `saldo = true` y `saldo_monto > 0`
- creditos: cobros registrados en `Cobro`

No hay todavia conciliacion fina cobro vs venta. Por lo tanto:

- el saldo del cliente se calcula como `sum(saldo_monto de ventas) - sum(cobros)`
- `GET /api/clientes/deudores` filtra clientes con `saldo_actual > 0`
- el extracto devuelve un libro cronologico de debitos y creditos con `saldo_acumulado`

---

## 2. Estado actual del backend

## 2.1 Clientes

### Endpoints disponibles hoy

- `GET /api/clientes`
  - lista clientes
  - si recibe `search` con 2 o mas caracteres, aplica busqueda por relevancia

- `GET /api/clientes/:id`
  - devuelve:
    - datos del cliente
    - `envases_prestados`
    - `zona`
    - `historial_ventas`

- `POST /api/clientes`
  - crea cliente
  - admite `envases_prestados` iniciales

- `PUT /api/clientes/:id`
  - actualiza cliente
  - si se envia `envases_prestados`, reemplaza el conjunto actual

- `PATCH /api/clientes/:id/estado`
  - activa o desactiva cliente

- `DELETE /api/clientes/:id`
  - elimina cliente y sus envases prestados

### Lo bueno

- la entidad `Clientes` ya tiene el set base esperado por frontend:
  - `id`
  - `dni`
  - `nombre`
  - `email`
  - `telefono`
  - `direccion`
  - `latitud`
  - `longitud`
  - `zona`
  - `fecha_alta`
  - `estado`
  - `repartidor`
  - `dia_reparto`

### Problemas detectados

- `POST /api/clientes` y `PUT /api/clientes/:id` no devuelven exactamente el mismo shape que los `GET`
- `getZonas` existe en controlador pero no esta expuesto en rutas
- `getClientesPorMes` consulta `fecha_registro`, pero la entidad usa `fecha_alta`
- las validaciones de alta/edicion son muy laxas para un contrato de frontend estable
- no existe alta offline de cliente

---

## 2.2 Deuda, fiados y cobros

### Endpoints disponibles hoy

#### Ventas generales

- `POST /api/ventas`
- `POST /api/ventas/local`
- `GET /api/ventas/local`
- `GET /api/ventas/resumen`
- `GET /api/ventas/visualizacion`
- `DELETE /api/ventas/:ventaId`

#### Flujo rapido repartidor

- `POST /api/repartidor-rapido/venta`
- `POST /api/repartidor-rapido/fiado`
- `POST /api/repartidor-rapido/cobro`

#### Sincronizacion offline

- `POST /api/sincronizacion/operaciones`
- `GET /api/sincronizacion/estado`
- `POST /api/sincronizacion/reintentar`
- `GET /api/sincronizacion/ping`

### Modelo actual real

#### Venta

La deuda hoy nace en `Venta`:

- `saldo: boolean`
- `saldo_monto: string`
- `cliente_id: string`
- `monto_total: string`
- `forma_pago: total | parcial`

#### Cobro

Los pagos se registran en `Cobro`:

- `cliente_id: number`
- `monto: number`
- `medio_pago`
- `venta_relacionada_id` opcional
- `fecha_cobro`

### Que se puede hacer hoy

- registrar una venta con pago parcial
- registrar un fiado rapido
- registrar un cobro rapido
- obtener un resumen global de fiados y cobros desde `GET /api/ventas/visualizacion`

### Que falta para una cuenta corriente usable

- saldo actual por cliente
- movimientos contables por cliente
- listado de clientes con deuda
- historial de cobros por cliente
- deuda consolidada y confiable
- endpoints de lectura especificos para deuda/cuenta corriente
- anulacion o correccion de cobros
- definicion uniforme de que significa "saldo pendiente"

### Inconsistencias importantes

- `Venta` admite `efectivo`, `transferencia`, `debito`, `credito`, pero la validacion general de `VentaService` solo acepta `efectivo` y `transferencia`
- `POST /api/ventas/local` usa `metodo_pago`, mientras otras rutas usan `medio_pago`
- `POST /api/ventas/local` no recibe `saldo_monto` aunque el servicio lo necesita si `forma_pago = parcial`
- los cobros rapidos se registran en auditoria como `VENTA_LOCAL`, lo que puede distorsionar dashboards y metricas

---

## 2.3 Envases

### Endpoints disponibles hoy

- `POST /api/clientes/envases/prestar`
- `GET /api/clientes/:id/envases`
- `GET /api/repartidor-rapido/envases/:cliente_id`

Ademas:

- `POST /api/repartidor-rapido/venta` puede registrar `envases_prestados` y `envases_devueltos`
- `POST /api/repartidor-rapido/fiado` puede registrar `envases_prestados`
- `POST /api/sincronizacion/operaciones` soporta `MOVIMIENTO_ENVASE`

### Modelo actual real

#### Estado actual

`EnvasesPrestados` funciona como snapshot por cliente y producto:

- `cliente_id`
- `producto_id`
- `producto_nombre`
- `capacidad`
- `cantidad`
- `fecha_prestamo`

#### Historial

`MovimientoEnvase` funciona como libro de movimientos:

- `tipo: PRESTAMO | DEVOLUCION | AJUSTE`
- `cantidad`
- `cliente_id`
- `producto_id`
- `repartidor_id`
- `observaciones`
- `venta_relacionada_id`
- `fecha_movimiento`

### Que se puede hacer hoy

- dar de alta cliente con envases prestados
- editar el snapshot de envases del cliente
- prestar envases manualmente
- registrar prestamos y devoluciones dentro de ventas rapidas
- consultar resumen de envases desde repartidor rapido

### Problemas detectados

- no hay endpoint general y claro para devolucion manual
- no hay endpoint general y claro para ajuste manual
- el contrato de envases cambia segun el endpoint:
  - alta/edicion cliente pide `producto_id`, `producto_nombre`, `capacidad`, `cantidad`
  - prestamo manual pide lo mismo
  - venta rapida solo pide `producto_id`, `cantidad`
- `POST /api/clientes/envases/prestar` crea registros directos y no consolida el snapshot como lo hace el flujo rapido
- el historial en `GET /api/repartidor-rapido/envases/:cliente_id` esta limitado a los ultimos 50 movimientos

---

## 3. Que hace falta implementar

## 3.1 Minimo necesario para frontend

Para que frontend pueda construir bien las pantallas de clientes, deuda y envases, el backend necesita cubrir al menos esto:

### A. Contrato estable de cliente

- mismo shape de respuesta en `GET`, `POST` y `PUT`
- endpoint para zonas
- validaciones basicas claras
- respuesta normalizada para frontend

### B. Cuenta corriente por cliente

- endpoint de resumen por cliente
- endpoint de extracto/movimientos por cliente
- listado de clientes deudores
- saldo actual calculado en backend

### C. Cobros

- endpoint de listado de cobros por cliente
- endpoint de alta de cobro fuera del flujo rapido
- contrato de respuesta comun

### D. Envases

- endpoint unico para resumen actual + historial
- endpoint unico para prestar / devolver / ajustar
- reglas para no permitir saldo negativo salvo ajuste

### E. Documentacion de contrato

- payloads
- responses
- errores
- reglas de negocio
- nomenclatura de campos

---

## 3.2 Recomendacion de modelado

### Recomendacion para MVP

No crear una nueva tabla de cuenta corriente en la primera etapa.

Conviene construir la cuenta corriente como lectura unificada sobre:

- `Venta` con `saldo = true` o `saldo_monto > 0` como debito
- `Cobro` como credito

Con esto el backend puede devolver:

- saldo actual
- total adeudado historico
- total cobrado
- extracto cronologico
- clientes con deuda

### Recomendacion para etapa 2

Si el negocio necesita saber exactamente que venta quedo saldada o parcialmente saldada, agregar una tabla de aplicacion de cobros.

Ejemplo recomendado:

- `cobro_aplicacion`
  - `id`
  - `cobro_id`
  - `venta_id`
  - `monto_aplicado`
  - `fecha_aplicacion`

Esto no es imprescindible para el primer release de cuenta corriente por cliente, pero si para una conciliacion por comprobante.

---

## 4. Plan de implementacion

## Fase 0. Normalizacion de contratos existentes

Objetivo: dejar de romper al frontend por diferencias de nombres, tipos o shapes.

### Backend

- exponer `GET /api/clientes/zonas`
- unificar el response de cliente entre `GET`, `POST` y `PUT`
- unificar nomenclatura de medios de pago:
  - usar siempre `medio_pago`
- corregir venta local parcial para que acepte `saldo_monto`
- revisar validacion de medios de pago en `VentaService`
- corregir `getClientesPorMes`
- separar movimientos de auditoria de ventas vs cobros

### Frontend

- consumir un solo shape `ClienteDTO`
- dejar de asumir que `POST /api/clientes` devuelve una entidad distinta a `GET /api/clientes/:id`
- migrar cualquier uso de `metodo_pago` a `medio_pago`

### Resultado esperado

Frontend puede construir formularios de cliente y venta sin hacks de normalizacion local.

---

## Fase 1. Cuenta corriente por cliente (lectura)

Objetivo: exponer una vista confiable de deuda sin reescribir el modelo de datos.

### Backend

Agregar un servicio nuevo, por ejemplo `CuentaCorrienteService`, que consolide:

- ventas con saldo
- cobros
- saldo acumulado
- totales por cliente

### Endpoints nuevos recomendados

- `GET /api/clientes/:id/cuenta-corriente/resumen`
- `GET /api/clientes/:id/cuenta-corriente`
- `GET /api/clientes/deudores`
- `GET /api/clientes/:id/cobros`

### Resultado esperado

Frontend ya puede mostrar:

- ficha de cliente con saldo
- pantalla de cuenta corriente
- listado de clientes con deuda
- historial de cobros

---

## Fase 2. Escritura de cobros y deuda fuera del flujo rapido

Objetivo: que backoffice y frontend administrativo no dependan solo de repartidor rapido.

### Backend

Agregar:

- `POST /api/clientes/:id/cobros`
- opcionalmente `POST /api/clientes/:id/deudas/manuales` si se necesita ajuste contable
- anulacion o reversal de cobro

### Reglas recomendadas

- un cobro nunca debe borrar deuda historica; debe quedar como credito en el extracto
- si todavia no existe conciliacion por venta, el cobro impacta saldo total del cliente
- si se implementa conciliacion avanzada, el backend aplica el cobro a una o varias ventas

### Resultado esperado

Frontend puede registrar pagos desde la cuenta del cliente, no solo desde modulo repartidor.

---

## Fase 3. Envases unificados

Objetivo: unificar los flujos de envases y dejar un solo contrato para frontend.

### Backend

Agregar:

- `GET /api/clientes/:id/envases/resumen`
- `GET /api/clientes/:id/envases/movimientos?page=1&limit=20`
- `POST /api/clientes/:id/envases/movimientos`

El `POST` deberia soportar:

- `PRESTAMO`
- `DEVOLUCION`
- `AJUSTE`

### Reglas recomendadas

- `PRESTAMO` suma al snapshot
- `DEVOLUCION` resta del snapshot
- `AJUSTE` corrige stock historico por diferencia operativa
- `DEVOLUCION` no puede dejar saldo negativo
- si el saldo queda en 0, el snapshot puede eliminarse o quedar en 0 segun la preferencia tecnica

### Resultado esperado

Frontend puede usar un solo formulario para prestar, devolver y ajustar envases.

---

## Fase 4. Offline, conciliacion fina y endurecimiento

Objetivo: cerrar el circuito para operacion real.

### Backend

- agregar `NUEVO_CLIENTE` a operaciones offline si el repartidor debe dar altas en calle
- si hace falta, agregar conciliacion cobro vs venta con tabla `cobro_aplicacion`
- agregar paginacion real e indices
- agregar tests de servicios y endpoints
- documentar errores de negocio

### Resultado esperado

Sistema listo para operar tanto en backoffice como en flujo movil.

---

## 5. Contrato recomendado para frontend

Todo lo que sigue en esta seccion debe leerse como contrato objetivo. Algunas rutas ya existen y otras deben implementarse.

---

## 5.1 Convenciones generales

### Formato de respuesta recomendado

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

### Formato de error recomendado

```json
{
  "success": false,
  "message": "Descripcion legible del error",
  "code": "CODIGO_NEGOCIO_O_VALIDACION",
  "details": {}
}
```

### Tipos

- ids numericos como `number`
- montos como `number`
- fechas como ISO string
- enums siempre en minuscula si ya nacen asi (`efectivo`, `transferencia`, etc.)

No mezclar `string` y `number` para el mismo concepto en endpoints distintos.

---

## 5.2 DTOs recomendados

### ClienteDTO

```ts
type ClienteDTO = {
  id: number;
  dni: string | null;
  nombre: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  latitud: number | null;
  longitud: number | null;
  zona_id: number | null;
  zona_nombre?: string | null;
  fecha_alta: string;
  estado: boolean;
  repartidor: string | null;
  dia_reparto: string | null;
  saldo_actual?: number;
  resumen_envases?: {
    cantidad_total: number;
    items: EnvaseSaldoDTO[];
  };
};
```

### EnvaseSaldoDTO

```ts
type EnvaseSaldoDTO = {
  producto_id: number;
  producto_nombre: string;
  capacidad: number;
  cantidad: number;
};
```

### CuentaCorrienteMovimientoDTO

```ts
type CuentaCorrienteMovimientoDTO = {
  id: string;
  fecha: string;
  tipo: "DEBITO_VENTA" | "CREDITO_COBRO" | "AJUSTE";
  origen: "VENTA" | "COBRO" | "AJUSTE_MANUAL";
  referencia_id: string;
  descripcion: string;
  debito: number;
  credito: number;
  saldo_acumulado: number;
  medio_pago?: "efectivo" | "transferencia" | "debito" | "credito" | null;
  observaciones?: string | null;
};
```

### CuentaCorrienteResumenDTO

```ts
type CuentaCorrienteResumenDTO = {
  cliente: ClienteDTO;
  saldo_actual: number;
  total_debitos: number;
  total_creditos: number;
  cantidad_movimientos: number;
  ultimo_movimiento_at: string | null;
};
```

### CobroDTO

```ts
type CobroDTO = {
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
```

### MovimientoEnvaseDTO

```ts
type MovimientoEnvaseDTO = {
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

## 5.3 Endpoints recomendados para clientes

## `GET /api/clientes`

### Query params

- `search?: string`
- `estado?: boolean`
- `soloConDeuda?: boolean`
- `page?: number`
- `limit?: number`

### Respuesta recomendada

```json
{
  "success": true,
  "data": [
    {
      "id": 25,
      "dni": "30111222",
      "nombre": "Juan Perez",
      "email": null,
      "telefono": "3584123456",
      "direccion": "Sobremonte 123",
      "latitud": -33.12,
      "longitud": -64.34,
      "zona_id": 3,
      "zona_nombre": "Centro",
      "fecha_alta": "2026-05-26T17:00:00.000Z",
      "estado": true,
      "repartidor": "Pedro",
      "dia_reparto": "martes",
      "saldo_actual": 12500,
      "resumen_envases": {
        "cantidad_total": 2,
        "items": [
          {
            "producto_id": 1,
            "producto_nombre": "Bidon 20L",
            "capacidad": 20,
            "cantidad": 2
          }
        ]
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

## `GET /api/clientes/:id`

Debe devolver el mismo `ClienteDTO`, mas bloques opcionales:

- `cuenta_corriente_resumen`
- `envases_resumen`
- `historial_ventas`

## `POST /api/clientes`

### Request recomendado

```json
{
  "dni": "30111222",
  "nombre": "Juan Perez",
  "email": null,
  "telefono": "3584123456",
  "direccion": "Sobremonte 123",
  "latitud": -33.12,
  "longitud": -64.34,
  "zona_id": 3,
  "repartidor": "Pedro",
  "dia_reparto": "martes",
  "envases_iniciales": [
    {
      "producto_id": 1,
      "cantidad": 2
    }
  ]
}
```

### Validaciones minimas recomendadas

- `nombre` requerido
- `telefono` recomendado
- `direccion` requerida si el cliente se reparte
- `zona_id` valida si se envia
- `envases_iniciales[].producto_id` valido
- `envases_iniciales[].cantidad > 0`

### Respuesta

Debe devolver exactamente el mismo shape que `GET /api/clientes/:id`.

## `PUT /api/clientes/:id`

Misma regla: response con shape identico al detalle.

## `GET /api/clientes/zonas`

### Respuesta recomendada

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nombre": "Centro"
    }
  ]
}
```

---

## 5.4 Endpoints recomendados para cuenta corriente y deuda

## `GET /api/clientes/:id/cuenta-corriente/resumen`

### Respuesta

```json
{
  "success": true,
  "data": {
    "cliente": {
      "id": 25,
      "nombre": "Juan Perez",
      "telefono": "3584123456"
    },
    "saldo_actual": 12500,
    "total_debitos": 30000,
    "total_creditos": 17500,
    "cantidad_movimientos": 5,
    "ultimo_movimiento_at": "2026-05-26T17:00:00.000Z"
  }
}
```

## `GET /api/clientes/:id/cuenta-corriente`

### Query params

- `desde?: YYYY-MM-DD`
- `hasta?: YYYY-MM-DD`
- `page?: number`
- `limit?: number`

### Respuesta

```json
{
  "success": true,
  "data": {
    "resumen": {
      "saldo_actual": 12500,
      "total_debitos": 30000,
      "total_creditos": 17500
    },
    "movimientos": [
      {
        "id": "venta-9d4",
        "fecha": "2026-05-01T10:00:00.000Z",
        "tipo": "DEBITO_VENTA",
        "origen": "VENTA",
        "referencia_id": "9d4",
        "descripcion": "Venta fiada",
        "debito": 12000,
        "credito": 0,
        "saldo_acumulado": 12000
      },
      {
        "id": "cobro-18",
        "fecha": "2026-05-03T15:30:00.000Z",
        "tipo": "CREDITO_COBRO",
        "origen": "COBRO",
        "referencia_id": "18",
        "descripcion": "Cobro en efectivo",
        "debito": 0,
        "credito": 5000,
        "saldo_acumulado": 7000,
        "medio_pago": "efectivo"
      }
    ]
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 2
  }
}
```

## `GET /api/clientes/deudores`

### Query params

- `search?: string`
- `zona_id?: number`
- `repartidor?: string`
- `page?: number`
- `limit?: number`

### Respuesta

```json
{
  "success": true,
  "data": [
    {
      "cliente_id": 25,
      "nombre": "Juan Perez",
      "telefono": "3584123456",
      "saldo_actual": 12500,
      "cantidad_movimientos": 5,
      "ultimo_movimiento_at": "2026-05-26T17:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

### Regla importante

El frontend no debe calcular el saldo del cliente localmente. Siempre debe consumir `saldo_actual` entregado por backend.

---

## 5.5 Endpoints recomendados para cobros

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
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

## `POST /api/clientes/:id/cobros`

### Request recomendado

```json
{
  "monto": 5000,
  "medio_pago": "efectivo",
  "observaciones": "Cobro parcial",
  "venta_relacionada_id": null
}
```

### Reglas

- `monto > 0`
- `medio_pago` obligatorio
- `venta_relacionada_id` opcional en MVP

### Respuesta

Debe devolver:

- el `CobroDTO`
- el nuevo `saldo_actual`

Ejemplo:

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

---

## 5.6 Endpoints recomendados para envases

## `GET /api/clientes/:id/envases/resumen`

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
        "cantidad": 2
      }
    ],
    "cantidad_total": 2,
    "ultimo_movimiento_at": "2026-05-26T17:00:00.000Z"
  }
}
```

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
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

## `POST /api/clientes/:id/envases/movimientos`

### Request recomendado

```json
{
  "tipo": "DEVOLUCION",
  "items": [
    {
      "producto_id": 1,
      "cantidad": 1
    }
  ],
  "observaciones": "Retiro manual en local",
  "repartidor_id": null
}
```

### Reglas

- `items.length > 0`
- `cantidad > 0`
- `tipo` obligatorio
- en `DEVOLUCION`, el backend valida que no deje saldo negativo
- `AJUSTE` debe requerir `observaciones`

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
    "movimientos_creados": [
      {
        "id": 45,
        "tipo": "DEVOLUCION",
        "cantidad": 1
      }
    ]
  }
}
```

---

## 5.7 Contrato recomendado para offline

El modo offline ya existe para:

- `VENTA_RAPIDA`
- `COBRO_RAPIDO`
- `FIADO_RAPIDO`
- `MOVIMIENTO_ENVASE`

### Recomendacion

Si el negocio quiere que el repartidor tambien pueda crear clientes sin conexion, agregar:

- `NUEVO_CLIENTE`

con este payload:

```json
{
  "operacion_id": "uuid-local",
  "tipo": "NUEVO_CLIENTE",
  "datos_operacion": {
    "nombre": "Juan Perez",
    "telefono": "3584123456",
    "direccion": "Sobremonte 123",
    "zona_id": 3
  },
  "fecha_operacion_local": "2026-05-26T17:00:00.000Z"
}
```

---

## 6. Reglas de negocio para alinear frontend

Estas reglas deben quedar explicitas para que frontend no tome decisiones de negocio por su cuenta.

### Cuenta corriente

- el saldo del cliente se calcula en backend
- una venta con saldo genera un debito
- un cobro genera un credito
- el frontend nunca recalcula saldo historico por su cuenta

### Cobros

- un cobro no borra movimientos anteriores
- un cobro siempre queda en el extracto
- si existe conciliacion por venta, frontend la consume; no la inventa

### Envases

- el saldo actual de envases tambien se calcula en backend
- el frontend no debe sumar/restar historial para inferir el saldo actual
- toda devolucion debe pasar validacion backend

### Clientes

- `estado = false` significa que el cliente no debe aceptar nuevas ventas
- el frontend puede seguir mostrando historial aunque el cliente este inactivo

---

## 7. Orden sugerido para implementar

Si hubiera que priorizar para salir rapido:

1. normalizar contratos actuales
2. exponer cuenta corriente de lectura por cliente
3. exponer listado de clientes deudores
4. exponer cobros por cliente
5. exponer alta de cobro desde clientes
6. unificar envases en endpoints generales
7. agregar alta offline de clientes si se necesita
8. agregar conciliacion fina cobro vs venta si negocio lo pide

---

## 8. Checklist para dar por cerrado el alineamiento backend/frontend

- [ ] `GET`, `POST` y `PUT` de clientes devuelven el mismo shape
- [ ] existe `GET /api/clientes/zonas`
- [ ] existe `GET /api/clientes/:id/cuenta-corriente/resumen`
- [ ] existe `GET /api/clientes/:id/cuenta-corriente`
- [ ] existe `GET /api/clientes/deudores`
- [ ] existe `GET /api/clientes/:id/cobros`
- [ ] existe `POST /api/clientes/:id/cobros`
- [ ] existe `GET /api/clientes/:id/envases/resumen`
- [ ] existe `GET /api/clientes/:id/envases/movimientos`
- [ ] existe `POST /api/clientes/:id/envases/movimientos`
- [ ] todos los montos salen como `number`
- [ ] todas las fechas salen como ISO string
- [ ] todos los errores de negocio devuelven `code`
- [ ] frontend deja de recalcular deuda o saldo de envases localmente

---

## 9. Conclusion

El backend actual ya resolvio una buena parte del problema operativo, sobre todo en clientes, reparto rapido, offline y trazabilidad basica. El faltante principal no es "registrar mas cosas", sino convertir esas piezas en una API estable y legible para frontend.

La mejor estrategia es:

- no romper lo ya existente
- construir cuenta corriente por lectura unificada
- agregar endpoints faltantes de cobros y envases
- normalizar contratos antes de ampliar funcionalidad

Con eso frontend ya puede trabajar sobre un contrato claro, sin tener que inferir deuda, saldo o estado de envases desde varias fuentes inconsistentes.
