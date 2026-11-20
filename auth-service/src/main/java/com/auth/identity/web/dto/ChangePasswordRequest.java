package com.auth.identity.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Carga útil para la renovación voluntaria u obligatoria de contraseña.
 *
 * @param currentPassword Contraseña activa actual para validación de titularidad.
 * @param newPassword Nueva contraseña elegida que cumpla las directivas de seguridad.
 *
 * @author Equipo de Arquitectura e Identidad
 * @version 1.0
 */
@Schema(description = "Carga útil para el cambio de contraseña de usuario")
public record ChangePasswordRequest(
        @Schema(description = "Contraseña actual activa para validación de titularidad")
        @NotBlank(message = "La contraseña actual es obligatoria")
        String currentPassword,

        @Schema(description = "Nueva contraseña con longitud mínima de 8 caracteres")
        @NotBlank(message = "La nueva contraseña es obligatoria")
        @Size(min = 8, message = "La nueva contraseña debe contener al menos 8 caracteres")
        String newPassword
) {}
