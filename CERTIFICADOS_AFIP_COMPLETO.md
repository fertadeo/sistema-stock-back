# Creación de Certificados AFIP - Documentación Completa

## Descripción

Esta funcionalidad permite crear certificados tanto de desarrollo como de producción para conectarse a los web services de AFIP usando las automatizaciones `create-cert-dev` y `create-cert-prod` del AFIP SDK.

## Endpoints Disponibles

### 1. Crear Certificado de Desarrollo
**POST** `/api/facturacion/crear-certificado-desarrollo`

Crea un nuevo certificado de desarrollo usando las credenciales de ARCA.

#### Parámetros requeridos:
```json
{
  "cuit": "20111111112",           // CUIT a usar en la página de ARCA
  "username": "20111111112",      // CUIT para loguearse (normalmente el mismo que cuit)
  "password": "contraseña#segura?", // Contraseña para loguearse en ARCA
  "alias": "afipsdk_dev"          // Nombre alfanumérico para el certificado
}
```

### 2. Crear Certificado de Producción
**POST** `/api/facturacion/crear-certificado-produccion`

Crea un nuevo certificado de producción usando las credenciales de ARCA.

#### Parámetros requeridos:
```json
{
  "cuit": "20111111112",           // CUIT a usar en la página de ARCA
  "username": "20111111112",      // CUIT para loguearse (normalmente el mismo que cuit)
  "password": "contraseña#segura?", // Contraseña para loguearse en ARCA
  "alias": "afipsdk_prod"          // Nombre alfanumérico para el certificado
}
```

### 3. Listar Certificados Disponibles
**GET** `/api/facturacion/certificados`

Lista todos los certificados guardados en el directorio del sistema, separados por tipo.

#### Respuesta:
```json
{
  "success": true,
  "message": "Se encontraron 4 certificado(s)",
  "certificados": [
    {
      "alias": "afipsdk_dev",
      "alias_original": "afipsdk_dev",
      "tipo": "desarrollo",
      "certificado_existe": true,
      "clave_existe": true,
      "ruta_certificado": "/path/to/certs/afipsdk_dev.crt",
      "ruta_clave": "/path/to/certs/afipsdk_dev.key",
      "fecha_modificacion": "2024-01-15T10:30:00.000Z"
    },
    {
      "alias": "afipsdk_prod_prod",
      "alias_original": "afipsdk_prod",
      "tipo": "produccion",
      "certificado_existe": true,
      "clave_existe": true,
      "ruta_certificado": "/path/to/certs/afipsdk_prod_prod.crt",
      "ruta_clave": "/path/to/certs/afipsdk_prod_prod.key",
      "fecha_modificacion": "2024-01-15T11:30:00.000Z"
    }
  ],
  "resumen": {
    "total": 4,
    "desarrollo": 2,
    "produccion": 2
  },
  "certificados_desarrollo": [...],
  "certificados_produccion": [...]
}
```

## Uso con cURL

### Crear certificado de desarrollo:
```bash
curl -X POST http://localhost:3000/api/facturacion/crear-certificado-desarrollo \
  -H "Content-Type: application/json" \
  -d '{
    "cuit": "20111111112",
    "username": "20111111112", 
    "password": "tu_contraseña",
    "alias": "mi_certificado_dev"
  }'
```

### Crear certificado de producción:
```bash
curl -X POST http://localhost:3000/api/facturacion/crear-certificado-produccion \
  -H "Content-Type: application/json" \
  -d '{
    "cuit": "20111111112",
    "username": "20111111112", 
    "password": "tu_contraseña",
    "alias": "mi_certificado_prod"
  }'
```

### Listar certificados:
```bash
curl -X GET http://localhost:3000/api/facturacion/certificados
```

## Uso con JavaScript/Node.js

```javascript
const axios = require('axios');

// Crear certificado de desarrollo
async function crearCertificadoDesarrollo() {
  try {
    const response = await axios.post('http://localhost:3000/api/facturacion/crear-certificado-desarrollo', {
      cuit: "20111111112",
      username: "20111111112",
      password: "tu_contraseña",
      alias: "mi_certificado_dev"
    });
    
    console.log('Certificado de desarrollo creado:', response.data);
  } catch (error) {
    console.error('Error:', error.response.data);
  }
}

// Crear certificado de producción
async function crearCertificadoProduccion() {
  try {
    const response = await axios.post('http://localhost:3000/api/facturacion/crear-certificado-produccion', {
      cuit: "20111111112",
      username: "20111111112",
      password: "tu_contraseña",
      alias: "mi_certificado_prod"
    });
    
    console.log('Certificado de producción creado:', response.data);
  } catch (error) {
    console.error('Error:', error.response.data);
  }
}

// Listar certificados
async function listarCertificados() {
  try {
    const response = await axios.get('http://localhost:3000/api/facturacion/certificados');
    console.log('Certificados:', response.data);
  } catch (error) {
    console.error('Error:', error.response.data);
  }
}
```

## Archivos Generados

Los certificados se guardan automáticamente en el directorio `certs/` del proyecto:

```
certs/
├── afipsdk_dev.crt        # Certificado de desarrollo
├── afipsdk_dev.key        # Clave privada de desarrollo
├── afipsdk_prod_prod.crt  # Certificado de producción
├── afipsdk_prod_prod.key  # Clave privada de producción
└── mi_certificado_dev.crt
    └── mi_certificado_dev.key
```

