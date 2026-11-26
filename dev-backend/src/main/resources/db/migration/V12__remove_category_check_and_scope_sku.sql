-- ============================================================================
-- V12: Eliminar restricción rígida de categorías en productos y hacer SKU único por negocio
-- ============================================================================
-- 1. Eliminar CHECK obsoleto de nombres de categoría en inventario.productos_bebidas
ALTER TABLE inventario.productos_bebidas
    DROP CONSTRAINT IF EXISTS productos_bebidas_nombre_categoria_check;

-- 2. Ampliar longitud de nombre_categoria a 150 caracteres para compatibilidad con categorias_bebidas
ALTER TABLE inventario.productos_bebidas
    ALTER COLUMN nombre_categoria TYPE VARCHAR(150);

-- 3. Hacer único el SKU por negocio (empresa_id) en lugar de único global
ALTER TABLE inventario.productos_bebidas
    DROP CONSTRAINT IF EXISTS productos_bebidas_codigo_sku_key CASCADE;

ALTER TABLE inventario.productos_bebidas
    DROP CONSTRAINT IF EXISTS uq_productos_bebidas_empresa_sku CASCADE;

ALTER TABLE inventario.productos_bebidas
    ADD CONSTRAINT uq_productos_bebidas_empresa_sku UNIQUE (empresa_id, codigo_sku);

COMMENT ON CONSTRAINT uq_productos_bebidas_empresa_sku ON inventario.productos_bebidas
    IS 'Garantiza unicidad de códigos SKU por empresa matriz / negocio.';
