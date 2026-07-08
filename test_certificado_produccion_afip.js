/**
 * Script de prueba específico para certificados de producción AFIP
 * 
 * Este script demuestra cómo usar la nueva funcionalidad de creación de certificados
 * de producción usando la automatización create-cert-prod de AFIP SDK.
 * 
 * IMPORTANTE: 
 * - Necesitas tener un access_token válido de AFIP SDK
 * - Las credenciales deben ser válidas para ARCA en modo producción
 * - Este script es para testing en modo producción (AFECTA DATOS REALES)
 * - Usar con precaución ya que puede generar certificados reales
 */

const axios = require('axios');

// Configuración del servidor
const SERVER_URL = 'http://localhost:3000'; // Cambiar por tu URL del servidor
const API_BASE = `${SERVER_URL}/api/facturacion`;

// Datos de ejemplo para crear certificado de producción
const datosCertificadoProduccion = {
  cuit: "20111111112",           // CUIT a usar en la página de ARCA
  username: "20111111112",      // CUIT para loguearse (normalmente el mismo que cuit)
  password: "contraseña#segura?", // Contraseña para ARCA
  alias: "afipsdk_prod"          // Nombre alfanumérico para el certificado
};

/**
 * Función para crear certificado de producción
 */
async function crearCertificadoProduccion() {
  try {
    console.log('=== CREAR CERTIFICADO PRODUCCIÓN ===');
    console.log('⚠️  ADVERTENCIA: Esto creará un certificado REAL de producción');
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
      timeout: 120000 // 120 segundos de timeout (más tiempo para producción)
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
    
    if (response.data.certificados_produccion && response.data.certificados_produccion.length > 0) {
      console.log('\n🔒 Certificados de Producción:');
      response.data.certificados_produccion.forEach((cert, index) => {
        console.log(`\nCertificado Producción ${index + 1}:`);
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
      console.log('No hay certificados de producción guardados');
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
 * Función para verificar estado del servidor
 */
async function verificarServidor() {
  try {
    console.log('=== VERIFICAR SERVIDOR ===');
    
    const response = await axios.get(`${SERVER_URL}/api/facturacion/test-afip`, {
      timeout: 10000
    });
    
    console.log('✅ Servidor funcionando correctamente');
    console.log('Status:', response.status);
    
    return true;
  } catch (error) {
    console.error('❌ Error conectando al servidor:');
    console.error('Asegúrate de que el servidor esté ejecutándose en:', SERVER_URL);
    console.error('Error:', error.message);
    return false;
  }
}

/**
 * Función principal para ejecutar pruebas de producción
 */
async function ejecutarPruebasProduccion() {
  try {
    console.log('🚀 Iniciando pruebas de certificados de PRODUCCIÓN AFIP...\n');
    console.log('⚠️  ADVERTENCIA: Estas pruebas pueden crear certificados REALES de producción\n');

    // 0. Verificar que el servidor esté funcionando
    const servidorOk = await verificarServidor();
    if (!servidorOk) {
      console.log('❌ No se puede continuar sin conexión al servidor');
      process.exit(1);
    }

    // 1. Probar conexión con AFIP
    await testConexionAfip();

    // 2. Listar certificados existentes
    await listarCertificados();

    // 3. Crear certificado de producción (DESCOMENTAR PARA USAR)
    // console.log('\n⚠️  ADVERTENCIA: A punto de crear certificado REAL de producción');
    // console.log('⚠️  Presiona Ctrl+C en los próximos 5 segundos para cancelar...');
    // await new Promise(resolve => setTimeout(resolve, 5000));
    // await crearCertificadoProduccion();

    // 4. Listar certificados después de crear uno nuevo
    // await listarCertificados();

    console.log('\n✅ Todas las pruebas completadas exitosamente');
    console.log('\n📝 Para crear un certificado real de producción:');
    console.log('   1. Descomenta las líneas 3 y 4 en la función ejecutarPruebasProduccion()');
    console.log('   2. Asegúrate de tener credenciales válidas de ARCA');
    console.log('   3. Ejecuta el script nuevamente');

  } catch (error) {
    console.error('\n❌ Error en las pruebas:', error.message);
    process.exit(1);
  }
}

// Ejecutar las pruebas si el script se ejecuta directamente
if (require.main === module) {
  ejecutarPruebasProduccion();
}

module.exports = {
  crearCertificadoProduccion,
  listarCertificados,
  testConexionAfip,
  verificarServidor,
  ejecutarPruebasProduccion
};
