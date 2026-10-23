-- =============================================================================
-- SCRIPT SQL: 07_analyst_and_auditor_permissions.sql
-- DESCRIPCIÓN: Asignación de permisos RBAC para los roles ANALYST (Cajero / Vendedor)
--              y AUDITOR (Auditor de Caja e Inventario) en permisos_rol_menu.
-- =============================================================================

-- 1. Permisos para ANALYST (Cajero / Vendedor)
INSERT INTO permisos_rol_menu (
    rol_id, opcion_menu_id, visible_en_menu, puede_ver, puede_crear, puede_editar, puede_eliminar, puede_exportar
)
SELECT
    '22222222-2222-4222-8222-222222222203',
    id,
    CASE WHEN codigo IN ('DASH_HOME', 'MOD_COMMERCIAL', 'SALES_WHOLESALE_RETAIL', 'SALES_HISTORY', 'DISCOUNT_COUPONS', 'CASH_REGISTER_AUDIT') THEN TRUE ELSE FALSE END,
    CASE WHEN codigo IN ('DASH_HOME', 'MOD_COMMERCIAL', 'SALES_WHOLESALE_RETAIL', 'SALES_HISTORY', 'DISCOUNT_COUPONS', 'CASH_REGISTER_AUDIT', 'PROFILE_SETTINGS') THEN TRUE ELSE FALSE END,
    CASE WHEN codigo IN ('SALES_WHOLESALE_RETAIL', 'CASH_REGISTER_AUDIT') THEN TRUE ELSE FALSE END,
    CASE WHEN codigo IN ('SALES_WHOLESALE_RETAIL') THEN TRUE ELSE FALSE END,
    FALSE,
    CASE WHEN codigo IN ('SALES_HISTORY', 'CASH_REGISTER_AUDIT') THEN TRUE ELSE FALSE END
FROM opciones_menu
ON CONFLICT (rol_id, opcion_menu_id) DO UPDATE SET
    visible_en_menu = EXCLUDED.visible_en_menu,
    puede_ver = EXCLUDED.puede_ver,
    puede_crear = EXCLUDED.puede_crear,
    puede_editar = EXCLUDED.puede_editar,
    puede_eliminar = EXCLUDED.puede_eliminar,
    puede_exportar = EXCLUDED.puede_exportar;

-- 2. Permisos para AUDITOR (Auditor de Caja e Inventario)
INSERT INTO permisos_rol_menu (
    rol_id, opcion_menu_id, visible_en_menu, puede_ver, puede_crear, puede_editar, puede_eliminar, puede_exportar
)
SELECT
    '22222222-2222-4222-8222-222222222204',
    id,
    CASE WHEN codigo IN ('DASH_HOME', 'MOD_COMMERCIAL', 'SALES_HISTORY', 'CASH_REGISTER_AUDIT', 'MOD_REPORTS', 'MOD_CATALOG', 'SUB_PRODUCTS_PRICES', 'PROD_LIST', 'MOD_ADMIN', 'MGMT_SESSIONS') THEN TRUE ELSE FALSE END,
    CASE WHEN codigo IN ('DASH_HOME', 'MOD_COMMERCIAL', 'SALES_HISTORY', 'CASH_REGISTER_AUDIT', 'MOD_REPORTS', 'MOD_CATALOG', 'SUB_PRODUCTS_PRICES', 'PROD_LIST', 'MOD_ADMIN', 'MGMT_SESSIONS', 'PROFILE_SETTINGS') THEN TRUE ELSE FALSE END,
    FALSE,
    FALSE,
    FALSE,
    TRUE
FROM opciones_menu
ON CONFLICT (rol_id, opcion_menu_id) DO UPDATE SET
    visible_en_menu = EXCLUDED.visible_en_menu,
    puede_ver = EXCLUDED.puede_ver,
    puede_crear = EXCLUDED.puede_crear,
    puede_editar = EXCLUDED.puede_editar,
    puede_eliminar = EXCLUDED.puede_eliminar,
    puede_exportar = EXCLUDED.puede_exportar;
