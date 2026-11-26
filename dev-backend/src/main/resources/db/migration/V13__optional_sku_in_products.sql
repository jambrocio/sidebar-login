-- ============================================================================
-- V13: Hacer el campo codigo_sku opcional en inventario.productos_bebidas y
-- garantizar unicidad de SKU cuando se registra un valor (no nulo) por negocio
-- ============================================================================

-- 1. Permitir valores nulos en codigo_sku
ALTER TABLE inventario.productos_bebidas
    ALTER COLUMN codigo_sku DROP NOT NULL;

-- 2. Asegurar que la restricción UNIQUE permita múltiples NULLs (comportamiento estándar SQL)
ALTER TABLE inventario.productos_bebidas
    DROP CONSTRAINT IF EXISTS uq_productos_bebidas_empresa_sku CASCADE;

ALTER TABLE inventario.productos_bebidas
    ADD CONSTRAINT uq_productos_bebidas_empresa_sku UNIQUE (empresa_id, codigo_sku);

COMMENT ON COLUMN inventario.productos_bebidas.codigo_sku
    IS 'Código SKU opcional del producto. Si se registra, es estrictamente único por empresa matriz / negocio.';
