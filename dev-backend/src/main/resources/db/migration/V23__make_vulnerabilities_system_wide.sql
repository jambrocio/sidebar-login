-- ============================================================================
-- Migración V23: Alcance Global del Módulo Auditoría de Vulnerabilidades
-- La auditoría de vulnerabilidades aplica a todo el sistema y no depende de
-- una empresa o negocio específico, por lo que se elimina la columna empresa_id.
-- ============================================================================

SET search_path TO core, auth, rbac, inventario, ventas, compras, public;

-- 1. Eliminar índices y restricción vinculados a empresa_id
DROP INDEX IF EXISTS core.idx_vuln_empresa_estado;
DROP INDEX IF EXISTS core.idx_vuln_empresa_severidad;
DROP INDEX IF EXISTS core.idx_vuln_empresa_fecha;

ALTER TABLE core.vulnerabilidades_seguridad
    DROP CONSTRAINT IF EXISTS uq_vulnerabilidad_empresa_codigo;

-- 2. Eliminar la columna empresa_id
ALTER TABLE core.vulnerabilidades_seguridad
    DROP COLUMN IF EXISTS empresa_id;

-- 3. Crear índices globales de sistema
CREATE INDEX IF NOT EXISTS idx_vuln_estado ON core.vulnerabilidades_seguridad(estado);
CREATE INDEX IF NOT EXISTS idx_vuln_severidad ON core.vulnerabilidades_seguridad(severidad);
CREATE INDEX IF NOT EXISTS idx_vuln_fecha ON core.vulnerabilidades_seguridad(fecha_deteccion DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_vulnerabilidades_codigo_global
    ON core.vulnerabilidades_seguridad (UPPER(TRIM(codigo)));
