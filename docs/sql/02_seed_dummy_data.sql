-- =============================================================================
-- ARCHIVO: 02_seed_dummy_data.sql
-- DESCRIPCIÓN: Inserts de datos de prueba sincronizados 1:1 con los archivos
--              de la carpeta /json:
--              - json/business-and-branches.json (2 Negocios Matriz y 6 Locales)
--              - json/users-and-roles.json (Roles, Usuarios y Locales Asignados)
--              - json/sidebar-menu.json (Árbol completo de opciones del Sidebar)
--              - json/products-and-categories.json (Líneas y Bebidas Mayor/Menor)
--              - json/coupons.json (Cupones promocionales)
--              - json/sales-and-cart.json (Ventas emitidas y detalle multiproducto)
--              - json/purchases.json (Órdenes de compra y abastecimiento)
--              - json/cash-register.json (Arqueos de caja por local)
--              - json/notifications.json (Notificaciones del sistema)
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. NEGOCIOS MATRIZ (json/business-and-branches.json -> "businesses")
-- =============================================================================
INSERT INTO empresas (
    id, codigo, nombre_comercial, razon_social, identificacion_fiscal,
    direccion_fiscal, telefono, correo_soporte, zona_horaria, moneda
) VALUES
(
    'a0000000-0000-4000-8000-000000000001',
    'BIZ-001',
    'El Roble — Bebidas & Licores',
    'Distribuidora de Licores y Bebidas El Roble S.A.C.',
    '20608945123',
    'Av. Industrial 1450, Cercado de Lima',
    '+51 01 480-9920',
    'ventas@distribuidoraelroble.com',
    'America/Lima (GMT-5)',
    'USD ($)'
),
(
    'a0000000-0000-4000-8000-000000000002',
    'BIZ-002',
    'Andina Drinks Mayorista',
    'Corporación Licorera Andina del Sur S.A.C.',
    '20554128901',
    'Av. Ejército 910, Arequipa',
    '+51 054 240-110',
    'administracion@andinadrinks.com',
    'America/Lima (GMT-5)',
    'USD ($)'
);

-- =============================================================================
-- 2. LOCALES / SUCURSALES POR NEGOCIO (json/business-and-branches.json -> "branches")
-- =============================================================================
INSERT INTO sedes (
    id, empresa_id, codigo, nombre, tipo_sede,
    direccion, telefono, serie_facturacion, nombre_encargado, terminales_pos, estado
) VALUES
-- Locales de BIZ-001 (Distribuidora El Roble S.A.C.)
(
    'b0000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'LOC-01',
    'Sede Central (Mayorista)',
    'Almacén Central y Mayorista',
    'Av. Industrial 1450, Cercado de Lima',
    '+51 01 480-9921',
    'F001 / B001',
    'Ana García (agarcia)',
    4,
    'Operativo'
),
(
    'b0000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    'LOC-02',
    'Tienda Norte (Licorería Express)',
    'Tienda Minorista / Express',
    'Av. Carlos Izaguirre 820, Los Olivos',
    '+51 01 521-3340',
    'F002 / B002',
    'Lucía Torres (ltorres)',
    2,
    'Operativo'
),
(
    'b0000000-0000-4000-8000-000000000003',
    'a0000000-0000-4000-8000-000000000001',
    'LOC-03',
    'Sucursal Sur (Distribuidora)',
    'Centro Mayorista y Minorista',
    'Av. Caminos del Inca 1140, Surco',
    '+51 01 275-8810',
    'F003 / B003',
    'Carlos Mendoza (cmendoza)',
    3,
    'Operativo'
),
(
    'b0000000-0000-4000-8000-000000000004',
    'a0000000-0000-4000-8000-000000000001',
    'LOC-04',
    'Tienda Este (Mayor y Menor)',
    'Sucursal Mixta HORECA',
    'Av. Javier Prado Este 5210, La Molina',
    '+51 01 348-1190',
    'F004 / B004',
    'Roberto Díaz (rdiaz)',
    2,
    'Operativo'
),
-- Locales de BIZ-002 (Corporación Licorera Andina del Sur S.A.C.)
(
    'b0000000-0000-4000-8000-000000000005',
    'a0000000-0000-4000-8000-000000000002',
    'LOC-05',
    'Almacén Mayorista Arequipa',
    'Almacén Central y Mayorista',
    'Av. Ejército 910, Yanahuara',
    '+51 054 240-115',
    'F010 / B010',
    'Marco Paredes (mparedes)',
    3,
    'Operativo'
),
(
    'b0000000-0000-4000-8000-000000000006',
    'a0000000-0000-4000-8000-000000000002',
    'LOC-06',
    'Licorería Express Cayma',
    'Tienda Minorista / Express',
    'Av. Trinidad Morán 412, Cayma',
    '+51 054 251-890',
    'F011 / B011',
    'Sofía Quispe (squispe)',
    2,
    'Operativo'
);

