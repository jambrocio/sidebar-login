package com.elroble.bevadmin.modules.suppliers.controller;

import com.elroble.bevadmin.audit.Auditable;
import com.elroble.bevadmin.modules.suppliers.dto.CreateSupplierRequest;
import com.elroble.bevadmin.modules.suppliers.dto.UpdateSupplierStatusRequest;
import com.elroble.bevadmin.modules.suppliers.service.SuppliersService;
import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Controlador REST síncrono para la administración independiente de Proveedores Comerciales
 * con aislamiento multi-tenant por negocio ({@code /api/v1/suppliers}).
 */
@RestController
@RequestMapping("/api/v1/suppliers")
@Tag(
        name = "09B. Proveedores Comerciales",
        description = "Administración del directorio de proveedores oficiales por Negocio Matriz con control de estado operativo."
)
public class SuppliersController {

    private final SuppliersService suppliersService;

    public SuppliersController(SuppliersService suppliersService) {
        this.suppliersService = suppliersService;
    }

    @GetMapping
    @PreAuthorize("@menuPermissionEvaluator.hasAccess(authentication, 'MGMT_SUPPLIERS', 'VIEW')")
    @Operation(
            summary = "Listar proveedores del negocio",
            description = "Devuelve los proveedores del negocio matriz del usuario autenticado o permite al Administrador General filtrar por negocio específico."
    )
    @ApiResponse(responseCode = "200", description = "Lista de proveedores obtenida correctamente.")
    public List<Map<String, Object>> listSuppliers(
            @RequestParam(name = "businessCode", required = false) String businessCode,
            @AuthenticationPrincipal AuthenticatedUserPrincipal user) {
        return suppliersService.listSuppliers(businessCode, user);
    }

    @PostMapping
    @PreAuthorize("@menuPermissionEvaluator.hasAccess(authentication, 'MGMT_SUPPLIERS', 'CREATE')")
    @Auditable(module = "Compras", eventType = "SUPPLIER_REGISTERED")
    @Operation(
            summary = "Registrar nuevo proveedor comercial",
            description = "Registra un proveedor validando unicidad por RUC/documento dentro del negocio."
    )
    @ApiResponse(responseCode = "200", description = "Proveedor registrado exitosamente.")
    public Map<String, Object> registerSupplier(
            @Valid @RequestBody CreateSupplierRequest req,
            @AuthenticationPrincipal AuthenticatedUserPrincipal user) {
        return suppliersService.registerSupplier(req, user);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("@menuPermissionEvaluator.hasAccess(authentication, 'MGMT_SUPPLIERS', 'EDIT')")
    @Auditable(module = "Compras", eventType = "SUPPLIER_STATUS_UPDATED")
    @Operation(
            summary = "Cambiar estado del proveedor",
            description = "Permite activar o desactivar un proveedor comercial dentro del negocio."
    )
    @ApiResponse(responseCode = "200", description = "Estado del proveedor actualizado exitosamente.")
    public Map<String, Object> updateSupplierStatus(
            @PathVariable("id") UUID supplierId,
            @Valid @RequestBody UpdateSupplierStatusRequest req,
            @AuthenticationPrincipal AuthenticatedUserPrincipal user) {
        return suppliersService.updateSupplierStatus(supplierId, req.active(), user);
    }
}
