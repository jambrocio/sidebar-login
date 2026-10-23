package com.elroble.bevadmin.modules.sales.service;

import com.elroble.bevadmin.modules.sales.dto.EmitSaleRequest;
import com.elroble.bevadmin.modules.sales.dto.SaleCartItemRequest;
import com.elroble.bevadmin.modules.sales.repository.SalesRepository;
import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Implementación imperativa y síncrona del servicio de Ventas e Historial por Usuario ({@link SalesService}).
 * <p>
 * Centraliza los cálculos financieros del carrito multiproducto (Subtotal, Descuento por Cupón,
 * IGV 18% y Total General) y garantiza que toda venta quede vinculada al Local Asignado del usuario.
 */
@Service
public class SalesServiceImpl implements SalesService {

    /** Repositorio síncrono de ventas y detalle de comprobantes. */
    private final SalesRepository salesRepository;

    /**
     * Constructor con inyección de dependencias.
     *
     * @param salesRepository repositorio de ventas
     */
    public SalesServiceImpl(SalesRepository salesRepository) {
        this.salesRepository = salesRepository;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getMySalesHistory(AuthenticatedUserPrincipal user) {
        return salesRepository.findSalesHistoryBySellerUserId(user.userId());
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAllSales(AuthenticatedUserPrincipal user) {
        return salesRepository.findAllSalesByBusinessId(user.businessId());
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional
    public Map<String, Object> emitSaleReceipt(EmitSaleRequest request, AuthenticatedUserPrincipal user) {
        // 1. Cálculo síncrono del Subtotal sumando cada ítem del carrito
        BigDecimal subtotal = request.items().stream()
                .map(item -> item.unitPrice().multiply(BigDecimal.valueOf(item.quantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 2. Aplicación de descuento por cupón y cálculo de IGV (18%) y Total Neto
        BigDecimal discount = request.discountAmount() != null ? request.discountAmount() : BigDecimal.ZERO;
        BigDecimal total = subtotal.subtract(discount).max(BigDecimal.ZERO);
        BigDecimal taxIgv = total.multiply(new BigDecimal("0.18")).setScale(2, RoundingMode.HALF_UP);

        // 3. Construcción del resumen de ítems y determinación de modalidad consolidada
        String itemsSummary = String.join(" + ",
                request.items().stream().map(i -> i.quantity() + "x " + i.productName()).toList()
        );

        boolean hasWholesale = request.items().stream().anyMatch(i -> "Por Mayor".equalsIgnoreCase(i.modality()));
        boolean hasRetail = request.items().stream().anyMatch(i -> "Por Menor".equalsIgnoreCase(i.modality()));
        String consolidatedModality = (hasWholesale && hasRetail)
                ? "Mixta (Mayor y Menor)"
                : (hasWholesale ? "Por Mayor" : "Por Menor");

        // 4. Persistencia transaccional de cabecera y líneas en PostgreSQL
        UUID saleId = UUID.randomUUID();
        salesRepository.insertSaleHeader(
                saleId, request, user, consolidatedModality, itemsSummary, subtotal, discount, taxIgv, total
        );

        for (SaleCartItemRequest item : request.items()) {
            BigDecimal lineSubtotal = item.unitPrice().multiply(BigDecimal.valueOf(item.quantity()));
            salesRepository.insertSaleItem(saleId, item, lineSubtotal);
        }

        // 5. Actualización de uso del cupón si aplica
        if (request.couponCode() != null && !request.couponCode().isBlank()) {
            salesRepository.incrementCouponUsage(user.businessId(), request.couponCode());
        }

        return Map.of(
                "saleId", saleId,
                "saleCode", request.saleCode(),
                "branch", user.assignedBranchName(),
                "sellerUser", user.fullName() + " (" + user.username() + ")",
                "total", total
        );
    }
}
