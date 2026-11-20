package com.elroble.bevadmin.modules.sales.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.elroble.bevadmin.modules.sales.dto.EmitSaleRequest;
import com.elroble.bevadmin.modules.sales.dto.SaleCartItemRequest;
import com.elroble.bevadmin.modules.sales.repository.SalesRepository;
import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
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

    private static final Logger log = LoggerFactory.getLogger(SalesServiceImpl.class);

    /** Repositorio síncrono de ventas y detalle de comprobantes. */
    private final SalesRepository salesRepository;

    /** Mapeador Jackson para normalizar campos JSON/JSONB de PostgreSQL a colecciones nativas. */
    private final ObjectMapper objectMapper = new ObjectMapper();

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
        List<Map<String, Object>> rows = salesRepository.findSalesHistoryBySellerUserId(user.userId());
        return normalizeSalesItems(rows);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAllSales(AuthenticatedUserPrincipal user) {
        List<Map<String, Object>> rows = salesRepository.findAllSalesByBusinessId(user.businessId());
        return normalizeSalesItems(rows);
    }

    /**
     * Normaliza el campo {@code items} (tipo JSONB en PostgreSQL) para que Jackson lo serialice
     * como un arreglo JSON nativo en lugar de una estructura envolvente {@code PGobject}.
     */
    private List<Map<String, Object>> normalizeSalesItems(List<Map<String, Object>> rows) {
        return rows.stream().map(row -> {
            Map<String, Object> copy = new HashMap<>(row);
            Object rawItems = copy.get("items");
            if (rawItems != null) {
                try {
                    String jsonStr;
                    if (rawItems instanceof String s) {
                        jsonStr = s;
                    } else {
                        try {
                            jsonStr = (String) rawItems.getClass().getMethod("getValue").invoke(rawItems);
                        } catch (Exception ignored) {
                            jsonStr = rawItems.toString();
                        }
                    }
                    if (jsonStr != null && !jsonStr.isBlank()) {
                        copy.put("items", objectMapper.readValue(jsonStr, new TypeReference<List<Map<String, Object>>>() {}));
                    } else {
                        copy.put("items", List.of());
                    }
                } catch (Exception e) {
                    log.warn("Error al deserializar items de venta {}: {}", copy.get("id"), e.getMessage());
                    copy.put("items", List.of());
                }
            } else {
                copy.put("items", List.of());
            }
            return copy;
        }).toList();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional
    public Map<String, Object> emitSaleReceipt(EmitSaleRequest request, AuthenticatedUserPrincipal user) {
        // 1. Cálculo síncrono del Importe Total bruto sumando cada ítem del carrito
        BigDecimal grossTotal = request.items().stream()
                .map(item -> item.unitPrice().multiply(BigDecimal.valueOf(item.quantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 2. Aplicación de descuento por cupón para determinar el Importe Total a cobrar
        BigDecimal discount = request.discountAmount() != null ? request.discountAmount() : BigDecimal.ZERO;
        BigDecimal total = grossTotal.subtract(discount).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);

        // 3. Desglose contable SUNAT: Subtotal = Importe Total - IGV (donde Base Imponible = Total / 1.18)
        BigDecimal baseImponible = total.divide(new BigDecimal("1.18"), 2, RoundingMode.HALF_UP);
        BigDecimal taxIgv = total.subtract(baseImponible).setScale(2, RoundingMode.HALF_UP);
        BigDecimal subtotal = total.subtract(taxIgv).setScale(2, RoundingMode.HALF_UP);

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
        String finalSaleCode = (request.saleCode() != null && !request.saleCode().isBlank())
                ? request.saleCode().trim()
                : salesRepository.generateNextSaleCode();

        salesRepository.insertSaleHeader(
                saleId, finalSaleCode, request, user, consolidatedModality, itemsSummary, subtotal, discount, taxIgv, total
        );

        for (SaleCartItemRequest item : request.items()) {
            BigDecimal lineSubtotal = item.unitPrice().multiply(BigDecimal.valueOf(item.quantity()));
            salesRepository.insertSaleItem(saleId, item, lineSubtotal);
            log.info("Descontando stock tras venta - SKU={}, Producto={}, Modalidad={}, Cantidad={}, Negocio={}",
                    item.sku(), item.productName(), item.modality(), item.quantity(), user.businessId());
            salesRepository.decrementProductStock(user.businessId(), item.sku(), item.productName(), item.modality(), item.quantity());
        }

        // 5. Actualización de uso del cupón si aplica
        if (request.couponCode() != null && !request.couponCode().isBlank()) {
            salesRepository.incrementCouponUsage(user.businessId(), request.couponCode());
        }

        return Map.of(
                "saleId", saleId,
                "saleCode", finalSaleCode,
                "branch", user.assignedBranchName(),
                "sellerUser", user.fullName() + " (" + user.username() + ")",
                "total", total
        );
    }
}
