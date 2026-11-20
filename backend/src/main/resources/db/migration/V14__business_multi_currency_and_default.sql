-- =============================================================================
-- MIGRACIÓN V14: Soporte Multi-Moneda para Negocios y Divisa por Defecto
-- =============================================================================
-- Permite que cada Empresa Matriz / Negocio (core.empresas) pueda registrar y
-- transaccionar en múltiples tipos de moneda, especificando una moneda configurada
-- por defecto para la preselección automática en formularios de registro.
-- =============================================================================

-- 1. Ampliar core.empresas con moneda_defecto y monedas_permitidas
ALTER TABLE core.empresas
    ADD COLUMN IF NOT EXISTS moneda_defecto VARCHAR(20) NOT NULL DEFAULT 'PEN',
    ADD COLUMN IF NOT EXISTS monedas_permitidas VARCHAR(250) NOT NULL DEFAULT 'PEN,USD';

COMMENT ON COLUMN core.empresas.moneda_defecto IS 'Moneda base configurada por defecto para auto-selección en formularios de registro.';
COMMENT ON COLUMN core.empresas.monedas_permitidas IS 'Lista de códigos de monedas admitidas separadas por comas (ej. PEN,USD,EUR).';

-- 2. Sincronizar negocios existentes
UPDATE core.empresas SET
    moneda = 'PEN',
    moneda_defecto = 'PEN',
    monedas_permitidas = 'PEN,USD'
WHERE codigo = 'BIZ-003';

UPDATE core.empresas SET
    moneda = 'USD',
    moneda_defecto = 'USD',
    monedas_permitidas = 'USD,PEN,EUR'
WHERE codigo = 'BIZ-001';

UPDATE core.empresas SET
    moneda = 'USD',
    moneda_defecto = 'USD',
    monedas_permitidas = 'USD,PEN'
WHERE codigo = 'BIZ-002';

-- 3. Tabla relacional 3FN: core.empresa_monedas
CREATE TABLE IF NOT EXISTS core.empresa_monedas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core.empresas(id) ON DELETE CASCADE,
    codigo_moneda VARCHAR(10) NOT NULL,
    simbolo VARCHAR(10) NOT NULL,
    nombre VARCHAR(60) NOT NULL,
    es_defecto BOOLEAN NOT NULL DEFAULT FALSE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_empresa_moneda UNIQUE (empresa_id, codigo_moneda)
);

COMMENT ON TABLE core.empresa_monedas IS 'Catálogo relacional de monedas admitidas por empresa matriz con bandera de divisa por defecto.';
COMMENT ON COLUMN core.empresa_monedas.empresa_id IS 'Empresa matriz titular de la parametrización de divisa.';
COMMENT ON COLUMN core.empresa_monedas.codigo_moneda IS 'Código ISO de la divisa (ej. PEN, USD, EUR).';
COMMENT ON COLUMN core.empresa_monedas.simbolo IS 'Símbolo monetario (ej. S/, $, €).';
COMMENT ON COLUMN core.empresa_monedas.nombre IS 'Nombre descriptivo de la divisa.';
COMMENT ON COLUMN core.empresa_monedas.es_defecto IS 'Indica si es la moneda preseleccionada por defecto en operaciones de registro.';

CREATE INDEX IF NOT EXISTS idx_empresa_monedas_empresa ON core.empresa_monedas(empresa_id);

-- 4. Sembrado de monedas admitidas para los negocios existentes
-- BIZ-001: USD (default), PEN, EUR
INSERT INTO core.empresa_monedas (empresa_id, codigo_moneda, simbolo, nombre, es_defecto)
SELECT id, 'USD', '$', 'Dólares Estadounidenses (USD)', TRUE
FROM core.empresas WHERE codigo = 'BIZ-001'
ON CONFLICT (empresa_id, codigo_moneda) DO UPDATE SET es_defecto = TRUE;

INSERT INTO core.empresa_monedas (empresa_id, codigo_moneda, simbolo, nombre, es_defecto)
SELECT id, 'PEN', 'S/', 'Soles Peruanos (PEN)', FALSE
FROM core.empresas WHERE codigo = 'BIZ-001'
ON CONFLICT (empresa_id, codigo_moneda) DO NOTHING;

INSERT INTO core.empresa_monedas (empresa_id, codigo_moneda, simbolo, nombre, es_defecto)
SELECT id, 'EUR', '€', 'Euros (EUR)', FALSE
FROM core.empresas WHERE codigo = 'BIZ-001'
ON CONFLICT (empresa_id, codigo_moneda) DO NOTHING;

-- BIZ-002: USD (default), PEN
INSERT INTO core.empresa_monedas (empresa_id, codigo_moneda, simbolo, nombre, es_defecto)
SELECT id, 'USD', '$', 'Dólares Estadounidenses (USD)', TRUE
FROM core.empresas WHERE codigo = 'BIZ-002'
ON CONFLICT (empresa_id, codigo_moneda) DO UPDATE SET es_defecto = TRUE;

INSERT INTO core.empresa_monedas (empresa_id, codigo_moneda, simbolo, nombre, es_defecto)
SELECT id, 'PEN', 'S/', 'Soles Peruanos (PEN)', FALSE
FROM core.empresas WHERE codigo = 'BIZ-002'
ON CONFLICT (empresa_id, codigo_moneda) DO NOTHING;

-- BIZ-003 (COTIC): PEN (default), USD
INSERT INTO core.empresa_monedas (empresa_id, codigo_moneda, simbolo, nombre, es_defecto)
SELECT id, 'PEN', 'S/', 'Soles Peruanos (PEN)', TRUE
FROM core.empresas WHERE codigo = 'BIZ-003'
ON CONFLICT (empresa_id, codigo_moneda) DO UPDATE SET es_defecto = TRUE;

INSERT INTO core.empresa_monedas (empresa_id, codigo_moneda, simbolo, nombre, es_defecto)
SELECT id, 'USD', '$', 'Dólares Estadounidenses (USD)', FALSE
FROM core.empresas WHERE codigo = 'BIZ-003'
ON CONFLICT (empresa_id, codigo_moneda) DO NOTHING;
