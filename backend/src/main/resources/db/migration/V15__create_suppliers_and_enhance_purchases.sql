-- ============================================================================
-- Migration V15: Create Suppliers Management Table and Enhance Purchases Scope
-- Standard: Senior DBA / Clean Architecture (PostgreSQL 17)
-- ============================================================================

-- 1. Enhance compras.compras table for larger category names, supplier names and currency
ALTER TABLE compras.compras ALTER COLUMN nombre_categoria TYPE VARCHAR(150);
ALTER TABLE compras.compras ALTER COLUMN proveedor TYPE VARCHAR(200);
ALTER TABLE compras.compras ADD COLUMN IF NOT EXISTS moneda VARCHAR(10) DEFAULT 'PEN';

-- 2. Create compras.proveedores table with multi-tenant isolation per business
CREATE TABLE IF NOT EXISTS compras.proveedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core.empresas(id) ON DELETE CASCADE,
    codigo_proveedor VARCHAR(30) NOT NULL,
    tipo_documento VARCHAR(20) NOT NULL DEFAULT 'RUC',
    numero_documento VARCHAR(30) NOT NULL,
    razon_social VARCHAR(200) NOT NULL,
    nombre_comercial VARCHAR(200),
    contacto_nombre VARCHAR(150),
    correo_electronico VARCHAR(150),
    telefono VARCHAR(50),
    direccion VARCHAR(250),
    categoria_rubro VARCHAR(100),
    activo BOOLEAN NOT NULL DEFAULT true,
    registrado_por_usuario_id UUID REFERENCES auth.usuarios(id) ON DELETE SET NULL,
    fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    fecha_modificacion TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT uq_proveedores_empresa_documento UNIQUE (empresa_id, numero_documento),
    CONSTRAINT uq_proveedores_empresa_codigo UNIQUE (empresa_id, codigo_proveedor)
);

COMMENT ON TABLE compras.proveedores IS 'Directorio maestro de proveedores comerciales con aislamiento multi-tenant por negocio';
COMMENT ON COLUMN compras.proveedores.empresa_id IS 'Identificador del negocio matriz propietario del registro de proveedor';
COMMENT ON COLUMN compras.proveedores.codigo_proveedor IS 'Código correlativo único del proveedor por empresa (ej. PRV-001)';
COMMENT ON COLUMN compras.proveedores.numero_documento IS 'Número de RUC o documento tributario único por empresa';
COMMENT ON COLUMN compras.proveedores.activo IS 'Estado operativo del proveedor (true = activo para compras, false = inactivo)';

-- 3. Optimal performance indexes
CREATE INDEX IF NOT EXISTS idx_proveedores_empresa_activo ON compras.proveedores(empresa_id, activo);
CREATE INDEX IF NOT EXISTS idx_proveedores_empresa_razon ON compras.proveedores(empresa_id, razon_social);

-- 4. Register RBAC Menu Option for Suppliers
INSERT INTO rbac.opciones_menu (
    id, padre_id, codigo, etiqueta, icono, ruta_enlace, etiqueta_miga_pan, orden, es_grupo, es_visible, activo
) VALUES (
    '33333333-3333-4333-8333-333333333212',
    (SELECT id FROM rbac.opciones_menu WHERE codigo = 'MOD_COMMERCIAL'),
    'MGMT_SUPPLIERS',
    'Proveedores',
    'bi bi-building-gear',
    '/dashboard/suppliers',
    'Proveedores',
    4,
    false,
    true,
    true
) ON CONFLICT (codigo) DO UPDATE 
SET ruta_enlace = EXCLUDED.ruta_enlace,
    etiqueta = EXCLUDED.etiqueta,
    icono = EXCLUDED.icono;

-- 5. Grant RBAC Permissions for Suppliers
INSERT INTO rbac.permisos_rol_menu (rol_id, opcion_menu_id, puede_ver, puede_crear, puede_editar, puede_eliminar, puede_exportar)
SELECT r.id, o.id, true, true, true, (r.codigo IN ('ADMIN', 'ADMIN_NEGOCIO')), true
FROM rbac.roles r, rbac.opciones_menu o
WHERE o.codigo = 'MGMT_SUPPLIERS'
  AND r.codigo IN ('ADMIN', 'ADMIN_NEGOCIO', 'SUPERVISOR')
ON CONFLICT (rol_id, opcion_menu_id) DO UPDATE 
SET puede_ver = true, puede_crear = true, puede_editar = true, puede_exportar = true;

