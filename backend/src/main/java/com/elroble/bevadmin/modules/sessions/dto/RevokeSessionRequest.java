package com.elroble.bevadmin.modules.sessions.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Solicitud de revocación administrativa remota de sesión.
 */
@Schema(description = "Datos para forzar el cierre remoto de una sesión activa.")
public record RevokeSessionRequest(

        @Schema(description = "Motivo administrativo del cierre remoto de sesión.", example = "Actividad sospechosa desde IP foránea no autorizada")
        String reason
) {}