-- =============================================================================
-- 3. ROLES DEL SISTEMA (json/users-and-roles.json -> "systemRoles")
-- =============================================================================
INSERT INTO roles (id, codigo, nombre, descripcion, alcance, es_sistema, activo) VALUES
(
    '22222222-2222-4222-8222-222222222201',
    'ADMIN',
    'Administrador General',
    'Control total del Negocio Matriz, sus múltiples locales, usuarios, roles y catálogo.',
    'Nivel Negocio (Multi-Local)',
    TRUE,
    TRUE
),
(
    '22222222-2222-4222-8222-222222222202',
    'SUPERVISOR',
    'Jefe de Tienda y Compras',
    'Supervisa compras, abastecimiento, cupones y arqueos de los locales asignados.',
    'Nivel Negocio (Multi-Local)',
    TRUE,
    TRUE
),
(
    '22222222-2222-4222-8222-222222222203',
    'ANALYST',
    'Cajero / Vendedor (Mayor/Menor)',
    'Emite ventas por mayor y menor y ejecuta el arqueo de caja en su local asignado.',
    'Nivel Local Asignado',
    FALSE,
    TRUE
),
(
    '22222222-2222-4222-8222-222222222204',
    'AUDITOR',
    'Auditor de Caja e Inventario',
    'Revisión de solo lectura de comprobantes, arqueos de caja y kardex de bebidas.',
    'Nivel Negocio (Multi-Local)',
    FALSE,
    TRUE
);

-- =============================================================================
-- 4. USUARIOS CON NEGOCIO Y LOCAL PRINCIPAL (json/users-and-roles.json -> "users")
-- =============================================================================
INSERT INTO usuarios (
    id, codigo_usuario, nombre_usuario, correo_electronico, hash_contrasena, nombre_completo, iniciales_avatar,
    empresa_id, sede_asignada_id, tipo_cliente, estado, doble_factor_habilitado,
    preferencias_interfaz, fecha_ultimo_acceso
) VALUES
(
    '11111111-1111-4111-8111-111111111101',
    'USR-001',
    'agarcia',
    'ana.garcia@empresa.com',
    '$2b$12$K8p9mZ0Q1r2s3t4u5v6w7x8y9z0A1B2C3D4E5F6G7H8I9J0K1L2M3',
    'Ana García López',
    'AG',
    'a0000000-0000-4000-8000-000000000001', -- BIZ-001
    'b0000000-0000-4000-8000-000000000001', -- LOC-01 Sede Central (Mayorista)
    'Personal Interno',
    'ACTIVE',
    TRUE,
    '{"darkMode": false, "sidebarCollapsed": false}'::jsonb,
    NOW() - INTERVAL '10 minutes'
),
(
    '11111111-1111-4111-8111-111111111102',
    'USR-002',
    'ltorres',
    'lucia.torres@empresa.com',
    '$2b$12$K8p9mZ0Q1r2s3t4u5v6w7x8y9z0A1B2C3D4E5F6G7H8I9J0K1L2M3',
    'Lucía Torres Vega',
    'LT',
    'a0000000-0000-4000-8000-000000000001', -- BIZ-001
    'b0000000-0000-4000-8000-000000000002', -- LOC-02 Tienda Norte (Licorería Express)
    'Personal Interno',
    'ACTIVE',
    FALSE,
    '{"darkMode": false, "sidebarCollapsed": true}'::jsonb,
    NOW() - INTERVAL '1 hour'
),
(
    '11111111-1111-4111-8111-111111111103',
    'USR-003',
    'cmendoza',
    'carlos.mendoza@empresa.com',
    '$2b$12$K8p9mZ0Q1r2s3t4u5v6w7x8y9z0A1B2C3D4E5F6G7H8I9J0K1L2M3',
    'Carlos Mendoza Ríos',
    'CM',
    'a0000000-0000-4000-8000-000000000001', -- BIZ-001
    'b0000000-0000-4000-8000-000000000003', -- LOC-03 Sucursal Sur (Distribuidora)
    'Personal Interno',
    'ACTIVE',
    TRUE,
    '{"darkMode": true, "sidebarCollapsed": true}'::jsonb,
    NOW() - INTERVAL '2 hours'
),
(
    '11111111-1111-4111-8111-111111111104',
    'USR-004',
    'mparedes',
    'mparedes@andinadrinks.com',
    '$2b$12$K8p9mZ0Q1r2s3t4u5v6w7x8y9z0A1B2C3D4E5F6G7H8I9J0K1L2M3',
    'Marco Paredes Salas',
    'MP',
    'a0000000-0000-4000-8000-000000000002', -- BIZ-002
    'b0000000-0000-4000-8000-000000000005', -- LOC-05 Almacén Mayorista Arequipa
    'Personal Interno',
    'ACTIVE',
    FALSE,
    '{"darkMode": false, "sidebarCollapsed": true}'::jsonb,
    NOW() - INTERVAL '1 day'
);