-- 6. Seed initial suppliers per business
-- BIZ-001: Distribuidora El Roble
INSERT INTO compras.proveedores (
    empresa_id, codigo_proveedor, tipo_documento, numero_documento, razon_social,
    nombre_comercial, contacto_nombre, correo_electronico, telefono, direccion,
    categoria_rubro, activo, registrado_por_usuario_id
) VALUES 
(
    'a0000000-0000-4000-8000-000000000001', 'PRV-001', 'RUC', '20100113610',
    'Unión de Cervecerías Peruanas Backus y Johnston S.A.A.', 'Backus',
    'Carlos Mendoza Ramos', 'ventas@backus.com.pe', '+51 1 311-3000',
    'Av. Nicolás Ayllón 3986, Ate, Lima', 'Cervezas y Aguas', true,
    '11111111-1111-4111-8111-111111111101'
),
(
    'a0000000-0000-4000-8000-000000000001', 'PRV-002', 'RUC', '20503023021',
    'Diageo Perú S.A.', 'Diageo',
    'Lucía Ramos Silva', 'contacto@diageo.com', '+51 1 615-5000',
    'Av. Canaval y Moreyra 480, San Isidro, Lima', 'Licores y Destilados', true,
    '11111111-1111-4111-8111-111111111101'
),
(
    'a0000000-0000-4000-8000-000000000001', 'PRV-003', 'RUC', '20100107849',
    'Arca Continental Lindley S.A.', 'Lindley (Coca-Cola / Inca Kola)',
    'Roberto Soto Quispe', 'atencion@arcacontal.com', '+51 1 311-5500',
    'Av. Javier Prado Este 4200, Surco, Lima', 'Gaseosas y Bebidas', true,
    '11111111-1111-4111-8111-111111111101'
)
ON CONFLICT (empresa_id, numero_documento) DO NOTHING;

-- BIZ-002: Andina del Sur
INSERT INTO compras.proveedores (
    empresa_id, codigo_proveedor, tipo_documento, numero_documento, razon_social,
    nombre_comercial, contacto_nombre, correo_electronico, telefono, direccion,
    categoria_rubro, activo, registrado_por_usuario_id
) VALUES 
(
    'a0000000-0000-4000-8000-000000000002', 'PRV-001', 'RUC', '20100107849',
    'Arca Continental Lindley S.A.', 'Lindley Región Sur',
    'Mateo Quispe Flores', 'cusco@arcacontal.com', '+51 84 223-100',
    'Av. Industrial 120, Wanchaq, Cusco', 'Gaseosas y Bebidas', true,
    '11111111-1111-4111-8111-111111111101'
),
(
    'a0000000-0000-4000-8000-000000000002', 'PRV-002', 'RUC', '20100113610',
    'Unión de Cervecerías Peruanas Backus y Johnston S.A.A.', 'Backus Planta Cusco',
    'Ana Morales Cárdenas', 'cusco@backus.com.pe', '+51 84 231-500',
    'Av. De la Cultura 1520, Cusco', 'Cervezas', true,
    '11111111-1111-4111-8111-111111111101'
)
ON CONFLICT (empresa_id, numero_documento) DO NOTHING;

-- BIZ-003: COTIC S.A.C.
INSERT INTO compras.proveedores (
    empresa_id, codigo_proveedor, tipo_documento, numero_documento, razon_social,
    nombre_comercial, contacto_nombre, correo_electronico, telefono, direccion,
    categoria_rubro, activo, registrado_por_usuario_id
) VALUES 
(
    '5f897841-04a7-40e6-87b1-ca8298457e41', 'PRV-001', 'RUC', '20107293818',
    'Bodegas y Viñedos Tabernero S.A.C.', 'Tabernero',
    'Fernando Gómez Vidal', 'ventas@tabernero.com', '+51 1 444-2200',
    'Fundo El Carmen, Chincha Alta, Ica', 'Vinos de Exportacion', true,
    '11111111-1111-4111-8111-111111111101'
),
(
    '5f897841-04a7-40e6-87b1-ca8298457e41', 'PRV-002', 'RUC', '20512839210',
    'Compañía Cervecera Ambev Perú S.A.C.', 'Ambev / Brahma',
    'Patricia Vega Romero', 'contacto@ambev.com.pe', '+51 1 513-8000',
    'Av. Materiales 2850, Lima', 'Bebidas Alcoholicas', true,
    '11111111-1111-4111-8111-111111111101'
),
(
    '5f897841-04a7-40e6-87b1-ca8298457e41', 'PRV-003', 'RUC', '20100107849',
    'Arca Continental Lindley S.A.', 'Lindley Lima Central',
    'Juan Pérez Alarcón', 'pedidos@arcacontal.com', '+51 1 311-5500',
    'Av. Industrial 450, Lima', 'Gaseosas', true,
    '11111111-1111-4111-8111-111111111101'
)
ON CONFLICT (empresa_id, numero_documento) DO NOTHING;
