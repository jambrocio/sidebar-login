package com.auth.identity.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

/**
 * Carga útil para la rotación y renovación de tokens mediante Refresh Token.
 *
 * @param refreshToken Token de refresco opaco emitido previamente.
 *
 * @author Equipo de Arquitectura e Identidad
 * @version 1.0
 */
@Schema(description = "Solicitud de renovación de tokens mediante token de refresco")
public record RefreshTokenRequest(
        @Schema(description = "Token de refresco opaco emitido previamente")
        @NotBlank(message = "El token de refresco es obligatorio")
        String refreshToken
) {}
