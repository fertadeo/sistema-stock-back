/**
 * Script de prueba para crear certificado de desarrollo AFIP
 * 
 * Este script demuestra cómo usar la nueva funcionalidad de creación de certificados
 * usando la automatización create-cert-dev de AFIP SDK.
 * 
 * IMPORTANTE: 
 * - Necesitas tener un access_token válido de AFIP SDK
 * - Las credenciales deben ser válidas para ARCA
 * - Este script es solo para testing en modo desarrollo
 */

const axios = require('axios');

// Configuración del servidor
const SERVER_URL = 'http://localhost:3000'; // Cambiar por tu URL del servidor
const API_BASE = `${SERVER_URL}/api/facturacion`;

// Datos de ejemplo para crear certificado de desarrollo
const datosCertificadoDesarrollo = {
  cuit: "20175767410",           // CUIT a usar en la página de ARCA
  username: "20175767410",      // CUIT para loguearse (normalmente el mismo que cuit)
  password: "contraseña#segura?", // Contraseña para ARCA
  alias: "20175767410"          // Nombre alfanumérico para el certificado
};

// Datos de ejemplo para crear certificado de producción
const datosCertificadoProduccion = {
  cuit: "20111111112",           // CUIT a usar en la página de ARCA
  username: "20111111112",      // CUIT para loguearse (normalmente el mismo que cuit)
  password: "contraseña#segura?", // Contraseña para ARCA
  alias: "afipsdk_prod"          // Nombre alfanumérico para el certificado
};

/**
 * Función para crear certificado de desarrollo
 */
async function crearCertificadoDesarrollo() {
  try {
    console.log('=== CREAR CERTIFICADO DESARROLLO ===');
    console.log('Datos:', {
      cuit: datosCertificadoDesarrollo.cuit,
      username: datosCertificadoDesarrollo.username,
      alias: datosCertificadoDesarrollo.alias,
      password: '***' // No mostrar la contraseña
    });

    const response = await axios.post(`${API_BASE}/crear-certificado-desarrollo`, datosCertificadoDesarrollo, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60 segundos de timeout
    });

    console.log('✅ Respuesta exitosa:');
    console.log('Status:', response.status);
    console.log('Success:', response.data.success);
    console.log('Message:', response.data.message);
    
    if (response.data.data) {
      console.log('ID:', response.data.data.id);
      console.log('Status:', response.data.data.status);
      console.log('Alias:', response.data.data.alias);
      console.log('CUIT:', response.data.data.cuit);
      console.log('Tipo:', response.data.data.tipo || 'desarrollo');
      console.log('Archivos guardados:', response.data.data.archivos_guardados);
      
      // Mostrar solo el inicio del certificado (por seguridad)
      if (response.data.data.certificado) {
        console.log('Certificado (inicio):', response.data.data.certificado.substring(0, 100) + '...');
      }
    }

    return response.data;

  } catch (error) {
    console.error('❌ Error creando certificado de desarrollo:');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No se recibió respuesta del servidor');
      console.error('Request:', error.request);
    } else {
      console.error('Error:', error.message);
    }
    
    throw error;
  }
}

/**
 * Función para crear certificado de producción
 */
async function crearCertificadoProduccion() {
  try {
    console.log('=== CREAR CERTIFICADO PRODUCCIÓN ===');
    console.log('Datos:', {
      cuit: datosCertificadoProduccion.cuit,
      username: datosCertificadoProduccion.username,
      alias: datosCertificadoProduccion.alias,
      password: '***' // No mostrar la contraseña
    });

    const response = await axios.post(`${API_BASE}/crear-certificado-produccion`, datosCertificadoProduccion, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60 segundos de timeout
    });

    console.log('✅ Respuesta exitosa:');
    console.log('Status:', response.status);
    console.log('Success:', response.data.success);
    console.log('Message:', response.data.message);
    
    if (response.data.data) {
      console.log('ID:', response.data.data.id);
      console.log('Status:', response.data.data.status);
      console.log('Alias:', response.data.data.alias);
      console.log('CUIT:', response.data.data.cuit);
      console.log('Tipo:', response.data.data.tipo || 'produccion');
      console.log('Archivos guardados:', response.data.data.archivos_guardados);
      
      // Mostrar solo el inicio del certificado (por seguridad)
      if (response.data.data.certificado) {
        console.log('Certificado (inicio):', response.data.data.certificado.substring(0, 100) + '...');
      }
    }

    return response.data;

  } catch (error) {
    console.error('❌ Error creando certificado de producción:');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No se recibió respuesta del servidor');
      console.error('Request:', error.request);
    } else {
      console.error('Error:', error.message);
    }
    
    throw error;
  }
}

