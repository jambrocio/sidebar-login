package com.elroble.bevadmin.modules.sessions.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Respuesta del latido (heartbeat) de sesión.
 */
@Schema(description = "Estado del latido de sesión para verificar conexión activa o revocación remota.")
public record HeartbeatResponse(

        @Schema(description = "Indica si la sesión continúa activa y válida.", example = "true")
        boolean active,

        @Schema(description = "Indica si la sesión ha sido revocada remotamente por un Administrador.", example = "false")
        boolean revoked,

        @Schema(description = "Estado de conexión resultante (ONLINE, IDLE, DISCONNECTED).", example = "ONLINE")
        String status,

        @Schema(description = "Mensaje informativo o de advertencia.", example = "Sesión activa y latido registrado.")
        String message
) {}
