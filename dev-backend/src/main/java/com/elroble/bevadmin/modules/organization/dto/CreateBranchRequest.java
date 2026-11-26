package com.elroble.bevadmin.modules.organization.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

/**
 * DTO de entrada para registrar una nueva Sede / Sucursal en la tabla {@code sedes}.
 *
 * @param businessCode  código del negocio matriz propietario (ej. {@code BIZ-001})
 * @param code          código único de la sede (ej. {@code LOC-07})
 * @param name          nombre comercial de la sede (ej. {@code Sucursal Miraflores})
 * @param type          tipo o clasificación de sede (ej. {@code Centro Mayorista y Minorista})
 * @param address       dirección física de la sede
 * @param phone         teléfono de contacto de la sede
 * @param invoiceSeries serie de facturación electrónica (ej. {@code F007 / B007})
 * @param manager       nombre o usuario del encargado responsable
 * @param posTerminals  cantidad de terminales de punto de venta activos
 */
@Schema(description = "Datos requeridos para registrar una nueva sede/sucursal en 'sedes'")
public record CreateBranchRequest(
        @Schema(description = "Código del negocio matriz propietario", example = "BIZ-001")
        @NotBlank String businessCode,

        @Schema(description = "Código único del local", example = "LOC-07")
        @NotBlank String code,

        @Schema(description = "Nombre comercial del local o sucursal", example = "Sucursal Miraflores")
        @NotBlank String name,

        @Schema(description = "Tipo o modalidad de la sede", example = "Centro Mayorista y Minorista")
        String type,

        @Schema(description = "Dirección física del local", example = "Av. Larco 123, Miraflores")
        @NotBlank String address,

        @Schema(description = "Teléfono de contacto", example = "+51 01 440-1200")
        String phone,

        @Schema(description = "Serie de facturación asignada", example = "F007 / B007")
        String invoiceSeries,

        @Schema(description = "Nombre del encargado responsable", example = "Carlos Mendoza")
        String manager,

        @Schema(description = "Cantidad de cajas / terminales POS", example = "2")
        Integer posTerminals
) {}
