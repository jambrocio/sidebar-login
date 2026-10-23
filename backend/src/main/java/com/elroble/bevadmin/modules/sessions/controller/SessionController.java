package com.elroble.bevadmin.modules.sessions.controller;

import com.elroble.bevadmin.audit.Auditable;
import com.elroble.bevadmin.modules.sessions.dto.ActiveSessionDto;
import com.elroble.bevadmin.modules.sessions.dto.HeartbeatResponse;
import com.elroble.bevadmin.modules.sessions.dto.RevokeSessionRequest;
import com.elroble.bevadmin.modules.sessions.service.SessionService;
import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Controlador REST síncrono para la Auditoría de Conexiones,
 * Monitoreo Semaforizado de Sesiones y Cierre Remoto de Dispositivos (Kill Session).
 */
@RestController
@Tag(
        name = "05. Sesiones Activas y Auditoría de Red",
        description = "Monitoreo en tiempo real de IPs, navegadores, geolocalización, semáforos de actividad y revocación forzada por el Administrador."
)
public class SessionController {

    private final SessionService sessionService;

    public SessionController(SessionService sessionService) {
        this.sessionService = sessionService;
    }

    /**
     * Lista todas las sesiones activas y auditadas con semáforos e IPs.
     */
    @GetMapping("/api/v1/admin/sessions")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERVISOR')")
    @Operation(
            summary = "Listar sesiones activas con semaforización y geolocalización",
            description = "Devuelve la lista de sesiones desde 'vw_user_active_sessions' con IP, navegador, dispositivo, ubicación, semáforo (🟢 Online, 🟡 Ausente, 🔴 Desconectado) y banderas de revocación."
    )
    @ApiResponse(responseCode = "200", description = "Lista de sesiones obtenida correctamente.")
    public List<ActiveSessionDto> listSessions() {
        return sessionService.listActiveSessions();
    }

    /**
     * Cierra remotamente la sesión de un usuario (Kill Session).
     */
    @PostMapping("/api/v1/admin/sessions/{sessionId}/revoke")
    @PreAuthorize("hasRole('ADMIN')")
    @Auditable(module = "Seguridad", eventType = "SESSION_REVOKED")
    @Operation(
            summary = "Cerrar sesión remotamente a un usuario (Kill Session)",
            description = "Invalida de inmediato la sesión en 'user_sessions', expulsando al usuario o infiltrado en su próximo latido o petición HTTP."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Sesión revocada exitosamente."),
            @ApiResponse(responseCode = "404", description = "Sesión no encontrada.")
    })
    public Map<String, Object> revokeSession(
            @Parameter(description = "UUID de la sesión a revocar") @PathVariable UUID sessionId,
            @RequestBody(required = false) RevokeSessionRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal adminUser) {

        String adminName = (adminUser != null) ? adminUser.username() : "admin_sistema";
        String reason = (request != null) ? request.reason() : null;
        return sessionService.revokeSession(sessionId, adminName, reason);
    }

    /**
     * Bloquea la cuenta de un usuario infiltrado y revoca todas sus sesiones activas de golpe.
     */
    @PostMapping("/api/v1/admin/sessions/users/{userId}/lock")
    @PreAuthorize("hasRole('ADMIN')")
    @Auditable(module = "Seguridad", eventType = "USER_LOCKED")
    @Operation(
            summary = "Bloquear cuenta de usuario infiltrado y revocar todas sus sesiones",
            description = "Establece el estado del usuario en 'LOCKED' y revoca todas sus sesiones activas en la base de datos."
    )
    @ApiResponse(responseCode = "200", description = "Usuario bloqueado y sesiones cerradas.")
    public Map<String, Object> lockUserAndRevokeSessions(
            @Parameter(description = "UUID del usuario a bloquear") @PathVariable UUID userId,
            @RequestBody(required = false) RevokeSessionRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal adminUser) {

        String adminName = (adminUser != null) ? adminUser.username() : "admin_sistema";
        String reason = (request != null) ? request.reason() : "Bloqueo por presunta infiltración de seguridad";
        return sessionService.lockUserAndRevokeSessions(userId, adminName, reason);
    }

    /**
     * Latido periódico emitido desde el cliente web para registrar actividad y comprobar si fue revocado.
     */
    @PostMapping("/api/v1/auth/heartbeat")
    @Operation(
            summary = "Enviar latido de actividad (Heartbeat) y verificar validez",
            description = "Permite al frontend mantener el semáforo en 🟢 ONLINE y comprobar si un Administrador revocó su sesión para auto-expulsarse."
    )
    @ApiResponse(responseCode = "200", description = "Estado del latido devuelto.")
    public HeartbeatResponse heartbeat(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest request) {

        String token = "";
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        }
        return sessionService.processHeartbeat(token, request);
    }
}
