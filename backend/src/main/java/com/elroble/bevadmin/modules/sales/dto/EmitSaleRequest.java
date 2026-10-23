package com.elroble.bevadmin.modules.sales.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.math.BigDecimal;
import java.util.List;

/**
 * DTO de entrada para emitir un nuevo comprobante electrónico de venta multiproducto.
 *
 * @param saleCode       número correlativo del comprobante (ej. {@code VTA-9042})
 * @param documentType   tipo de comprobante ({@code FACTURA ELECTRÓNICA} o {@code BOLETA DE VENTA ELECTRÓNICA})
 * @param clientName     nombre o razón social del cliente
 * @param paymentMethod  medio de pago ({@code Efectivo}, {@code Transferencia}, {@code Yape / Plin}, {@code Tarjeta POS})
 * @param couponCode     código de cupón promocional aplicado (opcional)
 * @param discountAmount importe descontado por el cupón
 * @param items          lista de todos los productos agregados al carrito
 */
@Schema(description = "Solicitud de emisión de Comprobante Electrónico de Venta con carrito multiproducto")
public record EmitSaleRequest(
        @Schema(description = "Código correlativo de la venta", example = "VTA-9042")
        @NotBlank String saleCode,

        @Schema(description = "Tipo de comprobante electrónico", example = "FACTURA ELECTRÓNICA", allowableValues = {"FACTURA ELECTRÓNICA", "BOLETA DE VENTA ELECTRÓNICA"})
        @NotBlank String documentType,

        @Schema(description = "Cliente o Razón Social receptora", example = "Restobar La Estación S.A.C.")
        @NotBlank String clientName,

        @Schema(description = "Medio de pago utilizado", example = "Transferencia")
        @NotBlank String paymentMethod,

        @Schema(description = "Código de cupón aplicado (opcional)", example = "MAYORISTA15")
        String couponCode,

        @Schema(description = "Monto de descuento aplicado", example = "31.50")
        BigDecimal discountAmount,

        @Schema(description = "Lista de productos agregados al carrito")
        @Valid @NotEmpty List<SaleCartItemRequest> items
) {}
