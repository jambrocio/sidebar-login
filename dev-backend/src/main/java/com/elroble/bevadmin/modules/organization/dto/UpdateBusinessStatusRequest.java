package com.elroble.bevadmin.modules.organization.dto;

import jakarta.validation.constraints.NotNull;

/**
 * DTO de solicitud para habilitar o deshabilitar un Negocio Matriz.
 *
 * @param active {@code true} para habilitar el negocio, {@code false} para deshabilitarlo
 */
public record UpdateBusinessStatusRequest(
        @NotNull(message = "El estado activo es obligatorio")
        Boolean active
) {
}
