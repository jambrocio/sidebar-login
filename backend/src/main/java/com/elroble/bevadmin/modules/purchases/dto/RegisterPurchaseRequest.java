package com.elroble.bevadmin.modules.purchases.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

/**
 * DTO de entrada para registrar una nueva Orden de Compra y Abastecimiento en {@code purchases}.
 *
 * @param purchaseCode  código correlativo de la orden de compra (ej. {@code OC-2026-090})
 * @param supplier      razón social del proveedor o distribuidor oficial
 * @param categoryName  categoría de la bebida ({@code Cervezas}, {@code Licores}, {@code Gaseosas}, {@code Otros})
 * @param productDetail descripción del producto y formato adquirido
 * @param boxesQty      cantidad de cajas ingresadas al almacén
 * @param boxCost       costo unitario de compra por caja
 */
@Schema(description = "Datos requeridos para registrar el ingreso de una compra de bebidas en el Local Asignado")
public record RegisterPurchaseRequest(
        @Schema(description = "Código correlativo de la orden de compra", example = "OC-2026-090")
        @NotBlank String purchaseCode,

        @Schema(description = "Proveedor o distribuidor oficial", example = "Unión de Cervecerías Peruanas Backus y Johnston")
        @NotBlank String supplier,

        @Schema(description = "Categoría de la bebida recepcionada", example = "Cervezas")
        @NotBlank String categoryName,

        @Schema(description = "Producto y formato abastecido", example = "Cerveza Pilsen Callao 630ml (Caja x 12)")
        @NotBlank String productDetail,

        @Schema(description = "Cantidad de cajas recibidas", example = "50")
        @Positive int boxesQty,

        @Schema(description = "Costo de compra por caja en dólares", example = "16.50")
        @Positive BigDecimal boxCost
) {}
