-- =============================================================================
-- ARCHIVO: 01_schema_ddl.sql
-- DESCRIPCIÓN: Esquema relacional completo y documentado en ESPAÑOL (DDL + 
--              Diccionario nativo en catálogo PostgreSQL mediante COMMENT ON):
--              - Estructura 1..N Empresas Matriz (empresas) -> Sedes (sedes)
--              - Usuarios con Empresa asignada, Sede Principal y Sedes Autorizadas (usuario_sedes)
--              - Roles con alcance Organizacional (Nivel Negocio Multi-Sede vs Sede Asignada)
--              - Menú Multinivel Recursivo (opciones_menu) y Permisos RBAC (permisos_rol_menu, permisos_usuario_menu)
--              - Catálogo de Bebidas y Categorías (categorias_bebidas, productos_bebidas)
--              - Ventas por Mayor/Menor Multiproducto y Comprobantes Electrónicos (ventas, detalles_venta)
--              - Compras y Abastecimiento (compras), Cupones (cupones_descuento) y Arqueo de Caja (arqueos_caja)
--              - Centro de Notificaciones (notificaciones_sistema)
--              - Sesiones de Usuario y Auditoría (sesiones_usuario, auditoria_autenticacion)
-- MOTOR: PostgreSQL 14+ (Compatible con estándar ANSI SQL)
-- =============================================================================

-- =============================================================================
-- 0. EXTENSIÓN REQUERIDA
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Limpieza en orden inverso de dependencias
DROP TABLE IF EXISTS notificaciones_sistema CASCADE;
DROP TABLE IF EXISTS arqueos_caja CASCADE;
DROP TABLE IF EXISTS compras CASCADE;
DROP TABLE IF EXISTS detalles_venta CASCADE;
DROP TABLE IF EXISTS ventas CASCADE;
DROP TABLE IF EXISTS cupones_descuento CASCADE;
DROP TABLE IF EXISTS productos_bebidas CASCADE;
DROP TABLE IF EXISTS categorias_bebidas CASCADE;
DROP TABLE IF EXISTS permisos_usuario_menu CASCADE;
DROP TABLE IF EXISTS permisos_rol_menu CASCADE;
DROP TABLE IF EXISTS opciones_menu CASCADE;
DROP TABLE IF EXISTS usuario_roles CASCADE;
DROP TABLE IF EXISTS usuario_sedes CASCADE;
DROP TABLE IF EXISTS auditoria_autenticacion CASCADE;
DROP TABLE IF EXISTS sesiones_usuario CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS sedes CASCADE;
DROP TABLE IF EXISTS empresas CASCADE;

-- Limpieza de compatibilidad histórica
DROP TABLE IF EXISTS system_notifications CASCADE;
DROP TABLE IF EXISTS cash_register_audits CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS discount_coupons CASCADE;
DROP TABLE IF EXISTS beverage_products CASCADE;
DROP TABLE IF EXISTS beverage_categories CASCADE;
DROP TABLE IF EXISTS user_menu_permissions CASCADE;
DROP TABLE IF EXISTS role_menu_permissions CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS user_branches CASCADE;
DROP TABLE IF EXISTS auth_audit_logs CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS branches CASCADE;
DROP TABLE IF EXISTS businesses CASCADE;

-- =============================================================================
-- 1. TABLA: empresas (Empresas Matriz / Negocios)
-- =============================================================================
CREATE TABLE empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre_comercial VARCHAR(150) NOT NULL,
    razon_social VARCHAR(200) NOT NULL,
    identificacion_fiscal VARCHAR(20) NOT NULL UNIQUE,
    direccion_fiscal VARCHAR(250) NOT NULL,
    telefono VARCHAR(40),
    correo_soporte VARCHAR(150),
    zona_horaria VARCHAR(60) NOT NULL DEFAULT 'America/Lima (GMT-5)',
    moneda VARCHAR(20) NOT NULL DEFAULT 'USD ($)',
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE empresas IS 'Entidad raíz de Empresa Matriz (Razón Social / RUC). Una empresa matriz puede tener múltiples sedes o sucursales asociadas (relación 1:N).';
COMMENT ON COLUMN empresas.id IS 'Identificador único universal (UUID v4) de la empresa matriz.';
COMMENT ON COLUMN empresas.codigo IS 'Código corto de empresa visible en interfaz (ej. BIZ-001, BIZ-002).';
COMMENT ON COLUMN empresas.nombre_comercial IS 'Nombre comercial o marca de la empresa mostrado en el panel y comprobantes.';
COMMENT ON COLUMN empresas.razon_social IS 'Razón social oficial registrada ante la administración tributaria.';
COMMENT ON COLUMN empresas.identificacion_fiscal IS 'Número de Registro Único de Contribuyente (RUC / NIT) único por empresa.';
COMMENT ON COLUMN empresas.direccion_fiscal IS 'Domicilio fiscal legal de la empresa matriz.';
COMMENT ON COLUMN empresas.telefono IS 'Teléfono central de contacto corporativo.';
COMMENT ON COLUMN empresas.correo_soporte IS 'Correo electrónico corporativo de soporte y facturación.';
COMMENT ON COLUMN empresas.zona_horaria IS 'Zona horaria oficial para cortes de turno y arqueos de caja.';
COMMENT ON COLUMN empresas.moneda IS 'Moneda base de operación contable y comercial.';
COMMENT ON COLUMN empresas.activo IS 'Indica si la empresa matriz se encuentra habilitada para operar.';
COMMENT ON COLUMN empresas.fecha_creacion IS 'Fecha y hora de registro de la empresa en el sistema.';
COMMENT ON COLUMN empresas.fecha_actualizacion IS 'Fecha y hora de la última actualización de datos societarios.';

-- =============================================================================
-- 2. TABLA: sedes (Sedes / Locales / Almacenes pertenecientes a una Empresa)
-- =============================================================================
CREATE TABLE sedes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    tipo_sede VARCHAR(100) NOT NULL,
    direccion VARCHAR(250) NOT NULL,
    telefono VARCHAR(40),
    serie_facturacion VARCHAR(40) NOT NULL,
    nombre_encargado VARCHAR(120),
    terminales_pos INT NOT NULL DEFAULT 1,
    estado VARCHAR(30) NOT NULL DEFAULT 'Operativo'
        CHECK (estado IN ('Operativo', 'Mantenimiento', 'Inactivo')),
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (empresa_id, nombre)
);

