-- =============================================================================
-- ARCHIVO: V1__schema_ddl.sql
-- DESCRIPCIÓN: Arquitectura Relacional Modular Basada en Esquemas en ESPAÑOL.
--              Aísla el subsistema de Identidad, Autenticación y RBAC de la
--              estructura organizacional y de los módulos de negocio actuales y futuros.
--
-- ESQUEMAS:
--   1. auth:          Identidad, credenciales, sesiones y auditoría de accesos.
--   2. rbac:          Roles, matriz de permisos granulares y catálogo de navegación.
--   3. core:          Organización multi-tenant (Empresas Matriz, Sedes y Asignaciones).
--   4. inventario:    Líneas de bebidas, catálogo de productos (SKUs) y stock.
--   5. ventas:        Comprobantes electrónicos (Facturas/Boletas), detalles y cupones.
--   6. compras:       Órdenes de abastecimiento e ingreso de mercadería por sede.
--   7. tesoreria:     Arqueos, turnos y cuadres de caja física y digital.
--   8. notificaciones: Centro de alertas operativas del sistema.
--
-- MOTOR: PostgreSQL 14+ / 17 (Estándar ANSI SQL + Tipos Nativos UUID/JSONB)
-- =============================================================================

-- =============================================================================
-- 0. EXTENSIÓN CRIPTOGRÁFICA Y ESQUEMAS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS rbac;
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS inventario;
CREATE SCHEMA IF NOT EXISTS ventas;
CREATE SCHEMA IF NOT EXISTS compras;
CREATE SCHEMA IF NOT EXISTS tesoreria;
CREATE SCHEMA IF NOT EXISTS notificaciones;

-- Configuración de resolución de búsqueda para esta sesión y persistente en la BD
SET search_path TO auth, rbac, core, inventario, ventas, compras, tesoreria, notificaciones, public;

-- =============================================================================
-- LIMPIEZA ORDENADA EN INVERSO DE DEPENDENCIAS
-- =============================================================================
DROP TABLE IF EXISTS notificaciones.notificaciones_sistema CASCADE;
DROP TABLE IF EXISTS tesoreria.arqueos_caja CASCADE;
DROP TABLE IF EXISTS compras.compras CASCADE;
DROP TABLE IF EXISTS ventas.detalles_venta CASCADE;
DROP TABLE IF EXISTS ventas.ventas CASCADE;
DROP TABLE IF EXISTS ventas.cupones_descuento CASCADE;
DROP TABLE IF EXISTS inventario.productos_bebidas CASCADE;
DROP TABLE IF EXISTS inventario.categorias_bebidas CASCADE;
DROP TABLE IF EXISTS rbac.permisos_usuario_menu CASCADE;
DROP TABLE IF EXISTS rbac.permisos_rol_menu CASCADE;
DROP TABLE IF EXISTS rbac.opciones_menu CASCADE;
DROP TABLE IF EXISTS rbac.usuario_roles CASCADE;
DROP TABLE IF EXISTS core.usuario_sedes CASCADE;
DROP TABLE IF EXISTS auth.auditoria_autenticacion CASCADE;
DROP TABLE IF EXISTS auth.sesiones_usuario CASCADE;
DROP TABLE IF EXISTS auth.usuarios CASCADE;
DROP TABLE IF EXISTS rbac.roles CASCADE;
DROP TABLE IF EXISTS core.sedes CASCADE;
DROP TABLE IF EXISTS core.empresas CASCADE;

-- Limpieza de compatibilidad histórica en esquema public si existieran
DROP TABLE IF EXISTS public.notificaciones_sistema CASCADE;
DROP TABLE IF EXISTS public.arqueos_caja CASCADE;
DROP TABLE IF EXISTS public.compras CASCADE;
DROP TABLE IF EXISTS public.detalles_venta CASCADE;
DROP TABLE IF EXISTS public.ventas CASCADE;
DROP TABLE IF EXISTS public.cupones_descuento CASCADE;
DROP TABLE IF EXISTS public.productos_bebidas CASCADE;
DROP TABLE IF EXISTS public.categorias_bebidas CASCADE;
DROP TABLE IF EXISTS public.permisos_usuario_menu CASCADE;
DROP TABLE IF EXISTS public.permisos_rol_menu CASCADE;
DROP TABLE IF EXISTS public.opciones_menu CASCADE;
DROP TABLE IF EXISTS public.usuario_roles CASCADE;
DROP TABLE IF EXISTS public.usuario_sedes CASCADE;
DROP TABLE IF EXISTS public.auditoria_autenticacion CASCADE;
DROP TABLE IF EXISTS public.sesiones_usuario CASCADE;
DROP TABLE IF EXISTS public.usuarios CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;
DROP TABLE IF EXISTS public.sedes CASCADE;
DROP TABLE IF EXISTS public.empresas CASCADE;

-- =============================================================================
-- BLOQUE A: ESQUEMA core (Organización Multi-Tenant)
-- =============================================================================

