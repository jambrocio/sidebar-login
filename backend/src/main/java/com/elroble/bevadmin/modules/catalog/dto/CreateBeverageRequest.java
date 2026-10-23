package com.elroble.bevadmin.modules.catalog.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

/**
 * DTO de entrada para el alta de una nueva bebida (SKU) en el catálogo maestro.
 *
 * @param sku            código SKU único del producto (ej. {@code CER-105})
 * @param name           nombre comercial y formato de botella/lata
 * @param categoryName   categoría ({@code Licores}, {@code Cervezas}, {@code Gaseosas}, {@code Otros})
 * @param presentation   formato mayorista (ej. {@code Caja x 24 Botellas})
 * @param retailPrice    precio unitario de venta por menor
 * @param wholesalePrice precio de venta por mayor (por caja o paquete cerrado)
 * @param stockBoxes     stock inicial en cajas cerradas
 * @param stockUnits     stock inicial equivalente en unidades sueltas
 */
@Schema(description = "Ficha técnica para registrar una nueva bebida en el catálogo maestro ('beverage_products')")
public record CreateBeverageRequest(
        @Schema(description = "Código SKU único", example = "CER-105")
        @NotBlank String sku,

        @Schema(description = "Nombre comercial y capacidad", example = "Cerveza Cusqueña Dorada 620ml")
        @NotBlank String name,

        @Schema(description = "Categoría de la bebida", example = "Cervezas", allowableValues = {"Licores", "Cervezas", "Gaseosas", "Otros"})
        @NotBlank String categoryName,

        @Schema(description = "Presentación de venta al por mayor", example = "Caja x 12 Botellas")
        @NotBlank String presentation,

        @Schema(description = "Precio de venta Por Menor (Unidad)", example = "2.50")
        @Positive BigDecimal retailPrice,

        @Schema(description = "Precio de venta Por Mayor (Caja cerrada)", example = "24.00")
        @Positive BigDecimal wholesalePrice,

        @Schema(description = "Stock inicial en cajas", example = "80")
        int stockBoxes,

        @Schema(description = "Stock inicial equivalente en unidades", example = "960")
        int stockUnits
) {}
