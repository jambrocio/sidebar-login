package com.elroble.bevadmin.modules.coupons.controller;

import com.elroble.bevadmin.audit.Auditable;
import com.elroble.bevadmin.modules.coupons.dto.CreateCouponRequest;
import com.elroble.bevadmin.modules.coupons.service.CouponsService;
import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
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
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Controlador REST síncrono de Cupones Promocionales de Descuento ({@code /api/v1/coupons}).
 * <p>
 * Delega toda la lógica de negocio a {@link CouponsService}.
 * <p>
 * <b>Interfaz de Angular 21 que alimenta:</b> {@code CouponsViewComponent} ({@code /dashboard/coupons}).
 */
@RestController
@RequestMapping("/api/v1/coupons")
@Tag(
        name = "07. Cupones de Descuento",
        description = "Creación y administración de campañas de cupones promocionales (Porcentaje o Monto Fijo) para clientes."
)
public class CouponsController {

    /** Servicio de negocio síncrono de cupones. */
    private final CouponsService couponsService;

    /**
     * Constructor con inyección de dependencias.
     *
     * @param couponsService servicio de cupones
     */
    public CouponsController(CouponsService couponsService) {
        this.couponsService = couponsService;
    }

    /**
     * Lista todos los cupones promocionales del Negocio Matriz del usuario autenticado.
     *
     * @param user usuario en sesión
     * @return lista de cupones con su contador de usos y usuario creador
     */
    @GetMapping
    @PreAuthorize("@menuPermissionEvaluator.hasAccess(authentication, 'DISCOUNT_COUPONS', 'VIEW')")
    @Operation(
            summary = "Listar Cupones de Descuento del Negocio",
            description = "Consulta la tabla 'discount_coupons' e incluye el nombre del usuario que creó cada cupón para fines de auditoría."
    )
    @ApiResponse(responseCode = "200", description = "Listado de cupones obtenido correctamente.")
    public List<Map<String, Object>> listCoupons(@AuthenticationPrincipal AuthenticatedUserPrincipal user) {
        return couponsService.listCoupons(user);
    }

    /**
     * Crea un nuevo cupón de descuento firmando con el usuario en sesión.
     *
     * @param req  datos del cupón a crear
     * @param user usuario autenticado que genera el cupón
     * @return confirmación del cupón creado
     */
    @PostMapping
    @PreAuthorize("@menuPermissionEvaluator.hasAccess(authentication, 'DISCOUNT_COUPONS', 'CREATE')")
    @Auditable(module = "Cupones", eventType = "COUPON_CREATED")
    @Operation(
            summary = "Generar un nuevo Cupón de Descuento",
            description = "Inserta un nuevo cupón promocional en 'discount_coupons' firmando con el usuario autenticado (created_by_user_id)."
    )
    @ApiResponse(responseCode = "200", description = "Cupón promocional creado exitosamente.")
    public Map<String, Object> createCoupon(
            @Valid @RequestBody CreateCouponRequest req,
            @AuthenticationPrincipal AuthenticatedUserPrincipal user) {
        return couponsService.createCoupon(req, user);
    }

    /**
     * Activa o pausa la vigencia de un cupón de descuento existente.
     *
     * @param code código del cupón (ej. {@code MAYORISTA15})
     * @param user usuario autenticado
     * @return confirmación del cambio de estado
     */
    @PatchMapping("/{code}/toggle")
    @PreAuthorize("@menuPermissionEvaluator.hasAccess(authentication, 'DISCOUNT_COUPONS', 'EDIT')")
    @Auditable(module = "Cupones", eventType = "COUPON_TOGGLED")
    @Operation(
            summary = "Activar o Pausar un Cupón de Descuento",
            description = "Alterna el campo booleano 'is_active' del cupón especificado dentro del negocio del usuario."
    )
    @ApiResponse(responseCode = "200", description = "Estado del cupón actualizado correctamente.")
    public Map<String, Object> toggleCouponStatus(
            @Parameter(description = "Código del cupón promocional", example = "MAYORISTA15")
            @PathVariable String code,
            @AuthenticationPrincipal AuthenticatedUserPrincipal user) {
        return couponsService.toggleCouponStatus(code, user);
    }
}
