-- ============================================================================
-- V11: Unicidad de categorías comerciales por negocio (empresa_id)
-- ============================================================================
-- 1. Eliminar restricciones de unicidad global en codigo y slug
ALTER TABLE inventario.categorias_bebidas
    DROP CONSTRAINT IF EXISTS categorias_bebidas_codigo_key CASCADE;

ALTER TABLE inventario.categorias_bebidas
    DROP CONSTRAINT IF EXISTS categorias_bebidas_slug_key CASCADE;

-- 2. Crear restricciones de unicidad compuestas por negocio (empresa_id)
ALTER TABLE inventario.categorias_bebidas
    ADD CONSTRAINT uq_categorias_bebidas_empresa_codigo UNIQUE (empresa_id, codigo);

ALTER TABLE inventario.categorias_bebidas
    ADD CONSTRAINT uq_categorias_bebidas_empresa_slug UNIQUE (empresa_id, slug);

-- 3. Crear índice único para el nombre de categoría por negocio (case-insensitive y sin espacios en blanco)
CREATE UNIQUE INDEX IF NOT EXISTS uq_idx_categorias_bebidas_empresa_nombre
    ON inventario.categorias_bebidas (empresa_id, UPPER(TRIM(nombre)));

COMMENT ON INDEX inventario.uq_idx_categorias_bebidas_empresa_nombre
    IS 'Garantiza que no existan categorías duplicadas por nombre dentro del mismo negocio matriz.';
