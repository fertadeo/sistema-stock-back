// interfaces/OrderPayload.ts

export interface ProductoPayload {
    id: number; // ID del producto
    cantidadCarga: number; // Cantidad cargada
    cajonesLlenos?: number; // Cajones llenos (solo para productos de soda)
    unidadesLlenas?: number; // Unidades llenas (solo para productos de soda)
    cajonesVacios?: number; // Cajones vacíos (solo para productos de soda)
    unidadesVacias?: number; // Unidades vacías (solo para productos de soda)
    cantidadLlenos?: number; // Cantidad de envases llenos (para otros productos)
    cantidadVacios?: number; // Cantidad de envases vacíos (para otros productos)
  }
  
  export interface OrderPayload {
    fecha: string; // Fecha de la carga/descarga
    repartidor: string; // Nombre del repartidor
    tipo: 'CARGA' | 'DESCARGA'; // Tipo de operación
    productos: ProductoPayload[]; // Lista de productos
  }