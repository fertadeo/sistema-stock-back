export const PERMISSIONS = {
  // Gestión de usuarios
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  
  // Ventas
  VENTA_CREATE: 'venta:create',
  VENTA_READ: 'venta:read',
  VENTA_UPDATE: 'venta:update',
  VENTA_DELETE: 'venta:delete',
  
  // Productos
  PRODUCT_CREATE: 'product:create',
  PRODUCT_READ: 'product:read',
  PRODUCT_UPDATE: 'product:update',
  PRODUCT_DELETE: 'product:delete',
  
  // Reportes
  REPORT_READ: 'report:read',
  
  // Configuración
  CONFIG_UPDATE: 'config:update'
};

export const ROLE_PERMISSIONS = {
  admin: Object.values(PERMISSIONS),
  sistema: [
    PERMISSIONS.VENTA_CREATE,
    PERMISSIONS.VENTA_READ,
    PERMISSIONS.VENTA_UPDATE,
    PERMISSIONS.PRODUCT_READ,
    PERMISSIONS.REPORT_READ
  ],
  repartidor: [
    PERMISSIONS.VENTA_READ,
    PERMISSIONS.PRODUCT_READ
  ]
};