CREATE INDEX idx_sedes_empresa ON sedes(empresa_id);

COMMENT ON TABLE sedes IS 'Sedes, sucursales, tiendas minoristas o almacenes mayoristas pertenecientes a una Empresa Matriz (relación 1 Empresa -> N Sedes).';
COMMENT ON COLUMN sedes.id IS 'Identificador único universal (UUID v4) de la sede o sucursal.';
COMMENT ON COLUMN sedes.empresa_id IS 'Llave foránea hacia empresas(id) que indica a qué empresa matriz pertenece la sede.';
COMMENT ON COLUMN sedes.codigo IS 'Código único de identificación de la sede (ej. LOC-01 a LOC-06).';
COMMENT ON COLUMN sedes.nombre IS 'Nombre comercial e identificador de la sede o tienda.';
COMMENT ON COLUMN sedes.tipo_sede IS 'Clasificación operativa de la sede (Almacén Central y Mayorista, Tienda Minorista, Centro Logístico).';
COMMENT ON COLUMN sedes.direccion IS 'Dirección física de ubicación de la sede.';
COMMENT ON COLUMN sedes.telefono IS 'Teléfono directo de la sede o anexo.';
COMMENT ON COLUMN sedes.serie_facturacion IS 'Series de facturación electrónica asignadas a la sede (ej. F001 / B001).';
COMMENT ON COLUMN sedes.nombre_encargado IS 'Nombre del encargado o administrador responsable de la sede.';
COMMENT ON COLUMN sedes.terminales_pos IS 'Cantidad de puntos de venta (cajas POS) habilitados en la sede.';
COMMENT ON COLUMN sedes.estado IS 'Estado operativo actual de la sede: Operativo, Mantenimiento o Inactivo.';
COMMENT ON COLUMN sedes.fecha_creacion IS 'Fecha y hora de alta de la sede.';
COMMENT ON INDEX idx_sedes_empresa IS 'Índice para acelerar el filtrado de sedes pertenecientes a una empresa matriz.';

-- =============================================================================
-- 3. TABLA: roles (Catálogo de Roles con Alcance Empresa vs Sede)
-- =============================================================================
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(120) NOT NULL,
    descripcion VARCHAR(255),
    alcance VARCHAR(60) NOT NULL DEFAULT 'Nivel Local Asignado'
        CHECK (alcance IN ('Nivel Negocio (Multi-Local)', 'Nivel Local Asignado')),
    es_sistema BOOLEAN NOT NULL DEFAULT FALSE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE roles IS 'Catálogo de roles de seguridad (RBAC) con definición de alcance organizacional (Multi-Local a nivel Empresa o restringido a la Sede Asignada).';
COMMENT ON COLUMN roles.id IS 'Identificador único universal (UUID v4) del rol.';
COMMENT ON COLUMN roles.codigo IS 'Código técnico único del rol (ADMIN, SUPERVISOR, ANALYST, AUDITOR).';
COMMENT ON COLUMN roles.nombre IS 'Nombre descriptivo del rol mostrado en la interfaz.';
COMMENT ON COLUMN roles.descripcion IS 'Detalle funcional de las responsabilidades y facultades del rol.';
COMMENT ON COLUMN roles.alcance IS 'Alcance organizacional: Nivel Negocio (Multi-Local) o Nivel Local Asignado.';
COMMENT ON COLUMN roles.es_sistema IS 'Protege los roles base del sistema contra eliminación accidental.';
COMMENT ON COLUMN roles.activo IS 'Indica si el rol se encuentra activo para ser asignado y evaluado.';
COMMENT ON COLUMN roles.fecha_creacion IS 'Fecha de creación del rol.';
COMMENT ON COLUMN roles.fecha_actualizacion IS 'Fecha de última modificación del rol.';

-- =============================================================================
-- 4. TABLA: usuarios (Usuarios con Asignación de Empresa y Sede Principal)
-- =============================================================================
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_usuario VARCHAR(20) NOT NULL UNIQUE,
    nombre_usuario VARCHAR(60) NOT NULL UNIQUE,
    correo_electronico VARCHAR(150) NOT NULL UNIQUE,
    hash_contrasena VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(120) NOT NULL,
    iniciales_avatar VARCHAR(4) NOT NULL DEFAULT 'US',
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
    sede_asignada_id UUID NOT NULL REFERENCES sedes(id) ON DELETE RESTRICT,
    tipo_cliente VARCHAR(40) NOT NULL DEFAULT 'Personal Interno'
        CHECK (tipo_cliente IN ('Personal Interno', 'Mayorista VIP', 'Minorista Frecuente')),
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (estado IN ('ACTIVE', 'INACTIVE', 'LOCKED', 'PENDING')),
    doble_factor_habilitado BOOLEAN NOT NULL DEFAULT FALSE,
    intentos_fallidos_login INT NOT NULL DEFAULT 0,
    preferencias_interfaz JSONB NOT NULL DEFAULT '{"darkMode": false, "sidebarCollapsed": true}'::jsonb,
    fecha_ultimo_acceso TIMESTAMPTZ NULL,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usuarios_empresa_sede ON usuarios(empresa_id, sede_asignada_id);

