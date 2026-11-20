package com.auth.identity.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

/**
 * Carga útil para el aprovisionamiento de una nueva identidad de usuario corporativo.
 *
 * @param userCode Código identificador corporativo (ej. USR-010).
 * @param username Nombre de usuario único para autenticación.
 * @param email Correo electrónico corporativo único.
 * @param password Contraseña inicial asignada (mínimo 8 caracteres).
 * @param fullName Nombre completo del colaborador.
 * @param businessId Identificador UUID de la empresa a la que pertenece.
 * @param assignedBranchId Identificador UUID de la sucursal o sede principal.
 * @param authorizedBranchIds Lista opcional de sedes adicionales donde tiene autorización para operar.
 * @param roleCode Código del rol RBAC asignado (ADMIN, SUPERVISOR, ANALYST, AUDITOR).
 * @param clientType Perfil o tipología de usuario (ej. "Personal Interno").
 *
 * @author Equipo de Arquitectura e Identidad
 * @version 1.0
 */
@Schema(description = "Carga útil para la creación y aprovisionamiento de un nuevo usuario")
public record CreateUserRequest(
        @Schema(description = "Código corporativo del usuario", example = "USR-010")
        @NotBlank(message = "El código de usuario es obligatorio")
        String userCode,

        @Schema(description = "Nombre de usuario para el inicio de sesión", example = "jdoe")
        @NotBlank(message = "El nombre de usuario es obligatorio")
        @Size(min = 3, max = 50, message = "El nombre de usuario debe tener entre 3 y 50 caracteres")
        String username,

        @Schema(description = "Correo electrónico corporativo único", example = "jdoe@elroble.com")
        @NotBlank(message = "El correo electrónico es obligatorio")
        @Email(message = "El formato de correo electrónico es inválido")
        String email,

        @Schema(description = "Contraseña inicial de la cuenta")
        @NotBlank(message = "La contraseña inicial es obligatoria")
        @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres")
        String password,

        @Schema(description = "Nombre completo del colaborador", example = "John Doe")
        @NotBlank(message = "El nombre completo es obligatorio")
        String fullName,

        @Schema(description = "Identificador UUID de la empresa")
        @NotNull(message = "El identificador de empresa es obligatorio")
        UUID businessId,

        @Schema(description = "Identificador UUID de la sede principal asignada")
        @NotNull(message = "La sede principal asignada es obligatoria")
        UUID assignedBranchId,

        @Schema(description = "Lista de identificadores UUID de todas las sedes autorizadas para operar")
        List<UUID> authorizedBranchIds,

        @Schema(description = "Código del rol RBAC a asignar", example = "ANALYST")
        @NotBlank(message = "El código de rol es obligatorio")
        String roleCode,

        @Schema(description = "Clasificación o perfil operativo del usuario", example = "Personal Interno")
        String clientType
) {}
