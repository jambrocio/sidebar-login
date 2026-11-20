package com.elroble.bevadmin.modules.organization.controller;

import com.elroble.bevadmin.audit.Auditable;
import com.elroble.bevadmin.modules.organization.dto.CreateBranchRequest;
import com.elroble.bevadmin.modules.organization.dto.CreateBusinessRequest;
import com.elroble.bevadmin.modules.organization.service.OrganizationService;
import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Controlador REST síncrono de Administración de Negocios Matriz ({@code businesses}) y
 * Locales / Sucursales ({@code branches}).
 * <p>
 * Delega toda la lógica de negocio a {@link OrganizationService}.
 * <p>
 * <b>Interfaz de Angular 21 que alimenta:</b> {@code BranchesManagementComponent} ({@code /dashboard/branches}).
 */
@RestController
@RequestMapping("/api/v1")
@Tag(
        name = "03. Negocios Matriz y Locales",
        description = "Administración de la estructura multi-empresa (businesses) y sus locales, tiendas o almacenes asociados (branches)."
)
public class OrganizationController {

    /** Servicio de negocio síncrono para estructura organizacional. */
    private final OrganizationService organizationService;

    /**
     * Constructor con inyección de dependencias.
     *
     * @param organizationService servicio de negocios y locales
     */
    public OrganizationController(OrganizationService organizationService) {
        this.organizationService = organizationService;
    }

    /**
     * Lista todos los Negocios Matriz registrados en el sistema.
     *
     * @return lista de negocios con su RUC, razón social, moneda y estado
     */
    @GetMapping("/businesses")
    @Operation(
            summary = "Listar Negocios Matriz (todos para Administrador General o exclusivo del negocio asignado)",
            description = "Consulta la tabla 'businesses'. Si el usuario es Administrador General devuelve todos los negocios; si es usuario de negocio, lista exclusivamente el suyo."
    )
    @ApiResponse(responseCode = "200", description = "Listado de negocios obtenido correctamente.")
    public List<Map<String, Object>> listBusinesses(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUserPrincipal user) {
            if (!user.isSuperAdmin()) {
                return organizationService.listBusinesses().stream()
                        .filter(b -> user.businessCode() != null && user.businessCode().equalsIgnoreCase((String) b.get("code")))
                        .toList();
            }
        }
        return organizationService.listBusinesses();
    }

    /**
     * Registra un nuevo Negocio Matriz y genera un evento de auditoría.
     *
     * @param req datos del nuevo negocio matriz
     * @return mapa confirmando el código creado
     */
    @PostMapping("/businesses")
    @PreAuthorize("@menuPermissionEvaluator.hasAccess(authentication, 'MGMT_BUSINESS_BRANCHES', 'CREATE')")
    @Auditable(module = "Seguridad", eventType = "BUSINESS_CREATED")
    @Operation(
            summary = "Registrar un nuevo Negocio Matriz",
            description = "Inserta una nueva empresa matriz en la tabla 'businesses'. Requiere perfil de Administrador General (Superusuario)."
    )
    @ApiResponse(responseCode = "200", description = "Negocio matriz registrado exitosamente.")
    public Map<String, Object> createBusiness(
            Authentication authentication,
            @Valid @RequestBody CreateBusinessRequest req) {
        if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUserPrincipal user) {
            if (!user.isSuperAdmin()) {
                throw new AccessDeniedException("Solo el Administrador General (Superusuario) tiene autorización para registrar nuevos Negocios Matriz.");
            }
        }
        return organizationService.createBusiness(req);
    }

    /**
     * Lista los locales/sucursales registrados, permitiendo filtrar opcionalmente por el código del Negocio Matriz.
     *
     * @param businessCode código opcional del negocio matriz (ej. {@code BIZ-001})
     * @return lista de locales con su serie de facturación, encargado y estado operativo
     */
    @GetMapping("/branches")
    @Operation(
            summary = "Listar Locales y Sucursales (filtrable por Negocio Matriz)",
            description = "Consulta la tabla 'branches' unida con 'businesses'. Si se envía 'businessCode' (ej. BIZ-001), devuelve únicamente los locales pertenecientes a ese negocio."
    )
    @ApiResponse(responseCode = "200", description = "Listado de locales devuelto correctamente.")
    public List<Map<String, Object>> listBranches(
            Authentication authentication,
            @Parameter(description = "Código opcional del Negocio Matriz para filtrar sus locales", example = "BIZ-001")
            @RequestParam(required = false) String businessCode) {
        String effectiveBusinessCode = businessCode;
        if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUserPrincipal user) {
            if (!user.isSuperAdmin()) {
                effectiveBusinessCode = user.businessCode();
            }
        }
        return organizationService.listBranches(effectiveBusinessCode);
    }

    /**
     * Registra un nuevo Local o Sucursal vinculado a un Negocio Matriz y genera un evento de auditoría.
     *
     * @param req datos de la nueva sede/sucursal
     * @return mapa confirmando el código creado
     */
    @PostMapping("/branches")
    @PreAuthorize("@menuPermissionEvaluator.hasAccess(authentication, 'MGMT_BUSINESS_BRANCHES', 'CREATE')")
    @Auditable(module = "Seguridad", eventType = "BRANCH_CREATED")
    @Operation(
            summary = "Registrar un nuevo Local o Sucursal",
            description = "Inserta un nuevo local en la tabla 'sedes' vinculado al Negocio Matriz especificado."
    )
    @ApiResponse(responseCode = "200", description = "Local o sucursal registrado exitosamente.")
    public Map<String, Object> createBranch(
            Authentication authentication,
            @Valid @RequestBody CreateBranchRequest req) {
        CreateBranchRequest resolved = req;
        if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUserPrincipal user) {
            String targetBusinessCode = user.isSuperAdmin() && req.businessCode() != null && !req.businessCode().isBlank()
                    ? req.businessCode()
                    : user.businessCode();
            resolved = new CreateBranchRequest(
                    targetBusinessCode,
                    req.code(),
                    req.name(),
                    req.type(),
                    req.address(),
                    req.phone(),
                    req.invoiceSeries(),
                    req.manager(),
                    req.posTerminals()
            );
        }
        return organizationService.createBranch(resolved);
    }
}
