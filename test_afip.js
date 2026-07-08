const axios = require('axios');

// Configuración
const BASE_URL = 'http://localhost:8080';
let AUTH_TOKEN = '';

// Función para hacer login
async function login() {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'tu_email@ejemplo.com', // Cambiar por tu email
      password: 'tu_password'        // Cambiar por tu password
    });
    
    if (response.data.success) {
      AUTH_TOKEN = response.data.token;
      console.log('✅ Login exitoso');
      return true;
    } else {
      console.log('❌ Error en login:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Error de conexión:', error.message);
    return false;
  }
}

// Función para obtener catálogos
async function obtenerCatalogos() {
  try {
    console.log('\n📋 Obteniendo catálogos...');
    
    // Tipos de comprobantes
    const tiposComprobante = await axios.get(`${BASE_URL}/api/facturacion/tipos-comprobante`, {
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
    });
    console.log('✅ Tipos de comprobantes:', tiposComprobante.data.data?.length || 0, 'tipos encontrados');
    
    // Tipos de documento
    const tiposDocumento = await axios.get(`${BASE_URL}/api/facturacion/tipos-documento`, {
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
    });
    console.log('✅ Tipos de documento:', tiposDocumento.data.data?.length || 0, 'tipos encontrados');
    
    // Alicuotas de IVA
    const alicuotasIva = await axios.get(`${BASE_URL}/api/facturacion/alicuotas-iva`, {
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
    });
    console.log('✅ Alicuotas de IVA:', alicuotasIva.data.data?.length || 0, 'alicuotas encontradas');
    
    return true;
  } catch (error) {
    console.log('❌ Error obteniendo catálogos:', error.response?.data?.message || error.message);
    return false;
  }
}

// Función para crear una factura de prueba
async function crearFacturaPrueba() {
  try {
    console.log('\n🧾 Creando factura de prueba...');
    
    const facturaData = {
      tipoComprobante: 1, // Factura A
      concepto: 1,        // Productos
      tipoDoc: 99,        // Consumidor Final
      nroDoc: 0,
      fechaServicioDesde: "20240101",
      fechaServicioHasta: "20240101",
      fechaVtoPago: "20240115",
      importeTotal: 1210.00,
      importeNeto: 1000.00,
      importeIva: 210.00,
      items: [
        {
          descripcion: "Soda 1L - Prueba AFIP",
          cantidad: 10,
          precioUnitario: 100.00,
          importe: 1000.00,
          alicuotaIva: 21
        }
      ]
    };
    
    const response = await axios.post(`${BASE_URL}/api/facturacion/factura`, facturaData, {
      headers: { 
        Authorization: `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      console.log('✅ Factura creada exitosamente');
      console.log('📄 CAE:', response.data.cae);
      console.log('📅 Fecha vencimiento:', response.data.fechaVencimiento);
      console.log('🔢 Número comprobante:', response.data.numeroComprobante);
      return response.data;
    } else {
      console.log('❌ Error creando factura:', response.data.message);
      return null;
    }
  } catch (error) {
    console.log('❌ Error creando factura:', error.response?.data?.message || error.message);
    return null;
  }
}

// Función para consultar contribuyente
async function consultarContribuyente() {
  try {
    console.log('\n👤 Consultando contribuyente...');
    
    const response = await axios.get(`${BASE_URL}/api/facturacion/contribuyente/20111111112`, {
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
    });
    
    if (response.data.success) {
      console.log('✅ Contribuyente consultado exitosamente');
      console.log('📋 Datos:', JSON.stringify(response.data.data, null, 2));
      return true;
    } else {
      console.log('❌ Error consultando contribuyente:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Error consultando contribuyente:', error.response?.data?.message || error.message);
    return false;
  }
}

// Función principal de pruebas
async function ejecutarPruebas() {
  console.log('🚀 Iniciando pruebas del módulo AFIP...\n');
  
  // 1. Login
  const loginExitoso = await login();
  if (!loginExitoso) {
    console.log('❌ No se pudo hacer login. Verifica las credenciales.');
    return;
  }
  
  // 2. Obtener catálogos
  await obtenerCatalogos();
  
  // 3. Consultar contribuyente
  await consultarContribuyente();
  
  // 4. Crear factura de prueba
  const factura = await crearFacturaPrueba();
  
  if (factura) {
    console.log('\n🎉 ¡Todas las pruebas completadas exitosamente!');
    console.log('📝 El módulo de facturación AFIP está funcionando correctamente.');
  } else {
    console.log('\n⚠️  Algunas pruebas fallaron. Revisa los errores anteriores.');
  }
}

// Ejecutar pruebas si el script se ejecuta directamente
if (require.main === module) {
  ejecutarPruebas().catch(console.error);
}

module.exports = {
  login,
  obtenerCatalogos,
  crearFacturaPrueba,
  consultarContribuyente,
  ejecutarPruebas
};
