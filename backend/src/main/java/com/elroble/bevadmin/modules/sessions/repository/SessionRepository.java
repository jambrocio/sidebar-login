package com.elroble.bevadmin.modules.sessions.repository;

import com.elroble.bevadmin.modules.sessions.dto.ActiveSessionDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repositorio JDBC imperativo y síncrono para la consulta de sesiones activas,
 * registro de auditoría de red (IP, User-Agent, Ubicación) y revocación remota.
 */
@Repository
public class SessionRepository {

    private final JdbcTemplate jdbcTemplate;

    public SessionRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private static final RowMapper<ActiveSessionDto> ACTIVE_SESSION_ROW_MAPPER = (rs, rowNum) -> new ActiveSessionDto(
            (UUID) rs.getObject("session_id"),
            (UUID) rs.getObject("user_id"),
            rs.getString("user_code"),
            rs.getString("username"),
            rs.getString("full_name"),
            rs.getString("email"),
            rs.getString("user_status"),
            rs.getString("role_code"),
            rs.getString("role_name"),
            rs.getString("branch_code"),
            rs.getString("branch_name"),
            rs.getString("business_name"),
            rs.getString("ip_address"),
            rs.getString("browser_name"),
            rs.getString("device_type"),
            rs.getString("user_agent"),
            rs.getString("location_name"),
            rs.getBigDecimal("latitude"),
            rs.getBigDecimal("longitude"),
            rs.getObject("login_at", OffsetDateTime.class),
            rs.getObject("last_activity_at", OffsetDateTime.class),
            rs.getObject("expires_at", OffsetDateTime.class),
            rs.getBoolean("is_revoked"),
            rs.getBoolean("revoked_by_admin"),
            rs.getString("revoked_reason"),
            rs.getObject("revoked_at", OffsetDateTime.class),
            rs.getString("connection_status"),
            rs.getString("semaphore_indicator")
    );

    /**
     * Consulta todas las sesiones desde la vista consolidada {@code vw_sesiones_activas_usuario}.
     */
    public List<ActiveSessionDto> findAllActiveSessions() {
        String sql = """
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
            FROM vw_sesiones_activas_usuario
            ORDER BY
                CASE estado_conexion
                    WHEN 'ONLINE' THEN 1
                    WHEN 'IDLE' THEN 2
                    ELSE 3
                END,
                fecha_ultima_actividad DESC
            LIMIT 50
        """;
        return jdbcTemplate.query(sql, ACTIVE_SESSION_ROW_MAPPER);
    }

    /**
     * Busca una sesión específica por su UUID.
     */
    public Optional<ActiveSessionDto> findSessionById(UUID sessionId) {
        String sql = """
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
            FROM vw_sesiones_activas_usuario
            WHERE sesion_id = ?
        """;
        List<ActiveSessionDto> list = jdbcTemplate.query(sql, ACTIVE_SESSION_ROW_MAPPER, sessionId);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.getFirst());
    }

    /**
     * Inserta un nuevo registro de sesión en {@code sesiones_usuario}.
     */
    public void createSession(
            UUID userId,
            String tokenHash,
            String ip,
            String userAgent,
            String browser,
            String device,
            String location,
            BigDecimal lat,
            BigDecimal lon) {

        String sql = """
            INSERT INTO sesiones_usuario (
                usuario_id, hash_token_refresco, direccion_ip, agente_usuario,
                nombre_navegador, tipo_dispositivo, nombre_ubicacion, latitud, longitud,
                es_revocada, fecha_expiracion, fecha_creacion, fecha_ultima_actividad
            ) VALUES (
                ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                FALSE, NOW() + INTERVAL '7 days', NOW(), NOW()
            )
            ON CONFLICT (hash_token_refresco) DO UPDATE
            SET fecha_ultima_actividad = NOW(),
                direccion_ip = EXCLUDED.direccion_ip,
                agente_usuario = EXCLUDED.agente_usuario,
                es_revocada = FALSE
        """;
        jdbcTemplate.update(sql, userId, tokenHash, ip, userAgent, browser, device, location, lat, lon);
    }

    /**
     * Actualiza la fecha de última actividad (heartbeat).
     */
    public void updateLastActivity(String tokenHash) {
        String sql = """
            UPDATE sesiones_usuario
            SET fecha_ultima_actividad = NOW()
            WHERE hash_token_refresco = ? AND NOT es_revocada
        """;
        jdbcTemplate.update(sql, tokenHash);
    }

    /**
     * Comprueba si una sesión ha sido revocada por su hash de token.
     */
    public boolean isSessionRevoked(String tokenHash) {
        String sql = """
            SELECT es_revocada
            FROM sesiones_usuario
            WHERE hash_token_refresco = ?
            LIMIT 1
        """;
        List<Boolean> list = jdbcTemplate.query(sql, (rs, rowNum) -> rs.getBoolean("es_revocada"), tokenHash);
        return !list.isEmpty() && list.getFirst();
    }

    /**
     * Revoca administrativamente una sesión específica (Kill Session).
     */
    public int revokeSession(UUID sessionId, String adminUsername, String reason) {
        String sql = """
            UPDATE sesiones_usuario
            SET es_revocada = TRUE,
                revocada_por_admin = TRUE,
                motivo_revocacion = ?,
                fecha_revocacion = NOW()
            WHERE id = ?
        """;
        return jdbcTemplate.update(sql, reason, sessionId);
    }

    /**
     * Revoca todas las sesiones activas de un usuario dado.
     */
    public int revokeAllSessionsForUser(UUID userId, String adminUsername, String reason) {
        String sql = """
            UPDATE sesiones_usuario
            SET es_revocada = TRUE,
                revocada_por_admin = TRUE,
                motivo_revocacion = ?,
                fecha_revocacion = NOW()
            WHERE usuario_id = ?
        """;
        return jdbcTemplate.update(sql, reason, userId);
    }

    /**
     * Bloquea la cuenta de un usuario en {@code usuarios} (estado = 'LOCKED').
     */
    public int lockUserAccount(UUID userId, String adminUsername, String reason) {
        String sql = """
            UPDATE usuarios
            SET estado = 'LOCKED'
            WHERE id = ?
        """;
        return jdbcTemplate.update(sql, userId);
    }

    /**
     * Escribe un registro inmutable en {@code auditoria_autenticacion}.
     */
    public void recordAuthAuditLog(
            UUID userId,
            UUID branchId,
            String eventType,
            String actionDetail,
            String module,
            String ip,
            String metadataJson) {

        String sql = """
            INSERT INTO auditoria_autenticacion (
                usuario_id, sede_id, tipo_evento, detalle_accion, distintivo_modulo, direccion_ip, metadatos, fecha_creacion
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?::jsonb, NOW()
            )
        """;
        jdbcTemplate.update(sql, userId, branchId, eventType, actionDetail, module, ip, metadataJson != null ? metadataJson : "{}");
    }
}
