package com.elroble.bevadmin.modules.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * DTO de entrada para la solicitud de cambio o renovación de contraseña por expiración.
 *
 * @param username        nombre de usuario o correo electrónico
 * @param currentPassword contraseña actual o vencida
 * @param newPassword     nueva contraseña (mínimo 8 caracteres)
 */
@Schema(description = "Solicitud para renovar la contraseña de acceso (por expiración o cambio voluntario)")
public record ChangePasswordRequest(
        @Schema(description = "Nombre de usuario o correo electrónico corporativo", example = "lucia.torres@empresa.com")
        @NotBlank(message = "El usuario o correo es obligatorio")
        String username,

        @Schema(description = "Contraseña actual o expirada", example = "Cajero123*")
        @NotBlank(message = "La contraseña actual es obligatoria")
        String currentPassword,

        @Schema(description = "Nueva contraseña segura", example = "RobleSegura2026#")
        @NotBlank(message = "La nueva contraseña es obligatoria")
        @Size(min = 8, message = "La nueva contraseña debe tener al menos 8 caracteres")
        String newPassword
) {}