COMMENT ON TABLE usuarios IS 'Directorio de usuarios del sistema vinculados obligatoriamente a una Empresa Matriz y a una Sede Principal de operación.';
COMMENT ON COLUMN usuarios.id IS 'Identificador único universal (UUID v4) del usuario.';
COMMENT ON COLUMN usuarios.codigo_usuario IS 'Código legible del usuario (ej. USR-001, USR-002).';
COMMENT ON COLUMN usuarios.nombre_usuario IS 'Nombre de usuario único para inicio de sesión y firma de auditoría.';
COMMENT ON COLUMN usuarios.correo_electronico IS 'Correo electrónico institucional único del usuario.';
COMMENT ON COLUMN usuarios.hash_contrasena IS 'Hash criptográfico de la contraseña (bcrypt/Argon2id).';
COMMENT ON COLUMN usuarios.nombre_completo IS 'Nombre y apellidos completos del operador.';
COMMENT ON COLUMN usuarios.iniciales_avatar IS 'Iniciales de 2 caracteres mostradas en el avatar de la barra superior.';
COMMENT ON COLUMN usuarios.empresa_id IS 'Empresa matriz a la que pertenece el usuario.';
COMMENT ON COLUMN usuarios.sede_asignada_id IS 'Sede Principal asignada por defecto donde el usuario registra ventas, compras y arqueos.';
COMMENT ON COLUMN usuarios.tipo_cliente IS 'Clasificación de perfil: Personal Interno, Mayorista VIP o Minorista Frecuente.';
COMMENT ON COLUMN usuarios.estado IS 'Estado de la cuenta: ACTIVE, INACTIVE, LOCKED o PENDING.';
COMMENT ON COLUMN usuarios.doble_factor_habilitado IS 'Indica si tiene activa la verificación en dos pasos (2FA).';
COMMENT ON COLUMN usuarios.intentos_fallidos_login IS 'Contador de intentos fallidos consecutivos de inicio de sesión.';
COMMENT ON COLUMN usuarios.preferencias_interfaz IS 'Objeto JSONB con preferencias de interfaz (modo oscuro/claro y estado del sidebar).';
COMMENT ON COLUMN usuarios.fecha_ultimo_acceso IS 'Fecha y hora del último acceso exitoso.';
COMMENT ON COLUMN usuarios.fecha_creacion IS 'Fecha de alta del usuario.';
COMMENT ON COLUMN usuarios.fecha_actualizacion IS 'Fecha de última modificación del perfil del usuario.';
COMMENT ON INDEX idx_usuarios_empresa_sede IS 'Índice compuesto para consultas de usuarios por empresa matriz y sede principal.';

-- =============================================================================
-- 5. TABLA: usuario_sedes (Sedes Autorizadas por Usuario dentro de su Empresa)
-- =============================================================================
CREATE TABLE usuario_sedes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    sede_id UUID NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,
    es_principal BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_asignacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (usuario_id, sede_id)
);

COMMENT ON TABLE usuario_sedes IS 'Tabla intermedia (N:M) que registra todas las sedes de una empresa en las que un usuario está autorizado a operar.';
COMMENT ON COLUMN usuario_sedes.id IS 'Identificador único del vínculo usuario-sede.';
COMMENT ON COLUMN usuario_sedes.usuario_id IS 'Usuario al que se le habilita la sede.';
COMMENT ON COLUMN usuario_sedes.sede_id IS 'Sede o sucursal autorizada.';
COMMENT ON COLUMN usuario_sedes.es_principal IS 'TRUE si esta sede corresponde a la Sede Principal por defecto del usuario.';
COMMENT ON COLUMN usuario_sedes.fecha_asignacion IS 'Fecha y hora de asignación de la sede al usuario.';

-- =============================================================================
-- 6. TABLA: usuario_roles (Asignación de Roles a Usuarios)
-- =============================================================================
CREATE TABLE usuario_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    rol_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    asignado_por_id UUID NULL REFERENCES usuarios(id) ON DELETE SET NULL,
    fecha_asignacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_expiracion TIMESTAMPTZ NULL,
    UNIQUE (usuario_id, rol_id)
);

COMMENT ON TABLE usuario_roles IS 'Asignación de uno o varios roles de seguridad a cada usuario, con soporte de vigencia temporal opcional.';
COMMENT ON COLUMN usuario_roles.id IS 'Identificador único de la asignación de rol.';
COMMENT ON COLUMN usuario_roles.usuario_id IS 'Usuario que recibe el rol.';
COMMENT ON COLUMN usuario_roles.rol_id IS 'Rol asignado.';
COMMENT ON COLUMN usuario_roles.asignado_por_id IS 'Usuario administrador que otorgó el rol.';
COMMENT ON COLUMN usuario_roles.fecha_asignacion IS 'Fecha y hora en que se otorgó el rol.';
COMMENT ON COLUMN usuario_roles.fecha_expiracion IS 'Fecha de expiración opcional para delegaciones temporales de rol.';

-- =============================================================================
-- 7. TABLAS: sesiones_usuario & auditoria_autenticacion (Seguridad y Sesiones)
-- =============================================================================
CREATE TABLE sesiones_usuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    hash_token_refresco VARCHAR(255) NOT NULL UNIQUE,
    direccion_ip VARCHAR(60),
    agente_usuario TEXT,
    es_revocada BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_expiracion TIMESTAMPTZ NOT NULL,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE sesiones_usuario IS 'Registro de sesiones activas y tokens de refresco para control de dispositivos y revocación remota.';
COMMENT ON COLUMN sesiones_usuario.id IS 'Identificador único de la sesión.';
COMMENT ON COLUMN sesiones_usuario.usuario_id IS 'Usuario propietario de la sesión.';
COMMENT ON COLUMN sesiones_usuario.hash_token_refresco IS 'Hash del Refresh Token emitido.';
COMMENT ON COLUMN sesiones_usuario.direccion_ip IS 'Dirección IP desde donde se inició la sesión.';
COMMENT ON COLUMN sesiones_usuario.agente_usuario IS 'Navegador, sistema operativo o cliente del usuario.';
COMMENT ON COLUMN sesiones_usuario.es_revocada IS 'Indica si la sesión fue invalidada manualmente o por cierre de sesión.';
COMMENT ON COLUMN sesiones_usuario.fecha_expiracion IS 'Fecha y hora límite de validez de la sesión.';
COMMENT ON COLUMN sesiones_usuario.fecha_creacion IS 'Fecha y hora de creación de la sesión.';

