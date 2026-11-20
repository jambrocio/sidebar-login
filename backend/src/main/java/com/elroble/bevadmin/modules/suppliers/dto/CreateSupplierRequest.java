package com.elroble.bevadmin.modules.suppliers.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * DTO de entrada para registrar un nuevo Proveedor Comercial con aislamiento multi-tenant por negocio.
 */
@Schema(description = "Datos para el registro de un nuevo proveedor comercial")
public record CreateSupplierRequest(
        @Schema(description = "Tipo de documento de identidad tributaria", example = "RUC", allowableValues = {"RUC", "DNI", "OTRO"})
        @NotBlank(message = "El tipo de documento es obligatorio")
        String documentType,

        @Schema(description = "Número de RUC o documento del proveedor (único dentro del negocio)", example = "20100113610")
        @NotBlank(message = "El número de documento es obligatorio")
        @Pattern(regexp = "^[0-9A-Za-z-]{8,20}$", message = "El documento debe contener entre 8 y 20 caracteres válidos")
        String documentNumber,

        @Schema(description = "Razón social oficial del proveedor", example = "Unión de Cervecerías Peruanas Backus y Johnston S.A.A.")
        @NotBlank(message = "La razón social es obligatoria")
        @Size(max = 200, message = "La razón social no puede exceder 200 caracteres")
        String legalName,

        @Schema(description = "Nombre comercial o marca del proveedor", example = "Backus")
        @Size(max = 200, message = "El nombre comercial no puede exceder 200 caracteres")
        String commercialName,

        @Schema(description = "Nombre y apellidos de la persona o ejecutivo de contacto", example = "Carlos Mendoza")
        @Size(max = 150, message = "El nombre del contacto no puede exceder 150 caracteres")
        String contactName,

        @Schema(description = "Correo electrónico corporativo para órdenes de compra", example = "ventas@backus.com.pe")
        @Size(max = 150, message = "El correo no puede exceder 150 caracteres")
        String email,

        @Schema(description = "Teléfono o celular de contacto comercial", example = "+51 1 311-3000")
        @Size(max = 50, message = "El teléfono no puede exceder 50 caracteres")
        String phone,

        @Schema(description = "Dirección fiscal o del centro de distribución", example = "Av. Nicolás Ayllón 3986, Ate, Lima")
        @Size(max = 250, message = "La dirección no puede exceder 250 caracteres")
        String address,

        @Schema(description = "Rubro o categoría principal de abastecimiento", example = "Cervezas y Aguas")
        @Size(max = 100, message = "El rubro no puede exceder 100 caracteres")
        String rubroCategory,

        @Schema(description = "Código del negocio destino (exclusivo para Administrador General)", example = "BIZ-001")
        String businessCode
) {}
