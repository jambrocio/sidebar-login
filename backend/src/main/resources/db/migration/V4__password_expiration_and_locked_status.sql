-- ==============================================================================
-- Script 04: Control de Expiración de Contraseña, Cambio Obligatorio y Bloqueo de Cuenta
-- ==============================================================================

-- 1. Agregar columnas de expiración y cambio obligatorio en usuarios si no existen
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS fecha_expiracion_contrasena TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days'),
ADD COLUMN IF NOT EXISTS debe_cambiar_contrasena BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN usuarios.fecha_expiracion_contrasena IS 'Fecha y hora en que expira la contraseña del usuario (rotación cada 90 días).';
COMMENT ON COLUMN usuarios.debe_cambiar_contrasena IS 'Indica si el usuario debe obligatoriamente renovar su contraseña antes de acceder.';

-- 2. Sincronizar datos semilla con los 5 casos de prueba de auth-test-users.json
-- Caso 1: Ana García (USR-001) - Vigente (45 días restantes)
UPDATE usuarios 
SET estado = 'ACTIVE',
    intentos_fallidos_login = 0,
    debe_cambiar_contrasena = FALSE,
    fecha_expiracion_contrasena = NOW() + INTERVAL '45 days'
WHERE nombre_usuario = 'agarcia';

-- Caso 2: Lucía Torres (USR-002) - Expirada (hace 3 días) -> Cambio Obligatorio
UPDATE usuarios 
SET estado = 'ACTIVE',
    intentos_fallidos_login = 0,
    debe_cambiar_contrasena = TRUE,
    fecha_expiracion_contrasena = NOW() - INTERVAL '3 days'
WHERE nombre_usuario = 'ltorres';

-- Caso 3: Carlos Mendoza (USR-003) - Por Expirar (en 4 días) -> Advertencia preventiva
UPDATE usuarios 
SET estado = 'ACTIVE',
    intentos_fallidos_login = 0,
    debe_cambiar_contrasena = FALSE,
    fecha_expiracion_contrasena = NOW() + INTERVAL '4 days'
WHERE nombre_usuario = 'cmendoza';

-- Caso 4: Marco Paredes (USR-004) - Expirada (hace 1 día) -> Cambio Obligatorio
UPDATE usuarios 
SET estado = 'ACTIVE',
    intentos_fallidos_login = 0,
    debe_cambiar_contrasena = TRUE,
    fecha_expiracion_contrasena = NOW() - INTERVAL '1 day'
WHERE nombre_usuario = 'mparedes';

-- Caso 5: Roberto Díaz (USR-005) - Clave Temporal (0 días) -> Cambio Obligatorio
UPDATE usuarios 
SET estado = 'ACTIVE',
    intentos_fallidos_login = 0,
    debe_cambiar_contrasena = TRUE,
    fecha_expiracion_contrasena = NOW()
WHERE nombre_usuario = 'rdiaz';

-- 3. Crear Usuario de Prueba Caso 6: Cuenta Bloqueada (LOCKED por 5 intentos fallidos)
INSERT INTO usuarios (
    id, codigo_usuario, nombre_usuario, correo_electronico, hash_contrasena, nombre_completo, iniciales_avatar,
    empresa_id, sede_asignada_id, tipo_cliente, estado, doble_factor_habilitado,
    intentos_fallidos_login, debe_cambiar_contrasena, fecha_expiracion_contrasena
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
SET estado = 'LOCKED', intentos_fallidos_login = 5;

-- Asignar rol y local al usuario bloqueado
INSERT INTO usuario_roles (usuario_id, rol_id)
VALUES (
    '11111111-1111-4111-8111-111111111106',
    '22222222-2222-4222-8222-222222222203'  -- Cajero / Vendedor
) ON CONFLICT (usuario_id, rol_id) DO NOTHING;

INSERT INTO usuario_sedes (usuario_id, sede_id, es_principal)
VALUES (
    '11111111-1111-4111-8111-111111111106',
    'b0000000-0000-4000-8000-000000000001',
    TRUE
) ON CONFLICT (usuario_id, sede_id) DO NOTHING;
