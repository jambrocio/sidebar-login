/**
 * Modelos de dominio transversales del Sistema de Distribución y Venta de Bebidas
 * bajo la arquitectura jerárquica: Negocio (Empresa) -> Locales (Sucursales) -> Usuarios y Roles.
 */

/** Representa un Negocio / Empresa registrada en la plataforma */
export interface BusinessProfile {
  /** Identificador único del negocio (ej. 'BIZ-001') */
  id: string;
  /** Nombre comercial visible en el Sidebar y Navbar */
  commercialName: string;
  /** Razón social legal para facturación electrónica */
  legalName: string;
  /** Número de RUC / Identificación tributaria */
  taxId: string;
  /** Dirección fiscal principal */
  fiscalAddress: string;
  /** Teléfono central */
  phone: string;
  /** Correo corporativo de soporte y ventas */
  supportEmail: string;
  /** Zona horaria operativa */
  timezone: string;
  /** Moneda predeterminada */
  currency: string;
}

/** Representa un Local / Sucursal / Almacén perteneciente a un Negocio (`businessId`) */
export interface BusinessBranch {
  /** Código único del local (ej. 'LOC-01') */
  code: string;
  /** Identificador del Negocio Matriz propietario */
  businessId: string;
  /** Nombre comercial del local */
  name: string;
  /** Tipo de operación (Mayorista, Minorista, Mixto) */
  type: string;
  /** Dirección física del local */
  address: string;
  /** Teléfono de contacto del local */
  phone: string;
  /** Serie de facturación electrónica asignada al local */
  invoiceSeries: string;
  /** Usuario responsable o encargado de tienda */
  managerUser: string;
  /** Cantidad de cajas / terminales POS habilitadas */
  posTerminals: number;
  /** Estado operativo del local */
  status: 'Operativo' | 'Mantenimiento';
}

/** Tarjeta de indicador clave de rendimiento (KPI) */
export interface KpiCard {
  label: string;
  value: string;
  trend: string;
  positive: boolean;
  icon: string;
}

/** Registro de actividad en la bitácora de auditoría */
export interface AuditActivityItem {
  user: string;
  branch: string;
  action: string;
  time: string;
  badge: string;
}

/** Estado de vigencia y expiración de la contraseña del usuario */
export type PasswordExpirationStatus =
  | 'Vigente'
  | 'Por Expirar'
  | 'Expirada'
  | 'Clave Temporal';

/** Usuario del sistema con asignación explícita a un Negocio, Locales y control de Expiración de Clave */
export interface SystemUser {
  /** Identificador único (ej. 'USR-001') */
  id: string;
  /** Nombre completo del usuario o cliente */
  name: string;
  /** Nombre de usuario de acceso (ej. 'agarcia') */
  username: string;
  /** Correo electrónico corporativo */
  email: string;
  /** Contraseña actual de prueba para validar Login y Cambio de Clave */
  password?: string;
  /** Código o nombre del rol asignado */
  role: string;
  /** ID del Negocio al que pertenece */
  businessId: string;
  /** Nombre del Negocio asignado */
  businessName: string;
  /** Local principal asignado para registrar operaciones */
  assignedBranch: string;
  /** Lista de locales del negocio donde el usuario está autorizado */
  assignedBranches: string[];
  /** Clasificación del usuario/cliente */
  clientType: 'Personal Interno' | 'Mayorista VIP' | 'Minorista Frecuente';
  /** Estado de la cuenta */
  status: 'Activo' | 'Inactivo' | 'Pendiente';
  /** Último acceso registrado */
  lastAccess: string;
  /** Estado actual de expiración de la contraseña */
  passwordStatus: PasswordExpirationStatus;
  /** Fecha de vencimiento de la contraseña (YYYY-MM-DD) */
  passwordExpiresAt: string;
  /** Días restantes para que expire la clave (negativo si ya venció) */
  daysUntilExpiration: number;
  /** Indica si el usuario está obligado a cambiar su clave antes de ingresar al Dashboard */
  mustChangePassword: boolean;
  /** Fecha del último cambio de contraseña */
  passwordLastChangedAt?: string;
  /** Etiqueta descriptiva del escenario de prueba para validar en el Login */
  testCaseDescription?: string;
}

