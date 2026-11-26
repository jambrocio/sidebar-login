package com.elroble.bevadmin.modules.roles.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

/**
 * DTO de entrada para el registro de un nuevo Rol del Sistema en la tabla {@code roles}.
 *
 * @param code        código técnico único del rol (ej. {@code JEFE_ALMACEN})
 * @param name        nombre descriptivo del rol
 * @param description descripción de responsabilidades
 * @param scope       alcance organizacional ({@code Nivel Negocio (Multi-Local)} o {@code Nivel Local Asignado})
 */
@Schema(description = "Datos requeridos para crear un nuevo Rol en la tabla 'roles'")
public record CreateRoleRequest(
        @Schema(description = "Código técnico único del rol", example = "JEFE_ALMACEN")
        @NotBlank String code,

        @Schema(description = "Nombre comercial del rol", example = "Jefe de Almacén Mayorista")
        @NotBlank String name,

        @Schema(description = "Descripción de las facultades del rol", example = "Control de recepción de lotes, stock en cajas y transferencias.")
        String description,

        @Schema(description = "Alcance organizacional del rol", example = "Nivel Local Asignado", allowableValues = {"Nivel Negocio (Multi-Local)", "Nivel Local Asignado"})
        @NotBlank String scope
) {}