**Nota**: Los certificados de producción se guardan con el sufijo `_prod` para distinguirlos de los de desarrollo.

## Códigos de Error

| Código | Descripción |
|--------|-------------|
| `MISSING_PARAMETERS` | Faltan parámetros requeridos |
| `INVALID_CUIT` | CUIT inválido |
| `INVALID_ALIAS` | Alias inválido (debe ser alfanumérico) |
| `INVALID_CREDENTIALS` | Credenciales inválidas para ARCA |
| `TIMEOUT_ERROR` | Timeout al crear certificado |
| `NETWORK_ERROR` | Error de conexión con AFIP |
| `CERTIFICATE_CREATION_ERROR` | Error general al crear certificado de desarrollo |
| `CERTIFICATE_PRODUCTION_ERROR` | Error general al crear certificado de producción |
| `PRODUCTION_CERT_ERROR` | Error específico de certificado de producción |

## Diferencias entre Desarrollo y Producción

### Certificados de Desarrollo (`create-cert-dev`)
- ✅ Para testing y pruebas
- ✅ No afecta datos reales
- ✅ Más permisivo en validaciones
- ⚠️ Solo válido en ambiente de desarrollo

### Certificados de Producción (`create-cert-prod`)
- 🔒 Para uso en producción real
- 🔒 Afecta datos reales de AFIP
- 🔒 Validaciones más estrictas
- ⚠️ Requiere credenciales válidas de producción

## Requisitos Previos

1. **Access Token de AFIP SDK**: Debes tener un access token válido configurado en la variable de entorno `AFIP_ACCESS_TOKEN`
2. **Credenciales de ARCA**: Necesitas credenciales válidas para acceder a la página de ARCA
3. **CUIT válido**: El CUIT debe estar registrado en AFIP
4. **Permisos apropiados**: Para certificados de producción, necesitas permisos especiales

## Configuración del Entorno

Asegúrate de tener configurado el access token en tu archivo `.env`:

```env
AFIP_ACCESS_TOKEN=tu_access_token_aqui
```

## Testing

Puedes usar el archivo `test_certificado_afip.js` para probar ambas funcionalidades:

```bash
node test_certificado_afip.js
```

El script incluye funciones para:
- Crear certificados de desarrollo
- Crear certificados de producción
- Listar todos los certificados
- Probar conexión con AFIP

## Notas Importantes

- ⚠️ **Desarrollo vs Producción**: Los certificados de desarrollo son solo para testing, los de producción son para uso real
- 🔒 **Seguridad**: Nunca expongas las credenciales o claves privadas en logs o respuestas públicas
- 📁 **Almacenamiento**: Los certificados se guardan localmente en el directorio `certs/`
- 🔄 **Renovación**: Los certificados pueden necesitar renovación periódica
- 🏷️ **Nomenclatura**: Los certificados de producción se guardan con sufijo `_prod`

## Integración con el Sistema Existente

Una vez creados los certificados, puedes usarlos para inicializar AFIP según el ambiente:

### Para Desarrollo:
```javascript
// En facturacionService.ts
const certPath = path.join(__dirname, '../../certs/mi_certificado_dev.crt');
const keyPath = path.join(__dirname, '../../certs/mi_certificado_dev.key');

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  const cert = fs.readFileSync(certPath, { encoding: 'utf8' });
  const key = fs.readFileSync(keyPath, { encoding: 'utf8' });
  
  this.afip = new Afip({ 
    cert, 
    key, 
    CUIT: 20111111112,
    production: false, // Modo desarrollo
    access_token: process.env.AFIP_ACCESS_TOKEN
  });
}
```

### Para Producción:
```javascript
// En facturacionService.ts
const certPath = path.join(__dirname, '../../certs/mi_certificado_prod_prod.crt');
const keyPath = path.join(__dirname, '../../certs/mi_certificado_prod_prod.key');

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  const cert = fs.readFileSync(certPath, { encoding: 'utf8' });
  const key = fs.readFileSync(keyPath, { encoding: 'utf8' });
  
  this.afip = new Afip({ 
    cert, 
    key, 
    CUIT: 20111111112,
    production: true, // Modo producción
    access_token: process.env.AFIP_ACCESS_TOKEN
  });
}
```

## Flujo de Trabajo Recomendado

1. **Desarrollo**: Crear certificados de desarrollo para testing
2. **Testing**: Probar todas las funcionalidades con certificados de desarrollo
3. **Producción**: Crear certificados de producción cuando esté listo para usar
4. **Monitoreo**: Verificar periódicamente el estado de los certificados
5. **Renovación**: Renovar certificados antes de que expiren

## Troubleshooting

### Error: "Credenciales inválidas"
- Verificar que el CUIT y password sean correctos
- Asegurarse de que las credenciales sean válidas para ARCA
- Verificar que el access token tenga permisos suficientes

### Error: "CUIT inválido"
- Verificar que el CUIT tenga 11 dígitos
- Validar el dígito verificador del CUIT
- Asegurarse de que el CUIT esté registrado en AFIP

### Error: "Timeout"
- Verificar conexión a internet
- Intentar nuevamente después de unos minutos
- Contactar soporte de AFIP si persiste

### Error: "Certificado no encontrado"
- Verificar que los archivos se hayan guardado correctamente
- Revisar permisos del directorio `certs/`
- Ejecutar `listarCertificados()` para verificar estado
