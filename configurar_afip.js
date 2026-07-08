/**
 * Script de configuración rápida para AFIP SDK
 * 
 * Este script te ayuda a configurar las variables de entorno necesarias
 */

const fs = require('fs');
const path = require('path');

// Configuración por defecto
const configuracionPorDefecto = {
  AFIP_ACCESS_TOKEN: 'tu_access_token_aqui',
  AFIP_CUIT: '20175767410',
  PORT: '8080',
  NODE_ENV: 'development'
};

/**
 * Función para crear archivo .env si no existe
 */
function crearArchivoEnv() {
  const envPath = path.join(__dirname, '.env');
  
  if (!fs.existsSync(envPath)) {
    console.log('📝 Creando archivo .env...');
    
    let contenidoEnv = '';
    Object.entries(configuracionPorDefecto).forEach(([key, value]) => {
      contenidoEnv += `${key}=${value}\n`;
    });
    
    fs.writeFileSync(envPath, contenidoEnv);
    console.log('✅ Archivo .env creado exitosamente');
    console.log('📋 Contenido:');
    console.log(contenidoEnv);
  } else {
    console.log('✅ El archivo .env ya existe');
  }
}

/**
 * Función para mostrar instrucciones de configuración
 */
function mostrarInstrucciones() {
  console.log('\n🔧 INSTRUCCIONES DE CONFIGURACIÓN:');
  console.log('=====================================');
  console.log('');
  console.log('1. 📝 Edita el archivo .env y configura:');
  console.log('   - AFIP_ACCESS_TOKEN: Tu access token de AFIP SDK');
  console.log('   - AFIP_CUIT: Tu CUIT (20175767410)');
  console.log('');
  console.log('2. 🔑 Para obtener tu access token:');
  console.log('   - Ve al panel de AFIP SDK');
  console.log('   - Genera un access token para automatizaciones');
  console.log('   - Copia el token y pégalo en AFIP_ACCESS_TOKEN');
  console.log('');
  console.log('3. 🚀 Reinicia el servidor después de configurar:');
  console.log('   npm run dev');
  console.log('');
  console.log('4. 🧪 Prueba la configuración:');
  console.log('   node test_configuracion_afip.js');
  console.log('');
}

/**
 * Función para verificar configuración actual
 */
function verificarConfiguracion() {
  console.log('\n🔍 VERIFICANDO CONFIGURACIÓN ACTUAL:');
  console.log('====================================');
  
  const envPath = path.join(__dirname, '.env');
  
  if (fs.existsSync(envPath)) {
    const contenido = fs.readFileSync(envPath, 'utf8');
    const lineas = contenido.split('\n').filter(linea => linea.trim() && !linea.startsWith('#'));
    
    console.log('📋 Variables configuradas:');
    lineas.forEach(linea => {
      const [key, value] = linea.split('=');
      if (key && value) {
        const valorOculto = key.includes('TOKEN') || key.includes('PASSWORD') 
          ? '*'.repeat(Math.min(value.length, 10)) 
          : value;
        console.log(`   ${key}: ${valorOculto}`);
      }
    });
  } else {
    console.log('❌ Archivo .env no encontrado');
  }
}

/**
 * Función principal
 */
function main() {
  console.log('🚀 CONFIGURACIÓN RÁPIDA AFIP SDK');
  console.log('=================================');
  
  crearArchivoEnv();
  verificarConfiguracion();
  mostrarInstrucciones();
  
  console.log('\n✅ Configuración completada');
  console.log('📝 Recuerda editar el archivo .env con tus datos reales');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = {
  crearArchivoEnv,
  verificarConfiguracion,
  mostrarInstrucciones,
  main
};
