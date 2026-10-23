-- =============================================================================
-- SCRIPT: 05_active_sessions_and_remote_kill.sql
-- DESCRIPCIÓN: Auditoría de conexiones (IP, Navegador, Dispositivo, Ubicación),
--              indicadores semaforizados (🟢 Online, 🟡 Idle, 🔴 Desconectado),
--              y soporte para cierre remoto de sesiones y bloqueo de intrusos.
-- =============================================================================

-- 1. Ampliación de la tabla sesiones_usuario con campos de auditoría y geolocalización
ALTER TABLE sesiones_usuario ADD COLUMN IF NOT EXISTS tipo_dispositivo VARCHAR(60) DEFAULT 'Desktop - Windows';
ALTER TABLE sesiones_usuario ADD COLUMN IF NOT EXISTS nombre_navegador VARCHAR(80) DEFAULT 'Chrome 122';
ALTER TABLE sesiones_usuario ADD COLUMN IF NOT EXISTS nombre_ubicacion VARCHAR(150) DEFAULT 'Lima, Perú (Sede Central)';
ALTER TABLE sesiones_usuario ADD COLUMN IF NOT EXISTS latitud NUMERIC(9,6) DEFAULT -12.046374;
ALTER TABLE sesiones_usuario ADD COLUMN IF NOT EXISTS longitud NUMERIC(9,6) DEFAULT -77.042793;
ALTER TABLE sesiones_usuario ADD COLUMN IF NOT EXISTS fecha_ultima_actividad TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE sesiones_usuario ADD COLUMN IF NOT EXISTS revocada_por_admin BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE sesiones_usuario ADD COLUMN IF NOT EXISTS motivo_revocacion TEXT;
ALTER TABLE sesiones_usuario ADD COLUMN IF NOT EXISTS fecha_revocacion TIMESTAMPTZ;

-- Comentarios explicativos
COMMENT ON COLUMN sesiones_usuario.tipo_dispositivo IS 'Dispositivo y sistema operativo del cliente (ej. Desktop - Windows 11, Mobile - Android 14, macOS).';
COMMENT ON COLUMN sesiones_usuario.nombre_navegador IS 'Nombre y versión del navegador web detectado (ej. Chrome 122, Firefox 125, Edge 123, Safari 17).';
COMMENT ON COLUMN sesiones_usuario.nombre_ubicacion IS 'Ubicación geográfica aproximada o sede física deducida de la IP.';
COMMENT ON COLUMN sesiones_usuario.latitud IS 'Latitud estimada para visualización en mapa.';
COMMENT ON COLUMN sesiones_usuario.longitud IS 'Longitud estimada para visualización en mapa.';
COMMENT ON COLUMN sesiones_usuario.fecha_ultima_actividad IS 'Marca de tiempo del último latido (heartbeat) o petición HTTP activa.';
COMMENT ON COLUMN sesiones_usuario.revocada_por_admin IS 'Bandera de revocación remota forzada por un administrador de seguridad.';
COMMENT ON COLUMN sesiones_usuario.motivo_revocacion IS 'Motivo administrativo de la terminación de la sesión (ej. Infiltración sospechosa, Bloqueo de cuenta).';
COMMENT ON COLUMN sesiones_usuario.fecha_revocacion IS 'Fecha y hora en que la sesión fue revocada remotamente.';

