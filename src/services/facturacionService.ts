import Afip from '@afipsdk/afip.js';
import fs from 'fs';
import path from 'path';

interface FacturaData {
  tipoComprobante: number; // 1: Factura A, 6: Factura B, 11: Factura C
  concepto: number; // 1: Productos, 2: Servicios, 3: Productos y Servicios
  tipoDoc: number; // 80: CUIT, 96: DNI, etc.
  nroDoc: number;
  fechaServicioDesde: string;
  fechaServicioHasta: string;
  fechaVtoPago: string;
  importeTotal: number;
  importeNeto: number;
  importeIva: number;
  items: Array<{
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    importe: number;
    alicuotaIva: number;
  }>;
}

interface ClienteData {
  tipoDoc: number;
  nroDoc: number;
  nombre: string;
  direccion: string;
  localidad: string;
  codigoPostal: string;
}

class FacturacionService {
  public afip: any; // Cambiado a público para diagnóstico
  private puntoVenta: number = 1; // Punto de venta por defecto

  constructor() {
    this.initializeAfip();
  }

  private initializeAfip() {
    try {
      // Para automatizaciones (creación de certificados) - necesitamos CUIT y access_token
      this.afip = new Afip({ 
        CUIT: parseInt(process.env.AFIP_CUIT || '20175767410'), // CUIT desde variable de entorno
        access_token: process.env.AFIP_ACCESS_TOKEN || 'TU_ACCESS_TOKEN'
      });
      
      console.log('AFIP inicializado para automatizaciones');
      console.log('CUIT configurado:', this.afip.CUIT);
      console.log('Access token configurado:', process.env.AFIP_ACCESS_TOKEN ? 'SÍ' : 'NO');
      
      // Verificar que CreateAutomation esté disponible
      if (typeof this.afip.CreateAutomation === 'function') {
        console.log('✅ CreateAutomation disponible');
      } else {
        console.log('❌ CreateAutomation NO disponible');
        console.log('Métodos disponibles:', Object.getOwnPropertyNames(this.afip));
        console.log('Prototipo AFIP:', Object.getPrototypeOf(this.afip));
        
        // Verificar si está en el prototipo
        if (typeof this.afip.__proto__.CreateAutomation === 'function') {
          console.log('✅ CreateAutomation encontrado en prototipo');
        }
        
        // Verificar métodos alternativos
        const metodosAlternativos = ['createAutomation', 'CreateCert', 'createCert', 'Automation'];
        metodosAlternativos.forEach(metodo => {
          if (typeof this.afip[metodo] === 'function') {
            console.log(`✅ Método alternativo encontrado: ${metodo}`);
          }
        });
      }
      
      // Para producción - descomentar y configurar con tu certificado
      /*
      const certPath = path.join(__dirname, '../../certs/certificado.crt');
      const keyPath = path.join(__dirname, '../../certs/key.key');
      
      if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        const cert = fs.readFileSync(certPath, { encoding: 'utf8' });
        const key = fs.readFileSync(keyPath, { encoding: 'utf8' });
        const CUIT = 20111111112; // Tu CUIT
        
        this.afip = new Afip({ 
          cert, 
          key, 
          CUIT,
          access_token: process.env.AFIP_ACCESS_TOKEN || 'TU_ACCESS_TOKEN'
        });
      } else {
        throw new Error('Certificados no encontrados');
      }
      */
    } catch (error) {
      console.error('Error inicializando AFIP:', error);
      throw error;
    }
  }