-- 1. TABLA: core.empresas (Empresas Matriz / Negocios)
CREATE TABLE core.empresas (
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

COMMENT ON SCHEMA core IS 'Esquema de estructura organizacional multi-sede y gobernanza empresarial.';
COMMENT ON TABLE core.empresas IS 'Entidad raíz de Empresa Matriz (Razón Social / RUC). Una empresa matriz puede tener múltiples sedes asociadas (1:N).';
COMMENT ON COLUMN core.empresas.id IS 'Identificador único universal (UUID v4) de la empresa matriz.';
COMMENT ON COLUMN core.empresas.codigo IS 'Código mnemotécnico de empresa (ej. BIZ-001, BIZ-002).';
COMMENT ON COLUMN core.empresas.nombre_comercial IS 'Nombre comercial o marca visible en la interfaz y comprobantes.';
COMMENT ON COLUMN core.empresas.razon_social IS 'Razón social legal registrada ante la administración tributaria.';
COMMENT ON COLUMN core.empresas.identificacion_fiscal IS 'Registro tributario único (RUC / NIT).';
COMMENT ON COLUMN core.empresas.direccion_fiscal IS 'Domicilio fiscal de la empresa matriz.';
COMMENT ON COLUMN core.empresas.telefono IS 'Teléfono central corporativo.';
COMMENT ON COLUMN core.empresas.correo_soporte IS 'Correo oficial de soporte y facturación.';
COMMENT ON COLUMN core.empresas.zona_horaria IS 'Zona horaria operativa para cortes de turno y arqueos.';
COMMENT ON COLUMN core.empresas.moneda IS 'Moneda base de operación contable y comercial.';
COMMENT ON COLUMN core.empresas.activo IS 'Estado de operación de la empresa matriz.';
COMMENT ON COLUMN core.empresas.fecha_creacion IS 'Fecha de alta del registro.';
COMMENT ON COLUMN core.empresas.fecha_actualizacion IS 'Fecha de última modificación.';

-- 2. TABLA: core.sedes (Locales, Tiendas y Almacenes)
CREATE TABLE core.sedes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core.empresas(id) ON DELETE CASCADE,
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

CREATE INDEX idx_sedes_empresa ON core.sedes(empresa_id);

COMMENT ON TABLE core.sedes IS 'Sedes, sucursales, tiendas minoristas o almacenes mayoristas pertenecientes a una Empresa Matriz.';
COMMENT ON COLUMN core.sedes.id IS 'Identificador único universal (UUID v4) de la sede.';
COMMENT ON COLUMN core.sedes.empresa_id IS 'Llave foránea hacia core.empresas(id).';
COMMENT ON COLUMN core.sedes.codigo IS 'Código único de identificación de la sede (ej. LOC-01 a LOC-06).';
COMMENT ON COLUMN core.sedes.nombre IS 'Nombre comercial de la sede o tienda.';
COMMENT ON COLUMN core.sedes.tipo_sede IS 'Clasificación operativa (Almacén Central y Mayorista, Tienda Minorista, etc.).';
COMMENT ON COLUMN core.sedes.direccion IS 'Dirección física de ubicación de la sede.';
COMMENT ON COLUMN core.sedes.telefono IS 'Teléfono directo de la sede o anexo.';
COMMENT ON COLUMN core.sedes.serie_facturacion IS 'Series de facturación electrónica asignadas a la sede (ej. F001 / B001).';
COMMENT ON COLUMN core.sedes.nombre_encargado IS 'Encargado o administrador responsable.';
COMMENT ON COLUMN core.sedes.terminales_pos IS 'Cantidad de puntos de venta (cajas POS) habilitados.';
COMMENT ON COLUMN core.sedes.estado IS 'Estado operativo: Operativo, Mantenimiento o Inactivo.';
COMMENT ON COLUMN core.sedes.fecha_creacion IS 'Fecha y hora de registro de la sede.';
COMMENT ON INDEX core.idx_sedes_empresa IS 'Índice para acelerar el filtrado de sedes por empresa matriz.';

-- =============================================================================
-- BLOQUE B: ESQUEMA auth (Identidad, Seguridad y Sesiones)
-- =============================================================================

-- 3. TABLA: auth.usuarios (Directorio de Usuarios e Identidad)
CREATE TABLE auth.usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_usuario VARCHAR(20) NOT NULL UNIQUE,
    nombre_usuario VARCHAR(60) NOT NULL UNIQUE,
    correo_electronico VARCHAR(150) NOT NULL UNIQUE,
    hash_contrasena VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(120) NOT NULL,
    iniciales_avatar VARCHAR(4) NOT NULL DEFAULT 'US',
    empresa_id UUID NOT NULL REFERENCES core.empresas(id) ON DELETE RESTRICT,
    sede_asignada_id UUID NOT NULL REFERENCES core.sedes(id) ON DELETE RESTRICT,
    tipo_cliente VARCHAR(40) NOT NULL DEFAULT 'Personal Interno'
        CHECK (tipo_cliente IN ('Personal Interno', 'Mayorista VIP', 'Minorista Frecuente')),
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (estado IN ('ACTIVE', 'INACTIVE', 'LOCKED', 'PENDING')),
    doble_factor_habilitado BOOLEAN NOT NULL DEFAULT FALSE,
    intentos_fallidos_login INT NOT NULL DEFAULT 0,
    preferencias_interfaz JSONB NOT NULL DEFAULT '{"darkMode": false, "sidebarCollapsed": true}'::jsonb,
    fecha_ultimo_acceso TIMESTAMPTZ NULL,
    fecha_expiracion_contrasena TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days'),
    debe_cambiar_contrasena BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usuarios_empresa_sede ON auth.usuarios(empresa_id, sede_asignada_id);

COMMENT ON SCHEMA auth IS 'Esquema de gestión de identidades, credenciales, sesiones y seguridad del sistema.';
COMMENT ON TABLE auth.usuarios IS 'Directorio principal de identidades y credenciales de acceso del sistema.';
COMMENT ON COLUMN auth.usuarios.id IS 'Identificador único universal (UUID v4) del usuario.';
COMMENT ON COLUMN auth.usuarios.codigo_usuario IS 'Código legible del usuario (ej. USR-001, USR-002).';
COMMENT ON COLUMN auth.usuarios.nombre_usuario IS 'Nombre de usuario único para login y firma de auditoría.';
COMMENT ON COLUMN auth.usuarios.correo_electronico IS 'Correo institucional único.';
COMMENT ON COLUMN auth.usuarios.hash_contrasena IS 'Hash criptográfico de la contraseña (BCrypt).';
COMMENT ON COLUMN auth.usuarios.nombre_completo IS 'Nombre y apellidos completos del operador.';
COMMENT ON COLUMN auth.usuarios.iniciales_avatar IS 'Iniciales para el avatar de la barra superior.';
COMMENT ON COLUMN auth.usuarios.empresa_id IS 'Empresa matriz a la que pertenece el usuario.';
COMMENT ON COLUMN auth.usuarios.sede_asignada_id IS 'Sede Principal asignada para operaciones transaccionales.';
COMMENT ON COLUMN auth.usuarios.tipo_cliente IS 'Clasificación de perfil (Personal Interno, Mayorista VIP, Minorista Frecuente).';
COMMENT ON COLUMN auth.usuarios.estado IS 'Estado de la cuenta: ACTIVE, INACTIVE, LOCKED o PENDING.';
COMMENT ON COLUMN auth.usuarios.doble_factor_habilitado IS 'Indica si tiene activo 2FA.';
COMMENT ON COLUMN auth.usuarios.intentos_fallidos_login IS 'Contador consecutivo de intentos fallidos de login.';
COMMENT ON COLUMN auth.usuarios.preferencias_interfaz IS 'Configuración de UI en formato JSONB.';
COMMENT ON COLUMN auth.usuarios.fecha_ultimo_acceso IS 'Fecha y hora del último login exitoso.';
COMMENT ON COLUMN auth.usuarios.fecha_expiracion_contrasena IS 'Fecha de caducidad de la clave (política de rotación de 90 días).';
COMMENT ON COLUMN auth.usuarios.debe_cambiar_contrasena IS 'Bandera de cambio obligatorio de clave antes de navegar.';
COMMENT ON COLUMN auth.usuarios.fecha_creacion IS 'Fecha de alta del usuario.';
COMMENT ON COLUMN auth.usuarios.fecha_actualizacion IS 'Fecha de última modificación del usuario.';

-- 4. TABLA: core.usuario_sedes (Asignación N:M Usuario <-> Sedes de Empresa)
CREATE TABLE core.usuario_sedes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES auth.usuarios(id) ON DELETE CASCADE,
    sede_id UUID NOT NULL REFERENCES core.sedes(id) ON DELETE CASCADE,
    es_principal BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_asignacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (usuario_id, sede_id)
);