-- Índices para optimizar las consultas del monitor de sesiones
CREATE INDEX IF NOT EXISTS idx_sesiones_usuario_usuario_id ON sesiones_usuario(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_usuario_activas ON sesiones_usuario(es_revocada, fecha_expiracion, fecha_ultima_actividad);

-- 2. Vista consolidada en español con semaforización de estado de conexión
CREATE OR REPLACE VIEW vw_sesiones_activas_usuario AS
SELECT
    s.id AS sesion_id,
    s.usuario_id,
    u.codigo_usuario,
    u.nombre_usuario,
    u.nombre_completo,
    u.correo_electronico,
    u.estado AS estado_usuario,
    COALESCE(r.codigo, 'CAJERO') AS codigo_rol,
    COALESCE(r.nombre, 'Cajero Minorista') AS nombre_rol,
    COALESCE(b.codigo, 'LOC-01') AS codigo_sede,
    COALESCE(b.nombre, 'Sede Central Matriz') AS nombre_sede,
    COALESCE(biz.razon_social, 'Distribuidora El Roble S.A.C.') AS nombre_empresa,
    s.direccion_ip,
    s.nombre_navegador,
    s.tipo_dispositivo,
    s.agente_usuario,
    s.nombre_ubicacion,
    s.latitud,
    s.longitud,
    s.fecha_creacion AS fecha_inicio_sesion,
    s.fecha_ultima_actividad,
    s.fecha_expiracion,
    s.es_revocada,
    s.revocada_por_admin,
    s.motivo_revocacion,
    s.fecha_revocacion,
    CASE
        WHEN s.es_revocada OR u.estado = 'LOCKED' OR s.fecha_expiracion < NOW() THEN 'DISCONNECTED'
        WHEN s.fecha_ultima_actividad >= NOW() - INTERVAL '5 minutes' THEN 'ONLINE'
        WHEN s.fecha_ultima_actividad >= NOW() - INTERVAL '15 minutes' THEN 'IDLE'
        ELSE 'DISCONNECTED'
    END AS estado_conexion,
    CASE
        WHEN s.es_revocada OR u.estado = 'LOCKED' OR s.fecha_expiracion < NOW() THEN '🔴'
        WHEN s.fecha_ultima_actividad >= NOW() - INTERVAL '5 minutes' THEN '🟢'
        WHEN s.fecha_ultima_actividad >= NOW() - INTERVAL '15 minutes' THEN '🟡'
        ELSE '🔴'
    END AS indicador_semaforo
FROM sesiones_usuario s
JOIN usuarios u ON s.usuario_id = u.id
LEFT JOIN usuario_roles ur ON u.id = ur.usuario_id
LEFT JOIN roles r ON ur.rol_id = r.id
LEFT JOIN sedes b ON u.sede_asignada_id = b.id
LEFT JOIN empresas biz ON u.empresa_id = biz.id
ORDER BY s.fecha_ultima_actividad DESC;

COMMENT ON VIEW vw_sesiones_activas_usuario IS 'Vista analítica para el panel de administración con semaforización de conexiones en tiempo real, geolocalización e IPs.';

-- Vista de compatibilidad en inglés
CREATE OR REPLACE VIEW vw_user_active_sessions AS
SELECT
    sesion_id AS session_id,
    usuario_id AS user_id,
    codigo_usuario AS user_code,
    nombre_usuario AS username,
    nombre_completo AS full_name,
    correo_electronico AS email,
    estado_usuario AS user_status,
    codigo_rol AS role_code,
    nombre_rol AS role_name,
    codigo_sede AS branch_code,
    nombre_sede AS branch_name,
    nombre_empresa AS business_name,
    direccion_ip AS ip_address,
    nombre_navegador AS browser_name,
    tipo_dispositivo AS device_type,
    agente_usuario AS user_agent,
    nombre_ubicacion AS location_name,
    latitud AS latitude,
    longitud AS longitude,
    fecha_inicio_sesion AS login_at,
    fecha_ultima_actividad AS last_activity_at,
    fecha_expiracion AS expires_at,
    es_revocada AS is_revoked,
    revocada_por_admin AS revoked_by_admin,
    motivo_revocacion AS revoked_reason,
    fecha_revocacion AS revoked_at,
    estado_conexion AS connection_status,
    indicador_semaforo AS semaphore_indicator
FROM vw_sesiones_activas_usuario;

-- 3. Población inicial de sesiones de auditoría para demostración y pruebas operativas
DO $$
DECLARE
    v_admin_id UUID;
    v_cajero_id UUID;
    v_tienda_id UUID;
    v_auditor_id UUID;
    v_bloqueado_id UUID;
BEGIN
    SELECT id INTO v_admin_id FROM usuarios WHERE nombre_usuario = 'agarcia' LIMIT 1;
    SELECT id INTO v_cajero_id FROM usuarios WHERE nombre_usuario = 'ltorres' LIMIT 1;
    SELECT id INTO v_tienda_id FROM usuarios WHERE nombre_usuario = 'cmendoza' LIMIT 1;
    SELECT id INTO v_auditor_id FROM usuarios WHERE nombre_usuario = 'rdiaz' LIMIT 1;
    SELECT id INTO v_bloqueado_id FROM usuarios WHERE nombre_usuario = 'jquispe' LIMIT 1;

    -- Limpia sesiones anteriores de prueba si existen
    DELETE FROM sesiones_usuario WHERE hash_token_refresco LIKE 'DEMO_SES_%';

    -- Sesión 1: Administradora Ana García (🟢 EN LÍNEA)
    IF v_admin_id IS NOT NULL THEN
        INSERT INTO sesiones_usuario (
            id, usuario_id, hash_token_refresco, direccion_ip, agente_usuario, tipo_dispositivo, nombre_navegador,
            nombre_ubicacion, latitud, longitud, es_revocada, fecha_expiracion, fecha_creacion, fecha_ultima_actividad
        ) VALUES (
            'a1111111-1111-1111-1111-111111111111',
            v_admin_id,
            'DEMO_SES_ADMIN_01',
            '190.236.12.84',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
            'Desktop - Windows 11',
            'Google Chrome 122',
            'Lima, Perú (Sede Central Matriz)',
            -12.046374,
            -77.042793,
            FALSE,
            NOW() + INTERVAL '7 days',
            NOW() - INTERVAL '45 minutes',
            NOW() - INTERVAL '1 minute'
        );
    END IF;

    -- Sesión 2: Cajera Lucía Torres (🟢 EN LÍNEA)
    IF v_cajero_id IS NOT NULL THEN
        INSERT INTO sesiones_usuario (
            id, usuario_id, hash_token_refresco, direccion_ip, agente_usuario, tipo_dispositivo, nombre_navegador,
            nombre_ubicacion, latitud, longitud, es_revocada, fecha_expiracion, fecha_creacion, fecha_ultima_actividad
        ) VALUES (
            'b2222222-2222-2222-2222-222222222222',
            v_cajero_id,
            'DEMO_SES_CAJERO_01',
            '190.236.12.85',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Edg/123.0.0.0',
            'POS Terminal - Windows 10',
            'Microsoft Edge 123',
            'Lima, Perú (Caja Principal 01)',
            -12.048500,
            -77.043200,
            FALSE,
            NOW() + INTERVAL '7 days',
            NOW() - INTERVAL '3 hours',
            NOW() - INTERVAL '2 minutes'
        );
    END IF;

    -- Sesión 3: Jefe de Tienda Carlos Mendoza (🟡 AUSENTE / IDLE)
    IF v_tienda_id IS NOT NULL THEN
        INSERT INTO sesiones_usuario (
            id, usuario_id, hash_token_refresco, direccion_ip, agente_usuario, tipo_dispositivo, nombre_navegador,
            nombre_ubicacion, latitud, longitud, es_revocada, fecha_expiracion, fecha_creacion, fecha_ultima_actividad
        ) VALUES (
            'c3333333-3333-3333-3333-333333333333',
            v_tienda_id,
            'DEMO_SES_TIENDA_01',
            '200.48.114.34',
            'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0',
            'Desktop - Ubuntu Linux',
            'Mozilla Firefox 125',
            'Arequipa, Perú (Sede Yanahuara)',
            -16.398890,
            -71.535000,
            FALSE,
            NOW() + INTERVAL '7 days',
            NOW() - INTERVAL '2 hours',
            NOW() - INTERVAL '8 minutes'
        );
    END IF;

    -- Sesión 4: Auditor Roberto Díaz (🟢 EN LÍNEA)
    IF v_auditor_id IS NOT NULL THEN
        INSERT INTO sesiones_usuario (
            id, usuario_id, hash_token_refresco, direccion_ip, agente_usuario, tipo_dispositivo, nombre_navegador,
            nombre_ubicacion, latitud, longitud, es_revocada, fecha_expiracion, fecha_creacion, fecha_ultima_actividad
        ) VALUES (
            'd4444444-4444-4444-4444-444444444444',
            v_auditor_id,
            'DEMO_SES_AUDITOR_01',
            '181.65.172.90',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/17.4',
            'Laptop - macOS Sonoma',
            'Apple Safari 17.4',
            'Trujillo, Perú (Sede Centro)',
            -8.111670,
            -79.028600,
            FALSE,
            NOW() + INTERVAL '7 days',
            NOW() - INTERVAL '1 hour',
            NOW() - INTERVAL '3 minutes'
        );
    END IF;

    -- Sesión 5: INFILTRADO SOSPECHOSO (🔴 PARA PRUEBA DE REVOCACIÓN REMOTA Y BLOQUEO)
    IF v_bloqueado_id IS NOT NULL THEN
        INSERT INTO sesiones_usuario (
            id, usuario_id, hash_token_refresco, direccion_ip, agente_usuario, tipo_dispositivo, nombre_navegador,
            nombre_ubicacion, latitud, longitud, es_revocada, fecha_expiracion, fecha_creacion, fecha_ultima_actividad
        ) VALUES (
            'e5555555-5555-5555-5555-555555555555',
            v_bloqueado_id,
            'DEMO_SES_INTRUDER_01',
            '45.154.255.89',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36',
            'Servidor Desconocido (VPN/Proxy)',
            'Tor Browser / Headless Linux',
            'San Petersburgo, Federación Rusa (IP NO RECONOCIDA)',
            59.934280,
            30.335099,
            FALSE,
            NOW() + INTERVAL '7 days',
            NOW() - INTERVAL '15 minutes',
            NOW() - INTERVAL '4 minutes'
        );
    END IF;

END $$;
