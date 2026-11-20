package com.auth.identity.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * Carga útil para la terminación remota forzada de una sesión de usuario (Kill Session).
 *
 * @param sessionId Identificador UUID de la sesión activa a revocar.
 * @param reason Motivo o justificación administrativa del cierre de sesión forzoso.
 *
 * @author Equipo de Arquitectura e Identidad
 * @version 1.0
 */
@Schema(description = "Solicitud de terminación remota de sesión activa (Kill Session)")
public record RevokeSessionRequest(
        @Schema(description = "Identificador UUID de la sesión a revocar")
        @NotNull(message = "El identificador de sesión es obligatorio")
        UUID sessionId,

        @Schema(description = "Motivo administrativo de la terminación", example = "Cierre por detección de ubicación anómala")
        String reason
) {}