-- =============================================================================
-- 5. ASIGNACIÓN DE LOCALES AUTORIZADOS POR USUARIO (user_branches)
-- =============================================================================
INSERT INTO usuario_sedes (usuario_id, sede_id, es_principal) VALUES
-- Ana García (USR-001) autorizada en los 4 locales de BIZ-001 (Sede Central como principal)
('11111111-1111-4111-8111-111111111101', 'b0000000-0000-4000-8000-000000000001', TRUE),
('11111111-1111-4111-8111-111111111101', 'b0000000-0000-4000-8000-000000000002', FALSE),
('11111111-1111-4111-8111-111111111101', 'b0000000-0000-4000-8000-000000000003', FALSE),
('11111111-1111-4111-8111-111111111101', 'b0000000-0000-4000-8000-000000000004', FALSE),
-- Lucía Torres (USR-002) autorizada en Tienda Norte (LOC-02)
('11111111-1111-4111-8111-111111111102', 'b0000000-0000-4000-8000-000000000002', TRUE),
-- Carlos Mendoza (USR-003) autorizado en Sede Central (LOC-01) y Sucursal Sur (LOC-03)
('11111111-1111-4111-8111-111111111103', 'b0000000-0000-4000-8000-000000000003', TRUE),
('11111111-1111-4111-8111-111111111103', 'b0000000-0000-4000-8000-000000000001', FALSE),
-- Marco Paredes (USR-004) autorizado en los 2 locales de BIZ-002
('11111111-1111-4111-8111-111111111104', 'b0000000-0000-4000-8000-000000000005', TRUE),
('11111111-1111-4111-8111-111111111104', 'b0000000-0000-4000-8000-000000000006', FALSE);

-- =============================================================================
-- 6. ASIGNACIÓN DE ROLES A USUARIOS (user_roles)
-- =============================================================================
INSERT INTO usuario_roles (usuario_id, rol_id, asignado_por_id) VALUES
('11111111-1111-4111-8111-111111111101', '22222222-2222-4222-8222-222222222201', '11111111-1111-4111-8111-111111111101'), -- Ana -> ADMIN
('11111111-1111-4111-8111-111111111102', '22222222-2222-4222-8222-222222222203', '11111111-1111-4111-8111-111111111101'), -- Lucía -> ANALYST
('11111111-1111-4111-8111-111111111103', '22222222-2222-4222-8222-222222222202', '11111111-1111-4111-8111-111111111101'), -- Carlos -> SUPERVISOR
('11111111-1111-4111-8111-111111111104', '22222222-2222-4222-8222-222222222202', '11111111-1111-4111-8111-111111111101'); -- Marco -> SUPERVISOR

-- =============================================================================
-- 7. OPCIONES DE MENÚ DEL SIDEBAR (json/sidebar-menu.json -> "menuItems")
-- =============================================================================
-- Nivel 1: Nodos Raíz
INSERT INTO opciones_menu (id, padre_id, codigo, etiqueta, icono, ruta_enlace, etiqueta_miga_pan, orden, es_grupo, es_visible) VALUES
('33333333-3333-4333-8333-333333333101', NULL, 'DASH_HOME', 'Inicio', 'bi bi-speedometer2', '/dashboard/inicio', 'Inicio', 1, FALSE, TRUE),
('33333333-3333-4333-8333-333333333102', NULL, 'MOD_COMMERCIAL', 'Comercial y Ventas', 'bi bi-cart-check-fill', NULL, 'Comercial y Ventas', 2, TRUE, TRUE),
('33333333-3333-4333-8333-333333333103', NULL, 'MOD_CATALOG', 'Catálogo de Bebidas', 'bi bi-cup-straw', NULL, 'Catálogo de Bebidas', 3, TRUE, TRUE),
('33333333-3333-4333-8333-333333333104', NULL, 'MOD_ADMIN', 'Administración', 'bi bi-folder-fill', NULL, 'Administración', 4, TRUE, TRUE),
('33333333-3333-4333-8333-333333333105', NULL, 'MOD_REPORTS', 'Reportes Comerciales', 'bi bi-file-earmark-bar-graph-fill', '/dashboard/reports', 'Reportes Comerciales', 5, FALSE, TRUE),
('33333333-3333-4333-8333-333333333106', NULL, 'PROFILE_SETTINGS', 'Configuración', 'bi bi-sliders', '/dashboard/settings', 'Configuración', 6, FALSE, FALSE);

