package com.elroble.bevadmin.modules.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

/**
 * DTO de entrada para la solicitud de inicio de sesión corporativo.
 *
 * @param username nombre de usuario (ej. {@code agarcia}) o correo electrónico ({@code ana.garcia@empresa.com})
 * @param password contraseña en texto plano que se validará contra {@code users.password_hash}
 */
@Schema(description = "Credenciales de acceso enviadas desde el formulario de Login (/login)")
public record LoginRequest(
        @Schema(description = "Nombre de usuario o correo electrónico corporativo", example = "ana.garcia@empresa.com")
        @NotBlank(message = "El usuario o correo es obligatorio")
        String username,

        @Schema(description = "Contraseña del usuario", example = "Admin123*")
        @NotBlank(message = "La contraseña es obligatoria")
        String password
) {}
