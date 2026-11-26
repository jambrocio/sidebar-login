package com.elroble.bevadmin.modules.analytics.controller;

import com.elroble.bevadmin.modules.analytics.service.AnalyticsService;
import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Controlador REST síncrono de Inteligencia Comercial y Toma de Decisiones ({@code /api/v1/analytics}).
 * <p>
 * <b>Interfaz de Angular 21 que alimenta:</b> {@code DecisionDashboardComponent} ({@code /dashboard/decision-dashboard}).
 */
@RestController
@RequestMapping("/api/v1/analytics")
@Tag(
        name = "13. Analítica y Toma de Decisiones",
        description = "KPIs ejecutivos, márgenes, tendencias diarias, rendimiento por local y alertas de reposición de stock."
)
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/decision-dashboard")
    @PreAuthorize("@menuPermissionEvaluator.hasAccess(authentication, 'DECISION_DASHBOARD', 'VIEW') or @menuPermissionEvaluator.hasAccess(authentication, 'REPORTS_VIEW', 'VIEW')")
    @Operation(
            summary = "Obtener Dashboard Ejecutivo para Toma de Decisiones",
            description = "Consolida ingresos, compras, margen bruto estimado, tendencia diaria, ranking de sedes, top productos y stock crítico."
    )
    @ApiResponse(responseCode = "200", description = "Métricas de decisión obtenidas correctamente.")
    public Map<String, Object> getDecisionDashboard(
            @AuthenticationPrincipal AuthenticatedUserPrincipal user,
            @Parameter(description = "Código de negocio opcional (solo Superusuario)", example = "BIZ-001")
            @RequestParam(required = false) String businessCode,
            @Parameter(description = "Ventana temporal en días (7, 30, 90, 365)", example = "30")
            @RequestParam(defaultValue = "30") int days) {
        String effectiveBusiness = (user != null && user.isSuperAdmin())
                ? businessCode
                : (user != null ? user.businessCode() : null);
        return analyticsService.getDecisionDashboard(effectiveBusiness, days);
    }
}