-- Nivel 2: Hijos de "Comercial y Ventas"
INSERT INTO opciones_menu (id, padre_id, codigo, etiqueta, icono, ruta_enlace, etiqueta_miga_pan, orden, es_grupo, es_visible) VALUES
('33333333-3333-4333-8333-333333333201', '33333333-3333-4333-8333-333333333102', 'SALES_WHOLESALE_RETAIL', 'Ventas Mayor / Menor', 'bi bi-shop', '/dashboard/sales', 'Ventas Mayor / Menor', 1, FALSE, TRUE),
('33333333-3333-4333-8333-333333333202', '33333333-3333-4333-8333-333333333102', 'SALES_HISTORY', 'Historial de Ventas Emitidas', 'bi bi-receipt-cutoff', '/dashboard/sales-history', 'Historial de Ventas Emitidas', 2, FALSE, TRUE),
('33333333-3333-4333-8333-333333333203', '33333333-3333-4333-8333-333333333102', 'PURCHASES_SUPPLIERS', 'Compras y Abastecimiento', 'bi bi-truck', '/dashboard/purchases', 'Compras y Abastecimiento', 3, FALSE, TRUE),
('33333333-3333-4333-8333-333333333204', '33333333-3333-4333-8333-333333333102', 'DISCOUNT_COUPONS', 'Cupones de Descuento', 'bi bi-ticket-perforated-fill', '/dashboard/coupons', 'Cupones de Descuento', 4, FALSE, TRUE),
('33333333-3333-4333-8333-333333333205', '33333333-3333-4333-8333-333333333102', 'CASH_REGISTER_AUDIT', 'Arqueo de Caja (Turnos)', 'bi bi-cash-coin', '/dashboard/cash-register', 'Arqueo de Caja (Turnos)', 5, FALSE, TRUE);

-- Nivel 2: Hijos de "Catálogo de Bebidas"
INSERT INTO opciones_menu (id, padre_id, codigo, etiqueta, icono, ruta_enlace, etiqueta_miga_pan, orden, es_grupo, es_visible) VALUES
('33333333-3333-4333-8333-333333333206', '33333333-3333-4333-8333-333333333103', 'SUB_PRODUCTS_PRICES', 'Productos y Precios', 'bi bi-box-seam-fill', NULL, 'Productos y Precios', 1, TRUE, TRUE);

-- Nivel 3: Hijos de "Productos y Precios"
INSERT INTO opciones_menu (id, padre_id, codigo, etiqueta, icono, ruta_enlace, etiqueta_miga_pan, orden, es_grupo, es_visible) VALUES
('33333333-3333-4333-8333-333333333301', '33333333-3333-4333-8333-333333333206', 'PROD_LIST', 'Inventario Mayor / Menor', 'bi bi-list-ul', '/dashboard/products/list', 'Inventario Mayor / Menor', 1, FALSE, TRUE),
('33333333-3333-4333-8333-333333333302', '33333333-3333-4333-8333-333333333206', 'PROD_ADD', 'Registrar Bebida', 'bi bi-plus-square-fill', '/dashboard/products/add', 'Registrar Bebida', 2, FALSE, TRUE),
('33333333-3333-4333-8333-333333333303', '33333333-3333-4333-8333-333333333206', 'SUB_CATEGORIES', 'Líneas y Categorías', 'bi bi-tags-fill', NULL, 'Líneas y Categorías', 3, TRUE, TRUE);

