# Módulo de Facturación AFIP

Este módulo integra AFIP SDK para permitir la facturación electrónica desde tu sistema de stock.

## Instalación

```bash
npm install @afipsdk/afip.js
```

## Configuración

### Desarrollo (Testing)
El sistema está configurado para usar AFIP SDK en modo desarrollo:
- CUIT: 20409378472 (CUIT de desarrollo)
- **Requiere access_token** obtenido desde https://app.afipsdk.com

### Obtener Access Token
1. Ve a https://app.afipsdk.com
2. Regístrate o inicia sesión
3. Obtén tu access_token
4. Configúralo en las variables de entorno:

```bash
# Crear archivo .env en la raíz del proyecto
AFIP_ACCESS_TOKEN=tu_access_token_aqui
```

### Producción
Para usar en producción, necesitas:

1. **Obtener certificados de AFIP**:
   - Seguir la guía oficial de AFIP para obtener certificados
   - Crear carpeta `certs/` en la raíz del proyecto
   - Colocar `certificado.crt` y `key.key` en esa carpeta

2. **Configurar en el servicio**:
   - Editar `src/services/facturacionService.ts`
   - Descomentar la sección de certificados propios
   - Cambiar el CUIT por el tuyo

## Endpoints Disponibles

### Facturación Principal

#### POST `/api/facturacion/factura`
Crear una nueva factura electrónica.

**Body:**
```json
{
  "tipoComprobante": 1,
  "concepto": 1,
  "tipoDoc": 80,
  "nroDoc": 20111111112,
  "fechaServicioDesde": "20240101",
  "fechaServicioHasta": "20240101",
  "fechaVtoPago": "20240115",
  "importeTotal": 1210.00,
  "importeNeto": 1000.00,
  "importeIva": 210.00,
  "items": [
    {
      "descripcion": "Producto 1",
      "cantidad": 2,
      "precioUnitario": 500.00,
      "importe": 1000.00,
      "alicuotaIva": 21
    }
  ]
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Factura creada exitosamente",
  "data": { ... },
  "cae": "12345678901234",
  "fechaVencimiento": "20240115",
  "numeroComprobante": 1
}
```

### Consultas y Catálogos

#### GET `/api/facturacion/ultimo-comprobante/:tipoComprobante`
Obtener el último número de comprobante para un tipo específico.

#### GET `/api/facturacion/contribuyente/:cuit`
Consultar datos completos de un contribuyente por CUIT desde AFIP.

**Parámetros:**
- `cuit` - CUIT del contribuyente (con o sin guiones, ej: `20123456789` o `20-12345678-9`)

**Características:**
- ✅ Validación automática del formato y dígito verificador del CUIT
- ✅ Limpieza automática de guiones y espacios
- ✅ Obtención automática de todos los datos del contribuyente desde AFIP
- ✅ Manejo inteligente de errores con códigos específicos

**Respuesta Exitosa:**
```json
{
  "success": true,
  "message": "Contribuyente encontrado exitosamente",
  "data": {
    "cuit": "20123456789",
    "cuit_formateado": "20-12345678-9",
    "razon_social": "EMPRESA EJEMPLO S.A.",
    "nombre_fantasia": "Empresa Ejemplo",
    "domicilio_fiscal": {
      "calle": "Av. Corrientes",
      "numero": "1234",
      "piso": "5",
      "departamento": "A",
      "codigo_postal": "1043",
      "localidad": "CABA",
      "provincia": "Buenos Aires"
    },
    "condicion_iva": "Responsable Inscripto",
    "condicion_impositiva": "Activo",
    "fecha_inicio_actividades": "2020-01-01",
    "estado": "Activo",
    "actividad_principal": "Comercio",
    "actividades_secundarias": [],
    "datos_originales": { ... }
  }
}
```

**Errores Posibles:**
```json
// CUIT inválido
{
  "success": false,
  "message": "El CUIT debe tener 11 dígitos numéricos",
  "code": "CUIT_INVALID_FORMAT",
  "received": "123"
}

// CUIT con dígito verificador incorrecto
{
  "success": false,
  "message": "El CUIT tiene un dígito verificador inválido",
  "code": "CUIT_INVALID_CHECKSUM",
  "received": "20123456788"
}

// Contribuyente no encontrado en AFIP
{
  "success": false,
  "message": "No se encontró el contribuyente con el CUIT proporcionado",
  "code": "CONTRIBUYENTE_NOT_FOUND",
  "cuit": "20123456789"
}

// Error de conexión con AFIP
{
  "success": false,
  "message": "Error de conexión con AFIP",
  "code": "NETWORK_ERROR",
  "error": "Connection timeout",
  "cuit": "20123456789"
}
```

