package com.elroble.bevadmin.modules.auth.dto;

import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * DTO de respuesta devuelto tras una autenticación exitosa o renovación de contraseña.
 *
 * @param accessToken          token JWT firmado que debe enviarse en el header {@code Authorization: Bearer <token>}
 * @param user                 contexto organizacional completo del usuario (Negocio Matriz, Local Asignado y Roles)
 * @param passwordStatus       estado de la contraseña ('Vigente', 'Por Expirar', 'Expirada', 'Clave Temporal')
 * @param daysUntilExpiration  días calendario restantes antes de que la contraseña expire
 * @param passwordExpiresAt    fecha de expiración en formato ISO o YYYY-MM-DD
 * @param mustChangePassword   indica si el usuario debe obligatoriamente renovar su contraseña
 */
@Schema(description = "Respuesta de autenticación con el Token JWT, perfil del usuario y estado de expiración de contraseña")
public record LoginResponse(
        @Schema(description = "Token de acceso JWT (vigencia 30 minutos)")
        String accessToken,

        @Schema(description = "Datos del usuario autenticado incluyendo su Negocio Matriz y Local Asignado")
        AuthenticatedUserPrincipal user,

        @Schema(description = "Estado de vigencia de la contraseña", example = "Vigente")
        String passwordStatus,

        @Schema(description = "Días restantes antes de expirar la contraseña", example = "45")
        Integer daysUntilExpiration,

        @Schema(description = "Fecha de expiración de la contraseña", example = "2026-12-06")
        String passwordExpiresAt,

        @Schema(description = "Indica si debe cambiar de contraseña obligatoriamente", example = "false")
        boolean mustChangePassword
) {
    /** Constructor de conveniencia */
    public LoginResponse(String accessToken, AuthenticatedUserPrincipal user) {
        this(accessToken, user, "Vigente", 90, null, false);
    }
}
