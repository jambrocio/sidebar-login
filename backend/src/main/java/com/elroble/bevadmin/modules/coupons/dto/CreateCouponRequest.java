package com.elroble.bevadmin.modules.coupons.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

/**
 * DTO de entrada para generar un nuevo Cupón de Descuento en {@code discount_coupons}.
 *
 * @param code           código alfanumérico único (ej. {@code MAYORISTA15})
 * @param discountType   tipo de descuento: {@code PERCENT} (porcentaje) o {@code FIXED} (monto fijo)
 * @param discountValue  valor numérico del descuento
 * @param targetModality modalidad objetivo ({@code Mayor y Menor}, {@code Solo Por Mayor}, {@code Solo Por Menor})
 * @param targetCategory categoría objetivo ({@code Todas}, {@code Licores}, {@code Cervezas}, {@code Gaseosas})
 * @param assignedClient cliente o segmento de clientes beneficiario
 * @param minPurchase    importe mínimo del carrito para aplicar el cupón
 * @param maxUses        límite máximo de veces que se puede canjear el cupón
 * @param expiresAt      etiqueta o fecha de vencimiento
 */
@Schema(description = "Datos requeridos para generar un nuevo Cupón de Descuento en 'discount_coupons'")
public record CreateCouponRequest(
        @Schema(description = "Código promocional único", example = "VERANO20")
        @NotBlank String code,

        @Schema(description = "Tipo de descuento (PERCENT = Porcentaje, FIXED = Monto Fijo)", example = "PERCENT", allowableValues = {"PERCENT", "FIXED"})
        @NotBlank String discountType,

        @Schema(description = "Valor del descuento (ej. 20 para 20% o 15.00 para $15)", example = "20")
        @Positive BigDecimal discountValue,

        @Schema(description = "Modalidad de venta válida", example = "Mayor y Menor")
        @NotBlank String targetModality,

        @Schema(description = "Categoría de bebidas elegible", example = "Cervezas")
        @NotBlank String targetCategory,

        @Schema(description = "Cliente o segmento asignado", example = "Clientes Mayoristas VIP")
        @NotBlank String assignedClient,

        @Schema(description = "Compra mínima requerida en dólares", example = "150.00")
        BigDecimal minPurchase,

        @Schema(description = "Cantidad máxima de redenciones permitidas", example = "50")
        @Positive int maxUses,

        @Schema(description = "Fecha de vencimiento del cupón", example = "31 Dic 2026")
        String expiresAt
) {}
