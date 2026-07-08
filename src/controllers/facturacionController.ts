import { Request, Response } from 'express';
import facturacionService from '../services/facturacionService';

class FacturacionController {
  /**
   * Crear una nueva factura electrónica
   */
  async crearFactura(req: Request, res: Response) {
    try {
      const {
        tipoComprobante,
        concepto,
        tipoDoc,
        nroDoc,
        fechaServicioDesde,
        fechaServicioHasta,
        fechaVtoPago,
        importeTotal,
        importeNeto,
        importeIva,
        items
      } = req.body;

      // Validaciones básicas
      if (!tipoComprobante || !concepto || !tipoDoc || !nroDoc || !items || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Faltan campos requeridos para crear la factura'
        });
      }

      const facturaData = {
        tipoComprobante,
        concepto,
        tipoDoc,
        nroDoc,
        fechaServicioDesde,
        fechaServicioHasta,
        fechaVtoPago,
        importeTotal,
        importeNeto,
        importeIva,
        items
      };

      const resultado = await facturacionService.crearFactura(facturaData);

      if (resultado.success) {
        return res.status(201).json({
          success: true,
          message: 'Factura creada exitosamente',
          data: resultado.data,
          cae: resultado.cae,
          fechaVencimiento: resultado.fechaVencimiento,
          numeroComprobante: resultado.numeroComprobante
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Error al crear la factura',
          error: resultado.error
        });
      }
    } catch (error) {
      console.error('Error en crearFactura:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  /**
   * Obtener el último número de comprobante
   */
  async obtenerUltimoComprobante(req: Request, res: Response) {
    try {
      const { tipoComprobante } = req.params;

      if (!tipoComprobante) {
        return res.status(400).json({
          success: false,
          message: 'El tipo de comprobante es requerido'
        });
      }

      const resultado = await facturacionService.obtenerUltimoComprobante(parseInt(tipoComprobante));

      if (resultado.success) {
        return res.status(200).json({
          success: true,
          data: resultado.data
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Error al obtener el último comprobante',
          error: resultado.error
        });
      }
    } catch (error) {
      console.error('Error en obtenerUltimoComprobante:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  /**
   * Consultar datos de un contribuyente por CUIT
   * Endpoint: GET /api/facturacion/contribuyente/:cuit
   * 
   * Este endpoint permite obtener automáticamente los datos del contribuyente
   * desde AFIP solo ingresando el CUIT en el frontend.
   * 
   * @param cuit - CUIT del contribuyente (con o sin guiones)
   * @returns Datos completos del contribuyente desde AFIP
   */
  async consultarContribuyente(req: Request, res: Response) {
    try {
      const { cuit } = req.params;

      // Validar que el CUIT esté presente
      if (!cuit) {
        return res.status(400).json({
          success: false,
          message: 'El CUIT es requerido',
          code: 'CUIT_REQUIRED'
        });
      }

      // Limpiar y validar formato del CUIT
      const cuitLimpio = cuit.replace(/[-\s]/g, ''); // Remover guiones y espacios
      
      // Validar que sea numérico y tenga 11 dígitos
      if (!/^\d{11}$/.test(cuitLimpio)) {
        return res.status(400).json({
          success: false,
          message: 'El CUIT debe tener 11 dígitos numéricos',
          code: 'CUIT_INVALID_FORMAT',
          received: cuit
        });
      }

      // Validar dígito verificador del CUIT usando el servicio
      const validacionCuit = facturacionService.validarCuit(cuitLimpio);
      if (!validacionCuit.esValido) {
        return res.status(400).json({
          success: false,
          message: validacionCuit.mensaje,
          code: validacionCuit.codigo,
          received: cuit
        });
      }

      const resultado = await facturacionService.consultarContribuyente(parseInt(cuitLimpio));

      if (resultado.success) {
        return res.status(200).json({
          success: true,
          message: 'Contribuyente encontrado exitosamente',
          data: {
            cuit: cuitLimpio,
            cuit_formateado: facturacionService.formatearCuit(cuitLimpio),
            ...resultado.data
          }
        });
      } else {
        // Manejar diferentes tipos de errores de AFIP
        if (resultado.error?.includes('No existe') || resultado.error?.includes('not found')) {
          return res.status(404).json({
            success: false,
            message: 'No se encontró el contribuyente con el CUIT proporcionado',
            code: 'CONTRIBUYENTE_NOT_FOUND',
            cuit: cuitLimpio
          });
        }

        return res.status(400).json({
          success: false,
          message: 'Error al consultar el contribuyente en AFIP',
          code: 'AFIP_ERROR',
          error: resultado.error,
          cuit: cuitLimpio
        });
      }
    } catch (error) {
      console.error('Error en consultarContribuyente:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        code: 'INTERNAL_ERROR',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  /**
   * Validar solo el formato y dígito verificador de un CUIT
   * Endpoint: GET /api/facturacion/validar-cuit/:cuit
   */
  async validarCuit(req: Request, res: Response) {
    try {
      const { cuit } = req.params;

      if (!cuit) {
        return res.status(400).json({
          success: false,
          message: 'El CUIT es requerido',
          code: 'CUIT_REQUIRED'
        });
      }

      // Limpiar CUIT
      const cuitLimpio = cuit.replace(/[-\s]/g, '');
      
      // Validar usando el servicio
      const validacion = facturacionService.validarCuit(cuitLimpio);

      return res.status(validacion.esValido ? 200 : 400).json({
        success: validacion.esValido,
        message: validacion.mensaje,
        code: validacion.codigo,
        cuit: cuitLimpio,
        cuit_formateado: validacion.esValido ? facturacionService.formatearCuit(cuitLimpio) : null
      });
    } catch (error) {
      console.error('Error en validarCuit:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        code: 'INTERNAL_ERROR',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  /**
   * Probar conexión con AFIP
   * Endpoint: GET /api/facturacion/test-afip
   */
  async testAfip(req: Request, res: Response) {
    try {
      // Probar obteniendo tipos de comprobante (endpoint más simple)
      const resultado = await facturacionService.obtenerTiposComprobante();
      
      if (resultado.success) {
        return res.status(200).json({
          success: true,
          message: 'Conexión con AFIP exitosa',
          data: {
            tipos_comprobante_count: resultado.data?.length || 0,
            primer_tipo: resultado.data?.[0] || null
          }
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Error al conectar con AFIP',
          error: resultado.error
        });
      }
    } catch (error) {
      console.error('Error en testAfip:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        code: 'INTERNAL_ERROR',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  /**
   * Probar método específico de consulta de contribuyente
   * Endpoint: GET /api/facturacion/test-contribuyente/:cuit
   */
  async testContribuyente(req: Request, res: Response) {
    try {
      const { cuit } = req.params;
      
      if (!cuit) {
        return res.status(400).json({
          success: false,
          message: 'El CUIT es requerido'
        });
      }

      const cuitLimpio = cuit.replace(/[-\s]/g, '');
      
      // Validar CUIT primero
      const validacion = facturacionService.validarCuit(cuitLimpio);
      if (!validacion.esValido) {
        return res.status(400).json({
          success: false,
          message: validacion.mensaje,
          code: validacion.codigo
        });
      }

      console.log(`=== INICIO TEST CONTRIBUYENTE ===`);
      console.log(`CUIT a consultar: ${cuitLimpio}`);
      
      // Probar el método específico con más información de debug
      const resultado = await facturacionService.testConsultarContribuyente(parseInt(cuitLimpio));
      
      console.log(`=== FIN TEST CONTRIBUYENTE ===`);
      
      return res.status(resultado.success ? 200 : 400).json(resultado);
      
    } catch (error) {
      console.error('Error en testContribuyente:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }

  /**
   * Probar otros métodos de AFIP para diagnóstico
   * Endpoint: GET /api/facturacion/test-otros-metodos
   */
  async testOtrosMetodos(req: Request, res: Response) {
    try {
      console.log('=== TEST OTROS MÉTODOS AFIP ===');
      
      const resultados = {
        tipos_comprobante: null as string | null,
        tipos_documento: null as string | null,
        alicuotas_iva: null as string | null,
        ultimo_comprobante: null as string | null
      };
      
      // Probar tipos de comprobante
      try {
        const tiposComp = await facturacionService.obtenerTiposComprobante();
        resultados.tipos_comprobante = tiposComp.success ? 'OK' : (tiposComp.error || 'Error desconocido');
      } catch (error) {
        resultados.tipos_comprobante = `Error: ${error instanceof Error ? error.message : 'Desconocido'}`;
      }
      
      // Probar tipos de documento
      try {
        const tiposDoc = await facturacionService.obtenerTiposDocumento();
        resultados.tipos_documento = tiposDoc.success ? 'OK' : (tiposDoc.error || 'Error desconocido');
      } catch (error) {
        resultados.tipos_documento = `Error: ${error instanceof Error ? error.message : 'Desconocido'}`;
      }
      
      // Probar alícuotas IVA
      try {
        const alicuotas = await facturacionService.obtenerAlicuotasIva();
        resultados.alicuotas_iva = alicuotas.success ? 'OK' : (alicuotas.error || 'Error desconocido');
      } catch (error) {
        resultados.alicuotas_iva = `Error: ${error instanceof Error ? error.message : 'Desconocido'}`;
      }
      
      // Probar último comprobante
      try {
        const ultimoComp = await facturacionService.obtenerUltimoComprobante(1);
        resultados.ultimo_comprobante = ultimoComp.success ? 'OK' : (ultimoComp.error || 'Error desconocido');
      } catch (error) {
        resultados.ultimo_comprobante = `Error: ${error instanceof Error ? error.message : 'Desconocido'}`;
      }
      
      console.log('=== RESULTADOS ===', resultados);
      
      return res.json({
        success: true,
        message: 'Test de otros métodos completado',
        resultados
      });
      
    } catch (error) {
      console.error('Error en testOtrosMetodos:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  /**
   * Probar con CUIT de testing oficial
   * Endpoint: GET /api/facturacion/test-cuit-oficial
   */
  async testCuitOficial(req: Request, res: Response) {
    try {
      console.log('=== TEST CUIT OFICIAL DE TESTING ===');
      
      // CUIT de testing oficial según documentación AFIP SDK
      const cuitOficial = 20409378472;
      
      const resultado = await facturacionService.testConsultarContribuyente(cuitOficial);
      
      return res.status(resultado.success ? 200 : 400).json({
        ...resultado,
        cuit_usado: cuitOficial,
        mensaje_adicional: 'Probando con CUIT oficial de testing de AFIP SDK'
      });
      
    } catch (error) {
      console.error('Error en testCuitOficial:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  /**
   * Verificar métodos disponibles en AFIP SDK
   * Endpoint: GET /api/facturacion/verificar-metodos-afip
   */
  async verificarMetodosAfip(req: Request, res: Response) {
    try {
      console.log('=== VERIFICAR MÉTODOS AFIP SDK ===');
      
      const diagnostico = {
        afip_disponible: !!facturacionService.afip,
        access_token_configurado: process.env.AFIP_ACCESS_TOKEN ? 'SÍ' : 'NO',
        metodos_disponibles: [] as string[],
        createAutomation_disponible: false,
        metodos_principales: [] as Array<{nombre: string, disponible: boolean}>
      };
      
      if (facturacionService.afip) {
        // Obtener todos los métodos disponibles
        diagnostico.metodos_disponibles = Object.getOwnPropertyNames(facturacionService.afip)
          .filter(key => typeof facturacionService.afip[key] === 'function');
        
        // Verificar CreateAutomation específicamente
        diagnostico.createAutomation_disponible = typeof facturacionService.afip.CreateAutomation === 'function';
        
        // Métodos principales que esperamos
        const metodosEsperados = [
          'CreateAutomation',
          'ElectronicBilling',
          'RegisterScopeThirteen',
          'RegisterScopeFour',
          'RegisterScopeFive',
          'RegisterScopeTen'
        ];
        
        diagnostico.metodos_principales = metodosEsperados.map(metodo => ({
          nombre: metodo,
          disponible: typeof facturacionService.afip[metodo] === 'function' || 
                     (typeof facturacionService.afip[metodo] === 'object' && facturacionService.afip[metodo] !== null)
        }));
      }
      
      console.log('=== RESULTADO VERIFICACIÓN ===', diagnostico);
      
      return res.json({
        success: true,
        message: 'Verificación de métodos completada',
        diagnostico
      });
      
    } catch (error) {
      console.error('Error en verificarMetodosAfip:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  /**
   * Diagnóstico completo de AFIP SDK
   * Endpoint: GET /api/facturacion/diagnostico-completo
   */
  async diagnosticoCompleto(req: Request, res: Response) {
    try {
      console.log('=== DIAGNÓSTICO COMPLETO AFIP SDK ===');
      
      const diagnostico = {
        configuracion: {
          cuit_configurado: facturacionService.afip?.CUIT || 'No disponible',
          access_token_configurado: process.env.AFIP_ACCESS_TOKEN ? 'SÍ' : 'NO',
          access_token_valor: process.env.AFIP_ACCESS_TOKEN ? 
            process.env.AFIP_ACCESS_TOKEN.substring(0, 10) + '...' : 'No configurado'
        },
        servicios_disponibles: [] as string[],
        test_basico: null as any,
        test_tipos_comprobante: null as any
      };
      
      // Verificar servicios disponibles
      if (facturacionService.afip) {
        diagnostico.servicios_disponibles = Object.keys(facturacionService.afip)
          .filter(key => key.startsWith('RegisterScope'));
      }
      
      // Test básico de AFIP
      try {
        const testBasico = await facturacionService.obtenerTiposComprobante();
        diagnostico.test_basico = {
          success: testBasico.success,
          error: testBasico.error || null,
          datos_recibidos: testBasico.success ? testBasico.data?.length || 0 : 0
        };
      } catch (error) {
        diagnostico.test_basico = {
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido'
        };
      }
      
      // Test de tipos de comprobante
      try {
        const tiposComp = await facturacionService.obtenerTiposComprobante();
        diagnostico.test_tipos_comprobante = {
          success: tiposComp.success,
          error: tiposComp.error || null,
          cantidad_tipos: tiposComp.success ? tiposComp.data?.length || 0 : 0
        };
      } catch (error) {
        diagnostico.test_tipos_comprobante = {
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido'
        };
      }
      
      console.log('=== RESULTADO DIAGNÓSTICO ===', diagnostico);
      
      return res.json({
        success: true,
        message: 'Diagnóstico completo realizado',
        diagnostico
      });
      
    } catch (error) {
      console.error('Error en diagnosticoCompleto:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  /**
   * Consultar contribuyente con fallback (simulación para testing)
   * Endpoint: GET /api/facturacion/contribuyente-fallback/:cuit
   */
  async consultarContribuyenteFallback(req: Request, res: Response) {
    try {
      const { cuit } = req.params;

      if (!cuit) {
        return res.status(400).json({
          success: false,
          message: 'El CUIT es requerido',
          code: 'CUIT_REQUIRED'
        });
      }

      const cuitLimpio = cuit.replace(/[-\s]/g, '');
      
      // Validar CUIT
      const validacion = facturacionService.validarCuit(cuitLimpio);
      if (!validacion.esValido) {
        return res.status(400).json({
          success: false,
          message: validacion.mensaje,
          code: validacion.codigo
        });
      }

      // Datos simulados para testing (ya que los servicios de padrón no funcionan)
      const datosSimulados = {
        cuit: cuitLimpio,
        cuit_formateado: facturacionService.formatearCuit(cuitLimpio),
        razon_social: `EMPRESA DE PRUEBA ${cuitLimpio.slice(-4)}`,
        nombre_fantasia: `Empresa Prueba ${cuitLimpio.slice(-4)}`,
        domicilio_fiscal: {
          calle: 'Av. Test',
          numero: '123',
          piso: '1',
          departamento: 'A',
          codigo_postal: '1000',
          localidad: 'Buenos Aires',
          provincia: 'Buenos Aires'
        },
        condicion_iva: 'Responsable Inscripto',
        condicion_impositiva: 'Activo',
        fecha_inicio_actividades: '2020-01-01',
        estado: 'Activo',
        actividad_principal: 'Comercio',
        actividades_secundarias: [],
        modo_simulacion: true,
        mensaje: 'Datos simulados para testing - servicios de padrón no disponibles'
      };

      return res.status(200).json({
        success: true,
        message: 'Contribuyente encontrado (modo simulación)',
        data: datosSimulados
      });

    } catch (error) {
      console.error('Error en consultarContribuyenteFallback:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        code: 'INTERNAL_ERROR',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  /**
   * Consultar contribuyente real con diferentes configuraciones
   * Endpoint: GET /api/facturacion/contribuyente-real/:cuit
   */
  async consultarContribuyenteReal(req: Request, res: Response) {
    try {
      const { cuit } = req.params;

      if (!cuit) {
        return res.status(400).json({
          success: false,
          message: 'El CUIT es requerido',
          code: 'CUIT_REQUIRED'
        });
      }

      const cuitLimpio = cuit.replace(/[-\s]/g, '');
      
      // Validar CUIT
      const validacion = facturacionService.validarCuit(cuitLimpio);
      if (!validacion.esValido) {
        return res.status(400).json({
          success: false,
          message: validacion.mensaje,
          code: validacion.codigo
        });
      }

      console.log(`=== CONSULTA REAL CONTRIBUYENTE ===`);
      console.log(`CUIT: ${cuitLimpio}`);

      const resultado = await facturacionService.consultarContribuyenteReal(parseInt(cuitLimpio));

      return res.status(resultado.success ? 200 : 400).json({
        ...resultado,
        cuit_consultado: cuitLimpio,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error en consultarContribuyenteReal:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        code: 'INTERNAL_ERROR',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  /**
   * Verificar si un comprobante existe
   */
  async verificarComprobante(req: Request, res: Response) {
    try {
      const { tipoComprobante, puntoVenta, numeroComprobante, cuit } = req.params;

      if (!tipoComprobante || !puntoVenta || !numeroComprobante || !cuit) {
        return res.status(400).json({
          success: false,
          message: 'Todos los parámetros son requeridos'
        });
      }

      const resultado = await facturacionService.verificarComprobante(
        parseInt(tipoComprobante),
        parseInt(puntoVenta),
        parseInt(numeroComprobante),
        parseInt(cuit)
      );

      if (resultado.success) {
        return res.status(200).json({
          success: true,
          data: resultado.data
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Error al verificar el comprobante',
          error: resultado.error
        });
      }
    } catch (error) {
      console.error('Error en verificarComprobante:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  /**
   * Obtener tipos de comprobantes disponibles
   */
  async obtenerTiposComprobante(req: Request, res: Response) {
    try {
      const resultado = await facturacionService.obtenerTiposComprobante();

      if (resultado.success) {
        return res.status(200).json({
          success: true,
          data: resultado.data
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Error al obtener tipos de comprobante',
          error: resultado.error
        });
      }
    } catch (error) {
      console.error('Error en obtenerTiposComprobante:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  /**
   * Obtener tipos de documento disponibles
   */
  async obtenerTiposDocumento(req: Request, res: Response) {
    try {
      const resultado = await facturacionService.obtenerTiposDocumento();

      if (resultado.success) {
        return res.status(200).json({
          success: true,
          data: resultado.data
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Error al obtener tipos de documento',
          error: resultado.error
        });
      }
    } catch (error) {
      console.error('Error en obtenerTiposDocumento:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  /**
   * Obtener alícuotas de IVA disponibles
   */
  async obtenerAlicuotasIva(req: Request, res: Response) {
    try {
      const resultado = await facturacionService.obtenerAlicuotasIva();

      if (resultado.success) {
        return res.status(200).json({
          success: true,
          data: resultado.data
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Error al obtener alícuotas de IVA',
          error: resultado.error
        });
      }
    } catch (error) {
      console.error('Error en obtenerAlicuotasIva:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  /**
   * Crear certificado de desarrollo usando implementación HTTP
   * Endpoint: POST /api/facturacion/crear-certificado-desarrollo-http
   */
  async crearCertificadoDesarrolloHttp(req: Request, res: Response) {
    try {
      const { cuit, username, password, alias } = req.body;

      // Validaciones básicas
      if (!cuit || !username || !password || !alias) {
        return res.status(400).json({
          success: false,
          message: 'Todos los campos son requeridos: cuit, username, password, alias',
          code: 'MISSING_PARAMETERS'
        });
      }

      console.log(`=== CREAR CERTIFICADO DESARROLLO HTTP ===`);
      console.log(`CUIT: ${cuit}`);
      console.log(`Username: ${username}`);
      console.log(`Alias: ${alias}`);

      const resultado = await facturacionService.crearCertificadoDesarrolloHttp(cuit, username, password, alias);

      if (resultado.success) {
        return res.status(201).json({
          success: true,
          message: 'Certificado de desarrollo creado exitosamente (HTTP)',
          data: resultado.data
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Error al crear el certificado de desarrollo',
          error: resultado.error,
          code: resultado.code,
          debug: resultado.debug
        });
      }
    } catch (error) {
      console.error('Error en crearCertificadoDesarrolloHttp:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        code: 'INTERNAL_ERROR',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  /**
   * Crear certificado de desarrollo
   * Endpoint: POST /api/facturacion/crear-certificado-desarrollo
   */
  async crearCertificadoDesarrollo(req: Request, res: Response) {
    try {
      const { cuit, username, password, alias } = req.body;

      // Validaciones básicas
      if (!cuit || !username || !password || !alias) {
        return res.status(400).json({
          success: false,
          message: 'Todos los campos son requeridos: cuit, username, password, alias',
          code: 'MISSING_PARAMETERS'
        });
      }

      console.log(`=== CREAR CERTIFICADO DESARROLLO ===`);
      console.log(`CUIT: ${cuit}`);
      console.log(`Username: ${username}`);
      console.log(`Alias: ${alias}`);

      const resultado = await facturacionService.crearCertificadoDesarrollo(cuit, username, password, alias);

      if (resultado.success) {
        return res.status(201).json({
          success: true,
          message: 'Certificado de desarrollo creado exitosamente',
          data: resultado.data
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Error al crear el certificado de desarrollo',
          error: resultado.error,
          code: resultado.code,
          debug: resultado.debug
        });
      }
    } catch (error) {
      console.error('Error en crearCertificadoDesarrollo:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        code: 'INTERNAL_ERROR',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  /**
   * Crear certificado de producción
   * Endpoint: POST /api/facturacion/crear-certificado-produccion
   */
  async crearCertificadoProduccion(req: Request, res: Response) {
    try {
      const { cuit, username, password, alias } = req.body;

      // Validaciones básicas
      if (!cuit || !username || !password || !alias) {
        return res.status(400).json({
          success: false,
          message: 'Todos los campos son requeridos: cuit, username, password, alias',
          code: 'MISSING_PARAMETERS'
        });
      }

      console.log(`=== CREAR CERTIFICADO PRODUCCIÓN ===`);
      console.log(`CUIT: ${cuit}`);
      console.log(`Username: ${username}`);
      console.log(`Alias: ${alias}`);

      const resultado = await facturacionService.crearCertificadoProduccion(cuit, username, password, alias);

      if (resultado.success) {
        return res.status(201).json({
          success: true,
          message: 'Certificado de producción creado exitosamente',
          data: resultado.data
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Error al crear el certificado de producción',
          error: resultado.error,
          code: resultado.code,
          debug: resultado.debug
        });
      }
    } catch (error) {
      console.error('Error en crearCertificadoProduccion:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        code: 'INTERNAL_ERROR',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  /**
   * Listar certificados disponibles
   * Endpoint: GET /api/facturacion/certificados
   */
  async listarCertificados(req: Request, res: Response) {
    try {
      console.log(`=== LISTAR CERTIFICADOS ===`);

      const resultado = await facturacionService.listarCertificados();

      if (resultado.success) {
        return res.status(200).json({
          success: true,
          message: resultado.message,
          certificados: resultado.certificados,
          resumen: resultado.resumen,
          certificados_desarrollo: resultado.certificados_desarrollo,
          certificados_produccion: resultado.certificados_produccion
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Error al listar certificados',
          error: resultado.error
        });
      }
    } catch (error) {
      console.error('Error en listarCertificados:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        code: 'INTERNAL_ERROR',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  /**
   * Crear factura desde una venta existente
   */
  async crearFacturaDesdeVenta(req: Request, res: Response) {
    try {
      const { ventaId } = req.params;

      if (!ventaId) {
        return res.status(400).json({
          success: false,
          message: 'El ID de la venta es requerido'
        });
      }

      // Aquí podrías integrar con tu servicio de ventas existente
      // para obtener los datos de la venta y convertirlos al formato de AFIP
      
      // Ejemplo de integración:
      // const venta = await ventaService.obtenerVentaPorId(ventaId);
      // const facturaData = this.convertirVentaAFactura(venta);
      // const resultado = await facturacionService.crearFactura(facturaData);

      return res.status(200).json({
        success: true,
        message: 'Función de integración con ventas pendiente de implementar',
        ventaId
      });
    } catch (error) {
      console.error('Error en crearFacturaDesdeVenta:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }
}

export default new FacturacionController();
