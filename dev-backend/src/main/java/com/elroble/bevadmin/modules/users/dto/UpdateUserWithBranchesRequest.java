package com.elroble.bevadmin.modules.users.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

/**
 * DTO de entrada para actualizar un usuario existente, su rol asignado y locales autorizados.
 */
@Schema(description = "Solicitud para actualizar un usuario, rol asignado y locales autorizados")
public record UpdateUserWithBranchesRequest(
        @Schema(description = "Nombre y apellidos completos", example = "Renato Ambrocio")
        @NotBlank String fullName,

        @Schema(description = "Nombre de usuario para login", example = "rambrocio")
        @NotBlank String username,

        @Schema(description = "Correo electrónico institucional", example = "rambrocio@empresa.com")
        @Email @NotBlank String email,

        @Schema(description = "Nueva contraseña opcional (dejar en blanco para conservar la actual)")
        String password,

        @Schema(description = "Código o nombre del Rol asignado", example = "SUPERVISOR")
        @NotBlank String roleCode,

        @Schema(description = "Código del Negocio Matriz", example = "BIZ-003")
        String businessCode,

        @Schema(description = "Nombre del Local Principal asignado")
        String primaryBranchName,

        @Schema(description = "Lista de Locales Autorizados dentro del negocio")
        List<String> authorizedBranchNames,

        @Schema(description = "Clasificación del usuario/cliente")
        String clientType,

        @Schema(description = "Estado del usuario (ACTIVE, INACTIVE, LOCKED)")
        String status
) {}
