package com.elroble.bevadmin.modules.sessions.service;

import com.elroble.bevadmin.modules.sessions.dto.ActiveSessionDto;
import com.elroble.bevadmin.modules.sessions.dto.HeartbeatResponse;
import jakarta.servlet.http.HttpServletRequest;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Contrato del servicio síncrono para la auditoría de conexiones y control de sesiones activas.
 */
public interface SessionService {

    /**
     * Lista todas las sesiones con indicadores semaforizados (🟢, 🟡, 🔴) y geolocalización.
     */
    List<ActiveSessionDto> listActiveSessions();

    /**
     * Registra una nueva sesión activa con IP, User-Agent y ubicación tras un login exitoso.
     */
    void recordLoginSession(UUID userId, UUID branchId, String username, String token, HttpServletRequest request);

    /**
     * Procesa un latido (heartbeat) de un cliente para mantener su estado ONLINE y verificar si fue revocado.
     */
    HeartbeatResponse processHeartbeat(String token, HttpServletRequest request);

    /**
     * Comprueba si un token ha sido revocado remotamente.
     */
    boolean isTokenRevoked(String token);

    /**
     * Revoca remotamente una sesión específica de usuario (Kill Session).
     */
    Map<String, Object> revokeSession(UUID sessionId, String adminUsername, String reason);

    /**
     * Bloquea la cuenta del usuario en PostgreSQL y revoca todas sus sesiones activas inmediatamente.
     */
    Map<String, Object> lockUserAndRevokeSessions(UUID userId, String adminUsername, String reason);
}
