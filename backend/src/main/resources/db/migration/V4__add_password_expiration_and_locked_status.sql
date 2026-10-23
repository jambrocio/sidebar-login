-- ==============================================================================
-- Migración V4: Control de Expiración de Contraseña, Cambio Obligatorio y Bloqueo de Cuenta
-- ==============================================================================

-- 1. Agregar columnas de expiración y cambio obligatorio en users si no existen
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days'),
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN users.password_expires_at IS 'Fecha y hora en que expira la contraseña del usuario (rotación cada 90 días).';
COMMENT ON COLUMN users.must_change_password IS 'Indica si el usuario debe obligatoriamente renovar su contraseña antes de acceder.';

-- 2. Sincronizar datos semilla con los 5 casos de prueba de auth-test-users.json
-- Caso 1: Ana García (USR-001) - Vigente (45 días restantes)
UPDATE users 
SET status = 'ACTIVE',
    failed_login_attempts = 0,
    must_change_password = FALSE,
    password_expires_at = NOW() + INTERVAL '45 days'
WHERE username = 'agarcia';

-- Caso 2: Lucía Torres (USR-002) - Expirada (hace 3 días) -> Cambio Obligatorio
UPDATE users 
SET status = 'ACTIVE',
    failed_login_attempts = 0,
    must_change_password = TRUE,
    password_expires_at = NOW() - INTERVAL '3 days'
WHERE username = 'ltorres';

-- Caso 3: Carlos Mendoza (USR-003) - Por Expirar (en 4 días) -> Advertencia preventiva
UPDATE users 
SET status = 'ACTIVE',
    failed_login_attempts = 0,
    must_change_password = FALSE,
    password_expires_at = NOW() + INTERVAL '4 days'
WHERE username = 'cmendoza';

-- Caso 4: Marco Paredes (USR-004) - Expirada (hace 1 día) -> Cambio Obligatorio
UPDATE users 
SET status = 'ACTIVE',
    failed_login_attempts = 0,
    must_change_password = TRUE,
    password_expires_at = NOW() - INTERVAL '1 day'
WHERE username = 'mparedes';

-- Caso 5: Roberto Díaz (USR-005) - Clave Temporal (0 días) -> Cambio Obligatorio
UPDATE users 
SET status = 'ACTIVE',
    failed_login_attempts = 0,
    must_change_password = TRUE,
    password_expires_at = NOW()
WHERE username = 'rdiaz';

-- 3. Crear Usuario de Prueba Caso 6: Cuenta Bloqueada (LOCKED por 5 intentos fallidos)
INSERT INTO users (
    id, user_code, username, email, password_hash, full_name, avatar_initials,
    business_id, assigned_branch_id, client_type, status, two_factor_enabled,
    failed_login_attempts, must_change_password, password_expires_at
) VALUES (
    '11111111-1111-4111-8111-111111111106',
    'USR-006',
    'jquispe',
    'juan.quispe@empresa.com',
    '$2b$12$K8p9mZ0Q1r2s3t4u5v6w7x8y9z0A1B2C3D4E5F6G7H8I9J0K1L2M3',
    'Juan Quispe Ramos (Bloqueado)',
    'JQ',
    'a0000000-0000-4000-8000-000000000001', -- BIZ-001 El Roble
    'b0000000-0000-4000-8000-000000000001', -- LOC-01 Sede Central
    'Personal Interno',
    'LOCKED',
    FALSE,
    5,
    FALSE,
    NOW() + INTERVAL '60 days'
) ON CONFLICT (id) DO UPDATE 
SET status = 'LOCKED', failed_login_attempts = 5;

-- Asignar rol y local al usuario bloqueado
INSERT INTO user_roles (user_id, role_id)
VALUES (
    '11111111-1111-4111-8111-111111111106',
    '22222222-2222-4222-8222-222222222203'  -- Cajero / Vendedor
) ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_branches (user_id, branch_id, is_primary)
VALUES (
    '11111111-1111-4111-8111-111111111106',
    'b0000000-0000-4000-8000-000000000001',
    TRUE
) ON CONFLICT (user_id, branch_id) DO NOTHING;