COMMENT ON TABLE core.usuario_sedes IS 'Tabla de asignación N:M que define las sedes autorizadas para cada usuario.';
COMMENT ON COLUMN core.usuario_sedes.id IS 'Identificador único de la asignación.';
COMMENT ON COLUMN core.usuario_sedes.usuario_id IS 'Usuario beneficiario de la autorización.';
COMMENT ON COLUMN core.usuario_sedes.sede_id IS 'Sede autorizada para operar.';
COMMENT ON COLUMN core.usuario_sedes.es_principal IS 'TRUE si corresponde a la sede por defecto del usuario.';
COMMENT ON COLUMN core.usuario_sedes.fecha_asignacion IS 'Fecha y hora de asignación.';

-- 5. TABLA: auth.sesiones_usuario (Sesiones Activas, Dispositivos y Kill Remoto)
CREATE TABLE auth.sesiones_usuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES auth.usuarios(id) ON DELETE CASCADE,
    hash_token_refresco VARCHAR(255) NOT NULL UNIQUE,
    direccion_ip VARCHAR(60),
    agente_usuario TEXT,
    tipo_dispositivo VARCHAR(60) DEFAULT 'Desktop - Windows',
    nombre_navegador VARCHAR(80) DEFAULT 'Chrome 122',
    nombre_ubicacion VARCHAR(150) DEFAULT 'Lima, Perú (Sede Central)',
    latitud NUMERIC(9,6) DEFAULT -12.046374,
    longitud NUMERIC(9,6) DEFAULT -77.042793,
    fecha_ultima_actividad TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    es_revocada BOOLEAN NOT NULL DEFAULT FALSE,
    revocada_por_admin BOOLEAN NOT NULL DEFAULT FALSE,
    motivo_revocacion TEXT,
    fecha_revocacion TIMESTAMPTZ,
    fecha_expiracion TIMESTAMPTZ NOT NULL,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sesiones_usuario_usuario ON auth.sesiones_usuario(usuario_id);
CREATE INDEX idx_sesiones_usuario_activas ON auth.sesiones_usuario(es_revocada, fecha_expiracion, fecha_ultima_actividad);

COMMENT ON TABLE auth.sesiones_usuario IS 'Control de sesiones activas, auditoría de red, latidos (heartbeats) y soporte de cierre remoto.';
COMMENT ON COLUMN auth.sesiones_usuario.id IS 'Identificador único de la sesión.';
COMMENT ON COLUMN auth.sesiones_usuario.usuario_id IS 'Usuario propietario de la sesión.';
COMMENT ON COLUMN auth.sesiones_usuario.hash_token_refresco IS 'Hash del refresh token emitido.';
COMMENT ON COLUMN auth.sesiones_usuario.direccion_ip IS 'Dirección IP del cliente.';
COMMENT ON COLUMN auth.sesiones_usuario.agente_usuario IS 'User Agent del cliente HTTP.';
COMMENT ON COLUMN auth.sesiones_usuario.tipo_dispositivo IS 'Tipo y SO del cliente.';
COMMENT ON COLUMN auth.sesiones_usuario.nombre_navegador IS 'Navegador y versión detectada.';
COMMENT ON COLUMN auth.sesiones_usuario.nombre_ubicacion IS 'Ubicación geográfica o sede deducida.';
COMMENT ON COLUMN auth.sesiones_usuario.latitud IS 'Coordenada de latitud.';
COMMENT ON COLUMN auth.sesiones_usuario.longitud IS 'Coordenada de longitud.';
COMMENT ON COLUMN auth.sesiones_usuario.fecha_ultima_actividad IS 'Último latido (heartbeat) registrado.';
COMMENT ON COLUMN auth.sesiones_usuario.es_revocada IS 'Indica si la sesión ha sido revocada.';
COMMENT ON COLUMN auth.sesiones_usuario.revocada_por_admin IS 'TRUE si fue terminada de forma forzada por un administrador.';
COMMENT ON COLUMN auth.sesiones_usuario.motivo_revocacion IS 'Motivo administrativo de la terminación remota.';
COMMENT ON COLUMN auth.sesiones_usuario.fecha_revocacion IS 'Fecha y hora de terminación de la sesión.';
COMMENT ON COLUMN auth.sesiones_usuario.fecha_expiracion IS 'Fecha de caducidad del token de sesión.';
COMMENT ON COLUMN auth.sesiones_usuario.fecha_creacion IS 'Fecha de inicio de sesión.';

