/**
 * Script de prueba para verificar la configuración de AFIP SDK
 * 
 * Este script verifica que CreateAutomation esté disponible y funcione correctamente
 */

const axios = require('axios');

// Configuración del servidor
const SERVER_URL = 'http://localhost:8080';
const API_BASE = `${SERVER_URL}/api/facturacion`;

/**
 * Función para verificar métodos disponibles en AFIP SDK
 */
async function verificarMetodosAfip() {
  try {
    console.log('=== VERIFICAR MÉTODOS AFIP SDK ===');

    const response = await axios.get(`${API_BASE}/verificar-metodos-afip`);

    console.log('✅ Verificación completada:');
    console.log('Success:', response.data.success);
    console.log('Message:', response.data.message);
    
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
      
      console.log('\n📋 Todos los métodos disponibles:');
      diag.metodos_disponibles.forEach(metodo => {
        console.log(`  - ${metodo}`);
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
 * Función para probar conexión básica con AFIP
 */
async function testConexionBasica() {
  try {
    console.log('\n=== TEST CONEXIÓN BÁSICA ===');

    const response = await axios.get(`${API_BASE}/test-afip`);

    console.log('✅ Test básico:');
    console.log('Success:', response.data.success);
    console.log('Message:', response.data.message);
    
    if (response.data.data) {
      console.log('Tipos comprobante count:', response.data.data.tipos_comprobante_count);
    }

    return response.data;

  } catch (error) {
    console.error('❌ Error en test básico:');
    
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
 * Función para probar creación de certificado de desarrollo
 */
async function probarCrearCertificado() {
  try {
    console.log('\n=== PROBAR CREAR CERTIFICADO DESARROLLO ===');
    console.log('⚠️  Usando datos de prueba - cambiar por tus credenciales reales');

    const datosPrueba = {
      cuit: "20175767410",
      username: "20175767410", 
      password: "Gustavo5624*", // CAMBIAR POR TU CONTRASEÑA REAL
      alias: "20175767410"
    };

    const response = await axios.post(`${API_BASE}/crear-certificado-desarrollo`, datosPrueba, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000
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
 * Función principal
 */
async function ejecutarPruebas() {
  try {
    console.log('🚀 Iniciando pruebas de configuración AFIP SDK...\n');

    // 1. Verificar métodos disponibles
    await verificarMetodosAfip();

    // 2. Probar conexión básica
    await testConexionBasica();

    // 3. Probar creación de certificado (descomentar para usar)
    // await probarCrearCertificado();

    console.log('\n✅ Todas las pruebas completadas');
    console.log('\n📝 Próximos pasos:');
    console.log('   1. Verificar que CreateAutomation esté disponible');
    console.log('   2. Configurar tu access_token real en .env');
    console.log('   3. Usar tus credenciales reales de ARCA');
    console.log('   4. Descomentar la línea de probarCrearCertificado()');

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
  verificarMetodosAfip,
  testConexionBasica,
  probarCrearCertificado,
  ejecutarPruebas
};