/** Rol del sistema con alcance organizacional (Negocio vs Local) */
export interface SystemRole {
  /** Código identificador único del rol (ej. 'ADMIN', 'SUPERVISOR') */
  code: string;
  /** Nombre descriptivo del rol */
  name: string;
  /** Descripción funcional de las responsabilidades del rol */
  description: string;
  /** Alcance de operación: Todo el Negocio (Multi-Local) o solo Local Asignado */
  scope: 'Nivel Negocio (Multi-Local)' | 'Nivel Local Asignado';
  /** Cantidad de usuarios asignados actualmente */
  usersCount: number;
  /** Estado de vigencia del rol */
  active: boolean;
}

/** Fila de la matriz RBAC de permisos por opción de menú */
export interface RoleMenuMatrixRow {
  code: string;
  label: string;
  level: number;
  routerLink: string;
  visibleInSidebar: boolean;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
}

/** Producto de bebida con precios diferenciados por Mayor y por Menor */
export interface BeverageProduct {
  sku: string;
  name: string;
  category: 'Licores' | 'Cervezas' | 'Gaseosas' | 'Otros';
  presentation: string;
  retailPrice: number;
  wholesalePrice: number;
  stockBoxes: number;
  stockUnits: number;
  status: 'En Stock' | 'Stock Bajo' | 'Agotado';
  registeredByUser: string;
}

/** Ítem individual agregado al carrito de una venta */
export interface SaleCartItem {
  sku: string;
  productName: string;
  modality: 'Por Mayor' | 'Por Menor';
  unitLabel: string;
  quantity: number;
  unitPrice: number;
  lineSubtotal: number;
}

/** Registro de venta por Mayor o Menor con detalle de ítems para el Comprobante Electrónico */
export interface BeverageSale {
  id: string;
  documentType: 'FACTURA ELECTRÓNICA' | 'BOLETA DE VENTA ELECTRÓNICA';
  branchName: string;
  clientName: string;
  modality: string;
  paymentMethod: 'Efectivo' | 'Transferencia / Yape' | 'Tarjeta';
  items: SaleCartItem[];
  itemsSummary: string;
  totalItemsCount: number;
  subtotal: number;
  couponCode?: string;
  discountAmount: number;
  taxIgv: number;
  total: number;
  sellerUser: string;
  date: string;
}

/** Registro de orden de compra con Local asignado y Usuario comprador */
export interface BeveragePurchase {
  id: string;
  branchName: string;
  supplier: string;
  category: string;
  productDetail: string;
  boxesQty: number;
  boxCost: number;
  totalCost: number;
  buyerUser: string;
  status: 'Recibido' | 'En Tránsito' | 'Pendiente';
  date: string;
}

/** Cupón de descuento con auditoría del usuario que lo generó */
export interface DiscountCoupon {
  code: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  targetModality: 'Mayorista' | 'Minorista' | 'Mayor y Menor';
  targetCategory: 'Todas' | 'Licores' | 'Cervezas' | 'Gaseosas' | 'Otros';
  assignedClient: string;
  minPurchase: number;
  usedCount: number;
  maxUses: number;
  expiresAt: string;
  createdByUser: string;
  active: boolean;
}

/** Registro de Arqueo y Cierre de Caja al final del turno laboral */
export interface CashRegisterAudit {
  id: string;
  branchName: string;
  shift: string;
  openingBalance: number;
  cashSales: number;
  digitalSales: number;
  expenses: number;
  expectedCash: number;
  countedCash: number;
  difference: number;
  cashierUser: string;
  status: 'Cuadre Exacto' | 'Sobrante' | 'Faltante';
  closedAt: string;
}

/** Categoría o línea comercial de bebidas */
export interface BeverageCategory {
  code: string;
  name: string;
  slug: string;
  totalProducts: number;
  wholesaleMargin: string;
  active: boolean;
}

/** Alias de compatibilidad hacia BeverageCategory */
export type DummyCategory = BeverageCategory;

/** Reporte descargable comercial o de auditoría */
export interface EnterpriseReport {
  id: string;
  title: string;
  module: string;
  date: string;
  format: 'PDF' | 'XLSX' | 'CSV';
  size: string;
}

/** Alias de compatibilidad hacia EnterpriseReport */
export type DummyReport = EnterpriseReport;