-- 6. TABLA: auth.auditoria_autenticacion (Bitácora Inmutable de Seguridad)
CREATE TABLE auth.auditoria_autenticacion (
    id BIGSERIAL PRIMARY KEY,
    usuario_id UUID NULL REFERENCES auth.usuarios(id) ON DELETE SET NULL,
    sede_id UUID NULL REFERENCES core.sedes(id) ON DELETE SET NULL,
    tipo_evento VARCHAR(50) NOT NULL,
    detalle_accion TEXT NOT NULL,
    distintivo_modulo VARCHAR(40) NOT NULL DEFAULT 'Seguridad',
    direccion_ip VARCHAR(60),
    metadatos JSONB DEFAULT '{}'::jsonb,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auditoria_usuario_fecha ON auth.auditoria_autenticacion(usuario_id, fecha_creacion DESC);

COMMENT ON TABLE auth.auditoria_autenticacion IS 'Bitácora de auditoría inmutable de eventos críticos y accesos por usuario y sede.';
COMMENT ON COLUMN auth.auditoria_autenticacion.id IS 'Identificador secuencial del evento auditado.';
COMMENT ON COLUMN auth.auditoria_autenticacion.usuario_id IS 'Usuario autor de la acción.';
COMMENT ON COLUMN auth.auditoria_autenticacion.sede_id IS 'Sede donde ocurrió el evento.';
COMMENT ON COLUMN auth.auditoria_autenticacion.tipo_evento IS 'Código tipificado del evento de auditoría.';
COMMENT ON COLUMN auth.auditoria_autenticacion.detalle_accion IS 'Descripción legible para el panel de auditoría.';
COMMENT ON COLUMN auth.auditoria_autenticacion.distintivo_modulo IS 'Módulo funcional de procedencia.';
COMMENT ON COLUMN auth.auditoria_autenticacion.direccion_ip IS 'Dirección IP que originó la petición.';
COMMENT ON COLUMN auth.auditoria_autenticacion.metadatos IS 'Payload JSONB con valores anteriores/nuevos.';
COMMENT ON COLUMN auth.auditoria_autenticacion.fecha_creacion IS 'Marca de tiempo del evento.';

-- =============================================================================
-- BLOQUE C: ESQUEMA rbac (Control de Acceso Basado en Roles y Navegación)
-- =============================================================================

-- 7. TABLA: rbac.roles (Catálogo de Roles y Alcance)
CREATE TABLE rbac.roles (
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

COMMENT ON SCHEMA rbac IS 'Esquema de control de accesos basado en roles, permisos granulares y navegación lateral.';
COMMENT ON TABLE rbac.roles IS 'Catálogo de perfiles y roles de seguridad con alcance organizacional.';
COMMENT ON COLUMN rbac.roles.id IS 'Identificador único universal (UUID v4) del rol.';
COMMENT ON COLUMN rbac.roles.codigo IS 'Código mnemotécnico del rol (ADMIN, SUPERVISOR, ANALYST, AUDITOR).';
COMMENT ON COLUMN rbac.roles.nombre IS 'Nombre descriptivo del rol.';
COMMENT ON COLUMN rbac.roles.descripcion IS 'Detalle funcional de responsabilidades.';
COMMENT ON COLUMN rbac.roles.alcance IS 'Alcance: Nivel Negocio (Multi-Local) o Nivel Local Asignado.';
COMMENT ON COLUMN rbac.roles.es_sistema IS 'Protege los roles base del sistema contra borrado.';
COMMENT ON COLUMN rbac.roles.activo IS 'Estado de disponibilidad del rol.';
COMMENT ON COLUMN rbac.roles.fecha_creacion IS 'Fecha de alta.';
COMMENT ON COLUMN rbac.roles.fecha_actualizacion IS 'Fecha de modificación.';

-- 8. TABLA: rbac.usuario_roles (Asignación Usuario <-> Roles)
CREATE TABLE rbac.usuario_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES auth.usuarios(id) ON DELETE CASCADE,
    rol_id UUID NOT NULL REFERENCES rbac.roles(id) ON DELETE CASCADE,
    asignado_por_id UUID NULL REFERENCES auth.usuarios(id) ON DELETE SET NULL,
    fecha_asignacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_expiracion TIMESTAMPTZ NULL,
    UNIQUE (usuario_id, rol_id)
);

COMMENT ON TABLE rbac.usuario_roles IS 'Asignación de roles de seguridad a cada usuario con soporte de expiración temporal.';
COMMENT ON COLUMN rbac.usuario_roles.id IS 'Identificador único de la asignación.';
COMMENT ON COLUMN rbac.usuario_roles.usuario_id IS 'Usuario asignado.';
COMMENT ON COLUMN rbac.usuario_roles.rol_id IS 'Rol asignado.';
COMMENT ON COLUMN rbac.usuario_roles.asignado_por_id IS 'Administrador que otorgó el rol.';
COMMENT ON COLUMN rbac.usuario_roles.fecha_asignacion IS 'Fecha de asignación.';
COMMENT ON COLUMN rbac.usuario_roles.fecha_expiracion IS 'Fecha de expiración opcional.';

-- 9. TABLA: rbac.opciones_menu (Catálogo Jerárquico de Opciones del Sidebar)
CREATE TABLE rbac.opciones_menu (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    padre_id UUID NULL REFERENCES rbac.opciones_menu(id) ON DELETE CASCADE,
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

CREATE INDEX idx_opciones_menu_padre ON rbac.opciones_menu(padre_id, orden);

COMMENT ON TABLE rbac.opciones_menu IS 'Catálogo jerárquico recursivo de rutas y opciones del menú lateral.';
COMMENT ON COLUMN rbac.opciones_menu.id IS 'Identificador único universal (UUID v4) del ítem de menú.';
COMMENT ON COLUMN rbac.opciones_menu.padre_id IS 'Referencia al nodo padre (NULL para ítems raíz de nivel 1).';
COMMENT ON COLUMN rbac.opciones_menu.codigo IS 'Código funcional único (ej. DASH_HOME, SALES_EMIT, MGMT_SESSIONS).';
COMMENT ON COLUMN rbac.opciones_menu.etiqueta IS 'Texto visible en el menú lateral.';
COMMENT ON COLUMN rbac.opciones_menu.icono IS 'Clase CSS del ícono (Bootstrap Icons).';
COMMENT ON COLUMN rbac.opciones_menu.ruta_enlace IS 'Ruta de la aplicación frontend asociada.';
COMMENT ON COLUMN rbac.opciones_menu.etiqueta_miga_pan IS 'Texto en el breadcrumb.';
COMMENT ON COLUMN rbac.opciones_menu.orden IS 'Orden secuencial de aparición.';
COMMENT ON COLUMN rbac.opciones_menu.es_grupo IS 'TRUE si agrupa subopciones (nodo acordeón).';
COMMENT ON COLUMN rbac.opciones_menu.es_visible IS 'TRUE si se renderiza en la barra de navegación.';
COMMENT ON COLUMN rbac.opciones_menu.activo IS 'Disponibilidad global del módulo.';
COMMENT ON COLUMN rbac.opciones_menu.fecha_creacion IS 'Fecha de registro.';

-- 10. TABLA: rbac.permisos_rol_menu (Matriz Granular Rol x Opción de Menú)
CREATE TABLE rbac.permisos_rol_menu (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rol_id UUID NOT NULL REFERENCES rbac.roles(id) ON DELETE CASCADE,
    opcion_menu_id UUID NOT NULL REFERENCES rbac.opciones_menu(id) ON DELETE CASCADE,
    visible_en_menu BOOLEAN NOT NULL DEFAULT TRUE,
    puede_ver BOOLEAN NOT NULL DEFAULT TRUE,
    puede_crear BOOLEAN NOT NULL DEFAULT FALSE,
    puede_editar BOOLEAN NOT NULL DEFAULT FALSE,
    puede_eliminar BOOLEAN NOT NULL DEFAULT FALSE,
    puede_exportar BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (rol_id, opcion_menu_id)
);

COMMENT ON TABLE rbac.permisos_rol_menu IS 'Matriz RBAC granular (Ver, Crear, Editar, Eliminar, Exportar) por rol y recurso navegable.';
COMMENT ON COLUMN rbac.permisos_rol_menu.id IS 'Identificador único del permiso.';
COMMENT ON COLUMN rbac.permisos_rol_menu.rol_id IS 'Rol beneficiario.';
COMMENT ON COLUMN rbac.permisos_rol_menu.opcion_menu_id IS 'Opción de menú o ruta protegida.';
COMMENT ON COLUMN rbac.permisos_rol_menu.visible_en_menu IS 'Visibilidad en el sidebar.';
COMMENT ON COLUMN rbac.permisos_rol_menu.puede_ver IS 'Permiso de consulta/lectura.';
COMMENT ON COLUMN rbac.permisos_rol_menu.puede_crear IS 'Permiso de registro.';
COMMENT ON COLUMN rbac.permisos_rol_menu.puede_editar IS 'Permiso de modificación.';
COMMENT ON COLUMN rbac.permisos_rol_menu.puede_eliminar IS 'Permiso de anulación o eliminación.';
COMMENT ON COLUMN rbac.permisos_rol_menu.puede_exportar IS 'Permiso de descarga de reportes.';
COMMENT ON COLUMN rbac.permisos_rol_menu.fecha_actualizacion IS 'Fecha de última modificación.';

-- 11. TABLA: rbac.permisos_usuario_menu (Sobrescrituras Específicas ALLOW/DENY)
CREATE TABLE rbac.permisos_usuario_menu (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES auth.usuarios(id) ON DELETE CASCADE,
    opcion_menu_id UUID NOT NULL REFERENCES rbac.opciones_menu(id) ON DELETE CASCADE,
    tipo_permiso VARCHAR(10) NOT NULL DEFAULT 'ALLOW'
        CHECK (tipo_permiso IN ('ALLOW', 'DENY')),
    puede_ver BOOLEAN NOT NULL DEFAULT TRUE,
    puede_crear BOOLEAN NOT NULL DEFAULT FALSE,
    puede_editar BOOLEAN NOT NULL DEFAULT FALSE,
    puede_eliminar BOOLEAN NOT NULL DEFAULT FALSE,
    puede_exportar BOOLEAN NOT NULL DEFAULT FALSE,
    autorizado_por_id UUID NULL REFERENCES auth.usuarios(id) ON DELETE SET NULL,
    fecha_expiracion TIMESTAMPTZ NULL,
    UNIQUE (usuario_id, opcion_menu_id)
);

COMMENT ON TABLE rbac.permisos_usuario_menu IS 'Excepciones individuales por usuario (ALLOW/DENY) con precedencia sobre los permisos de rol.';
COMMENT ON COLUMN rbac.permisos_usuario_menu.id IS 'Identificador único de la excepción.';
COMMENT ON COLUMN rbac.permisos_usuario_menu.usuario_id IS 'Usuario objetivo.';
COMMENT ON COLUMN rbac.permisos_usuario_menu.opcion_menu_id IS 'Opción de menú afectada.';
COMMENT ON COLUMN rbac.permisos_usuario_menu.tipo_permiso IS 'ALLOW para otorgar facultades extra o DENY para revocar acceso heredado.';
COMMENT ON COLUMN rbac.permisos_usuario_menu.puede_ver IS 'Permiso efectivo de visualización.';
COMMENT ON COLUMN rbac.permisos_usuario_menu.puede_crear IS 'Permiso de creación.';
COMMENT ON COLUMN rbac.permisos_usuario_menu.puede_editar IS 'Permiso de edición.';
COMMENT ON COLUMN rbac.permisos_usuario_menu.puede_eliminar IS 'Permiso de eliminación.';
COMMENT ON COLUMN rbac.permisos_usuario_menu.puede_exportar IS 'Permiso de exportación.';
COMMENT ON COLUMN rbac.permisos_usuario_menu.autorizado_por_id IS 'Administrador que autorizó la excepción.';
COMMENT ON COLUMN rbac.permisos_usuario_menu.fecha_expiracion IS 'Fecha de caducidad de la excepción.';

-- =============================================================================
-- BLOQUE D: ESQUEMA inventario (Líneas de Bebidas, SKUs y Stock)
-- =============================================================================

-- 12. TABLA: inventario.categorias_bebidas (Líneas Comerciales)
CREATE TABLE inventario.categorias_bebidas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core.empresas(id) ON DELETE CASCADE,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE,
    total_productos INT NOT NULL DEFAULT 0,
    margen_mayorista VARCHAR(60) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON SCHEMA inventario IS 'Esquema de gestión de productos, líneas comerciales, listas de precios y stock.';
COMMENT ON TABLE inventario.categorias_bebidas IS 'Líneas y categorías comerciales de bebidas (Licores, Cervezas, Gaseosas, etc.).';
COMMENT ON COLUMN inventario.categorias_bebidas.id IS 'Identificador único universal (UUID v4) de la categoría.';
COMMENT ON COLUMN inventario.categorias_bebidas.empresa_id IS 'Empresa matriz propietaria de la línea.';
COMMENT ON COLUMN inventario.categorias_bebidas.codigo IS 'Código mnemotécnico de la categoría.';
COMMENT ON COLUMN inventario.categorias_bebidas.nombre IS 'Nombre comercial de la línea.';
COMMENT ON COLUMN inventario.categorias_bebidas.slug IS 'Identificador URL slug amigable.';
COMMENT ON COLUMN inventario.categorias_bebidas.total_productos IS 'Cantidad de productos SKU registrados.';
COMMENT ON COLUMN inventario.categorias_bebidas.margen_mayorista IS 'Regla comercial mayorista.';
COMMENT ON COLUMN inventario.categorias_bebidas.activo IS 'Disponibilidad en catálogo.';
COMMENT ON COLUMN inventario.categorias_bebidas.fecha_creacion IS 'Fecha de registro.';

-- 13. TABLA: inventario.productos_bebidas (Catálogo de Bebidas con Doble Lista de Precios)
CREATE TABLE inventario.productos_bebidas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core.empresas(id) ON DELETE CASCADE,
    categoria_id UUID NULL REFERENCES inventario.categorias_bebidas(id) ON DELETE SET NULL,
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
    registrado_por_usuario_id UUID NOT NULL REFERENCES auth.usuarios(id),
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE inventario.productos_bebidas IS 'Catálogo maestro de bebidas con precio por mayor y por menor y control de stock.';
COMMENT ON COLUMN inventario.productos_bebidas.id IS 'Identificador único universal (UUID v4) del producto.';
COMMENT ON COLUMN inventario.productos_bebidas.empresa_id IS 'Empresa matriz propietaria.';
COMMENT ON COLUMN inventario.productos_bebidas.categoria_id IS 'Categoría asociada en inventario.categorias_bebidas(id).';
COMMENT ON COLUMN inventario.productos_bebidas.codigo_sku IS 'Código SKU único (ej. CER-102, LIC-001).';
COMMENT ON COLUMN inventario.productos_bebidas.nombre IS 'Nombre comercial y presentación.';
COMMENT ON COLUMN inventario.productos_bebidas.nombre_categoria IS 'Clasificación de línea.';
COMMENT ON COLUMN inventario.productos_bebidas.presentacion IS 'Formato de empaque mayorista (Caja x 24, Pack x 6).';
COMMENT ON COLUMN inventario.productos_bebidas.precio_minorista IS 'Precio por menor unitario.';
COMMENT ON COLUMN inventario.productos_bebidas.precio_mayorista IS 'Precio por mayor por caja/pack.';
COMMENT ON COLUMN inventario.productos_bebidas.stock_cajas IS 'Stock disponible en cajas cerradas.';
COMMENT ON COLUMN inventario.productos_bebidas.stock_unidades IS 'Stock disponible en unidades sueltas.';
COMMENT ON COLUMN inventario.productos_bebidas.estado_stock IS 'Estado: En Stock, Stock Bajo o Agotado.';
COMMENT ON COLUMN inventario.productos_bebidas.registrado_por_usuario_id IS 'Usuario autor del registro en auth.usuarios(id).';
COMMENT ON COLUMN inventario.productos_bebidas.fecha_creacion IS 'Fecha de registro del SKU.';

-- =============================================================================
-- BLOQUE E: ESQUEMA ventas (Comprobantes Electrónicos, Carrito y Cupones)
-- =============================================================================

-- 14. TABLA: ventas.cupones_descuento (Campañas Promocionales)
CREATE TABLE ventas.cupones_descuento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core.empresas(id) ON DELETE CASCADE,
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
    creado_por_usuario_id UUID NOT NULL REFERENCES auth.usuarios(id),
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON SCHEMA ventas IS 'Esquema comercial de facturación electrónica, comprobantes, transacciones y promociones.';
COMMENT ON TABLE ventas.cupones_descuento IS 'Cupones promocionales de descuento porcentual o monto fijo redimibles en caja.';
COMMENT ON COLUMN ventas.cupones_descuento.id IS 'Identificador único universal (UUID v4) del cupón.';
COMMENT ON COLUMN ventas.cupones_descuento.empresa_id IS 'Empresa emisora de la promoción.';
COMMENT ON COLUMN ventas.cupones_descuento.codigo IS 'Código promocional único.';
COMMENT ON COLUMN ventas.cupones_descuento.tipo_descuento IS 'PERCENT (porcentaje) o FIXED (monto fijo).';
COMMENT ON COLUMN ventas.cupones_descuento.valor_descuento IS 'Magnitud del beneficio.';
COMMENT ON COLUMN ventas.cupones_descuento.modalidad_objetivo IS 'Mayor y Menor, Solo Por Mayor o Solo Por Menor.';
COMMENT ON COLUMN ventas.cupones_descuento.categoria_objetivo IS 'Categoría elegible.';
COMMENT ON COLUMN ventas.cupones_descuento.cliente_asignado IS 'Segmento o cliente autorizado.';
COMMENT ON COLUMN ventas.cupones_descuento.compra_minima IS 'Monto mínimo requerido.';
COMMENT ON COLUMN ventas.cupones_descuento.usos_actuales IS 'Usos registrados a la fecha.';
COMMENT ON COLUMN ventas.cupones_descuento.usos_maximos IS 'Límite de redenciones.';
COMMENT ON COLUMN ventas.cupones_descuento.etiqueta_expiracion IS 'Etiqueta o fecha límite.';
COMMENT ON COLUMN ventas.cupones_descuento.activo IS 'Vigencia de aplicación.';
COMMENT ON COLUMN ventas.cupones_descuento.creado_por_usuario_id IS 'Usuario autor en auth.usuarios(id).';
COMMENT ON COLUMN ventas.cupones_descuento.fecha_creacion IS 'Fecha de alta.';

-- 15. TABLA: ventas.ventas (Cabecera de Facturas y Boletas Electrónicas)
CREATE TABLE ventas.ventas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_venta VARCHAR(30) NOT NULL UNIQUE,
    tipo_comprobante VARCHAR(50) NOT NULL
        CHECK (tipo_comprobante IN ('FACTURA ELECTRÓNICA', 'BOLETA DE VENTA ELECTRÓNICA')),
    empresa_id UUID NOT NULL REFERENCES core.empresas(id),
    sede_id UUID NOT NULL REFERENCES core.sedes(id),
    usuario_vendedor_id UUID NOT NULL REFERENCES auth.usuarios(id),
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

CREATE INDEX idx_ventas_usuario_vendedor ON ventas.ventas(usuario_vendedor_id, fecha_emision DESC);
CREATE INDEX idx_ventas_sede ON ventas.ventas(sede_id, fecha_emision DESC);

COMMENT ON TABLE ventas.ventas IS 'Cabecera de comprobantes electrónicos de venta emitidos en la sede.';
COMMENT ON COLUMN ventas.ventas.id IS 'Identificador único universal (UUID v4) de la venta.';
COMMENT ON COLUMN ventas.ventas.codigo_venta IS 'Correlativo único (ej. VTA-9041).';
COMMENT ON COLUMN ventas.ventas.tipo_comprobante IS 'FACTURA ELECTRÓNICA o BOLETA DE VENTA ELECTRÓNICA.';
COMMENT ON COLUMN ventas.ventas.empresa_id IS 'Empresa emisora.';
COMMENT ON COLUMN ventas.ventas.sede_id IS 'Sede desde donde se emitió el comprobante.';
COMMENT ON COLUMN ventas.ventas.usuario_vendedor_id IS 'Usuario vendedor que cobró la operación en auth.usuarios(id).';
COMMENT ON COLUMN ventas.ventas.nombre_cliente IS 'Razón social o nombre del comprador.';
COMMENT ON COLUMN ventas.ventas.modalidad IS 'Por Mayor, Por Menor o Mixta.';
COMMENT ON COLUMN ventas.ventas.metodo_pago IS 'Efectivo, Transferencia, Yape / Plin, Tarjeta POS.';
COMMENT ON COLUMN ventas.ventas.resumen_items IS 'Resumen textual de productos vendidos.';
COMMENT ON COLUMN ventas.ventas.cantidad_total_items IS 'Cantidad de líneas en el comprobante.';
COMMENT ON COLUMN ventas.ventas.subtotal IS 'Subtotal bruto antes de descuentos.';
COMMENT ON COLUMN ventas.ventas.codigo_cupon IS 'Código del cupón aplicado.';
COMMENT ON COLUMN ventas.ventas.monto_descuento IS 'Descuento total deducido.';
COMMENT ON COLUMN ventas.ventas.impuesto_igv IS 'Impuesto general a las ventas desglosado.';
COMMENT ON COLUMN ventas.ventas.total IS 'Importe total cobrado.';
COMMENT ON COLUMN ventas.ventas.fecha_emision IS 'Fecha y hora de emisión.';
COMMENT ON INDEX ventas.idx_ventas_usuario_vendedor IS 'Índice para Mis Ventas por vendedor.';
COMMENT ON INDEX ventas.idx_ventas_sede IS 'Índice para arqueos y ventas por sede.';

-- 16. TABLA: ventas.detalles_venta (Renglones Multiproducto de Comprobante)
CREATE TABLE ventas.detalles_venta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id UUID NOT NULL REFERENCES ventas.ventas(id) ON DELETE CASCADE,
    sku_producto VARCHAR(30) NOT NULL,
    nombre_producto VARCHAR(180) NOT NULL,
    modalidad VARCHAR(20) NOT NULL CHECK (modalidad IN ('Por Mayor', 'Por Menor')),
    etiqueta_unidad VARCHAR(80) NOT NULL,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10, 2) NOT NULL,
    subtotal_linea NUMERIC(12, 2) NOT NULL
);

