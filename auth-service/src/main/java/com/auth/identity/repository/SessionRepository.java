package com.auth.identity.repository;

import com.auth.identity.domain.model.UserSession;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Synchronous relational data access repository for session lifecycle,
 * concurrent token tracking, and remote session termination in {@code auth.sesiones_usuario}.
 */
@Repository
public class SessionRepository {

    private final JdbcClient jdbcClient;

    public SessionRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public void createSession(
            UUID sessionId,
            UUID userId,
            String refreshTokenHash,
            String ipAddress,
            String userAgent,
            String deviceType,
            String browserName,
            String locationName,
            BigDecimal latitude,
            BigDecimal longitude,
            OffsetDateTime expiresAt
    ) {
        String sql = """
                INSERT INTO auth.sesiones_usuario (
                    id, usuario_id, hash_token_refresco, direccion_ip, agente_usuario,
                    tipo_dispositivo, nombre_navegador, nombre_ubicacion, latitud, longitud,
                    fecha_ultima_actividad, es_revocada, revocada_por_admin, fecha_expiracion
                ) VALUES (
                    :id, :userId, :hash, :ip, :ua,
                    :device, :browser, :location, :lat, :lon,
                    NOW(), FALSE, FALSE, :expiresAt
                )
                """;

        jdbcClient.sql(sql)
                .param("id", sessionId)
                .param("userId", userId)
                .param("hash", refreshTokenHash)
                .param("ip", ipAddress)
                .param("ua", userAgent)
                .param("device", deviceType != null ? deviceType : "Desktop - Windows")
                .param("browser", browserName != null ? browserName : "Chrome 122")
                .param("location", locationName != null ? locationName : "Lima, Peru")
                .param("lat", latitude != null ? latitude : new BigDecimal("-12.046374"))
                .param("lon", longitude != null ? longitude : new BigDecimal("-77.042793"))
                .param("expiresAt", expiresAt)
                .update();
    }

    public Optional<UserSession> findActiveSessionByHash(String refreshTokenHash) {
        String sql = """
                SELECT id, usuario_id, hash_token_refresco, direccion_ip, agente_usuario,
                       tipo_dispositivo, nombre_navegador, nombre_ubicacion, latitud, longitud,
                       fecha_ultima_actividad, es_revocada, revocada_por_admin, motivo_revocacion,
                       fecha_revocacion, fecha_expiracion, fecha_creacion
                FROM auth.sesiones_usuario
                WHERE hash_token_refresco = :hash
                  AND es_revocada = FALSE
                  AND fecha_expiracion > NOW()
                LIMIT 1
                """;

        return jdbcClient.sql(sql)
                .param("hash", refreshTokenHash)
                .query((rs, rowNum) -> new UserSession(
                        UUID.fromString(rs.getString("id")),
                        UUID.fromString(rs.getString("usuario_id")),
                        rs.getString("hash_token_refresco"),
                        rs.getString("direccion_ip"),
                        rs.getString("agente_usuario"),
                        rs.getString("tipo_dispositivo"),
                        rs.getString("nombre_navegador"),
                        rs.getString("nombre_ubicacion"),
                        rs.getBigDecimal("latitud"),
                        rs.getBigDecimal("longitud"),
                        rs.getObject("fecha_ultima_actividad", OffsetDateTime.class),
                        rs.getBoolean("es_revocada"),
                        rs.getBoolean("revocada_por_admin"),
                        rs.getString("motivo_revocacion"),
                        rs.getObject("fecha_revocacion", OffsetDateTime.class),
                        rs.getObject("fecha_expiracion", OffsetDateTime.class),
                        rs.getObject("fecha_creacion", OffsetDateTime.class)
                ))
                .optional();
    }

    public void updateHeartbeat(UUID sessionId) {
        String sql = """
                UPDATE auth.sesiones_usuario
                SET fecha_ultima_actividad = NOW()
                WHERE id = :id AND es_revocada = FALSE
                """;
        jdbcClient.sql(sql).param("id", sessionId).update();
    }

    public void revokeSession(UUID sessionId, boolean byAdmin, String reason) {
        String sql = """
                UPDATE auth.sesiones_usuario
                SET es_revocada = TRUE,
                    revocada_por_admin = :byAdmin,
                    motivo_revocacion = :reason,
                    fecha_revocacion = NOW()
                WHERE id = :id
                """;
        jdbcClient.sql(sql)
                .param("id", sessionId)
                .param("byAdmin", byAdmin)
                .param("reason", reason)
                .update();
    }

    public void revokeAllUserSessions(UUID userId, String reason) {
        String sql = """
                UPDATE auth.sesiones_usuario
                SET es_revocada = TRUE,
                    motivo_revocacion = :reason,
                    fecha_revocacion = NOW()
                WHERE usuario_id = :userId AND es_revocada = FALSE
                """;
        jdbcClient.sql(sql)
                .param("userId", userId)
                .param("reason", reason)
                .update();
    }

    public List<Map<String, Object>> findActiveSessionsConsolidated() {
        String sql = "SELECT * FROM auth.vw_sesiones_activas_usuario ORDER BY fecha_inicio_sesion DESC";
        return jdbcClient.sql(sql).query().listOfRows();
    }
}
