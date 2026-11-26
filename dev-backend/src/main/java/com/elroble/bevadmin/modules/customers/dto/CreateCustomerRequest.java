package com.elroble.bevadmin.modules.customers.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;

/**
 * DTO para la creación de un nuevo cliente comercial en la plataforma.
 * Cada cliente está aislado y es único por Negocio Matriz (empresa_id).
 */
@Schema(description = "Solicitud para registrar un cliente comercial único por Negocio Matriz")
public record CreateCustomerRequest(
        @Schema(description = "Código único del cliente dentro del negocio", example = "CLI-005")
        String customerCode,

        @Schema(description = "Tipo de documento (RUC, DNI, CE, PASAPORTE)", example = "RUC")
        @NotBlank String documentType,

        @Schema(description = "Número de documento de identidad fiscal", example = "20601234567")
        @NotBlank String documentNumber,

        @Schema(description = "Razón social o nombre completo del cliente", example = "Distribuidora San José S.A.C.")
        @NotBlank String legalName,

        @Schema(description = "Nombre comercial", example = "Comercial San José")
        String commercialName,

        @Schema(description = "Tipo o clasificación (Mayorista VIP, Minorista Frecuente, Distribuidor, Corporativo)", example = "Mayorista VIP")
        @NotBlank String customerType,

        @Schema(description = "Correo electrónico de contacto", example = "contacto@sanjose.pe")
        String email,

        @Schema(description = "Teléfono o celular", example = "+51 987 654 321")
        String phone,

        @Schema(description = "Dirección fiscal o comercial", example = "Av. Argentina 1230, Lima")
        String address,

        @Schema(description = "Línea de crédito autorizada", example = "10000.00")
        BigDecimal creditLine,

        @Schema(description = "Código del negocio matriz si es Administrador General (ej. BIZ-001 o BIZ-002)", example = "BIZ-001")
        String businessCode
) {}
