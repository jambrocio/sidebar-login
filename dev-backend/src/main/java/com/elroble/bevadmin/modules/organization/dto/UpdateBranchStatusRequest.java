package com.elroble.bevadmin.modules.organization.dto;

import jakarta.validation.constraints.NotNull;

/**
 * DTO de solicitud para habilitar o deshabilitar un Local o Sucursal.
 *
 * @param active {@code true} para habilitar el local ({@code Operativo}), {@code false} para deshabilitarlo ({@code Inactivo})
 */
public record UpdateBranchStatusRequest(
        @NotNull(message = "El estado activo es obligatorio")
        Boolean active
) {
}