/**
 * Función para listar certificados disponibles
 */
async function listarCertificados() {
  try {
    console.log('\n=== LISTAR CERTIFICADOS ===');

    const response = await axios.get(`${API_BASE}/certificados`);

    console.log('✅ Certificados encontrados:');
    console.log('Success:', response.data.success);
    console.log('Message:', response.data.message);
    
    if (response.data.resumen) {
      console.log('\n📊 Resumen:');
      console.log('  Total:', response.data.resumen.total);
      console.log('  Desarrollo:', response.data.resumen.desarrollo);
      console.log('  Producción:', response.data.resumen.produccion);
    }
    
    if (response.data.certificados && response.data.certificados.length > 0) {
      console.log('\n📋 Lista completa:');
      response.data.certificados.forEach((cert, index) => {
        console.log(`\nCertificado ${index + 1}:`);
        console.log('  Alias:', cert.alias);
        console.log('  Alias original:', cert.alias_original);
        console.log('  Tipo:', cert.tipo);
        console.log('  Certificado existe:', cert.certificado_existe);
        console.log('  Clave existe:', cert.clave_existe);
        console.log('  Ruta certificado:', cert.ruta_certificado);
        console.log('  Ruta clave:', cert.ruta_clave);
        console.log('  Fecha modificación:', cert.fecha_modificacion);
      });
    } else {
      console.log('No hay certificados guardados');
    }

    return response.data;

  } catch (error) {
    console.error('❌ Error listando certificados:');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    
    throw error;
  }
}

/**
 * Función para probar conexión con AFIP
 */
async function testConexionAfip() {
  try {
    console.log('\n=== TEST CONEXIÓN AFIP ===');

    const response = await axios.get(`${API_BASE}/test-afip`);

    console.log('✅ Test AFIP:');
    console.log('Success:', response.data.success);
    console.log('Message:', response.data.message);
    
    if (response.data.data) {
      console.log('Tipos comprobante count:', response.data.data.tipos_comprobante_count);
      console.log('Primer tipo:', response.data.data.primer_tipo);
    }

    return response.data;

  } catch (error) {
    console.error('❌ Error en test AFIP:');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    
    throw error;
  }
}

/**
 * Función principal para ejecutar todas las pruebas
 */
async function ejecutarPruebas() {
  try {
    console.log('🚀 Iniciando pruebas de certificados AFIP...\n');

    // 1. Probar conexión con AFIP
    await testConexionAfip();

    // 2. Listar certificados existentes
    await listarCertificados();

    // 3. Crear certificado de desarrollo (descomentar para usar)
    // await crearCertificadoDesarrollo();

    // 4. Crear certificado de producción (descomentar para usar)
    // await crearCertificadoProduccion();

    // 5. Listar certificados después de crear nuevos
    // await listarCertificados();

    console.log('\n✅ Todas las pruebas completadas exitosamente');

  } catch (error) {
    console.error('\n❌ Error en las pruebas:', error.message);
    process.exit(1);
  }
}

// Ejecutar las pruebas si el script se ejecuta directamente
if (require.main === module) {
  ejecutarPruebas();
}

module.exports = {
  crearCertificadoDesarrollo,
  crearCertificadoProduccion,
  listarCertificados,
  testConexionAfip,
  ejecutarPruebas
};
