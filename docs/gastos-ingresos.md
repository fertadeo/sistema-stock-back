# Gastos e ingresos — API para el dashboard

Documentación para el equipo frontend: cómo consumir los endpoints que alimentan la pantalla **Gastos e ingresos** (totales, gráfico de barras por día, últimos ingresos y últimos gastos).

---

## 1. Endpoint recomendado: dashboard en una sola llamada

Para alimentar el dashboard completo (totales, gráfico y listas) con **una sola petición**, usar:

```http
GET /api/movimientos/dashboard?fechaInicio=YYYY-MM-DD&fechaFin=YYYY-MM-DD
```

### Parámetros (query)

| Parámetro    | Tipo   | Obligatorio | Descripción                          |
|-------------|--------|-------------|--------------------------------------|
| `fechaInicio` | string | Sí          | Inicio del período (ISO o YYYY-MM-DD) |
| `fechaFin`    | string | Sí          | Fin del período (ISO o YYYY-MM-DD)    |

**Ejemplos para los botones del dashboard:**

- **Últimos 7 días:** calcular en front `fechaFin = hoy`, `fechaInicio = hoy - 7 días`.
- **Últimos 30 días:** `fechaFin = hoy`, `fechaInicio = hoy - 30 días`.

### Cuerpo de la respuesta (200 OK)

```json
{
  "success": true,
  "periodo": {
    "fechaInicio": "2025-02-03",
    "fechaFin": "2025-03-04"
  },
  "totalIngresos": 1784972,
  "totalGastos": 0,
  "datosGrafico": [
    { "fecha": "2025-02-03", "ingresos": 0, "gastos": 0 },
    { "fecha": "2025-03-02", "ingresos": 500000, "gastos": 0 },
    { "fecha": "2025-03-03", "ingresos": 800000, "gastos": 0 },
    { "fecha": "2025-03-04", "ingresos": 484972, "gastos": 0 }
  ],
  "ultimosIngresos": [
    {
      "id": 42,
      "descripcion": "Cierre de venta por repar...",
      "monto": 224200,
      "fecha": "2025-03-04T12:00:00.000Z"
    },
    {
      "id": 41,
      "descripcion": "Venta en local por $20000",
      "monto": 20000,
      "fecha": "2025-03-04T11:30:00.000Z"
    }
  ],
  "ultimosGastos": []
}
```

### Uso en el frontend

| Elemento del dashboard      | Origen en la respuesta      |
|----------------------------|-----------------------------|
| **Total ingresos** (verde) | `totalIngresos` (número)    |
| **Total gastos** (rojo)    | `totalGastos` (número)      |
| **Gráfico de barras**      | `datosGrafico`: eje X = `fecha`, barras verdes = `ingresos`, barras rojas = `gastos` por día |
| **Últimos ingresos**       | `ultimosIngresos`: listar `descripcion` y `monto` |
| **Últimos gastos**         | `ultimosGastos`: listar `descripcion` y `monto` (o “Sin registros” si está vacío) |

Los montos vienen en pesos; los gastos se devuelven en positivo (el backend ya aplica valor absoluto).

### Errores

- **400** — Faltan `fechaInicio` o `fechaFin`:

```json
{
  "success": false,
  "message": "Se requieren fechaInicio y fechaFin (formato ISO o YYYY-MM-DD)"
}
```

- **500** — Error interno (revisar `message` y `error` en el cuerpo).

---

## 2. Funcionamiento: qué son “ingresos” y “gastos”

- **Ingresos:** movimientos de tipo `VENTA_LOCAL`, `CIERRE_VENTA` o `RENDICION` con `monto > 0`. Son los que suman al total verde.
- **Gastos:** movimientos de tipo `GASTO`. En base de datos el monto se guarda negativo; en el endpoint de dashboard y en esta doc se exponen en positivo para mostrar en el dashboard.

Otros tipos (`NUEVO_CLIENTE`, `NUEVO_PRODUCTO`, etc.) no se consideran ni ingreso ni gasto en este dashboard.

---

## 3. Otros endpoints útiles (opcional)

Si en algún flujo necesitáis listados o resúmenes por tipo:

### Resumen por tipo de movimiento

```http
GET /api/movimientos/resumen?fechaInicio=YYYY-MM-DD&fechaFin=YYYY-MM-DD
```

**Respuesta (ejemplo):**

```json
{
  "success": true,
  "resumen": {
    "VENTA_LOCAL": { "cantidad": 5, "total": 100000 },
    "GASTO": { "cantidad": 2, "total": -15000 },
    "CIERRE_VENTA": { "cantidad": 10, "total": 500000 }
  },
  "total_movimientos": 17
}
```

En `resumen.GASTO` el `total` puede ser negativo; para mostrarlo como “total gastos” usar `Math.abs(total)`.

### Listado paginado de movimientos

```http
GET /api/movimientos?fechaInicio=YYYY-MM-DD&fechaFin=YYYY-MM-DD&tipo=GASTO&page=1&limit=10
```

`tipo` opcional: `VENTA_LOCAL`, `GASTO`, `CIERRE_VENTA`, `RENDICION`, etc. Sin `tipo` devuelve todos.

### Solo gastos

```http
GET /api/gastos?fechaInicio=YYYY-MM-DD&fechaFin=YYYY-MM-DD&page=1&limit=10
```

---

## 4. Resumen rápido para frontend

- **Una sola llamada para el dashboard:**  
  `GET /api/movimientos/dashboard?fechaInicio=...&fechaFin=...`
- **Respuesta:** `totalIngresos`, `totalGastos`, `datosGrafico` (array por día con `fecha`, `ingresos`, `gastos`), `ultimosIngresos`, `ultimosGastos`.
- Calcular `fechaInicio` y `fechaFin` según “Últimos 7 días” o “Últimos 30 días” y usar esos mismos parámetros para el gráfico y las listas.
