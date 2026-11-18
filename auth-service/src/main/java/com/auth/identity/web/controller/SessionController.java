package com.auth.identity.web.controller;

import com.auth.identity.service.SessionService;
import com.auth.identity.web.dto.RevokeSessionRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Endpoints for active sessions monitoring, heartbeat updates, and remote session termination (Kill Session).
 */
@RestController
@RequestMapping("/api/v1/sessions")
@Tag(name = "Session Management", description = "Active connection monitoring, heartbeats, and remote session termination")
public class SessionController {

    private final SessionService sessionService;

    public SessionController(SessionService sessionService) {
        this.sessionService = sessionService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'AUDITOR', 'SUPERVISOR')")
    @Operation(summary = "List all active sessions", description = "Returns active sessions with device, IP, geolocalization, and connection health flags.")
    public ResponseEntity<List<Map<String, Object>>> getActiveSessions() {
        return ResponseEntity.ok(sessionService.getActiveSessions());
    }

    @PostMapping("/revoke")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Kill Session remotely", description = "Terminates an active session remotely, enforcing token rejection.")
    public ResponseEntity<Map<String, String>> revokeSession(@Valid @RequestBody RevokeSessionRequest request) {
        sessionService.revokeSession(request.sessionId(), true, request.reason());
        return ResponseEntity.ok(Map.of("message", "Session " + request.sessionId() + " successfully terminated."));
    }

    @PostMapping("/{sessionId}/heartbeat")
    @Operation(summary = "Record session heartbeat", description = "Refreshes last activity timestamp for an active session.")
    public ResponseEntity<Map<String, String>> heartbeat(@PathVariable UUID sessionId) {
        sessionService.recordHeartbeat(sessionId);
        return ResponseEntity.ok(Map.of("status", "ALIVE"));
    }
}