COMMENT ON TABLE ventas.detalles_venta IS 'Líneas multiproducto contenidas en cada comprobante electrónico.';
COMMENT ON COLUMN ventas.detalles_venta.id IS 'Identificador único del renglón de venta.';
COMMENT ON COLUMN ventas.detalles_venta.venta_id IS 'Venta cabecera en ventas.ventas(id).';
COMMENT ON COLUMN ventas.detalles_venta.sku_producto IS 'SKU de la bebida comercializada.';
COMMENT ON COLUMN ventas.detalles_venta.nombre_producto IS 'Nombre comercial registrado al momento de la venta.';
COMMENT ON COLUMN ventas.detalles_venta.modalidad IS 'Por Mayor o Por Menor.';
COMMENT ON COLUMN ventas.detalles_venta.etiqueta_unidad IS 'Presentación comercial (Caja x 24 o Botella suelta).';
COMMENT ON COLUMN ventas.detalles_venta.cantidad IS 'Cantidad facturada.';
COMMENT ON COLUMN ventas.detalles_venta.precio_unitario IS 'Precio unitario aplicado.';
COMMENT ON COLUMN ventas.detalles_venta.subtotal_linea IS 'Subtotal de la línea calculada.';

-- =============================================================================
-- BLOQUE F: ESQUEMA compras (Abastecimiento y Órdenes de Entrada)
-- =============================================================================