  /**
   * Crear una factura electrónica
   */
  async crearFactura(facturaData: FacturaData) {
    try {
      const comprobante = {
        tipoComprobante: facturaData.tipoComprobante,
        concepto: facturaData.concepto,
        tipoDoc: facturaData.tipoDoc,
        nroDoc: facturaData.nroDoc,
        fechaServicioDesde: facturaData.fechaServicioDesde,
        fechaServicioHasta: facturaData.fechaServicioHasta,
        fechaVtoPago: facturaData.fechaVtoPago,
        importeTotal: facturaData.importeTotal,
        importeNeto: facturaData.importeNeto,
        importeIva: facturaData.importeIva,
        puntoVenta: this.puntoVenta,
        items: facturaData.items
      };

      const resultado = await this.afip.ElectronicBilling.createVoucher(comprobante);
      
      return {
        success: true,
        data: resultado,
        cae: resultado.CAE,
        fechaVencimiento: resultado.fechaVencimiento,
        numeroComprobante: resultado.numeroComprobante
      };
    } catch (error) {
      console.error('Error creando factura:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  /**
   * Obtener el último número de comprobante
   */
  async obtenerUltimoComprobante(tipoComprobante: number) {
    try {
      const resultado = await this.afip.ElectronicBilling.getLastVoucher({
        tipoComprobante,
        puntoVenta: this.puntoVenta
      });
      
      return {
        success: true,
        data: resultado
      };
    } catch (error) {
      console.error('Error obteniendo último comprobante:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Consultar datos de un contribuyente por CUIT
   * 
   * Este método consulta AFIP para obtener los datos completos del contribuyente
   * incluyendo razón social, dirección, condición ante IVA, etc.
   * 
   * @param cuit - CUIT del contribuyente (número de 11 dígitos)
   * @returns Datos del contribuyente desde AFIP
   */
  async consultarContribuyente(cuit: number) {
    try {
      console.log(`Consultando contribuyente con CUIT: ${cuit}`);
      console.log(`Configuración AFIP - CUIT: ${this.afip.CUIT}`);
      
      // Verificar que AFIP esté inicializado
      if (!this.afip) {
        throw new Error('AFIP no está inicializado correctamente');
      }
      
      const resultado = await this.afip.RegisterScopeThirteen.getTaxpayerDetails(cuit);
      
      console.log(`Respuesta AFIP recibida:`, resultado);
      
      // Procesar y formatear los datos recibidos
      const datosFormateados = this.formatearDatosContribuyente(resultado, cuit);
      
      console.log(`Contribuyente encontrado: ${datosFormateados.razon_social}`);
      
      return {
        success: true,
        data: datosFormateados
      };
    } catch (error) {
      console.error('Error consultando contribuyente:', error);
      
      // Manejar diferentes tipos de errores de AFIP
      let mensajeError = 'Error desconocido';
      let codigoError = 'UNKNOWN_ERROR';
      
      if (error instanceof Error) {
        const mensaje = error.message.toLowerCase();
        
        // Manejar errores HTTP específicos
        if (mensaje.includes('status code 500')) {
          mensajeError = 'Error interno del servidor AFIP. El CUIT puede no existir o hay problemas temporales con AFIP';
          codigoError = 'AFIP_SERVER_ERROR';
        } else if (mensaje.includes('status code 404')) {
          mensajeError = 'El contribuyente no existe en AFIP';
          codigoError = 'CONTRIBUYENTE_NOT_FOUND';
        } else if (mensaje.includes('status code 401')) {
          mensajeError = 'Error de autenticación con AFIP. Verificar certificados';
          codigoError = 'AFIP_AUTH_ERROR';
        } else if (mensaje.includes('status code 403')) {
          mensajeError = 'Acceso denegado por AFIP';
          codigoError = 'AFIP_FORBIDDEN';
        } else if (mensaje.includes('no existe') || mensaje.includes('not found')) {
          mensajeError = 'El contribuyente no existe en AFIP';
          codigoError = 'CONTRIBUYENTE_NOT_FOUND';
        } else if (mensaje.includes('timeout') || mensaje.includes('time out')) {
          mensajeError = 'Timeout al consultar AFIP. Intente nuevamente';
          codigoError = 'AFIP_TIMEOUT';
        } else if (mensaje.includes('certificate') || mensaje.includes('certificado')) {
          mensajeError = 'Error de certificado AFIP';
          codigoError = 'CERTIFICATE_ERROR';
        } else if (mensaje.includes('network') || mensaje.includes('connection')) {
          mensajeError = 'Error de conexión con AFIP';
          codigoError = 'NETWORK_ERROR';
        } else {
          mensajeError = error.message;
          codigoError = 'AFIP_ERROR';
        }
      }
      
      return {
        success: false,
        error: mensajeError,
        code: codigoError,
        cuit: cuit,
        debug: {
          errorMessage: error instanceof Error ? error.message : 'Error desconocido',
          errorType: error instanceof Error ? error.constructor.name : typeof error
        }
      };
    }
  }

  /**
   * Formatear datos del contribuyente recibidos de AFIP
   */
  private formatearDatosContribuyente(datos: any, cuit: number) {
    return {
      cuit: cuit.toString(),
      cuit_formateado: this.formatearCuit(cuit.toString()),
      razon_social: datos.denominacion || datos.razonSocial || 'Sin denominación',
      nombre_fantasia: datos.nombreFantasia || datos.nombreFantasia || null,
      domicilio_fiscal: {
        calle: datos.domicilioFiscal?.calle || datos.domicilio?.calle || '',
        numero: datos.domicilioFiscal?.numero || datos.domicilio?.numero || '',
        piso: datos.domicilioFiscal?.piso || datos.domicilio?.piso || '',
        departamento: datos.domicilioFiscal?.departamento || datos.domicilio?.departamento || '',
        codigo_postal: datos.domicilioFiscal?.codigoPostal || datos.domicilio?.codigoPostal || '',
        localidad: datos.domicilioFiscal?.localidad || datos.domicilio?.localidad || '',
        provincia: datos.domicilioFiscal?.provincia || datos.domicilio?.provincia || ''
      },
      condicion_iva: datos.condicionIVA || datos.condicionIva || 'No informado',
      condicion_impositiva: datos.condicionImpositiva || 'No informado',
      fecha_inicio_actividades: datos.fechaInicioActividades || null,
      estado: datos.estado || 'Activo',
      actividad_principal: datos.actividadPrincipal || null,
      actividades_secundarias: datos.actividadesSecundarias || [],
      datos_originales: datos // Mantener datos originales para referencia
    };
  }

  /**
   * Validar CUIT completo (formato y dígito verificador)
   */
  validarCuit(cuit: string): { esValido: boolean; mensaje: string; codigo: string } {
    // Validar formato básico
    if (!/^\d{11}$/.test(cuit)) {
      return {
        esValido: false,
        mensaje: 'El CUIT debe tener 11 dígitos numéricos',
        codigo: 'CUIT_INVALID_FORMAT'
      };
    }

    // Validar dígito verificador
    if (!this.validarDigitoVerificador(cuit)) {
      return {
        esValido: false,
        mensaje: 'El CUIT tiene un dígito verificador inválido',
        codigo: 'CUIT_INVALID_CHECKSUM'
      };
    }

    return {
      esValido: true,
      mensaje: 'CUIT válido',
      codigo: 'CUIT_VALID'
    };
  }

  /**
   * Validar dígito verificador del CUIT usando algoritmo oficial
   */
  private validarDigitoVerificador(cuit: string): boolean {
    const multiplicadores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let suma = 0;
    
    for (let i = 0; i < 10; i++) {
      suma += parseInt(cuit[i]) * multiplicadores[i];
    }
    
    const resto = suma % 11;
    const digitoVerificador = resto < 2 ? resto : 11 - resto;
    
    return digitoVerificador === parseInt(cuit[10]);
  }

  /**
   * Formatear CUIT con guiones
   */
  formatearCuit(cuit: string): string {
    if (cuit.length === 11) {
      return `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}`;
    }
    return cuit;
  }

  /**
   * Verificar si un comprobante existe
   */
  async verificarComprobante(tipoComprobante: number, puntoVenta: number, numeroComprobante: number, cuit: number) {
    try {
      const resultado = await this.afip.ElectronicBilling.getVoucherInfo({
        tipoComprobante,
        puntoVenta,
        numeroComprobante,
        cuit
      });
      
      return {
        success: true,
        data: resultado
      };
    } catch (error) {
      console.error('Error verificando comprobante:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Obtener tipos de comprobantes disponibles
   */
  async obtenerTiposComprobante() {
    try {
      const resultado = await this.afip.ElectronicBilling.getVoucherTypes();
      
      return {
        success: true,
        data: resultado
      };
    } catch (error) {
      console.error('Error obteniendo tipos de comprobante:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Obtener tipos de documento disponibles
   */
  async obtenerTiposDocumento() {
    try {
      const resultado = await this.afip.ElectronicBilling.getDocumentTypes();
      
      return {
        success: true,
        data: resultado
      };
    } catch (error) {
      console.error('Error obteniendo tipos de documento:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Obtener alícuotas de IVA disponibles
   */
  async obtenerAlicuotasIva() {
    try {
      const resultado = await this.afip.ElectronicBilling.getTaxTypes();
      
      return {
        success: true,
        data: resultado
      };
    } catch (error) {
      console.error('Error obteniendo alícuotas de IVA:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Método de prueba para diagnosticar consulta de contribuyente con diferentes servicios
   */
  async testConsultarContribuyente(cuit: number) {
    try {
      console.log(`[TEST] Iniciando consulta de contribuyente`);
      console.log(`[TEST] CUIT: ${cuit}`);
      console.log(`[TEST] AFIP inicializado: ${!!this.afip}`);
      console.log(`[TEST] CUIT configurado: ${this.afip?.CUIT}`);
      
      const resultados = {
        registerScopeFour: null as any,
        registerScopeFive: null as any,
        registerScopeTen: null as any,
        registerScopeThirteen: null as any
      };
      
      // Probar RegisterScopeFour (Padrón A4)
      try {
        console.log(`[TEST] Probando RegisterScopeFour...`);
        if (this.afip.RegisterScopeFour && this.afip.RegisterScopeFour.getTaxpayerDetails) {
          const resultado4 = await this.afip.RegisterScopeFour.getTaxpayerDetails(cuit);
          resultados.registerScopeFour = {
            success: true,
            data: resultado4,
            metodo: 'RegisterScopeFour (Padrón A4)'
          };
          console.log(`[TEST] RegisterScopeFour exitoso:`, resultado4);
        } else {
          resultados.registerScopeFour = {
            success: false,
            error: 'RegisterScopeFour no disponible',
            metodo: 'RegisterScopeFour (Padrón A4)'
          };
        }
      } catch (error) {
        resultados.registerScopeFour = {
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido',
          metodo: 'RegisterScopeFour (Padrón A4)'
        };
        console.log(`[TEST] RegisterScopeFour error:`, error);
      }
      
      // Probar RegisterScopeFive (Padrón A5)
      try {
        console.log(`[TEST] Probando RegisterScopeFive...`);
        if (this.afip.RegisterScopeFive && this.afip.RegisterScopeFive.getTaxpayerDetails) {
          const resultado5 = await this.afip.RegisterScopeFive.getTaxpayerDetails(cuit);
          resultados.registerScopeFive = {
            success: true,
            data: resultado5,
            metodo: 'RegisterScopeFive (Padrón A5)'
          };
          console.log(`[TEST] RegisterScopeFive exitoso:`, resultado5);
        } else {
          resultados.registerScopeFive = {
            success: false,
            error: 'RegisterScopeFive no disponible',
            metodo: 'RegisterScopeFive (Padrón A5)'
          };
        }
      } catch (error) {
        resultados.registerScopeFive = {
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido',
          metodo: 'RegisterScopeFive (Padrón A5)'
        };
        console.log(`[TEST] RegisterScopeFive error:`, error);
      }
      
      // Probar RegisterScopeTen (Padrón A10)
      try {
        console.log(`[TEST] Probando RegisterScopeTen...`);
        if (this.afip.RegisterScopeTen && this.afip.RegisterScopeTen.getTaxpayerDetails) {
          const resultado10 = await this.afip.RegisterScopeTen.getTaxpayerDetails(cuit);
          resultados.registerScopeTen = {
            success: true,
            data: resultado10,
            metodo: 'RegisterScopeTen (Padrón A10)'
          };
          console.log(`[TEST] RegisterScopeTen exitoso:`, resultado10);
        } else {
          resultados.registerScopeTen = {
            success: false,
            error: 'RegisterScopeTen no disponible',
            metodo: 'RegisterScopeTen (Padrón A10)'
          };
        }
      } catch (error) {
        resultados.registerScopeTen = {
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido',
          metodo: 'RegisterScopeTen (Padrón A10)'
        };
        console.log(`[TEST] RegisterScopeTen error:`, error);
      }
      
      // Probar RegisterScopeThirteen (Padrón A13) - el que estábamos usando
      try {
        console.log(`[TEST] Probando RegisterScopeThirteen...`);
        if (this.afip.RegisterScopeThirteen && this.afip.RegisterScopeThirteen.getTaxpayerDetails) {
          const resultado13 = await this.afip.RegisterScopeThirteen.getTaxpayerDetails(cuit);
          resultados.registerScopeThirteen = {
            success: true,
            data: resultado13,
            metodo: 'RegisterScopeThirteen (Padrón A13)'
          };
          console.log(`[TEST] RegisterScopeThirteen exitoso:`, resultado13);
        } else {
          resultados.registerScopeThirteen = {
            success: false,
            error: 'RegisterScopeThirteen no disponible',
            metodo: 'RegisterScopeThirteen (Padrón A13)'
          };
        }
      } catch (error) {
        resultados.registerScopeThirteen = {
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido',
          metodo: 'RegisterScopeThirteen (Padrón A13)'
        };
        console.log(`[TEST] RegisterScopeThirteen error:`, error);
      }
      
      // Determinar cuál método funcionó
      const metodosDisponibles = Object.keys(this.afip).filter(key => key.startsWith('RegisterScope'));
      console.log(`[TEST] Métodos disponibles:`, metodosDisponibles);
      
      const metodosExitosos = Object.entries(resultados).filter(([_, resultado]) => resultado?.success);
      
      return {
        success: metodosExitosos.length > 0,
        message: metodosExitosos.length > 0 
          ? `Consulta exitosa con ${metodosExitosos.length} método(s)` 
          : 'Todos los métodos fallaron',
        resultados,
        debug: {
          cuit_consultado: cuit,
          metodos_disponibles: metodosDisponibles,
          metodos_exitosos: metodosExitosos.map(([metodo, _]) => metodo),
          afip_disponible: !!this.afip
        }
      };
      
    } catch (error) {
      console.error(`[TEST] Error general en consulta:`, error);
      
      return {
        success: false,
        message: 'Error general en consulta de contribuyente',
        error: error instanceof Error ? error.message : 'Error desconocido',
        debug: {
          cuit_consultado: cuit,
          error_type: error instanceof Error ? error.constructor.name : typeof error,
          error_stack: error instanceof Error ? error.stack : undefined,
          afip_disponible: !!this.afip
        }
      };
    }
  }

  /**
   * Crear certificado de producción usando la automatización de AFIP SDK
   * 
   * @param cuit - CUIT a usar en la página de ARCA
   * @param username - CUIT para loguearse en la página de ARCA (normalmente el mismo que cuit)
   * @param password - Contraseña para loguearse en la página de ARCA
   * @param alias - Nombre para el certificado (alfanumérico)
   * @returns Certificado y clave privada generados para producción
   */
  async crearCertificadoProduccion(cuit: string, username: string, password: string, alias: string) {
    try {
      console.log(`[CERTIFICADO-PROD] Iniciando creación de certificado de producción`);
      console.log(`[CERTIFICADO-PROD] CUIT: ${cuit}`);
      console.log(`[CERTIFICADO-PROD] Username: ${username}`);
      console.log(`[CERTIFICADO-PROD] Alias: ${alias}`);

      // Validar parámetros requeridos
      if (!cuit || !username || !password || !alias) {
        throw new Error('Todos los parámetros son requeridos: cuit, username, password, alias');
      }

      // Validar formato del CUIT
      const cuitLimpio = cuit.replace(/[-\s]/g, '');
      if (!/^\d{11}$/.test(cuitLimpio)) {
        throw new Error('El CUIT debe tener 11 dígitos numéricos');
      }

      // Validar formato del username (debe ser CUIT también)
      const usernameLimpio = username.replace(/[-\s]/g, '');
      if (!/^\d{11}$/.test(usernameLimpio)) {
        throw new Error('El username debe ser un CUIT válido de 11 dígitos');
      }

      // Validar alias (alfanumérico)
      if (!/^[a-zA-Z0-9]+$/.test(alias)) {
        throw new Error('El alias debe contener solo caracteres alfanuméricos');
      }

      // Preparar datos para la automatización
      const data = {
        cuit: cuitLimpio,
        username: usernameLimpio,
        password: password,
        alias: alias
      };

      console.log(`[CERTIFICADO-PROD] Ejecutando automatización create-cert-prod...`);

      // Ejecutar la automatización create-cert-prod
      const response = await this.afip.CreateAutomation("create-cert-prod", data, true);

      console.log(`[CERTIFICADO-PROD] Automatización completada exitosamente`);
      console.log(`[CERTIFICADO-PROD] Status: ${response.status}`);
      console.log(`[CERTIFICADO-PROD] ID: ${response.id}`);

      // Verificar que la respuesta contenga los certificados
      if (!response.data || !response.data.cert || !response.data.key) {
        throw new Error('La respuesta de AFIP no contiene los certificados esperados');
      }

      // Guardar certificados en archivos con prefijo de producción
      const aliasProd = `${alias}_prod`;
      const certificadosGuardados = await this.guardarCertificados(response.data.cert, response.data.key, aliasProd);

      return {
        success: true,
        message: 'Certificado de producción creado exitosamente',
        data: {
          id: response.id,
          status: response.status,
          certificado: response.data.cert,
          clave_privada: response.data.key,
          alias: aliasProd,
          cuit: cuitLimpio,
          tipo: 'produccion',
          archivos_guardados: certificadosGuardados
        }
      };

    } catch (error) {
      console.error('[CERTIFICADO-PROD] Error creando certificado:', error);
      
      let mensajeError = 'Error desconocido al crear certificado de producción';
      let codigoError = 'CERTIFICATE_PROD_ERROR';

      if (error instanceof Error) {
        const mensaje = error.message.toLowerCase();
        
        if (mensaje.includes('invalid credentials') || mensaje.includes('credenciales')) {
          mensajeError = 'Credenciales inválidas para ARCA';
          codigoError = 'INVALID_CREDENTIALS';
        } else if (mensaje.includes('cuit') && mensaje.includes('invalid')) {
          mensajeError = 'CUIT inválido';
          codigoError = 'INVALID_CUIT';
        } else if (mensaje.includes('alias') && mensaje.includes('invalid')) {
          mensajeError = 'Alias inválido';
          codigoError = 'INVALID_ALIAS';
        } else if (mensaje.includes('timeout') || mensaje.includes('time out')) {
          mensajeError = 'Timeout al crear certificado de producción. Intente nuevamente';
          codigoError = 'TIMEOUT_ERROR';
        } else if (mensaje.includes('network') || mensaje.includes('connection')) {
          mensajeError = 'Error de conexión con AFIP';
          codigoError = 'NETWORK_ERROR';
        } else if (mensaje.includes('production') || mensaje.includes('prod')) {
          mensajeError = 'Error específico de certificado de producción';
          codigoError = 'PRODUCTION_CERT_ERROR';
        } else {
          mensajeError = error.message;
          codigoError = 'CERTIFICATE_PRODUCTION_ERROR';
        }
      }

      return {
        success: false,
        error: mensajeError,
        code: codigoError,
        debug: {
          errorMessage: error instanceof Error ? error.message : 'Error desconocido',
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          parametros_recibidos: { cuit, username, alias },
          tipo_certificado: 'produccion'
        }
      };
    }
  }

  /**
   * Crear certificado de desarrollo usando llamada HTTP directa a AFIP SDK
   * 
   * @param cuit - CUIT a usar en la página de ARCA
   * @param username - CUIT para loguearse en la página de ARCA (normalmente el mismo que cuit)
   * @param password - Contraseña para loguearse en la página de ARCA
   * @param alias - Nombre para el certificado (alfanumérico)
   * @returns Certificado y clave privada generados
   */
  async crearCertificadoDesarrolloHttp(cuit: string, username: string, password: string, alias: string) {
    try {
      console.log(`[CERTIFICADO-HTTP] Iniciando creación de certificado de desarrollo`);
      console.log(`[CERTIFICADO-HTTP] CUIT: ${cuit}`);
      console.log(`[CERTIFICADO-HTTP] Username: ${username}`);
      console.log(`[CERTIFICADO-HTTP] Alias: ${alias}`);

      // Validar parámetros requeridos
      if (!cuit || !username || !password || !alias) {
        throw new Error('Todos los parámetros son requeridos: cuit, username, password, alias');
      }

      // Validar formato del CUIT
      const cuitLimpio = cuit.replace(/[-\s]/g, '');
      if (!/^\d{11}$/.test(cuitLimpio)) {
        throw new Error('El CUIT debe tener 11 dígitos numéricos');
      }

      // Validar formato del username (debe ser CUIT también)
      const usernameLimpio = username.replace(/[-\s]/g, '');
      if (!/^\d{11}$/.test(usernameLimpio)) {
        throw new Error('El username debe ser un CUIT válido de 11 dígitos');
      }

      // Validar alias (alfanumérico)
      if (!/^[a-zA-Z0-9]+$/.test(alias)) {
        throw new Error('El alias debe contener solo caracteres alfanuméricos');
      }

      // Preparar datos para la automatización
      const data = {
        cuit: cuitLimpio,
        username: usernameLimpio,
        password: password,
        alias: alias
      };

      console.log(`[CERTIFICADO-HTTP] Ejecutando automatización create-cert-dev via HTTP...`);

      // Llamada HTTP directa a la API de AFIP SDK
      const response = await this.llamarApiAfipSdk('create-cert-dev', data);

      console.log(`[CERTIFICADO-HTTP] Automatización completada exitosamente`);
      console.log(`[CERTIFICADO-HTTP] Status: ${response.status}`);
      console.log(`[CERTIFICADO-HTTP] ID: ${response.id}`);

      // Verificar que la respuesta contenga los certificados
      if (!response.data || !response.data.cert || !response.data.key) {
        throw new Error('La respuesta de AFIP no contiene los certificados esperados');
      }

      // Guardar certificados en archivos
      const certificadosGuardados = await this.guardarCertificados(response.data.cert, response.data.key, alias);

      return {
        success: true,
        message: 'Certificado de desarrollo creado exitosamente',
        data: {
          id: response.id,
          status: response.status,
          certificado: response.data.cert,
          clave_privada: response.data.key,
          alias: alias,
          cuit: cuitLimpio,
          archivos_guardados: certificadosGuardados
        }
      };

    } catch (error) {
      console.error('[CERTIFICADO-HTTP] Error creando certificado:', error);
      
      let mensajeError = 'Error desconocido al crear certificado';
      let codigoError = 'CERTIFICATE_ERROR';

      if (error instanceof Error) {
        const mensaje = error.message.toLowerCase();
        
        if (mensaje.includes('invalid credentials') || mensaje.includes('credenciales')) {
          mensajeError = 'Credenciales inválidas para ARCA';
          codigoError = 'INVALID_CREDENTIALS';
        } else if (mensaje.includes('cuit') && mensaje.includes('invalid')) {
          mensajeError = 'CUIT inválido';
          codigoError = 'INVALID_CUIT';
        } else if (mensaje.includes('alias') && mensaje.includes('invalid')) {
          mensajeError = 'Alias inválido';
          codigoError = 'INVALID_ALIAS';
        } else if (mensaje.includes('timeout') || mensaje.includes('time out')) {
          mensajeError = 'Timeout al crear certificado. Intente nuevamente';
          codigoError = 'TIMEOUT_ERROR';
        } else if (mensaje.includes('network') || mensaje.includes('connection')) {
          mensajeError = 'Error de conexión con AFIP';
          codigoError = 'NETWORK_ERROR';
        } else {
          mensajeError = error.message;
          codigoError = 'CERTIFICATE_CREATION_ERROR';
        }
      }

      return {
        success: false,
        error: mensajeError,
        code: codigoError,
        debug: {
          errorMessage: error instanceof Error ? error.message : 'Error desconocido',
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          parametros_recibidos: { cuit, username, alias }
        }
      };
    }
  }

  /**
   * Llamada HTTP directa a la API de AFIP SDK
   */
  private async llamarApiAfipSdk(automation: string, data: any) {
    const axios = require('axios');
    
    const accessToken = process.env.AFIP_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error('Access token de AFIP SDK no configurado');
    }

    const url = 'https://api.afipsdk.com/automation';
    
    const payload = {
      automation: automation,
      data: data
    };

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    console.log(`[API-AFIP] Llamando a: ${url}`);
    console.log(`[API-AFIP] Automation: ${automation}`);
    console.log(`[API-AFIP] Headers:`, { ...headers, Authorization: 'Bearer ***' });

    const response = await axios.post(url, payload, {
      headers,
      timeout: 120000 // 2 minutos
    });

    return response.data;
  }

  /**
   * Crear certificado de desarrollo usando la automatización de AFIP SDK
   * 
   * @param cuit - CUIT a usar en la página de ARCA
   * @param username - CUIT para loguearse en la página de ARCA (normalmente el mismo que cuit)
   * @param password - Contraseña para loguearse en la página de ARCA
   * @param alias - Nombre para el certificado (alfanumérico)
   * @returns Certificado y clave privada generados
   */
  async crearCertificadoDesarrollo(cuit: string, username: string, password: string, alias: string) {
    try {
      console.log(`[CERTIFICADO] Iniciando creación de certificado de desarrollo`);
      console.log(`[CERTIFICADO] CUIT: ${cuit}`);
      console.log(`[CERTIFICADO] Username: ${username}`);
      console.log(`[CERTIFICADO] Alias: ${alias}`);

      // Validar parámetros requeridos
      if (!cuit || !username || !password || !alias) {
        throw new Error('Todos los parámetros son requeridos: cuit, username, password, alias');
      }

      // Validar formato del CUIT
      const cuitLimpio = cuit.replace(/[-\s]/g, '');
      if (!/^\d{11}$/.test(cuitLimpio)) {
        throw new Error('El CUIT debe tener 11 dígitos numéricos');
      }

      // Validar formato del username (debe ser CUIT también)
      const usernameLimpio = username.replace(/[-\s]/g, '');
      if (!/^\d{11}$/.test(usernameLimpio)) {
        throw new Error('El username debe ser un CUIT válido de 11 dígitos');
      }

      // Validar alias (alfanumérico)
      if (!/^[a-zA-Z0-9]+$/.test(alias)) {
        throw new Error('El alias debe contener solo caracteres alfanuméricos');
      }

      // Preparar datos para la automatización
      const data = {
        cuit: cuitLimpio,
        username: usernameLimpio,
        password: password,
        alias: alias
      };

      console.log(`[CERTIFICADO] Ejecutando automatización create-cert-dev...`);

      // Intentar usar CreateAutomation si está disponible, sino usar HTTP
      let response;
      if (typeof this.afip.CreateAutomation === 'function') {
        console.log(`[CERTIFICADO] Usando CreateAutomation del SDK`);
        response = await this.afip.CreateAutomation("create-cert-dev", data, true);
      } else {
        console.log(`[CERTIFICADO] CreateAutomation no disponible, usando llamada HTTP directa`);
        response = await this.llamarApiAfipSdk('create-cert-dev', data);
      }

      console.log(`[CERTIFICADO] Automatización completada exitosamente`);
      console.log(`[CERTIFICADO] Status: ${response.status}`);
      console.log(`[CERTIFICADO] ID: ${response.id}`);

      // Verificar que la respuesta contenga los certificados
      if (!response.data || !response.data.cert || !response.data.key) {
        throw new Error('La respuesta de AFIP no contiene los certificados esperados');
      }

      // Guardar certificados en archivos (opcional)
      const certificadosGuardados = await this.guardarCertificados(response.data.cert, response.data.key, alias);

      return {
        success: true,
        message: 'Certificado de desarrollo creado exitosamente',
        data: {
          id: response.id,
          status: response.status,
          certificado: response.data.cert,
          clave_privada: response.data.key,
          alias: alias,
          cuit: cuitLimpio,
          archivos_guardados: certificadosGuardados
        }
      };

    } catch (error) {
      console.error('[CERTIFICADO] Error creando certificado:', error);
      
      let mensajeError = 'Error desconocido al crear certificado';
      let codigoError = 'CERTIFICATE_ERROR';

      if (error instanceof Error) {
        const mensaje = error.message.toLowerCase();
        
        if (mensaje.includes('invalid credentials') || mensaje.includes('credenciales')) {
          mensajeError = 'Credenciales inválidas para ARCA';
          codigoError = 'INVALID_CREDENTIALS';
        } else if (mensaje.includes('cuit') && mensaje.includes('invalid')) {
          mensajeError = 'CUIT inválido';
          codigoError = 'INVALID_CUIT';
        } else if (mensaje.includes('alias') && mensaje.includes('invalid')) {
          mensajeError = 'Alias inválido';
          codigoError = 'INVALID_ALIAS';
        } else if (mensaje.includes('timeout') || mensaje.includes('time out')) {
          mensajeError = 'Timeout al crear certificado. Intente nuevamente';
          codigoError = 'TIMEOUT_ERROR';
        } else if (mensaje.includes('network') || mensaje.includes('connection')) {
          mensajeError = 'Error de conexión con AFIP';
          codigoError = 'NETWORK_ERROR';
        } else {
          mensajeError = error.message;
          codigoError = 'CERTIFICATE_CREATION_ERROR';
        }
      }

      return {
        success: false,
        error: mensajeError,
        code: codigoError,
        debug: {
          errorMessage: error instanceof Error ? error.message : 'Error desconocido',
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          parametros_recibidos: { cuit, username, alias }
        }
      };
    }
  }

  /**
   * Guardar certificados en archivos del sistema
   * 
   * @param certificado - Certificado en formato PEM
   * @param clavePrivada - Clave privada en formato PEM
   * @param alias - Nombre del archivo
   * @returns Información de archivos guardados
   */
  private async guardarCertificados(certificado: string, clavePrivada: string, alias: string) {
    try {
      const certsDir = path.join(__dirname, '../../certs');
      
      // Crear directorio de certificados si no existe
      if (!fs.existsSync(certsDir)) {
        fs.mkdirSync(certsDir, { recursive: true });
        console.log(`[CERTIFICADO] Directorio creado: ${certsDir}`);
      }

      // Rutas de archivos
      const certPath = path.join(certsDir, `${alias}.crt`);
      const keyPath = path.join(certsDir, `${alias}.key`);

      // Guardar certificado
      fs.writeFileSync(certPath, certificado, { encoding: 'utf8' });
      console.log(`[CERTIFICADO] Certificado guardado: ${certPath}`);

      // Guardar clave privada
      fs.writeFileSync(keyPath, clavePrivada, { encoding: 'utf8' });
      console.log(`[CERTIFICADO] Clave privada guardada: ${keyPath}`);

      return {
        certificado_guardado: true,
        clave_guardada: true,
        ruta_certificado: certPath,
        ruta_clave: keyPath,
        directorio: certsDir
      };

    } catch (error) {
      console.error('[CERTIFICADO] Error guardando archivos:', error);
      return {
        certificado_guardado: false,
        clave_guardada: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Listar certificados disponibles en el directorio
   */
  async listarCertificados() {
    try {
      const certsDir = path.join(__dirname, '../../certs');
      
      if (!fs.existsSync(certsDir)) {
        return {
          success: true,
          message: 'No hay certificados guardados',
          certificados: []
        };
      }

      const archivos = fs.readdirSync(certsDir);
      const certificados = archivos
        .filter(archivo => archivo.endsWith('.crt'))
        .map(archivo => {
          const nombre = archivo.replace('.crt', '');
          const certPath = path.join(certsDir, archivo);
          const keyPath = path.join(certsDir, `${nombre}.key`);
          
          // Determinar tipo de certificado basado en el nombre
          let tipo = 'desarrollo';
          let aliasOriginal = nombre;
          
          if (nombre.endsWith('_prod')) {
            tipo = 'produccion';
            aliasOriginal = nombre.replace('_prod', '');
          }
          
          return {
            alias: nombre,
            alias_original: aliasOriginal,
            tipo: tipo,
            certificado_existe: fs.existsSync(certPath),
            clave_existe: fs.existsSync(keyPath),
            ruta_certificado: certPath,
            ruta_clave: keyPath,
            fecha_modificacion: fs.existsSync(certPath) ? fs.statSync(certPath).mtime : null
          };
        });

      // Separar certificados por tipo
      const certificadosDesarrollo = certificados.filter(cert => cert.tipo === 'desarrollo');
      const certificadosProduccion = certificados.filter(cert => cert.tipo === 'produccion');

      return {
        success: true,
        message: `Se encontraron ${certificados.length} certificado(s)`,
        certificados,
        resumen: {
          total: certificados.length,
          desarrollo: certificadosDesarrollo.length,
          produccion: certificadosProduccion.length
        },
        certificados_desarrollo: certificadosDesarrollo,
        certificados_produccion: certificadosProduccion
      };

    } catch (error) {
      console.error('[CERTIFICADO] Error listando certificados:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Intentar consulta real con diferentes configuraciones
   */
  async consultarContribuyenteReal(cuit: number) {
    try {
      console.log(`[REAL] Intentando consulta real con CUIT: ${cuit}`);
      
      // Intentar con diferentes configuraciones
      const configuraciones = [
        { nombre: 'Configuración actual', afip: this.afip },
        { nombre: 'Sin access_token', afip: new Afip({ CUIT: 20409378472, access_token: '' }) },
        { nombre: 'Con production: false', afip: new Afip({ CUIT: 20409378472, production: false, access_token: process.env.AFIP_ACCESS_TOKEN || '' }) }
      ];
      
      for (const config of configuraciones) {
        try {
          console.log(`[REAL] Probando ${config.nombre}...`);
          
          if (config.afip.RegisterScopeThirteen && config.afip.RegisterScopeThirteen.getTaxpayerDetails) {
            const resultado = await config.afip.RegisterScopeThirteen.getTaxpayerDetails(cuit);
            
            console.log(`[REAL] ¡Éxito con ${config.nombre}!`, resultado);
            
            return {
              success: true,
              message: `Consulta exitosa con ${config.nombre}`,
              data: this.formatearDatosContribuyente(resultado, cuit),
              configuracion_usada: config.nombre
            };
          }
        } catch (error) {
          console.log(`[REAL] Error con ${config.nombre}:`, error instanceof Error ? error.message : 'Error desconocido');
        }
      }
      
      // Si llegamos aquí, todos los métodos fallaron
      return {
        success: false,
        message: 'Todos los métodos de consulta real fallaron',
        error: 'No se pudo obtener datos reales del contribuyente',
        sugerencias: [
          'Verificar que el access_token tenga permisos para servicios de padrón',
          'Contactar con AFIP SDK para verificar estado de servicios',
          'Considerar usar certificados propios en lugar de access_token'
        ]
      };
      
    } catch (error) {
      console.error('[REAL] Error general:', error);
      return {
        success: false,
        message: 'Error en consulta real',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
}

export default new FacturacionService();