CREATE TABLE auditoria_autenticacion (
    id BIGSERIAL PRIMARY KEY,
    usuario_id UUID NULL REFERENCES usuarios(id) ON DELETE SET NULL,
    sede_id UUID NULL REFERENCES sedes(id) ON DELETE SET NULL,
    tipo_evento VARCHAR(50) NOT NULL,
    detalle_accion TEXT NOT NULL,
    distintivo_modulo VARCHAR(40) NOT NULL DEFAULT 'Seguridad',
    direccion_ip VARCHAR(60),
    metadatos JSONB DEFAULT '{}'::jsonb,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE auditoria_autenticacion IS 'Bitácora inmutable de auditoría de operaciones críticas (ventas, compras, cupones, productos, arqueos y accesos) por usuario y sede.';
COMMENT ON COLUMN auditoria_autenticacion.id IS 'Identificador secuencial autoincremental del evento de auditoría.';
COMMENT ON COLUMN auditoria_autenticacion.usuario_id IS 'Usuario que ejecutó la acción auditada.';
COMMENT ON COLUMN auditoria_autenticacion.sede_id IS 'Sede o local donde se ejecutó la operación.';
COMMENT ON COLUMN auditoria_autenticacion.tipo_evento IS 'Código tipificado del evento (SALE_CREATED, PURCHASE_REGISTERED, COUPON_CREATED, PRODUCT_REGISTERED, etc.).';
COMMENT ON COLUMN auditoria_autenticacion.detalle_accion IS 'Descripción legible de la operación registrada para la vista de Auditoría.';
COMMENT ON COLUMN auditoria_autenticacion.distintivo_modulo IS 'Etiqueta del módulo asociado: Ventas, Compras, Cupones, Inventario, Caja o Seguridad.';
COMMENT ON COLUMN auditoria_autenticacion.direccion_ip IS 'Dirección IP del cliente que originó la transacción.';
COMMENT ON COLUMN auditoria_autenticacion.metadatos IS 'Payload JSONB adicional con valores anteriores/nuevos o referencias de documentos.';
COMMENT ON COLUMN auditoria_autenticacion.fecha_creacion IS 'Marca de tiempo exacta del evento.';

-- =============================================================================
-- 8. TABLA: opciones_menu (Árbol Jerárquico de Opciones del Menú Lateral)
-- =============================================================================
CREATE TABLE opciones_menu (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    padre_id UUID NULL REFERENCES opciones_menu(id) ON DELETE CASCADE,
    codigo VARCHAR(60) NOT NULL UNIQUE,
    etiqueta VARCHAR(100) NOT NULL,
    icono VARCHAR(80) NOT NULL DEFAULT 'bi bi-circle',
    ruta_enlace VARCHAR(180) NULL,
    etiqueta_miga_pan VARCHAR(100) NULL,
    orden INT NOT NULL DEFAULT 0,
    es_grupo BOOLEAN NOT NULL DEFAULT FALSE,
    es_visible BOOLEAN NOT NULL DEFAULT TRUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_opciones_menu_padre ON opciones_menu(padre_id, orden);

COMMENT ON TABLE opciones_menu IS 'Catálogo jerárquico recursivo (hasta 4 niveles) de las opciones de navegación del Sidebar y rutas protegidas.';
COMMENT ON COLUMN opciones_menu.id IS 'Identificador único universal (UUID v4) de la opción de menú.';
COMMENT ON COLUMN opciones_menu.padre_id IS 'Referencia recursiva al ítem padre (NULL para opciones raíz de Nivel 1).';
COMMENT ON COLUMN opciones_menu.codigo IS 'Código único de negocio del ítem (ej. DASH_HOME, SALES_EMIT, SALES_HISTORY, MGMT_BUSINESS_BRANCHES).';
COMMENT ON COLUMN opciones_menu.etiqueta IS 'Texto visible en el menú lateral.';
COMMENT ON COLUMN opciones_menu.icono IS 'Clase CSS de Bootstrap Icons (ej. bi bi-cart-check-fill).';
COMMENT ON COLUMN opciones_menu.ruta_enlace IS 'Ruta interna de Angular asociada (NULL si es un contenedor acordeón).';
COMMENT ON COLUMN opciones_menu.etiqueta_miga_pan IS 'Etiqueta mostrada en la miga de pan (Breadcrumb).';
COMMENT ON COLUMN opciones_menu.orden IS 'Orden numérico de aparición dentro de su mismo nivel.';
COMMENT ON COLUMN opciones_menu.es_grupo IS 'TRUE si el nodo agrupa subopciones y se comporta como acordeón.';
COMMENT ON COLUMN opciones_menu.es_visible IS 'TRUE si se muestra en el Sidebar; FALSE para rutas ocultas como Configuración de Perfil (/dashboard/settings).';
COMMENT ON COLUMN opciones_menu.activo IS 'Estado global de disponibilidad del módulo.';
COMMENT ON COLUMN opciones_menu.fecha_creacion IS 'Fecha de registro del ítem de menú.';
COMMENT ON INDEX idx_opciones_menu_padre IS 'Índice para recorrer eficientemente la jerarquía padre-hijo ordenada por orden.';

-- =============================================================================
-- 9. TABLAS: permisos_rol_menu & permisos_usuario_menu (Matriz RBAC)
-- =============================================================================
CREATE TABLE permisos_rol_menu (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rol_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    opcion_menu_id UUID NOT NULL REFERENCES opciones_menu(id) ON DELETE CASCADE,
    visible_en_menu BOOLEAN NOT NULL DEFAULT TRUE,
    puede_ver BOOLEAN NOT NULL DEFAULT TRUE,
    puede_crear BOOLEAN NOT NULL DEFAULT FALSE,
    puede_editar BOOLEAN NOT NULL DEFAULT FALSE,
    puede_eliminar BOOLEAN NOT NULL DEFAULT FALSE,
    puede_exportar BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (rol_id, opcion_menu_id)
);

COMMENT ON TABLE permisos_rol_menu IS 'Matriz de permisos granulares (Ver, Crear, Editar, Eliminar, Exportar) asignados a cada Rol por opción de menú.';
COMMENT ON COLUMN permisos_rol_menu.id IS 'Identificador único del permiso rol-menú.';
COMMENT ON COLUMN permisos_rol_menu.rol_id IS 'Rol al que se le configura el permiso.';
COMMENT ON COLUMN permisos_rol_menu.opcion_menu_id IS 'Opción de menú sobre la que aplica el permiso.';
COMMENT ON COLUMN permisos_rol_menu.visible_en_menu IS 'Define si el módulo es visible en el menú lateral para este rol.';
COMMENT ON COLUMN permisos_rol_menu.puede_ver IS 'Permiso de lectura/consulta del módulo.';
COMMENT ON COLUMN permisos_rol_menu.puede_crear IS 'Permiso para registrar nuevos elementos en el módulo.';
COMMENT ON COLUMN permisos_rol_menu.puede_editar IS 'Permiso para modificar registros existentes.';
COMMENT ON COLUMN permisos_rol_menu.puede_eliminar IS 'Permiso para anular o eliminar registros.';
COMMENT ON COLUMN permisos_rol_menu.puede_exportar IS 'Permiso para descargar reportes o comprobantes (PDF/Excel/CSV).';
COMMENT ON COLUMN permisos_rol_menu.fecha_actualizacion IS 'Fecha de última actualización de la matriz.';

CREATE TABLE permisos_usuario_menu (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    opcion_menu_id UUID NOT NULL REFERENCES opciones_menu(id) ON DELETE CASCADE,
    tipo_permiso VARCHAR(10) NOT NULL DEFAULT 'ALLOW'
        CHECK (tipo_permiso IN ('ALLOW', 'DENY')),
    puede_ver BOOLEAN NOT NULL DEFAULT TRUE,
    puede_crear BOOLEAN NOT NULL DEFAULT FALSE,
    puede_editar BOOLEAN NOT NULL DEFAULT FALSE,
    puede_eliminar BOOLEAN NOT NULL DEFAULT FALSE,
    puede_exportar BOOLEAN NOT NULL DEFAULT FALSE,
    autorizado_por_id UUID NULL REFERENCES usuarios(id) ON DELETE SET NULL,
    fecha_expiracion TIMESTAMPTZ NULL,
    UNIQUE (usuario_id, opcion_menu_id)
);

COMMENT ON TABLE permisos_usuario_menu IS 'Excepciones individuales de permisos por usuario (ALLOW o DENY) que prevalecen sobre los permisos heredados del rol.';
COMMENT ON COLUMN permisos_usuario_menu.id IS 'Identificador único de la excepción por usuario.';
COMMENT ON COLUMN permisos_usuario_menu.usuario_id IS 'Usuario beneficiario o restringido por la excepción.';
COMMENT ON COLUMN permisos_usuario_menu.opcion_menu_id IS 'Opción de menú afectada.';
COMMENT ON COLUMN permisos_usuario_menu.tipo_permiso IS 'Tipo de excepción: ALLOW (otorga acceso extra) o DENY (revoca acceso heredado).';
COMMENT ON COLUMN permisos_usuario_menu.puede_ver IS 'Permiso efectivo de visualización.';
COMMENT ON COLUMN permisos_usuario_menu.puede_crear IS 'Permiso efectivo de creación.';
COMMENT ON COLUMN permisos_usuario_menu.puede_editar IS 'Permiso efectivo de edición.';
COMMENT ON COLUMN permisos_usuario_menu.puede_eliminar IS 'Permiso efectivo de eliminación.';
COMMENT ON COLUMN permisos_usuario_menu.puede_exportar IS 'Permiso efectivo de exportación.';
COMMENT ON COLUMN permisos_usuario_menu.autorizado_por_id IS 'Administrador que autorizó la excepción.';
COMMENT ON COLUMN permisos_usuario_menu.fecha_expiracion IS 'Fecha límite de vigencia de la excepción.';

-- =============================================================================
-- 10. TABLAS: categorias_bebidas & productos_bebidas (Catálogo de Bebidas)
-- =============================================================================
CREATE TABLE categorias_bebidas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE,
    total_productos INT NOT NULL DEFAULT 0,
    margen_mayorista VARCHAR(60) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE categorias_bebidas IS 'Líneas y categorías comerciales de bebidas (Licores, Cervezas, Gaseosas, Aguas y Energizantes) con sus reglas mayoristas.';
COMMENT ON COLUMN categorias_bebidas.id IS 'Identificador único universal (UUID v4) de la categoría.';
COMMENT ON COLUMN categorias_bebidas.empresa_id IS 'Empresa matriz propietaria de la línea de bebidas.';
COMMENT ON COLUMN categorias_bebidas.codigo IS 'Código corto de la línea (ej. LIN-LIC, LIN-CER, LIN-GAS).';
COMMENT ON COLUMN categorias_bebidas.nombre IS 'Nombre comercial de la línea de bebidas.';
COMMENT ON COLUMN categorias_bebidas.slug IS 'Identificador URL amigable (slug) de la categoría.';
COMMENT ON COLUMN categorias_bebidas.total_productos IS 'Cantidad de productos SKU registrados bajo esta línea.';
COMMENT ON COLUMN categorias_bebidas.margen_mayorista IS 'Regla de margen y volumen mínimo aplicable a ventas al por mayor.';
COMMENT ON COLUMN categorias_bebidas.activo IS 'Indica si la categoría se encuentra activa en el catálogo.';
COMMENT ON COLUMN categorias_bebidas.fecha_creacion IS 'Fecha de creación de la categoría.';

CREATE TABLE productos_bebidas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    categoria_id UUID NULL REFERENCES categorias_bebidas(id) ON DELETE SET NULL,
    codigo_sku VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(180) NOT NULL,
    nombre_categoria VARCHAR(40) NOT NULL
        CHECK (nombre_categoria IN ('Licores', 'Cervezas', 'Gaseosas', 'Otros')),
    presentacion VARCHAR(120) NOT NULL,
    precio_minorista NUMERIC(10, 2) NOT NULL,
    precio_mayorista NUMERIC(10, 2) NOT NULL,
    stock_cajas INT NOT NULL DEFAULT 0,
    stock_unidades INT NOT NULL DEFAULT 0,
    estado_stock VARCHAR(25) NOT NULL DEFAULT 'En Stock'
        CHECK (estado_stock IN ('En Stock', 'Stock Bajo', 'Agotado')),
    registrado_por_usuario_id UUID NOT NULL REFERENCES usuarios(id),
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE productos_bebidas IS 'Catálogo maestro de bebidas con doble lista de precios (Por Menor unitario y Por Mayor por caja/paquete) y control de stock.';
COMMENT ON COLUMN productos_bebidas.id IS 'Identificador único universal (UUID v4) del producto.';
COMMENT ON COLUMN productos_bebidas.empresa_id IS 'Empresa matriz propietaria del SKU.';
COMMENT ON COLUMN productos_bebidas.categoria_id IS 'Referencia a la línea de bebidas en categorias_bebidas(id).';
COMMENT ON COLUMN productos_bebidas.codigo_sku IS 'Código SKU único del producto (ej. CER-102, LIC-001, GAS-205).';
COMMENT ON COLUMN productos_bebidas.nombre IS 'Nombre comercial completo y capacidad del envase.';
COMMENT ON COLUMN productos_bebidas.nombre_categoria IS 'Clasificación rápida: Licores, Cervezas, Gaseosas u Otros.';
COMMENT ON COLUMN productos_bebidas.presentacion IS 'Formato de empaque mayorista (ej. Caja x 24 Botellas, Pack x 6 Unidades).';
COMMENT ON COLUMN productos_bebidas.precio_minorista IS 'Precio de venta al por menor (por botella o lata individual).';
COMMENT ON COLUMN productos_bebidas.precio_mayorista IS 'Precio de venta al por mayor (por caja o paquete cerrado).';
COMMENT ON COLUMN productos_bebidas.stock_cajas IS 'Existencias actuales en cajas o paquetes cerrados.';
COMMENT ON COLUMN productos_bebidas.stock_unidades IS 'Existencias actuales equivalentes en unidades sueltas.';
COMMENT ON COLUMN productos_bebidas.estado_stock IS 'Estado de disponibilidad de inventario: En Stock, Stock Bajo o Agotado.';
COMMENT ON COLUMN productos_bebidas.registrado_por_usuario_id IS 'Usuario que dio de alta el SKU en el catálogo maestro (auditoría).';
COMMENT ON COLUMN productos_bebidas.fecha_creacion IS 'Fecha de registro del producto.';

-- =============================================================================
-- 11. TABLA: cupones_descuento (Cupones Promocionales para Clientes)
-- =============================================================================
CREATE TABLE cupones_descuento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    codigo VARCHAR(40) NOT NULL UNIQUE,
    tipo_descuento VARCHAR(15) NOT NULL CHECK (tipo_descuento IN ('PERCENT', 'FIXED')),
    valor_descuento NUMERIC(10, 2) NOT NULL,
    modalidad_objetivo VARCHAR(30) NOT NULL DEFAULT 'Mayor y Menor',
    categoria_objetivo VARCHAR(40) NOT NULL DEFAULT 'Todas',
    cliente_asignado VARCHAR(160) NOT NULL,
    compra_minima NUMERIC(10, 2) NOT NULL DEFAULT 0,
    usos_actuales INT NOT NULL DEFAULT 0,
    usos_maximos INT NOT NULL DEFAULT 50,
    etiqueta_expiracion VARCHAR(40),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_por_usuario_id UUID NOT NULL REFERENCES usuarios(id),
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE cupones_descuento IS 'Cupones promocionales de descuento porcentual o monto fijo aplicables en el punto de venta según cliente, modalidad y monto mínimo.';
COMMENT ON COLUMN cupones_descuento.id IS 'Identificador único universal (UUID v4) del cupón.';
COMMENT ON COLUMN cupones_descuento.empresa_id IS 'Empresa matriz emisora de la campaña promocional.';
COMMENT ON COLUMN cupones_descuento.codigo IS 'Código promocional único digitado en caja (ej. MAYORISTA15, LICORVIP20).';
COMMENT ON COLUMN cupones_descuento.tipo_descuento IS 'Tipo de beneficio: PERCENT (porcentaje) o FIXED (monto fijo en dinero).';
COMMENT ON COLUMN cupones_descuento.valor_descuento IS 'Valor numérico del descuento (ej. 15 para 15% o 25.00 para $25.00).';
COMMENT ON COLUMN cupones_descuento.modalidad_objetivo IS 'Modalidad de venta habilitada: Mayor y Menor, Solo Por Mayor o Solo Por Menor.';
COMMENT ON COLUMN cupones_descuento.categoria_objetivo IS 'Categoría de bebidas elegible (Todas, Licores, Cervezas, Gaseosas).';
COMMENT ON COLUMN cupones_descuento.cliente_asignado IS 'Segmento de clientes o cliente específico autorizado a redimir el cupón.';
COMMENT ON COLUMN cupones_descuento.compra_minima IS 'Importe mínimo de compra requerido para activar el cupón.';
COMMENT ON COLUMN cupones_descuento.usos_actuales IS 'Cantidad acumulada de redenciones realizadas.';
COMMENT ON COLUMN cupones_descuento.usos_maximos IS 'Límite máximo de usos permitidos para el cupón.';
COMMENT ON COLUMN cupones_descuento.etiqueta_expiracion IS 'Fecha o etiqueta de vencimiento de la promoción.';
COMMENT ON COLUMN cupones_descuento.activo IS 'Indica si el cupón se encuentra vigente para ser aplicado en ventas.';
COMMENT ON COLUMN cupones_descuento.creado_por_usuario_id IS 'Usuario que creó el cupón (trazabilidad de auditoría).';
COMMENT ON COLUMN cupones_descuento.fecha_creacion IS 'Fecha y hora de creación del cupón.';

-- =============================================================================
-- 12. TABLAS: ventas & detalles_venta (Ventas por Mayor/Menor y Comprobantes)
-- =============================================================================
CREATE TABLE ventas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_venta VARCHAR(30) NOT NULL UNIQUE,
    tipo_comprobante VARCHAR(50) NOT NULL
        CHECK (tipo_comprobante IN ('FACTURA ELECTRÓNICA', 'BOLETA DE VENTA ELECTRÓNICA')),
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    sede_id UUID NOT NULL REFERENCES sedes(id),
    usuario_vendedor_id UUID NOT NULL REFERENCES usuarios(id),
    nombre_cliente VARCHAR(160) NOT NULL,
    modalidad VARCHAR(40) NOT NULL,
    metodo_pago VARCHAR(40) NOT NULL,
    resumen_items TEXT NOT NULL,
    cantidad_total_items INT NOT NULL DEFAULT 1,
    subtotal NUMERIC(12, 2) NOT NULL,
    codigo_cupon VARCHAR(40) NULL,
    monto_descuento NUMERIC(12, 2) NOT NULL DEFAULT 0,
    impuesto_igv NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total NUMERIC(12, 2) NOT NULL,
    fecha_emision TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ventas_usuario_vendedor ON ventas(usuario_vendedor_id, fecha_emision DESC);
CREATE INDEX idx_ventas_sede ON ventas(sede_id, fecha_emision DESC);

COMMENT ON TABLE ventas IS 'Cabecera de comprobantes electrónicos de venta (Facturas y Boletas) emitidos en la sede asignada del usuario activo.';
COMMENT ON COLUMN ventas.id IS 'Identificador único universal (UUID v4) de la venta.';
COMMENT ON COLUMN ventas.codigo_venta IS 'Número correlativo único del comprobante (ej. VTA-9041).';
COMMENT ON COLUMN ventas.tipo_comprobante IS 'Tipo de comprobante fiscal: FACTURA ELECTRÓNICA o BOLETA DE VENTA ELECTRÓNICA.';
COMMENT ON COLUMN ventas.empresa_id IS 'Empresa matriz emisora del comprobante.';
COMMENT ON COLUMN ventas.sede_id IS 'Sede asignada desde donde se emitió la venta.';
COMMENT ON COLUMN ventas.usuario_vendedor_id IS 'Usuario vendedor que registró la operación (utilizado para filtrar Mis Ventas).';
COMMENT ON COLUMN ventas.nombre_cliente IS 'Razón social o nombre completo del cliente comprador.';
COMMENT ON COLUMN ventas.modalidad IS 'Modalidad resultante de la venta: Por Mayor, Por Menor o Mixta (Mayor y Menor).';
COMMENT ON COLUMN ventas.metodo_pago IS 'Medio de pago utilizado (Efectivo, Transferencia, Yape / Plin, Tarjeta POS).';
COMMENT ON COLUMN ventas.resumen_items IS 'Resumen textual de las líneas de productos incluidas en la venta.';
COMMENT ON COLUMN ventas.cantidad_total_items IS 'Cantidad de líneas de productos diferentes en el carrito.';
COMMENT ON COLUMN ventas.subtotal IS 'Suma bruta de todos los subtotales de línea antes de descuentos.';
COMMENT ON COLUMN ventas.codigo_cupon IS 'Código del cupón de descuento aplicado (NULL si no se utilizó cupón).';
COMMENT ON COLUMN ventas.monto_descuento IS 'Monto monetario descontado por aplicación de cupón.';
COMMENT ON COLUMN ventas.impuesto_igv IS 'Impuesto General a las Ventas (IGV 18%) desglosado del total.';
COMMENT ON COLUMN ventas.total IS 'Importe total neto cobrado al cliente.';
COMMENT ON COLUMN ventas.fecha_emision IS 'Fecha y hora exacta de emisión del comprobante.';
COMMENT ON INDEX idx_ventas_usuario_vendedor IS 'Índice optimizado para consultar el Historial de Ventas Emitidas por usuario vendedor.';
COMMENT ON INDEX idx_ventas_sede IS 'Índice optimizado para cierres y arqueos de caja por sede y fecha.';

CREATE TABLE detalles_venta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    sku_producto VARCHAR(30) NOT NULL,
    nombre_producto VARCHAR(180) NOT NULL,
    modalidad VARCHAR(20) NOT NULL CHECK (modalidad IN ('Por Mayor', 'Por Menor')),
    etiqueta_unidad VARCHAR(80) NOT NULL,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10, 2) NOT NULL,
    subtotal_linea NUMERIC(12, 2) NOT NULL
);