-- 17. TABLA: compras.compras (Órdenes de Compra a Proveedores por Sede)
CREATE TABLE compras.compras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_compra VARCHAR(30) NOT NULL UNIQUE,
    empresa_id UUID NOT NULL REFERENCES core.empresas(id),
    sede_id UUID NOT NULL REFERENCES core.sedes(id),
    usuario_comprador_id UUID NOT NULL REFERENCES auth.usuarios(id),
    proveedor VARCHAR(180) NOT NULL,
    nombre_categoria VARCHAR(40) NOT NULL,
    detalle_producto VARCHAR(200) NOT NULL,
    cantidad_cajas INT NOT NULL CHECK (cantidad_cajas > 0),
    costo_caja NUMERIC(10, 2) NOT NULL,
    costo_total NUMERIC(12, 2) NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'Recibido',
    fecha_compra TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON SCHEMA compras IS 'Esquema logístico de compras, proveedores y abastecimiento de almacenes.';
COMMENT ON TABLE compras.compras IS 'Órdenes de compra y recepción de mercadería de proveedores por sede.';
COMMENT ON COLUMN compras.compras.id IS 'Identificador único universal (UUID v4) de la orden.';
COMMENT ON COLUMN compras.compras.codigo_compra IS 'Correlativo único (ej. OC-2026-089).';
COMMENT ON COLUMN compras.compras.empresa_id IS 'Empresa compradora.';
COMMENT ON COLUMN compras.compras.sede_id IS 'Sede o almacén receptor.';
COMMENT ON COLUMN compras.compras.usuario_comprador_id IS 'Usuario responsable que registró la recepción en auth.usuarios(id).';
COMMENT ON COLUMN compras.compras.proveedor IS 'Razón social del distribuidor.';
COMMENT ON COLUMN compras.compras.nombre_categoria IS 'Línea de bebidas adquirida.';
COMMENT ON COLUMN compras.compras.detalle_producto IS 'Nombre y formato recibido.';
COMMENT ON COLUMN compras.compras.cantidad_cajas IS 'Cajas recibidas.';
COMMENT ON COLUMN compras.compras.costo_caja IS 'Costo unitario por caja.';
COMMENT ON COLUMN compras.compras.costo_total IS 'Importe total de la compra.';
COMMENT ON COLUMN compras.compras.estado IS 'Estado logístico: Recibido, En Tránsito o Anulado.';
COMMENT ON COLUMN compras.compras.fecha_compra IS 'Fecha y hora de registro de la compra.';

