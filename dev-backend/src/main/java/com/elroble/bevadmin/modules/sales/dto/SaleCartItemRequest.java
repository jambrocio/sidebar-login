package com.elroble.bevadmin.modules.sales.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

/**
 * DTO de entrada que representa una línea de producto dentro del carrito de venta multiproducto.
 *
 * @param sku         código SKU de la bebida (ej. {@code CER-102})
 * @param productName nombre comercial del producto
 * @param modality    modalidad de precio aplicada ({@code Por Mayor} o {@code Por Menor})
 * @param unitLabel   etiqueta de presentación ({@code Caja x 12 Botellas} o {@code Unidad})
 * @param quantity    cantidad de cajas o unidades vendidas
 * @param unitPrice   precio unitario aplicado según la modalidad
 */
@Schema(description = "Ítem individual agregado al carrito de venta multiproducto")
public record SaleCartItemRequest(
        @Schema(description = "Código SKU de la bebida", example = "CER-102")
        @NotBlank String sku,

        @Schema(description = "Nombre comercial del producto", example = "Cerveza Pilsen Callao 630ml")
        @NotBlank String productName,

        @Schema(description = "Modalidad de venta de la línea", example = "Por Mayor", allowableValues = {"Por Mayor", "Por Menor"})
        @NotBlank String modality,

        @Schema(description = "Presentación comercializada", example = "Caja x 12 Botellas")
        @NotBlank String unitLabel,

        @Schema(description = "Cantidad vendida", example = "10")
        @Positive int quantity,

        @Schema(description = "Precio unitario aplicado", example = "21.00")
        @Positive BigDecimal unitPrice
) {}