-- Nivel 4: Hijos de "Líneas y Categorías"
INSERT INTO opciones_menu (id, padre_id, codigo, etiqueta, icono, ruta_enlace, etiqueta_miga_pan, orden, es_grupo, es_visible) VALUES
('33333333-3333-4333-8333-333333333401', '33333333-3333-4333-8333-333333333303', 'CAT_LIST', 'Listar Categorías', 'bi bi-list-task', '/dashboard/categories', 'Listar Categorías', 1, FALSE, TRUE),
('33333333-3333-4333-8333-333333333402', '33333333-3333-4333-8333-333333333303', 'CAT_ADD', 'Nueva Categoría', 'bi bi-plus-circle-fill', '/dashboard/categories/new', 'Nueva Categoría', 2, FALSE, TRUE);

-- Nivel 2: Hijos de "Administración"
INSERT INTO opciones_menu (id, padre_id, codigo, etiqueta, icono, ruta_enlace, etiqueta_miga_pan, orden, es_grupo, es_visible) VALUES
('33333333-3333-4333-8333-333333333207', '33333333-3333-4333-8333-333333333104', 'MGMT_BUSINESS_BRANCHES', 'Negocio y Locales', 'bi bi-buildings-fill', '/dashboard/branches', 'Negocio y Locales', 1, FALSE, TRUE),
('33333333-3333-4333-8333-333333333208', '33333333-3333-4333-8333-333333333104', 'MGMT_USERS', 'Clientes y Usuarios', 'bi bi-people-fill', '/dashboard/users', 'Clientes y Usuarios', 2, FALSE, TRUE),
('33333333-3333-4333-8333-333333333209', '33333333-3333-4333-8333-333333333104', 'MGMT_ROLES', 'Roles y Permisos', 'bi bi-shield-check', '/dashboard/roles', 'Roles y Permisos', 3, FALSE, TRUE),
('33333333-3333-4333-8333-333333333210', '33333333-3333-4333-8333-333333333104', 'MGMT_SESSIONS', 'Sesiones y Auditoría', 'bi bi-shield-lock-fill', '/dashboard/sessions', 'Sesiones y Auditoría', 4, FALSE, TRUE);

-- =============================================================================
-- 8. PERMISOS DE MENÚ POR ROL (role_menu_permissions)
-- =============================================================================
INSERT INTO permisos_rol_menu (rol_id, opcion_menu_id, visible_en_menu, puede_ver, puede_crear, puede_editar, puede_eliminar, puede_exportar)
SELECT
    '22222222-2222-4222-8222-222222222201',
    id,
    es_visible, TRUE, TRUE, TRUE, TRUE, TRUE
FROM opciones_menu;

-- Permisos base para SUPERVISOR (Todo excepto eliminar roles)
INSERT INTO permisos_rol_menu (rol_id, opcion_menu_id, visible_en_menu, puede_ver, puede_crear, puede_editar, puede_eliminar, puede_exportar)
SELECT
    '22222222-2222-4222-8222-222222222202',
    id,
    es_visible,
    CASE WHEN codigo = 'MGMT_ROLES' THEN FALSE ELSE TRUE END,
    CASE WHEN codigo IN ('MGMT_ROLES', 'SALES_HISTORY') THEN FALSE ELSE TRUE END,
    CASE WHEN codigo IN ('MGMT_ROLES', 'SALES_HISTORY') THEN FALSE ELSE TRUE END,
    FALSE,
    TRUE
FROM opciones_menu;

-- =============================================================================
-- 9. CATEGORÍAS Y PRODUCTOS DE BEBIDAS (json/products-and-categories.json)
-- =============================================================================
INSERT INTO categorias_bebidas (
    id, empresa_id, codigo, nombre, slug, total_productos, margen_mayorista, activo
) VALUES
(
    'c0000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'LIN-LIC',
    'Licores y Destilados (Whisky, Ron, Pisco, Vodka)',
    'licores-destilados',
    64,
    '22% margen mayorista',
    TRUE
),
(
    'c0000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    'LIN-CER',
    'Cervezas Nacionales e Importadas',
    'cervezas',
    38,
    '16% margen mayorista',
    TRUE
),
(
    'c0000000-0000-4000-8000-000000000003',
    'a0000000-0000-4000-8000-000000000001',
    'LIN-GAS',
    'Gaseosas, Aguas de Mesa y Refrescos',
    'gaseosas-aguas',
    45,
    '18% margen mayorista',
    TRUE
);

