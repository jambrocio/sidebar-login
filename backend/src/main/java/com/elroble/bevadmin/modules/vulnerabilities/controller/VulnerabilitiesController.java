package com.elroble.bevadmin.modules.vulnerabilities.controller;

import com.elroble.bevadmin.audit.Auditable;
import com.elroble.bevadmin.modules.vulnerabilities.dto.CreateVulnerabilityRequest;
import com.elroble.bevadmin.modules.vulnerabilities.dto.UpdateVulnerabilityStatusRequest;
import com.elroble.bevadmin.modules.vulnerabilities.service.VulnerabilitiesService;
import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Controlador REST síncrono para la Auditoría y Registro de Vulnerabilidades de Seguridad ({@code /api/v1/vulnerabilities}).
 * Conecta los hallazgos de seguridad del skill cybersecurity-senior con la base de datos empresarial.
 */
@RestController
@RequestMapping("/api/v1/vulnerabilities")
@Tag(
        name = "08. Auditoría de Seguridad y Vulnerabilidades",
        description = "Registro, priorización y seguimiento de hallazgos de ciberseguridad defensiva (OWASP Top 10, CIS Docker y Seguridad de Redes)."
)
public class VulnerabilitiesController {

    private final VulnerabilitiesService vulnerabilitiesService;

    public VulnerabilitiesController(VulnerabilitiesService vulnerabilitiesService) {
        this.vulnerabilitiesService = vulnerabilitiesService;
    }

    @GetMapping
    @PreAuthorize("@menuPermissionEvaluator.hasAccess(authentication, 'MGMT_VULNERABILITIES', 'VIEW')")
    @Operation(
            summary = "Listar Hallazgos de Vulnerabilidad",
            description = "Devuelve el catálogo ordenado por criticidad y fecha de hallazgos registrados para el negocio matriz."
    )
    @ApiResponse(responseCode = "200", description = "Listado de vulnerabilidades obtenido con éxito.")
    public List<Map<String, Object>> listVulnerabilities(@AuthenticationPrincipal AuthenticatedUserPrincipal user) {
        return vulnerabilitiesService.listVulnerabilities(user);
    }

    @PostMapping
    @PreAuthorize("@menuPermissionEvaluator.hasAccess(authentication, 'MGMT_VULNERABILITIES', 'CREATE')")
    @Auditable(module = "Seguridad", eventType = "VULNERABILITY_REGISTERED")
    @Operation(
            summary = "Registrar Nuevo Hallazgo de Seguridad",
            description = "Inserta un reporte de vulnerabilidad con categoría OWASP, severidad y plan de remediación sugerido."
    )
    @ApiResponse(responseCode = "200", description = "Vulnerabilidad registrada correctamente.")
    public Map<String, Object> createVulnerability(
            @Valid @RequestBody CreateVulnerabilityRequest req,
            @AuthenticationPrincipal AuthenticatedUserPrincipal user) {
        return vulnerabilitiesService.createVulnerability(req, user);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("@menuPermissionEvaluator.hasAccess(authentication, 'MGMT_VULNERABILITIES', 'EDIT')")
    @Auditable(module = "Seguridad", eventType = "VULNERABILITY_STATUS_UPDATED")
    @Operation(
            summary = "Actualizar Estado de Mitigación de una Vulnerabilidad",
            description = "Permite transicionar el hallazgo a EN_PROCESO, MITIGADO o FALSO_POSITIVO registrando al usuario responsable."
    )
    @ApiResponse(responseCode = "200", description = "Estado de mitigación actualizado exitosamente.")
    public Map<String, Object> updateStatus(
            @Parameter(description = "UUID del registro de vulnerabilidad")
            @PathVariable UUID id,
            @Valid @RequestBody UpdateVulnerabilityStatusRequest req,
            @AuthenticationPrincipal AuthenticatedUserPrincipal user) {
        return vulnerabilitiesService.updateStatus(id, req, user);
    }
}
