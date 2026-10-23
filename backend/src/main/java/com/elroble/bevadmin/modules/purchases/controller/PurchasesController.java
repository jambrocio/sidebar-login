package com.elroble.bevadmin.modules.purchases.controller;

import com.elroble.bevadmin.audit.Auditable;
import com.elroble.bevadmin.modules.purchases.dto.RegisterPurchaseRequest;
import com.elroble.bevadmin.modules.purchases.service.PurchasesService;
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
 * Controlador REST síncrono de Compras y Abastecimiento de Bebidas ({@code /api/v1/purchases}).
 * <p>
 * Delega toda la lógica de cálculo de costos y vinculación con el Local Asignado a {@link PurchasesService}.
 * <p>
 * <b>Interfaz de Angular 21 que alimenta:</b> {@code PurchasesViewComponent} ({@code /dashboard/purchases}).
 */
@RestController
@RequestMapping("/api/v1/purchases")
@Tag(
        name = "09. Compras y Abastecimiento por Local",
        description = "Registro de órdenes de compra y recepción de cajas de proveedores en el Local Asignado del usuario."
)
public class PurchasesController {

    /** Servicio de negocio síncrono de compras. */
    private final PurchasesService purchasesService;

    /**
     * Constructor con inyección de dependencias.
     *
     * @param purchasesService servicio de compras
     */
    public PurchasesController(PurchasesService purchasesService) {
        this.purchasesService = purchasesService;
    }

    /**
     * Lista el historial de órdenes de compra y abastecimiento del negocio activo.
     *
     * @param user usuario autenticado
     * @return lista de compras con local receptor, proveedor, costo total y comprador
     */
    @GetMapping
    @PreAuthorize("@menuPermissionEvaluator.hasAccess(authentication, 'PURCHASES_SUPPLIERS', 'VIEW')")
    @Operation(
            summary = "Listar Órdenes de Compra y Abastecimiento",
            description = "Consulta la tabla 'purchases' mostrando el local receptor, proveedor, cantidad de cajas, costo total y el usuario comprador."
    )
    @ApiResponse(responseCode = "200", description = "Historial de compras obtenido correctamente.")
    public List<Map<String, Object>> listPurchases(@AuthenticationPrincipal AuthenticatedUserPrincipal user) {
        return purchasesService.listPurchases(user);
    }

    /**
     * Registra una nueva orden de compra asignándola automáticamente al <b>Local Asignado</b> del usuario.
     *
     * @param req  datos de la compra
     * @param user usuario autenticado que recepciona el lote
     * @return resumen de la orden de compra registrada
     */
    @PostMapping
    @PreAuthorize("@menuPermissionEvaluator.hasAccess(authentication, 'PURCHASES_SUPPLIERS', 'CREATE')")
    @Auditable(module = "Compras", eventType = "PURCHASE_REGISTERED")
    @Operation(
            summary = "Registrar ingreso de Compra y Abastecimiento (en el Local Asignado)",
            description = "Inserta una orden de compra en 'purchases' vinculada automáticamente al Local Asignado y al usuario activo en sesión."
    )
    @ApiResponse(responseCode = "200", description = "Orden de compra registrada exitosamente.")
    public Map<String, Object> registerPurchaseOrder(
            @Valid @RequestBody RegisterPurchaseRequest req,
            @AuthenticationPrincipal AuthenticatedUserPrincipal user) {
        return purchasesService.registerPurchaseOrder(req, user);
    }
}