INSERT INTO productos_bebidas (
    id, empresa_id, categoria_id, codigo_sku, nombre, nombre_categoria,
    presentacion, precio_minorista, precio_mayorista, stock_cajas, stock_unidades,
    estado_stock, registrado_por_usuario_id
) VALUES
(
    'd0000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'c0000000-0000-4000-8000-000000000002',
    'CER-102',
    'Cerveza Corona Extra 355ml',
    'Cervezas',
    'Caja x 24 Botellas (4 Six-Pack)',
    2.20,
    44.00,
    62,
    1488,
    'En Stock',
    '11111111-1111-4111-8111-111111111103' -- Carlos Mendoza
),
(
    'd0000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    'c0000000-0000-4000-8000-000000000001',
    'LIC-001',
    'Whisky Johnnie Walker Black Label 750ml',
    'Licores',
    'Caja x 12 Botellas',
    38.50,
    410.00,
    24,
    288,
    'En Stock',
    '11111111-1111-4111-8111-111111111101' -- Ana García
),
(
    'd0000000-0000-4000-8000-000000000003',
    'a0000000-0000-4000-8000-000000000001',
    'c0000000-0000-4000-8000-000000000002',
    'CER-101',
    'Cerveza Pilsen Callao 630ml Retornable',
    'Cervezas',
    'Caja x 12 Botellas',
    2.50,
    25.50,
    8,
    96,
    'Stock Bajo',
    '11111111-1111-4111-8111-111111111103' -- Carlos Mendoza
),
(
    'd0000000-0000-4000-8000-000000000004',
    'a0000000-0000-4000-8000-000000000001',
    'c0000000-0000-4000-8000-000000000003',
    'GAS-201',
    'Gaseosa Inca Kola / Coca-Cola 3 Litros',
    'Gaseosas',
    'Paquete x 6 Botellas',
    3.40,
    17.80,
    85,
    510,
    'En Stock',
    '11111111-1111-4111-8111-111111111101' -- Ana García
),
(
    'd0000000-0000-4000-8000-000000000005',
    'a0000000-0000-4000-8000-000000000001',
    'c0000000-0000-4000-8000-000000000001',
    'LIC-002',
    'Ron Cartavio XO 18 Años 750ml',
    'Licores',
    'Caja x 6 Botellas',
    52.00,
    276.00,
    15,
    90,
    'En Stock',
    '11111111-1111-4111-8111-111111111101' -- Ana García
);

-- =============================================================================
-- 10. CUPONES DE DESCUENTO (json/coupons.json -> "coupons")
-- =============================================================================
INSERT INTO cupones_descuento (
    empresa_id, codigo, tipo_descuento, valor_descuento, modalidad_objetivo,
    categoria_objetivo, cliente_asignado, compra_minima, usos_actuales, usos_maximos,
    etiqueta_expiracion, activo, creado_por_usuario_id
) VALUES
(
    'a0000000-0000-4000-8000-000000000001',
    'MAYORISTA15',
    'PERCENT',
    15.00,
    'Mayorista',
    'Todas',
    'Licorería El Brindis S.A.C.',
    500.00,
    12,
    50,
    '31 Dic 2026',
    TRUE,
    '11111111-1111-4111-8111-111111111101'
),
(
    'a0000000-0000-4000-8000-000000000001',
    'LICORVIP20',
    'PERCENT',
    20.00,
    'Mayor y Menor',
    'Licores',
    'Restaurante & Bar La Esquina',
    200.00,
    8,
    20,
    '30 Nov 2026',
    TRUE,
    '11111111-1111-4111-8111-111111111101'
),
(
    'a0000000-0000-4000-8000-000000000001',
    'PROMO10',
    'FIXED',
    10.00,
    'Minorista',
    'Cervezas',
    'Todos los Clientes Minoristas',
    50.00,
    45,
    100,
    '31 Oct 2026',
    TRUE,
    '11111111-1111-4111-8111-111111111102'
);

