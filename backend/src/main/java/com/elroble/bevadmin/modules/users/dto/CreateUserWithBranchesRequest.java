package com.elroble.bevadmin.modules.users.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

/**
 * DTO de entrada para registrar un nuevo usuario con su Negocio Matriz, Local Principal
 * y Locales Autorizados.
 *
 * @param userCode              código legible del usuario (ej. {@code USR-005})
 * @param fullName              nombres y apellidos completos
 * @param username              nombre de usuario único para login y auditoría
 * @param email                 correo electrónico institucional
 * @param password              contraseña inicial
 * @param roleCode              código del rol asignado ({@code ADMIN}, {@code SUPERVISOR}, {@code ANALYST}, {@code AUDITOR})
 * @param businessCode          código del Negocio Matriz ({@code BIZ-001} o {@code BIZ-002})
 * @param primaryBranchName     nombre del Local Principal de operación por defecto
 * @param authorizedBranchNames lista de todos los locales del negocio donde está autorizado a operar
 * @param clientType            clasificación ({@code Personal Interno}, {@code Mayorista VIP}, {@code Minorista Frecuente})
 */
@Schema(description = "Solicitud para registrar un usuario asignándole Negocio Matriz, Local Principal y Locales Autorizados")
public record CreateUserWithBranchesRequest(
        @Schema(description = "Código único del usuario", example = "USR-005")
        @NotBlank String userCode,

        @Schema(description = "Nombre y apellidos completos", example = "Roberto Paredes")
        @NotBlank String fullName,

        @Schema(description = "Nombre de usuario para login", example = "rparedes")
        @NotBlank String username,

        @Schema(description = "Correo electrónico institucional", example = "roberto.paredes@empresa.com")
        @Email @NotBlank String email,

        @Schema(description = "Contraseña inicial en texto plano (se cifra con BCrypt)", example = "Admin123*")
        @NotBlank String password,

        @Schema(description = "Código del Rol asignado", example = "ANALYST")
        @NotBlank String roleCode,

        @Schema(description = "Código del Negocio Matriz", example = "BIZ-001")
        @NotBlank String businessCode,

        @Schema(description = "Nombre del Local Principal asignado", example = "Sede Central (Mayorista) — Av. Industrial 450")
        @NotBlank String primaryBranchName,

        @Schema(description = "Lista de Locales Autorizados dentro del negocio", example = "[\"Sede Central (Mayorista) — Av. Industrial 450\", \"Tienda Miraflores (Minorista) — Av. Larco 820\"]")
        @NotEmpty List<String> authorizedBranchNames,

        @Schema(description = "Clasificación del usuario/cliente", example = "Personal Interno")
        @NotBlank String clientType
) {}
