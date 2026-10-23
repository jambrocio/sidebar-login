package com.elroble.bevadmin.modules.sales.controller;

import com.elroble.bevadmin.audit.Auditable;
import com.elroble.bevadmin.modules.sales.dto.EmitSaleRequest;
import com.elroble.bevadmin.modules.sales.service.SalesService;
import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Controlador REST síncrono de Ventas por Mayor y Menor ({@code /api/v1/sales}) e
 * Historial de Ventas Emitidas por el Usuario ({@code /api/v1/sales/my-history}).
 * <p>
 * Delega toda la lógica de cálculo de importes, aislamiento de Local Asignado y persistencia
 * transaccional a {@link SalesService}.
 * <p>
 * <b>Interfaces de Angular 21 que alimenta:</b>
 * <ul>
 *   <li>{@code SalesPosComponent} ({@code /dashboard/sales})</li>
 *   <li>{@code SalesHistoryComponent} ({@code /dashboard/sales-history})</li>
 *   <li>{@code SaleReceiptViewComponent} (Modal de Factura / Boleta Electrónica)</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/v1/sales")
@Tag(
        name = "08. Ventas (Mayor y Menor) e Historial por Usuario",
        description = "Emisión de Facturas/Boletas multiproducto en el Local Asignado y consulta del Historial de Ventas filtrado exclusivamente por el usuario vendedor."
)
public class SalesController {

    /** Servicio de negocio síncrono de ventas. */
    private final SalesService salesService;

    /**
     * Constructor con inyección de dependencias.
     *
     * @param salesService servicio de ventas e historial
     */
    public SalesController(SalesService salesService) {
        this.salesService = salesService;
    }

    /**
     * Devuelve el <b>Historial de Ventas Emitidas</b> filtrado estrictamente por el usuario
     * autenticado en sesión ({@code seller_user_id = user.userId()}).
     *
     * @param user usuario autenticado extraído del Token JWT
     * @return lista de comprobantes emitidos exclusivamente por el usuario en sesión
     */
    @GetMapping("/my-history")
    @PreAuthorize("@menuPermissionEvaluator.hasAccess(authentication, 'SALES_HISTORY', 'VIEW')")
    @Operation(
            summary = "Consultar Historial de Ventas Emitidas (Filtrado por Usuario Activo)",
            description = "Consulta la vista 'vw_sales_with_receipt_items' filtrando estrictamente por 'seller_user_id = usuarioAutenticado'. Garantiza que cada usuario solo visualice las ventas que él mismo registró, incluyendo el detalle JSON de productos para abrir la Vista de Comprobante."
    )
    @ApiResponse(responseCode = "200", description = "Historial de ventas del usuario recuperado correctamente.")
    public List<Map<String, Object>> getMySalesHistory(@AuthenticationPrincipal AuthenticatedUserPrincipal user) {
        return salesService.getMySalesHistory(user);
    }

    /**
     * Devuelve todas las ventas del negocio matriz para tableros y reportes.
     */
    @GetMapping
    @PreAuthorize("@menuPermissionEvaluator.hasAccess(authentication, 'SALES_HISTORY', 'VIEW')")
    @Operation(
            summary = "Listar todas las ventas del negocio",
            description = "Devuelve todas las ventas emitidas en el negocio para el tablero general y reportes."
    )
    @ApiResponse(responseCode = "200", description = "Listado de ventas obtenido correctamente.")
    public List<Map<String, Object>> getAllSales(@AuthenticationPrincipal AuthenticatedUserPrincipal user) {
        return salesService.getAllSales(user);
    }

    /**
     * Emite una nueva venta multiproducto (Mayor y/o Menor) en el <b>Local Asignado</b> del usuario.
     *
     * @param req  datos del comprobante y carrito de productos
     * @param user usuario vendedor autenticado
     * @return resumen del comprobante emitido listo para visualizar e imprimir
     */
    @PostMapping
    @PreAuthorize("@menuPermissionEvaluator.hasAccess(authentication, 'SALES_WHOLESALE_RETAIL', 'CREATE')")
    @Auditable(module = "Ventas", eventType = "SALE_EMITTED")
    @Operation(
            summary = "Emitir Comprobante de Venta Multiproducto (en el Local Asignado)",
            description = "Registra de forma transaccional la cabecera de venta en 'sales' (forzando branch_id = Local Asignado y seller_user_id = Usuario Activo) y todas las líneas del carrito en 'sale_items', calculando el total general e incrementando el uso del cupón."
    )
    @ApiResponse(responseCode = "200", description = "Comprobante electrónico emitido y registrado exitosamente.")
    public Map<String, Object> emitSaleReceipt(
            @Valid @RequestBody EmitSaleRequest req,
            @AuthenticationPrincipal AuthenticatedUserPrincipal user) {
        return salesService.emitSaleReceipt(req, user);
    }
}