COMMENT ON TABLE detalles_venta IS 'Detalle multiproducto (líneas del carrito) de cada comprobante electrónico de venta.';
COMMENT ON COLUMN detalles_venta.id IS 'Identificador único de la línea de detalle de venta.';
COMMENT ON COLUMN detalles_venta.venta_id IS 'Llave foránea hacia la cabecera de venta en ventas(id).';
COMMENT ON COLUMN detalles_venta.sku_producto IS 'Código SKU de la bebida vendida.';
COMMENT ON COLUMN detalles_venta.nombre_producto IS 'Descripción comercial del producto al momento de la venta.';
COMMENT ON COLUMN detalles_venta.modalidad IS 'Modalidad de precio aplicada en la línea: Por Mayor o Por Menor.';
COMMENT ON COLUMN detalles_venta.etiqueta_unidad IS 'Etiqueta de presentación comercializada (ej. Caja x 24 Botellas o Unidad Botella/Lata).';
COMMENT ON COLUMN detalles_venta.cantidad IS 'Cantidad de cajas o unidades vendidas en esta línea.';
COMMENT ON COLUMN detalles_venta.precio_unitario IS 'Precio unitario (mayorista o minorista) aplicado.';
COMMENT ON COLUMN detalles_venta.subtotal_linea IS 'Subtotal de la línea (cantidad * precio_unitario).';