-- =============================================================================
-- 11. VENTAS EMITIDAS Y DETALLE MULTIPRODUCTO (json/sales-and-cart.json)
-- =============================================================================
INSERT INTO ventas (
    id, codigo_venta, tipo_comprobante, empresa_id, sede_id, usuario_vendedor_id,
    nombre_cliente, modalidad, metodo_pago, resumen_items, cantidad_total_items,
    subtotal, codigo_cupon, monto_descuento, impuesto_igv, total
) VALUES
(
    'e0000000-0000-4000-8000-000000000001',
    'VTA-9041',
    'FACTURA ELECTRÓNICA',
    'a0000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-000000000001', -- Sede Central
    '11111111-1111-4111-8111-111111111101', -- Ana García
    'Licorería El Brindis S.A.C.',
    'Mayorista y Minorista',
    'Transferencia / Yape',
    '20 Cajas Cerveza Corona + 5 Cajas Whisky JW Black (25 cajas)',
    25,
    2930.00,
    'MAYORISTA15',
    439.50,
    448.29,
    2490.50
),
(
    'e0000000-0000-4000-8000-000000000002',
    'VTA-9039',
    'FACTURA ELECTRÓNICA',
    'a0000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-000000000001', -- Sede Central
    '11111111-1111-4111-8111-111111111101', -- Ana García
    'Restaurante & Bar La Esquina',
    'Por Mayor',
    'Tarjeta',
    '4 Cajas Ron Cartavio XO + 10 Paquetes Gaseosa 3L (14 ítems)',
    14,
    1282.00,
    'LICORVIP20',
    256.40,
    184.61,
    1025.60
),
(
    'e0000000-0000-4000-8000-000000000003',
    'VTA-9037',
    'BOLETA DE VENTA ELECTRÓNICA',
    'a0000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-000000000001', -- Sede Central
    '11111111-1111-4111-8111-111111111101', -- Ana García
    'Bodega Mayorista Don Pepe',
    'Mayor y Menor',
    'Efectivo',
    '15 Cajas Pilsen Callao + 3 Botellas Whisky JW Black (18 ítems)',
    18,
    498.00,
    NULL,
    0.00,
    89.64,
    498.00
),
(
    'e0000000-0000-4000-8000-000000000004',
    'VTA-9040',
    'BOLETA DE VENTA ELECTRÓNICA',
    'a0000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-000000000002', -- Tienda Norte
    '11111111-1111-4111-8111-111111111102', -- Lucía Torres
    'Cliente Mostrador (Juan Pérez)',
    'Por Menor',
    'Efectivo',
    '3 Botellas Ron Cartavio + 4 Gaseosas 3L (7 unds.)',
    7,
    169.60,
    'PROMO10',
    10.00,
    28.73,
    159.60
);

INSERT INTO detalles_venta (
    venta_id, sku_producto, nombre_producto, modalidad, etiqueta_unidad, cantidad, precio_unitario, subtotal_linea
) VALUES
-- Ítems de VTA-9041
('e0000000-0000-4000-8000-000000000001', 'CER-102', 'Cerveza Corona Extra 355ml', 'Por Mayor', 'Cajas (x24)', 20, 44.00, 880.00),
('e0000000-0000-4000-8000-000000000001', 'LIC-001', 'Whisky Johnnie Walker Black Label 750ml', 'Por Mayor', 'Cajas (x12)', 5, 410.00, 2050.00),
-- Ítems de VTA-9039
('e0000000-0000-4000-8000-000000000002', 'LIC-002', 'Ron Cartavio XO 18 Años 750ml', 'Por Mayor', 'Caja x 6 Botellas', 4, 276.00, 1104.00),
('e0000000-0000-4000-8000-000000000002', 'GAS-201', 'Gaseosa Inca Kola / Coca-Cola 3 Litros', 'Por Mayor', 'Paquete x 6 Botellas', 10, 17.80, 178.00),
-- Ítems de VTA-9037
('e0000000-0000-4000-8000-000000000003', 'CER-101', 'Cerveza Pilsen Callao 630ml Retornable', 'Por Mayor', 'Caja x 12 Botellas', 15, 25.50, 382.50),
('e0000000-0000-4000-8000-000000000003', 'LIC-001', 'Whisky Johnnie Walker Black Label 750ml', 'Por Menor', 'Botellas (Und.)', 3, 38.50, 115.50),
-- Ítems de VTA-9040
('e0000000-0000-4000-8000-000000000004', 'LIC-002', 'Ron Cartavio XO 18 Años 750ml', 'Por Menor', 'Botellas (Und.)', 3, 52.00, 156.00),
('e0000000-0000-4000-8000-000000000004', 'GAS-201', 'Gaseosa Inca Kola / Coca-Cola 3 Litros', 'Por Menor', 'Botellas (Und.)', 4, 3.40, 13.60);

-- =============================================================================
-- 12. COMPRAS Y ABASTECIMIENTO (json/purchases.json -> "purchases")
-- =============================================================================
INSERT INTO compras (
    codigo_compra, empresa_id, sede_id, usuario_comprador_id, proveedor,
    nombre_categoria, detalle_producto, cantidad_cajas, costo_caja, costo_total, estado
) VALUES
(
    'OC-2026-089',
    'a0000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111103', -- Carlos Mendoza
    'Unión de Cervecerías Backus y Johnston',
    'Cervezas',
    'Cerveza Pilsen Callao 630ml y Cusqueña Dorada',
    120,
    20.50,
    2460.00,
    'Recibido'
),
(
    'OC-2026-088',
    'a0000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111101', -- Ana García
    'Diageo / Importadora Premium Licores',
    'Licores',
    'Whisky Johnnie Walker Black & Red Label 750ml',
    30,
    330.00,
    9900.00,
    'Recibido'
);