-- =============================================================================
-- BLOQUE G: ESQUEMA tesoreria (Cierres y Arqueos de Caja)
-- =============================================================================

-- 18. TABLA: tesoreria.arqueos_caja (Arqueos por Turno y Sede)
CREATE TABLE tesoreria.arqueos_caja (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_arqueo VARCHAR(30) NOT NULL UNIQUE,
    empresa_id UUID NOT NULL REFERENCES core.empresas(id),
    sede_id UUID NOT NULL REFERENCES core.sedes(id),
    usuario_cajero_id UUID NOT NULL REFERENCES auth.usuarios(id),
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

COMMENT ON SCHEMA tesoreria IS 'Esquema de control de caja chica, fondos fijos, turnos laborales y arqueos.';
COMMENT ON TABLE tesoreria.arqueos_caja IS 'Actas de liquidación y cuadre de caja al cierre de turno laboral por sede.';
COMMENT ON COLUMN tesoreria.arqueos_caja.id IS 'Identificador único universal (UUID v4) del acta.';
COMMENT ON COLUMN tesoreria.arqueos_caja.codigo_arqueo IS 'Código de arqueo (ej. ARQ-2026-014).';
COMMENT ON COLUMN tesoreria.arqueos_caja.empresa_id IS 'Empresa asociada.';
COMMENT ON COLUMN tesoreria.arqueos_caja.sede_id IS 'Sede o local liquidado.';
COMMENT ON COLUMN tesoreria.arqueos_caja.usuario_cajero_id IS 'Cajero responsable en auth.usuarios(id).';
COMMENT ON COLUMN tesoreria.arqueos_caja.nombre_turno IS 'Descripción del turno liquidado.';
COMMENT ON COLUMN tesoreria.arqueos_caja.saldo_apertura IS 'Fondo inicial de sencillo.';
COMMENT ON COLUMN tesoreria.arqueos_caja.ventas_efectivo IS 'Cobrado en efectivo durante el turno.';
COMMENT ON COLUMN tesoreria.arqueos_caja.ventas_digitales IS 'Cobrado vía billeteras y POS.';
COMMENT ON COLUMN tesoreria.arqueos_caja.gastos IS 'Egresos menores autorizados.';
COMMENT ON COLUMN tesoreria.arqueos_caja.efectivo_esperado IS 'Monto teórico del sistema.';
COMMENT ON COLUMN tesoreria.arqueos_caja.efectivo_contado IS 'Monto físico real contado.';
COMMENT ON COLUMN tesoreria.arqueos_caja.diferencia IS 'Diferencia (Contado - Esperado).';
COMMENT ON COLUMN tesoreria.arqueos_caja.estado_arqueo IS 'Cuadre Exacto, Sobrante o Faltante.';
COMMENT ON COLUMN tesoreria.arqueos_caja.fecha_cierre IS 'Fecha y hora de cierre.';

-- =============================================================================
-- BLOQUE H: ESQUEMA notificaciones (Centro de Alertas del Sistema)
-- =============================================================================

-- 19. TABLA: notificaciones.notificaciones_sistema (Alertas Operativas)
CREATE TABLE notificaciones.notificaciones_sistema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_notificacion VARCHAR(20) NOT NULL UNIQUE,
    empresa_id UUID NOT NULL REFERENCES core.empresas(id) ON DELETE CASCADE,
    titulo VARCHAR(140) NOT NULL,
    descripcion TEXT NOT NULL,
    categoria VARCHAR(60) NOT NULL,
    icono VARCHAR(80) NOT NULL,
    tipo_notificacion VARCHAR(20) NOT NULL
        CHECK (tipo_notificacion IN ('success', 'info', 'warning', 'danger')),
    no_leida BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON SCHEMA notificaciones IS 'Esquema de mensajería, eventos y notificaciones operativas.';
COMMENT ON TABLE notificaciones.notificaciones_sistema IS 'Alertas operativas del centro de notificaciones de la barra superior.';
COMMENT ON COLUMN notificaciones.notificaciones_sistema.id IS 'Identificador único universal (UUID v4) de la alerta.';
COMMENT ON COLUMN notificaciones.notificaciones_sistema.codigo_notificacion IS 'Código de referencia (ej. NOT-01).';
COMMENT ON COLUMN notificaciones.notificaciones_sistema.empresa_id IS 'Empresa destinataria.';
COMMENT ON COLUMN notificaciones.notificaciones_sistema.titulo IS 'Título resumido.';
COMMENT ON COLUMN notificaciones.notificaciones_sistema.descripcion IS 'Contenido de la alerta.';
COMMENT ON COLUMN notificaciones.notificaciones_sistema.categoria IS 'Área funcional emisora.';
COMMENT ON COLUMN notificaciones.notificaciones_sistema.icono IS 'Clase CSS del ícono.';
COMMENT ON COLUMN notificaciones.notificaciones_sistema.tipo_notificacion IS 'Severidad: success, info, warning o danger.';
COMMENT ON COLUMN notificaciones.notificaciones_sistema.no_leida IS 'TRUE si está pendiente de lectura.';
COMMENT ON COLUMN notificaciones.notificaciones_sistema.fecha_creacion IS 'Fecha y hora de generación.';
