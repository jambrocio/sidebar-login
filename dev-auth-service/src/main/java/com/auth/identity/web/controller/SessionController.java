package com.auth.identity.web.controller;

import com.auth.identity.service.SessionService;
import com.auth.identity.web.dto.RevokeSessionRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Controlador REST para el monitoreo de sesiones concurrentes activas, latidos de presencia y terminación remota (Kill Session).
 *
 * <p>Permite a los administradores y auditores supervisar las conexiones activas,
 * registrar actividad periódica y dar de baja conexiones de forma inmediata.</p>
 *
 * @author Equipo de Arquitectura e Identidad
 * @version 1.0
 */
@RestController
@RequestMapping("/api/v1/sessions")
@Tag(name = "Gobierno de Sesiones de Usuario", description = "Monitoreo de conexiones activas, latidos (heartbeat) y terminación remota de sesiones")
public class SessionController {

    private final SessionService sessionService;

    /**
     * Constructor con inyección del servicio de sesiones.
     *
     * @param sessionService Servicio de control de sesiones.
     */
    public SessionController(SessionService sessionService) {
        this.sessionService = sessionService;
    }

    /**
     * Lista todas las sesiones activas en el sistema con geolocalización y datos de dispositivo.
     *
     * @return Lista de registros de sesiones activas.
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'AUDITOR', 'SUPERVISOR')")
    @Operation(
            summary = "Listar todas las sesiones activas",
            description = "Retorna las sesiones activas consolidadas con dirección IP, navegador, dispositivo y estado de actividad."
    )
    @ApiResponse(responseCode = "200", description = "Listado de sesiones activas obtenido exitosamente")
    @ApiResponse(responseCode = "403", description = "Acceso denegado por falta de permisos")
    public ResponseEntity<List<Map<String, Object>>> getActiveSessions() {
        return ResponseEntity.ok(sessionService.getActiveSessions());
    }

    /**
     * Revoca remotamente una sesión activa (Kill Session).
     *
     * @param request Datos de la solicitud indicando el ID de sesión y motivo.
     * @return Mensaje confirmatorio de la terminación de la sesión.
     */
    @PostMapping("/revoke")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
            summary = "Terminar sesión remotamente (Kill Session)",
            description = "Invalida de inmediato una sesión activa específica forzando el rechazo de cualquier solicitud posterior."
    )
    @ApiResponse(responseCode = "200", description = "Sesión terminada exitosamente")
    @ApiResponse(responseCode = "403", description = "Acceso restringido a usuarios con rol ADMIN")
    public ResponseEntity<Map<String, String>> revokeSession(@Valid @RequestBody RevokeSessionRequest request) {
        sessionService.revokeSession(request.sessionId(), true, request.reason());
        return ResponseEntity.ok(Map.of("message", "Sesión " + request.sessionId() + " terminada exitosamente."));
    }

    /**
     * Registra un latido de actividad (heartbeat) para mantener viva la sesión.
     *
     * @param sessionId Identificador UUID de la sesión activa.
     * @return Estado confirmatorio de sesión viva.
     */
    @PostMapping("/{sessionId}/heartbeat")
    @Operation(
            summary = "Registrar latido de actividad (Heartbeat)",
            description = "Actualiza la fecha y hora de última actividad de una sesión activa de usuario."
    )
    @ApiResponse(responseCode = "200", description = "Latido registrado exitosamente")
    public ResponseEntity<Map<String, String>> heartbeat(@PathVariable UUID sessionId) {
        sessionService.recordHeartbeat(sessionId);
        return ResponseEntity.ok(Map.of("status", "ALIVE"));
    }
}
