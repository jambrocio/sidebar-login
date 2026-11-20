-- =============================================================================
-- SCRIPT SQL: 08_split_customers_and_products_scope.sql
-- DESCRIPCIÓN: Separación independiente de Clientes y Usuarios en el Menú RBAC,
--              Unicidad multi-tenant de clientes por empresa_id y catálogo general de productos.
-- =============================================================================

SET search_path TO auth, rbac, core, inventario, ventas, compras, tesoreria, notificaciones, public;

-- 1. Crear tabla independiente ventas.clientes con clave única compuesta por negocio
CREATE TABLE IF NOT EXISTS ventas.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core.empresas(id) ON DELETE CASCADE,
    codigo_cliente VARCHAR(40) NOT NULL,
    tipo_documento VARCHAR(20) NOT NULL DEFAULT 'RUC'
        CHECK (tipo_documento IN ('RUC', 'DNI', 'CE', 'PASAPORTE')),
    numero_documento VARCHAR(30) NOT NULL,
    razon_social VARCHAR(180) NOT NULL,
    nombre_comercial VARCHAR(180),
    tipo_cliente VARCHAR(40) NOT NULL DEFAULT 'Minorista Frecuente'
        CHECK (tipo_cliente IN ('Mayorista VIP', 'Minorista Frecuente', 'Distribuidor', 'Corporativo')),
    correo_electronico VARCHAR(120),
    telefono VARCHAR(40),
    direccion VARCHAR(220),
    linea_credito NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    registrado_por_usuario_id UUID NULL REFERENCES auth.usuarios(id) ON DELETE SET NULL,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cliente_empresa_codigo UNIQUE (empresa_id, codigo_cliente),
    CONSTRAINT uq_cliente_empresa_documento UNIQUE (empresa_id, numero_documento)
);

-- 2. Poblar clientes de prueba iniciales para BIZ-001 y BIZ-002
INSERT INTO ventas.clientes (
    id, empresa_id, codigo_cliente, tipo_documento, numero_documento, razon_social, nombre_comercial,
    tipo_cliente, correo_electronico, telefono, direccion, linea_credito, registrado_por_usuario_id
) VALUES
(
    '44444444-4444-4444-8444-444444444101',
    'a0000000-0000-4000-8000-000000000001', -- BIZ-001 El Roble
    'CLI-001',
    'RUC',
    '20601234567',
    'Licorería El Brindis S.A.C.',
    'El Brindis Mayorista',
    'Mayorista VIP',
    'compras@elbrindis.pe',
    '+51 987 654 321',
    'Av. Los Conquistadores 450, San Isidro, Lima',
    25000.00,
    '11111111-1111-4111-8111-111111111101'
),
(
    '44444444-4444-4444-8444-444444444102',
    'a0000000-0000-4000-8000-000000000001', -- BIZ-001 El Roble
    'CLI-002',
    'DNI',
    '45892147',
    'Juan Carlos Pérez Rodríguez',
    'Bodega Don Juan',
    'Minorista Frecuente',
    'juan.perez@gmail.com',
    '+51 912 345 678',
    'Jr. Las Begonias 220, Lince, Lima',
    5000.00,
    '11111111-1111-4111-8111-111111111101'
),
(
    '44444444-4444-4444-8444-444444444103',
    'a0000000-0000-4000-8000-000000000002', -- BIZ-002 Andina Drinks
    'CLI-001', -- Mismo código permitido porque pertenece a otra empresa_id
    'RUC',
    '20548963214',
    'Restobar Los Andes E.I.R.L.',
    'Los Andes Resto',
    'Mayorista VIP',
    'contacto@losandesrestobar.pe',
    '+51 954 123 789',
    'Calle Mercaderes 110, Arequipa',
    18000.00,
    '11111111-1111-4111-8111-111111111104'
)
ON CONFLICT (empresa_id, codigo_cliente) DO NOTHING;

-- 3. Actualizar elementos de menú existentes
UPDATE rbac.opciones_menu
SET etiqueta = 'Usuarios',
    etiqueta_miga_pan = 'Usuarios',
    orden = 2
WHERE id = '33333333-3333-4333-8333-333333333208';

