package com.auth.identity.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Carga útil para la autenticación de credenciales en el Servicio Centralizado de Identidad.
 *
 * @param username Nombre de usuario único o correo electrónico corporativo registrado.
 * @param password Contraseña de acceso en texto plano enviada sobre canal TLS seguro.
 *
 * @author Equipo de Arquitectura e Identidad
 * @version 1.0
 */
@Schema(description = "Carga útil para autenticación de credenciales de usuario")
public record LoginRequest(
        @Schema(description = "Nombre de usuario único o correo electrónico corporativo", example = "agarcia")
        @NotBlank(message = "El nombre de usuario o correo electrónico es obligatorio")
        @Size(min = 3, max = 150, message = "El identificador debe tener entre 3 y 150 caracteres")
        String username,

        @Schema(description = "Contraseña en texto plano a verificar mediante BCrypt", example = "Password123!")
        @NotBlank(message = "La contraseña es obligatoria")
        String password
) {}
