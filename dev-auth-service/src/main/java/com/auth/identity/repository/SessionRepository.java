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
 * Repositorio relacional sincrónico para la gestión del ciclo de vida de sesiones,
 * concurrencia de clientes y revocación remota en la tabla {@code auth.sesiones_usuario}.
 *
 * @author Equipo de Arquitectura e Identidad
 * @version 1.0
 */
@Repository
public class SessionRepository {

    private final JdbcClient jdbcClient;

    /**
     * Constructor con inyección del cliente JDBC de Spring.
     *
     * @param jdbcClient Cliente JDBC simplificado y de alto rendimiento.
     */
    public SessionRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    /**
     * Registra una nueva sesión de cliente activa en la base de datos con sus metadatos de entorno.
     *
     * @param sessionId Identificador UUID de la nueva sesión.
     * @param userId Identificador UUID del usuario titular.
     * @param refreshTokenHash Resumen criptográfico SHA-256 del token de refresco.
     * @param ipAddress Dirección IP del cliente.
     * @param userAgent Cadena User-Agent enviada por el navegador o cliente HTTP.
     * @param deviceType Tipo de dispositivo clasificado.
     * @param browserName Nombre del navegador detectado.
     * @param locationName Ubicación estimada descriptiva.
     * @param latitude Coordenada de latitud estimada.
     * @param longitude Coordenada de longitud estimada.
     * @param expiresAt Fecha y hora de expiración de la sesión.
     */
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

    /**
     * Busca una sesión activa y no expirada mediante el hash SHA-256 de su token de refresco.
     *
     * @param refreshTokenHash Resumen criptográfico del token de refresco presentado.
     * @return {@link Optional} con la entidad {@link UserSession} si es válida y vigente.
     */
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

    /**
     * Actualiza la fecha y hora de última actividad (heartbeat) para mantener viva la sesión.
     *
     * @param sessionId Identificador UUID de la sesión activa.
     */
    public void updateHeartbeat(UUID sessionId) {
        String sql = """
                UPDATE auth.sesiones_usuario
                SET fecha_ultima_actividad = NOW()
                WHERE id = :id AND es_revocada = FALSE
                """;
        jdbcClient.sql(sql).param("id", sessionId).update();
    }

    /**
     * Marca una sesión como revocada registrando el motivo y si la acción provino de un administrador.
     *
     * @param sessionId Identificador UUID de la sesión a revocar.
     * @param byAdmin true si fue terminada de forma remota por un administrador.
     * @param reason Motivo explicativo de la revocación.
     */
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

    /**
     * Revoca todas las sesiones activas asociadas a un usuario en particular.
     *
     * @param userId Identificador UUID del usuario.
     * @param reason Motivo de revocación global (ej. "Password Changed").
     */
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

    /**
     * Obtiene el listado consolidado de todas las sesiones activas en el sistema con sus datos de usuario.
     *
     * @return Lista de filas obtenidas desde la vista {@code auth.vw_sesiones_activas_usuario}.
     */
    public List<Map<String, Object>> findActiveSessionsConsolidated() {
        String sql = "SELECT * FROM auth.vw_sesiones_activas_usuario ORDER BY fecha_inicio_sesion DESC";
        return jdbcClient.sql(sql).query().listOfRows();
    }
}
