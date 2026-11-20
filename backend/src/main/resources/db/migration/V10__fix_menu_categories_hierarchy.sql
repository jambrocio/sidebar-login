-- =============================================================================
-- MIGRACIÓN V10: Reestructuración visual y jerárquica del Menú de Categorías
-- =============================================================================

SET search_path TO auth, rbac, core, inventario, ventas, compras, tesoreria, notificaciones, public;

-- 1. Reubicar SUB_CATEGORIES para que sea hijo directo de MOD_CATALOG (nivel 2, hermano de Productos y Precios)
UPDATE rbac.opciones_menu
SET padre_id = '33333333-3333-4333-8333-333333333103', -- MOD_CATALOG
    orden = 2,
    etiqueta = 'Categorías de Productos',
    etiqueta_miga_pan = 'Categorías de Productos',
    icono = 'bi bi-tags-fill'
WHERE codigo = 'SUB_CATEGORIES';

-- 2. Asegurar que SUB_PRODUCTS_PRICES sea orden = 1 bajo MOD_CATALOG
UPDATE rbac.opciones_menu
SET orden = 1
WHERE codigo = 'SUB_PRODUCTS_PRICES';

-- 3. Actualizar etiqueta de PROD_LIST a 'Inventario de Productos' para generalización
UPDATE rbac.opciones_menu
SET etiqueta = 'Inventario de Productos',
    etiqueta_miga_pan = 'Inventario de Productos'
WHERE codigo = 'PROD_LIST';

-- 4. Asegurar íconos claros y orden para Listar Categorías y Nueva Categoría
UPDATE rbac.opciones_menu
SET orden = 1,
    etiqueta = 'Listar Categorías',
    icono = 'bi bi-card-list'
WHERE codigo = 'CAT_LIST';

UPDATE rbac.opciones_menu
SET orden = 2,
    etiqueta = 'Nueva Categoría',
    icono = 'bi bi-plus-circle-fill'
WHERE codigo = 'CAT_ADD';
