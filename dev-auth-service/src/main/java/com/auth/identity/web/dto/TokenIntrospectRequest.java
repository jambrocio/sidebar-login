package com.auth.identity.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

/**
 * Carga útil para la introspección de tokens de acceso según la especificación RFC 7662.
 *
 * @param token Cadena compacta del token JWT a evaluar.
 *
 * @author Equipo de Arquitectura e Identidad
 * @version 1.0
 */
@Schema(description = "Solicitud de introspección de token OAuth2 RFC 7662")
public record TokenIntrospectRequest(
        @Schema(description = "Cadena del token JWT de acceso a evaluar")
        @NotBlank(message = "El token es obligatorio")
        String token
) {}
