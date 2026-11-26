package com.auth.identity.service;

import com.auth.identity.domain.model.UserSession;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Interfaz de servicio para el gobierno de sesiones concurrentes, latidos de actividad y revocación remota.
 *
 * <p>Proporciona capacidades para registrar conexiones activas, auditar geolocalización aproximada,
 * actualizar periódicamente la presencia del cliente (heartbeat) y terminar sesiones no autorizadas (Kill Session).</p>
 *
 * @author Equipo de Arquitectura e Identidad
 * @version 1.0
 */
public interface SessionService {

    /**
     * Registra una nueva sesión activa de usuario tras una autenticación o rotación exitosa.
     *
     * @param userId Identificador UUID del usuario.
     * @param refreshToken Token de refresco opaco.
     * @param ipAddress Dirección IP de red de la conexión.
     * @param userAgent Cadena de identificación del navegador o cliente HTTP.
     * @return Entidad {@link UserSession} creada.
     */
    UserSession registerSession(UUID userId, String refreshToken, String ipAddress, String userAgent);

    /**
     * Actualiza la fecha y hora del último latido de actividad registrado por un cliente conectado.
     *
     * @param sessionId Identificador UUID de la sesión activa.
     */
    void recordHeartbeat(UUID sessionId);

    /**
     * Revoca y da de baja una sesión individual específica.
     *
     * @param sessionId Identificador UUID de la sesión a revocar.
     * @param byAdmin true si fue ejecutado remotamente por un administrador de seguridad.
     * @param reason Motivo justificado del cierre de la sesión.
     */
    void revokeSession(UUID sessionId, boolean byAdmin, String reason);

    /**
     * Revoca y termina todas las sesiones activas concurrentes de un usuario dado.
     *
     * @param userId Identificador UUID del usuario.
     * @param reason Motivo de la revocación masiva.
     */
    void revokeAllUserSessions(UUID userId, String reason);

    /**
     * Consulta la lista consolidada de todas las sesiones activas en la plataforma.
     *
     * @return Lista de mapas con los campos provenientes de la vista de sesiones activas.
     */
    List<Map<String, Object>> getActiveSessions();
}
