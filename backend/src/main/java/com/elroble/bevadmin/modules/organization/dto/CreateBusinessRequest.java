package com.elroble.bevadmin.modules.organization.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * DTO de entrada para el alta de un nuevo Negocio Matriz en la tabla {@code businesses}.
 *
 * @param code           código corto único del negocio (ej. {@code BIZ-003})
 * @param commercialName nombre comercial o marca
 * @param legalName      razón social legal inscrita en SUNAT
 * @param taxId          número de RUC de 11 dígitos
 * @param fiscalAddress  domicilio fiscal legal
 * @param phone          teléfono central corporativo
 * @param supportEmail   correo electrónico de soporte
 */
@Schema(description = "Datos requeridos para registrar un nuevo Negocio Matriz en la tabla 'businesses'")
public record CreateBusinessRequest(
        @Schema(description = "Código único del negocio", example = "BIZ-003")
        @NotBlank String code,

        @Schema(description = "Nombre comercial del negocio", example = "Distribuidora Norte — Bebidas")
        @NotBlank String commercialName,

        @Schema(description = "Razón social legal", example = "Distribuidora de Bebidas del Norte S.A.C.")
        @NotBlank String legalName,

        @Schema(description = "Número de RUC de 11 dígitos", example = "20609988776")
        @Pattern(regexp = "^[0-9]{11}$", message = "El RUC debe tener 11 dígitos") String taxId,

        @Schema(description = "Dirección fiscal oficial", example = "Av. Mansiche 890, Trujillo")
        @NotBlank String fiscalAddress,

        @Schema(description = "Teléfono corporativo", example = "+51 44 234-567")
        String phone,

        @Schema(description = "Correo de soporte y facturación", example = "contacto@bebidasnorte.pe")
        String supportEmail
) {}
