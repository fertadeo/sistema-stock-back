# Creación de Certificados AFIP - Documentación

## Descripción

Esta funcionalidad permite crear certificados de desarrollo para conectarse a los web services de AFIP usando la automatización `create-cert-dev` del AFIP SDK.

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
  "alias": "afipsdk"              // Nombre alfanumérico para el certificado
}
```

#### Respuesta exitosa:
```json
{
  "success": true,
  "message": "Certificado de desarrollo creado exitosamente",
  "data": {
    "id": "0c31d74f-d672-4677-a00b-7dc865396c69",
    "status": "complete",
    "certificado": "-----BEGIN CERTIFICATE-----\nMIIDRzC...",
    "clave_privada": "-----BEGIN RSA PRIVATE KEY-----\r\nMIIEowIBAAKCA...",
    "alias": "afipsdk",
    "cuit": "20111111112",
    "archivos_guardados": {
      "certificado_guardado": true,
      "clave_guardada": true,
      "ruta_certificado": "/path/to/certs/afipsdk.crt",
      "ruta_clave": "/path/to/certs/afipsdk.key",
      "directorio": "/path/to/certs"
    }
  }
}
```

#### Respuesta de error:
```json
{
  "success": false,
  "message": "Error al crear el certificado de desarrollo",
  "error": "Credenciales inválidas para ARCA",
  "code": "INVALID_CREDENTIALS",
  "debug": {
    "errorMessage": "Invalid credentials",
    "errorType": "Error",
    "parametros_recibidos": {
      "cuit": "20111111112",
      "username": "20111111112",
      "alias": "afipsdk"
    }
  }
}
```

### 2. Listar Certificados Disponibles
**GET** `/api/facturacion/certificados`

Lista todos los certificados guardados en el directorio del sistema.

#### Respuesta:
```json
{
  "success": true,
  "message": "Se encontraron 2 certificado(s)",
  "certificados": [
    {
      "alias": "afipsdk",
      "certificado_existe": true,
      "clave_existe": true,
      "ruta_certificado": "/path/to/certs/afipsdk.crt",
      "ruta_clave": "/path/to/certs/afipsdk.key",
      "fecha_modificacion": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

## Uso con cURL

### Crear certificado:
```bash
curl -X POST http://localhost:3000/api/facturacion/crear-certificado-desarrollo \
  -H "Content-Type: application/json" \
  -d '{
    "cuit": "20111111112",
    "username": "20111111112", 
    "password": "tu_contraseña",
    "alias": "mi_certificado"
  }'
```

### Listar certificados:
```bash
curl -X GET http://localhost:3000/api/facturacion/certificados
```

## Uso con JavaScript/Node.js

```javascript
const axios = require('axios');

// Crear certificado
async function crearCertificado() {
  try {
    const response = await axios.post('http://localhost:3000/api/facturacion/crear-certificado-desarrollo', {
      cuit: "20111111112",
      username: "20111111112",
      password: "tu_contraseña",
      alias: "mi_certificado"
    });
    
    console.log('Certificado creado:', response.data);
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
├── afipsdk.crt    # Certificado público
├── afipsdk.key    # Clave privada
└── mi_certificado.crt
    └── mi_certificado.key
```

## Códigos de Error

|               Código | Descripción                  |
|----------------------|- ----------------------------|
| `MISSING_PARAMETERS` | Faltan parámetros requeridos |
| `INVALID_CUIT`       | CUIT inválido                |
| `INVALID_ALIAS`      | Alias inválido (debe ser alfanumérico) |
| `INVALID_CREDENTIALS`| Credenciales inválidas para ARCA |
| `TIMEOUT_ERROR`      | Timeout al crear certificado |
| `NETWORK_ERROR`      | Error de conexión con AFIP   |
| `CERTIFICATE_CREATION_ERROR` | Error general al crear certificado |

## Requisitos Previos

1. **Access Token de AFIP SDK**: Debes tener un access token válido configurado en la variable de entorno `AFIP_ACCESS_TOKEN`
2. **Credenciales de ARCA**: Necesitas credenciales válidas para acceder a la página de ARCA
3. **CUIT válido**: El CUIT debe estar registrado en AFIP

## Configuración del Entorno

Asegúrate de tener configurado el access token en tu archivo `.env`:

```env
AFIP_ACCESS_TOKEN=tu_access_token_aqui
```

## Testing

Puedes usar el archivo `test_certificado_afip.js` para probar la funcionalidad:

```bash
node test_certificado_afip.js
```

## Notas Importantes

- ⚠️ **Solo para desarrollo**: Estos certificados son únicamente para testing en modo desarrollo
- 🔒 **Seguridad**: Nunca expongas las credenciales o claves privadas en logs o respuestas públicas
- 📁 **Almacenamiento**: Los certificados se guardan localmente en el directorio `certs/`
- 🔄 **Renovación**: Los certificados de desarrollo pueden necesitar renovación periódica

## Integración con el Sistema Existente

Una vez creado el certificado, puedes usarlo para inicializar AFIP en modo producción:

```javascript
// En facturacionService.ts
const certPath = path.join(__dirname, '../../certs/mi_certificado.crt');
const keyPath = path.join(__dirname, '../../certs/mi_certificado.key');

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  const cert = fs.readFileSync(certPath, { encoding: 'utf8' });
  const key = fs.readFileSync(keyPath, { encoding: 'utf8' });
  
  this.afip = new Afip({ 
    cert, 
    key, 
    CUIT: 20111111112,
    access_token: process.env.AFIP_ACCESS_TOKEN
  });
}
```