#### GET `/api/facturacion/verificar-comprobante/:tipoComprobante/:puntoVenta/:numeroComprobante/:cuit`
Verificar si un comprobante existe y es válido.

#### GET `/api/facturacion/tipos-comprobante`
Obtener todos los tipos de comprobantes disponibles.

#### GET `/api/facturacion/tipos-documento`
Obtener todos los tipos de documento disponibles.

#### GET `/api/facturacion/alicuotas-iva`
Obtener todas las alícuotas de IVA disponibles.

### Integración con Ventas

#### POST `/api/facturacion/factura-desde-venta/:ventaId`
Crear factura desde una venta existente (pendiente de implementar).

## Tipos de Comprobantes

- `1`: Factura A
- `6`: Factura B
- `11`: Factura C
- `3`: Nota de Crédito A
- `8`: Nota de Crédito B
- `13`: Nota de Crédito C

## Tipos de Documento

- `80`: CUIT
- `96`: DNI
- `99`: Consumidor Final
- `91`: CI Extranjera
- `92`: En Trámite

## Conceptos

- `1`: Productos
- `2`: Servicios
- `3`: Productos y Servicios

## Alicuotas de IVA

- `0`: 0%
- `1`: No Gravado
- `2`: Exento
- `3`: 10.5%
- `4`: 21%
- `5`: 27%
- `6`: Gravado
- `7`: 5%
- `8`: 2.5%

## Ejemplos de Uso

### Consultar Contribuyente por CUIT

```javascript
// Ejemplo 1: CUIT con guiones
const cuitConGuiones = '20-12345678-9';
const response1 = await fetch(`/api/facturacion/contribuyente/${cuitConGuiones}`, {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + token
  }
});

// Ejemplo 2: CUIT sin guiones
const cuitSinGuiones = '20123456789';
const response2 = await fetch(`/api/facturacion/contribuyente/${cuitSinGuiones}`, {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + token
  }
});

const contribuyente = await response1.json();

if (contribuyente.success) {
  console.log('Razón Social:', contribuyente.data.razon_social);
  console.log('Dirección:', contribuyente.data.domicilio_fiscal);
  console.log('Condición IVA:', contribuyente.data.condicion_iva);
  
  // Usar los datos para completar automáticamente el formulario de facturación
  document.getElementById('razon-social').value = contribuyente.data.razon_social;
  document.getElementById('direccion').value = contribuyente.data.domicilio_fiscal.calle + ' ' + contribuyente.data.domicilio_fiscal.numero;
  document.getElementById('localidad').value = contribuyente.data.domicilio_fiscal.localidad;
} else {
  console.error('Error:', contribuyente.message);
  console.error('Código:', contribuyente.code);
}
```

### Crear Factura A

```javascript
const facturaData = {
  tipoComprobante: 1, // Factura A
  concepto: 1, // Productos
  tipoDoc: 80, // CUIT
  nroDoc: 20111111112,
  fechaServicioDesde: "20240101",
  fechaServicioHasta: "20240101",
  fechaVtoPago: "20240115",
  importeTotal: 1210.00,
  importeNeto: 1000.00,
  importeIva: 210.00,
  items: [
    {
      descripcion: "Soda 1L",
      cantidad: 10,
      precioUnitario: 100.00,
      importe: 1000.00,
      alicuotaIva: 21
    }
  ]
};

const response = await fetch('/api/facturacion/factura', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify(facturaData)
});

const result = await response.json();
console.log('CAE:', result.cae);
console.log('Número de comprobante:', result.numeroComprobante);
```

### Flujo Completo de Facturación Manual

```javascript
// 1. El administrativo ingresa el CUIT
const cuit = '20-12345678-9';

// 2. Consultar datos del contribuyente automáticamente
const contribuyenteResponse = await fetch(`/api/facturacion/contribuyente/${cuit}`, {
  headers: { 'Authorization': 'Bearer ' + token }
});
const contribuyente = await contribuyenteResponse.json();

if (!contribuyente.success) {
  alert('Error: ' + contribuyente.message);
  return;
}

// 3. Completar datos de la factura con los datos obtenidos
const facturaData = {
  tipoComprobante: 1, // Factura A
  concepto: 1, // Productos
  tipoDoc: 80, // CUIT
  nroDoc: parseInt(contribuyente.data.cuit),
  fechaServicioDesde: "20240101",
  fechaServicioHasta: "20240101",
  fechaVtoPago: "20240115",
  importeTotal: 1210.00,
  importeNeto: 1000.00,
  importeIva: 210.00,
  items: [
    {
      descripcion: "Producto 1",
      cantidad: 2,
      precioUnitario: 500.00,
      importe: 1000.00,
      alicuotaIva: 21
    }
  ]
};

// 4. Crear la factura
const facturaResponse = await fetch('/api/facturacion/factura', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify(facturaData)
});

const factura = await facturaResponse.json();

if (factura.success) {
  console.log('✅ Factura creada exitosamente');
  console.log('CAE:', factura.cae);
  console.log('Número:', factura.numeroComprobante);
  console.log('Vencimiento:', factura.fechaVencimiento);
} else {
  console.error('❌ Error al crear factura:', factura.message);
}
```

