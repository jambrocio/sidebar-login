package com.elroble.bevadmin.modules.customers.controller;

import com.elroble.bevadmin.audit.Auditable;
import com.elroble.bevadmin.modules.customers.dto.CreateCustomerRequest;
import com.elroble.bevadmin.modules.customers.service.CustomersService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Controlador REST síncrono para la administración independiente de Clientes Comerciales
 * con aislamiento multi-tenant por negocio ({@code /api/v1/customers}).
 */
@RestController
@RequestMapping("/api/v1/customers")
@Tag(
        name = "04B. Clientes Comerciales",
        description = "Administración del directorio de clientes únicos por Negocio Matriz con diferenciación para Administrador General vs Usuario de Negocio."
)
public class CustomersController {

    private final CustomersService customersService;

    public CustomersController(CustomersService customersService) {
        this.customersService = customersService;
    }

    @GetMapping
    @PreAuthorize("@menuPermissionEvaluator.hasAccess(authentication, 'MGMT_CUSTOMERS', 'VIEW')")
    @Operation(
            summary = "Listar clientes del negocio",
            description = "Devuelve los clientes del negocio matriz del usuario autenticado o permite al Administrador General filtrar por negocio específico."
    )
    @ApiResponse(responseCode = "200", description = "Lista de clientes obtenida correctamente.")
    public List<Map<String, Object>> listCustomers(
            @RequestParam(name = "businessCode", required = false) String businessCode,
            @AuthenticationPrincipal AuthenticatedUserPrincipal user) {
        return customersService.listCustomers(businessCode, user);
    }

    @PostMapping
    @PreAuthorize("@menuPermissionEvaluator.hasAccess(authentication, 'MGMT_CUSTOMERS', 'CREATE')")
    @Auditable(module = "Ventas", eventType = "CUSTOMER_REGISTERED")
    @Operation(
            summary = "Registrar nuevo cliente comercial",
            description = "Registra un cliente validando unicidad por documento dentro del negocio. Si el usuario es Administrador General puede seleccionar el negocio destino; si es usuario de negocio, se asigna por defecto a su negocio."
    )
    @ApiResponse(responseCode = "200", description = "Cliente registrado exitosamente.")
    public Map<String, Object> registerCustomer(
            @Valid @RequestBody CreateCustomerRequest req,
            @AuthenticationPrincipal AuthenticatedUserPrincipal user) {
        return customersService.registerCustomer(req, user);
    }
}
