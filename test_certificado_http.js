/**
 * Script de prueba para certificados usando llamada HTTP directa
 * 
 * Este script prueba la implementación alternativa usando llamadas HTTP directas
 * a la API de AFIP SDK cuando CreateAutomation no está disponible
 */

const axios = require('axios');

// Configuración del servidor
const SERVER_URL = 'http://localhost:8080';
const API_BASE = `${SERVER_URL}/api/facturacion`;

/**
 * Función para probar creación de certificado con implementación HTTP
 */
async function probarCrearCertificadoHttp() {
  try {
    console.log('=== PROBAR CREAR CERTIFICADO CON HTTP ===');
    console.log('⚠️  Usando implementación HTTP directa');

    const datosPrueba = {
      cuit: "20175767410",
      username: "20175767410", 
      password: "Gustavo5624*",
      alias: "test_http"
    };

    const response = await axios.post(`${API_BASE}/crear-certificado-desarrollo`, datosPrueba, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 120000 // 2 minutos
    });

    console.log('✅ Certificado creado exitosamente:');
    console.log('Success:', response.data.success);
    console.log('Message:', response.data.message);
    
    if (response.data.data) {
      console.log('ID:', response.data.data.id);
      console.log('Status:', response.data.data.status);
      console.log('Alias:', response.data.data.alias);
      console.log('Archivos guardados:', response.data.data.archivos_guardados);
    }

    return response.data;

  } catch (error) {
    console.error('❌ Error creando certificado:');
    
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
 * Función para probar llamada HTTP directa a AFIP SDK
 */
async function probarLlamadaDirectaAfip() {
  try {
    console.log('\n=== PROBAR LLAMADA DIRECTA A AFIP SDK ===');
    
    const accessToken = process.env.AFIP_ACCESS_TOKEN;
    if (!accessToken) {
      console.log('❌ Access token no configurado');
      console.log('Configura AFIP_ACCESS_TOKEN en tu archivo .env');
      return;
    }

    const url = 'https://api.afipsdk.com/automation';
    
    const payload = {
      automation: 'create-cert-dev',
      data: {
        cuit: '20175767410',
        username: '20175767410',
        password: 'Gustavo5624*',
        alias: 'test_directo'
      }
    };

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    console.log('📡 Llamando a:', url);
    console.log('🔑 Usando access token:', accessToken.substring(0, 10) + '...');

    const response = await axios.post(url, payload, {
      headers,
      timeout: 120000
    });

    console.log('✅ Respuesta exitosa:');
    console.log('Status:', response.status);
    console.log('Data:', response.data);

    return response.data;

  } catch (error) {
    console.error('❌ Error en llamada directa:');
    
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
 * Función para verificar métodos disponibles
 */
async function verificarMetodosAfip() {
  try {
    console.log('\n=== VERIFICAR MÉTODOS AFIP SDK ===');

    const response = await axios.get(`${API_BASE}/verificar-metodos-afip`);

    console.log('✅ Verificación completada:');
    console.log('Success:', response.data.success);
    
    if (response.data.diagnostico) {
      const diag = response.data.diagnostico;
      console.log('\n📊 Diagnóstico:');
      console.log('  AFIP disponible:', diag.afip_disponible);
      console.log('  Access token configurado:', diag.access_token_configurado);
      console.log('  CreateAutomation disponible:', diag.createAutomation_disponible);
      
      console.log('\n🔧 Métodos principales:');
      diag.metodos_principales.forEach(metodo => {
        console.log(`  ${metodo.nombre}: ${metodo.disponible ? '✅' : '❌'}`);
      });
    }

    return response.data;

  } catch (error) {
    console.error('❌ Error verificando métodos:');
    
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
 * Función principal
 */
async function ejecutarPruebas() {
  try {
    console.log('🚀 Iniciando pruebas con implementación HTTP...\n');

    // 1. Verificar métodos disponibles
    await verificarMetodosAfip();

    // 2. Probar llamada directa a AFIP SDK (descomentar para usar)
    // await probarLlamadaDirectaAfip();

    // 3. Probar creación de certificado con implementación HTTP
    // await probarCrearCertificadoHttp();

    console.log('\n✅ Todas las pruebas completadas');
    console.log('\n📝 Próximos pasos:');
    console.log('   1. Configurar tu access_token real en .env');
    console.log('   2. Descomentar las líneas de prueba');
    console.log('   3. Probar la implementación HTTP');

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
  probarCrearCertificadoHttp,
  probarLlamadaDirectaAfip,
  verificarMetodosAfip,
  ejecutarPruebas
};