-- =============================================================================
-- 13. TABLA: compras (Compras y Abastecimiento de Bebidas por Sede)
-- =============================================================================
CREATE TABLE compras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_compra VARCHAR(30) NOT NULL UNIQUE,
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    sede_id UUID NOT NULL REFERENCES sedes(id),
    usuario_comprador_id UUID NOT NULL REFERENCES usuarios(id),
    proveedor VARCHAR(180) NOT NULL,
    nombre_categoria VARCHAR(40) NOT NULL,
    detalle_producto VARCHAR(200) NOT NULL,
    cantidad_cajas INT NOT NULL CHECK (cantidad_cajas > 0),
    costo_caja NUMERIC(10, 2) NOT NULL,
    costo_total NUMERIC(12, 2) NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'Recibido',
    fecha_compra TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE compras IS 'Órdenes de compra y recepción de lotes/cajas de proveedores para reabastecer el inventario de la sede asignada.';
COMMENT ON COLUMN compras.id IS 'Identificador único universal (UUID v4) de la orden de compra.';
COMMENT ON COLUMN compras.codigo_compra IS 'Código correlativo de la orden de compra (ej. OC-2026-089).';
COMMENT ON COLUMN compras.empresa_id IS 'Empresa matriz que realiza la adquisición.';
COMMENT ON COLUMN compras.sede_id IS 'Sede o almacén receptor de la mercadería.';
COMMENT ON COLUMN compras.usuario_comprador_id IS 'Usuario responsable que registró el ingreso del lote.';
COMMENT ON COLUMN compras.proveedor IS 'Razón social del proveedor o distribuidor oficial (ej. Backus, Diageo, Lindley).';
COMMENT ON COLUMN compras.nombre_categoria IS 'Categoría de la bebida adquirida (Cervezas, Licores, Gaseosas, Otros).';
COMMENT ON COLUMN compras.detalle_producto IS 'Nombre del producto y formato recibido.';
COMMENT ON COLUMN compras.cantidad_cajas IS 'Cantidad de cajas o paquetes ingresados al almacén.';
COMMENT ON COLUMN compras.costo_caja IS 'Costo de compra pagado al proveedor por cada caja.';
COMMENT ON COLUMN compras.costo_total IS 'Costo total de la orden de abastecimiento (cantidad_cajas * costo_caja).';
COMMENT ON COLUMN compras.estado IS 'Estado logístico de la recepción (Recibido, En Tránsito, Anulado).';
COMMENT ON COLUMN compras.fecha_compra IS 'Fecha y hora de registro de la compra.';