## Autenticación

Todas las rutas requieren autenticación mediante JWT token en el header:
```
Authorization: Bearer <token>
```

## Manejo de Errores

El sistema devuelve errores en formato JSON con códigos específicos para facilitar el manejo en el frontend:

### Formato General de Error
```json
{
  "success": false,
  "message": "Descripción del error",
  "code": "CODIGO_ERROR",
  "error": "Detalle técnico del error"
}
```

### Códigos de Error Específicos para Consulta de Contribuyente

| Código | Descripción | HTTP Status | Acción Recomendada |
|--------|-------------|-------------|-------------------|
| `CUIT_REQUIRED` | CUIT no proporcionado | 400 | Solicitar al usuario que ingrese el CUIT |
| `CUIT_INVALID_FORMAT` | CUIT no tiene 11 dígitos | 400 | Mostrar formato correcto (11 dígitos) |
| `CUIT_INVALID_CHECKSUM` | Dígito verificador incorrecto | 400 | Solicitar corrección del CUIT |
| `CONTRIBUYENTE_NOT_FOUND` | No existe en AFIP | 404 | Informar que el CUIT no está registrado |
| `AFIP_TIMEOUT` | Timeout de conexión | 400 | Sugerir reintentar |
| `NETWORK_ERROR` | Error de red | 400 | Verificar conexión |
| `CERTIFICATE_ERROR` | Error de certificado | 500 | Contactar soporte técnico |
| `AFIP_ERROR` | Error general de AFIP | 400 | Mostrar mensaje de error |
| `INTERNAL_ERROR` | Error interno del servidor | 500 | Contactar soporte técnico |

### Ejemplo de Manejo de Errores en Frontend

```javascript
async function consultarContribuyente(cuit) {
  try {
    const response = await fetch(`/api/facturacion/contribuyente/${cuit}`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    const result = await response.json();
    
    if (result.success) {
      // ✅ Éxito - mostrar datos del contribuyente
      mostrarDatosContribuyente(result.data);
    } else {
      // ❌ Error - manejar según el código
      switch (result.code) {
        case 'CUIT_INVALID_FORMAT':
          mostrarError('El CUIT debe tener 11 dígitos numéricos');
          break;
        case 'CUIT_INVALID_CHECKSUM':
          mostrarError('El CUIT ingresado no es válido. Verifique los dígitos.');
          break;
        case 'CONTRIBUYENTE_NOT_FOUND':
          mostrarError('No se encontró el contribuyente. Verifique el CUIT.');
          break;
        case 'AFIP_TIMEOUT':
          mostrarError('Timeout al consultar AFIP. Intente nuevamente.');
          break;
        case 'NETWORK_ERROR':
          mostrarError('Error de conexión. Verifique su internet.');
          break;
        default:
          mostrarError('Error: ' + result.message);
      }
    }
  } catch (error) {
    console.error('Error de red:', error);
    mostrarError('Error de conexión con el servidor');
  }
}
```

## Notas Importantes

1. **Testing**: En desarrollo, usa el certificado de testing de AFIP
2. **Producción**: Requiere certificados propios de AFIP
3. **Punto de Venta**: Configurado por defecto en 1
4. **Fechas**: Formato YYYYMMDD
5. **Importes**: Sin separadores de miles, con punto decimal

## Estado Actual del Sistema

### ✅ Implementado
- ✅ Consulta automática de contribuyentes por CUIT desde AFIP
- ✅ Validación completa de formato y dígito verificador de CUIT
- ✅ Manejo inteligente de errores con códigos específicos
- ✅ Formateo automático de datos del contribuyente
- ✅ Creación de facturas electrónicas con AFIP
- ✅ Consulta de tipos de comprobantes, documentos y alícuotas
- ✅ Verificación de comprobantes existentes
- ✅ Obtención del último número de comprobante

### 🔄 En Desarrollo
- 🔄 Almacenamiento de facturas en base de datos
- 🔄 Generación de PDF de facturas
- 🔄 Gestión completa de facturas (listar, anular, etc.)

### 📋 Próximos Pasos
1. Crear entidad `Factura` para persistencia en BD
2. Implementar generación de PDF con datos formateados
3. Agregar endpoints para gestión de facturas (listar, filtrar, anular)
4. Implementar notas de crédito y débito
5. Agregar reportes de facturación
6. Implementar backup y sincronización con AFIP