INSERT INTO rbac.opciones_menu (
    id,
    padre_id,
    codigo,
    etiqueta,
    icono,
    ruta_enlace,
    etiqueta_miga_pan,
    orden,
    es_grupo,
    es_visible
) VALUES (
    '33333333-3333-4333-8333-333333333211',
    '33333333-3333-4333-8333-333333333104',
    'MGMT_CUSTOMERS',
    'Clientes',
    'bi bi-person-badge-fill',
    '/dashboard/customers',
    'Clientes',
    3,
    FALSE,
    TRUE
) ON CONFLICT (id) DO UPDATE SET
    padre_id = EXCLUDED.padre_id,
    codigo = EXCLUDED.codigo,
    etiqueta = EXCLUDED.etiqueta,
    icono = EXCLUDED.icono,
    ruta_enlace = EXCLUDED.ruta_enlace,
    etiqueta_miga_pan = EXCLUDED.etiqueta_miga_pan,
    orden = EXCLUDED.orden,
    es_grupo = EXCLUDED.es_grupo,
    es_visible = EXCLUDED.es_visible;

UPDATE rbac.opciones_menu SET orden = 4 WHERE id = '33333333-3333-4333-8333-333333333209';
UPDATE rbac.opciones_menu SET orden = 5 WHERE id = '33333333-3333-4333-8333-333333333210';

UPDATE rbac.opciones_menu
SET etiqueta = 'Catálogo de Productos',
    etiqueta_miga_pan = 'Catálogo de Productos'
WHERE id = '33333333-3333-4333-8333-333333333103';

UPDATE rbac.opciones_menu
SET etiqueta = 'Registrar Producto',
    etiqueta_miga_pan = 'Registrar Producto'
WHERE id = '33333333-3333-4333-8333-333333333302';

UPDATE rbac.opciones_menu
SET etiqueta = 'Categorías de Productos',
    etiqueta_miga_pan = 'Categorías de Productos'
WHERE id = '33333333-3333-4333-8333-333333333303';

-- 4. Asignar permisos RBAC para MGMT_CUSTOMERS a los roles del sistema
INSERT INTO rbac.permisos_rol_menu (
    rol_id, opcion_menu_id, visible_en_menu, puede_ver, puede_crear, puede_editar, puede_eliminar, puede_exportar
) VALUES (
    '22222222-2222-4222-8222-222222222201',
    '33333333-3333-4333-8333-333333333211',
    TRUE, TRUE, TRUE, TRUE, TRUE, TRUE
) ON CONFLICT (rol_id, opcion_menu_id) DO UPDATE SET
    visible_en_menu = TRUE, puede_ver = TRUE, puede_crear = TRUE, puede_editar = TRUE, puede_eliminar = TRUE, puede_exportar = TRUE;

INSERT INTO rbac.permisos_rol_menu (
    rol_id, opcion_menu_id, visible_en_menu, puede_ver, puede_crear, puede_editar, puede_eliminar, puede_exportar
) VALUES (
    '22222222-2222-4222-8222-222222222202',
    '33333333-3333-4333-8333-333333333211',
    TRUE, TRUE, TRUE, TRUE, FALSE, TRUE
) ON CONFLICT (rol_id, opcion_menu_id) DO UPDATE SET
    visible_en_menu = TRUE, puede_ver = TRUE, puede_crear = TRUE, puede_editar = TRUE, puede_eliminar = FALSE, puede_exportar = TRUE;

INSERT INTO rbac.permisos_rol_menu (
    rol_id, opcion_menu_id, visible_en_menu, puede_ver, puede_crear, puede_editar, puede_eliminar, puede_exportar
) VALUES (
    '22222222-2222-4222-8222-222222222203',
    '33333333-3333-4333-8333-333333333211',
    TRUE, TRUE, TRUE, FALSE, FALSE, FALSE
) ON CONFLICT (rol_id, opcion_menu_id) DO UPDATE SET
    visible_en_menu = TRUE, puede_ver = TRUE, puede_crear = TRUE, puede_editar = FALSE, puede_eliminar = FALSE, puede_exportar = FALSE;