-- =============================================================================
-- 14. TABLA: arqueos_caja (Arqueos y Cierres de Caja por Turno y Sede)
-- =============================================================================
CREATE TABLE arqueos_caja (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_arqueo VARCHAR(30) NOT NULL UNIQUE,
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    sede_id UUID NOT NULL REFERENCES sedes(id),
    usuario_cajero_id UUID NOT NULL REFERENCES usuarios(id),
    nombre_turno VARCHAR(80) NOT NULL,
    saldo_apertura NUMERIC(12, 2) NOT NULL DEFAULT 0,
    ventas_efectivo NUMERIC(12, 2) NOT NULL DEFAULT 0,
    ventas_digitales NUMERIC(12, 2) NOT NULL DEFAULT 0,
    gastos NUMERIC(12, 2) NOT NULL DEFAULT 0,
    efectivo_esperado NUMERIC(12, 2) NOT NULL DEFAULT 0,
    efectivo_contado NUMERIC(12, 2) NOT NULL DEFAULT 0,
    diferencia NUMERIC(12, 2) NOT NULL DEFAULT 0,
    estado_arqueo VARCHAR(30) NOT NULL
        CHECK (estado_arqueo IN ('Cuadre Exacto', 'Sobrante', 'Faltante')),
    fecha_cierre TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE arqueos_caja IS 'Actas de arqueo y cierre de caja al finalizar el turno laboral en la sede asignada al usuario.';
COMMENT ON COLUMN arqueos_caja.id IS 'Identificador único universal (UUID v4) del acta de arqueo.';
COMMENT ON COLUMN arqueos_caja.codigo_arqueo IS 'Código único del acta de arqueo (ej. ARQ-2026-014).';
COMMENT ON COLUMN arqueos_caja.empresa_id IS 'Empresa matriz a la que pertenece el cierre de caja.';
COMMENT ON COLUMN arqueos_caja.sede_id IS 'Sede o sucursal donde se realizó el conteo físico.';
COMMENT ON COLUMN arqueos_caja.usuario_cajero_id IS 'Usuario responsable que declaró y firmó el arqueo de caja.';
COMMENT ON COLUMN arqueos_caja.nombre_turno IS 'Horario o turno laboral liquidado (ej. Turno Mañana 08:00 - 16:00).';
COMMENT ON COLUMN arqueos_caja.saldo_apertura IS 'Fondo fijo de sencillo con el que se aperturó la caja.';
COMMENT ON COLUMN arqueos_caja.ventas_efectivo IS 'Total cobrado en billetes y monedas durante el turno.';
COMMENT ON COLUMN arqueos_caja.ventas_digitales IS 'Total cobrado por medios digitales (Transferencias, Yape/Plin, Tarjeta POS).';
COMMENT ON COLUMN arqueos_caja.gastos IS 'Egresos o gastos menores pagados por caja chica durante el turno.';
COMMENT ON COLUMN arqueos_caja.efectivo_esperado IS 'Efectivo esperado según sistema (saldo_apertura + ventas_efectivo - gastos).';
COMMENT ON COLUMN arqueos_caja.efectivo_contado IS 'Efectivo físico real contado en gaveta al cierre del turno.';
COMMENT ON COLUMN arqueos_caja.diferencia IS 'Diferencia resultante (efectivo_contado - efectivo_esperado).';
COMMENT ON COLUMN arqueos_caja.estado_arqueo IS 'Dictamen del cierre: Cuadre Exacto, Sobrante o Faltante.';
COMMENT ON COLUMN arqueos_caja.fecha_cierre IS 'Fecha y hora de firma del cierre de caja.';

-- =============================================================================
-- 15. TABLA: notificaciones_sistema (Centro de Notificaciones)
-- =============================================================================
CREATE TABLE notificaciones_sistema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_notificacion VARCHAR(20) NOT NULL UNIQUE,
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    titulo VARCHAR(140) NOT NULL,
    descripcion TEXT NOT NULL,
    categoria VARCHAR(60) NOT NULL,
    icono VARCHAR(80) NOT NULL,
    tipo_notificacion VARCHAR(20) NOT NULL
        CHECK (tipo_notificacion IN ('success', 'info', 'warning', 'danger')),
    no_leida BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE notificaciones_sistema IS 'Alertas operativas del centro de notificaciones (stock crítico, ventas mayoristas, arqueos de caja y vencimiento de cupones).';
COMMENT ON COLUMN notificaciones_sistema.id IS 'Identificador único universal (UUID v4) de la notificación.';
COMMENT ON COLUMN notificaciones_sistema.codigo_notificacion IS 'Código corto de referencia de la alerta (ej. NOT-01).';
COMMENT ON COLUMN notificaciones_sistema.empresa_id IS 'Empresa matriz destinataria de la notificación.';
COMMENT ON COLUMN notificaciones_sistema.titulo IS 'Título resumido de la alerta.';
COMMENT ON COLUMN notificaciones_sistema.descripcion IS 'Mensaje detallado de la notificación.';
COMMENT ON COLUMN notificaciones_sistema.categoria IS 'Categoría funcional (Ventas Mayoristas, Stock Crítico, Arqueo de Caja, Cupones).';
COMMENT ON COLUMN notificaciones_sistema.icono IS 'Clase de ícono Bootstrap Icons.';
COMMENT ON COLUMN notificaciones_sistema.tipo_notificacion IS 'Severidad visual: success, info, warning o danger.';
COMMENT ON COLUMN notificaciones_sistema.no_leida IS 'TRUE si la alerta aún no ha sido marcada como leída.';
COMMENT ON COLUMN notificaciones_sistema.fecha_creacion IS 'Fecha y hora de generación de la alerta.';