-- =============================================================================
-- 13. ARQUEOS Y CIERRES DE CAJA (json/cash-register.json -> "cashAudits")
-- =============================================================================
INSERT INTO arqueos_caja (
    codigo_arqueo, empresa_id, sede_id, usuario_cajero_id, nombre_turno,
    saldo_apertura, ventas_efectivo, ventas_digitales, gastos,
    efectivo_esperado, efectivo_contado, diferencia, estado_arqueo
) VALUES
(
    'ARQ-2026-014',
    'a0000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-000000000001', -- Sede Central
    '11111111-1111-4111-8111-111111111101', -- Ana García
    'Turno Mañana (08:00 - 16:00)',
    500.00,
    4850.00,
    6200.00,
    150.00,
    5200.00,
    5200.00,
    0.00,
    'Cuadre Exacto'
),
(
    'ARQ-2026-013',
    'a0000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-000000000002', -- Tienda Norte
    '11111111-1111-4111-8111-111111111102', -- Lucía Torres
    'Turno Mañana (08:00 - 16:00)',
    200.00,
    1720.00,
    640.00,
    80.00,
    1840.00,
    1840.00,
    0.00,
    'Cuadre Exacto'
);

-- =============================================================================
-- 14. NOTIFICACIONES Y AUDITORÍA (json/notifications.json & dashboard-overview.json)
-- =============================================================================
INSERT INTO notificaciones_sistema (
    codigo_notificacion, empresa_id, titulo, descripcion, categoria, icono, tipo_notificacion, no_leida
) VALUES
(
    'NOT-01',
    'a0000000-0000-4000-8000-000000000001',
    'Stock bajo en Cervezas',
    'Quedan solo 8 cajas de "Cerveza Pilsen Callao 630ml (Caja x12)" en almacén.',
    'Almacén',
    'bi-exclamation-triangle-fill',
    'warning',
    TRUE
),
(
    'NOT-02',
    'a0000000-0000-4000-8000-000000000001',
    'Pedido Mayorista confirmado',
    'Licorería El Brindis S.A.C. compró 45 cajas aplicando el cupón MAYORISTA15.',
    'Ventas Mayor',
    'bi-cart-check-fill',
    'success',
    TRUE
),
(
    'NOT-03',
    'a0000000-0000-4000-8000-000000000001',
    'Ingreso de compra de Licores',
    'Se recepcionaron 30 cajas de Whisky Johnnie Walker Etiqueta Negra 750ml.',
    'Compras',
    'bi-truck',
    'info',
    TRUE
),
(
    'NOT-04',
    'a0000000-0000-4000-8000-000000000001',
    'Cupón próximo a vencer',
    'El cupón promocional "CHELA10" para clientes minoristas vence mañana.',
    'Cupones',
    'bi-ticket-perforated-fill',
    'danger',
    FALSE
);

INSERT INTO auditoria_autenticacion (usuario_id, sede_id, tipo_evento, detalle_accion, distintivo_modulo) VALUES
(
    '11111111-1111-4111-8111-111111111101',
    'b0000000-0000-4000-8000-000000000001',
    'SALE_EMITTED',
    'Emitió Comprobante VTA-9041 (25 ítems Mayoristas) con cupón MAYORISTA15',
    'Venta'
),
(
    '11111111-1111-4111-8111-111111111103',
    'b0000000-0000-4000-8000-000000000001',
    'PURCHASE_REGISTERED',
    'Registró Orden de Compra OC-2026-089 (120 cajas de Cerveza Pilsen)',
    'Compra'
),
(
    '11111111-1111-4111-8111-111111111101',
    'b0000000-0000-4000-8000-000000000001',
    'COUPON_CREATED',
    'Generó el cupón de descuento "LICORVIP20" (20% OFF) para Restaurante La Esquina',
    'Cupón'
),
(
    '11111111-1111-4111-8111-111111111102',
    'b0000000-0000-4000-8000-000000000002',
    'CASH_REGISTER_CLOSED',
    'Realizó Arqueo y Cierre de Caja Turno Mañana ($1,840.00 — Cuadre Exacto)',
    'Arqueo Caja'
);

COMMIT;
