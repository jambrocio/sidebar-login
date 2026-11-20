package com.elroble.bevadmin.modules.suppliers.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

/**
 * DTO para la actualización de estado operativo de un Proveedor Comercial (Activo / Inactivo).
 */
@Schema(description = "Petición para modificar el estado operativo de un proveedor")
public record UpdateSupplierStatusRequest(
        @Schema(description = "Nuevo estado del proveedor (true = activo para compras, false = inactivo)", example = "true")
        @NotNull(message = "El estado 'active' es requerido")
        Boolean active
) {}
