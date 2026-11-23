package com.elroble.bevadmin.modules.vulnerabilities.service;

import com.elroble.bevadmin.modules.vulnerabilities.dto.CreateVulnerabilityRequest;
import com.elroble.bevadmin.modules.vulnerabilities.dto.UpdateVulnerabilityStatusRequest;
import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Contrato de servicio síncrono para la gestión de auditoría y mitigación de vulnerabilidades de seguridad.
 */
public interface VulnerabilitiesService {

    List<Map<String, Object>> listVulnerabilities(AuthenticatedUserPrincipal user);

    Map<String, Object> createVulnerability(CreateVulnerabilityRequest request, AuthenticatedUserPrincipal user);

    Map<String, Object> updateStatus(UUID id, UpdateVulnerabilityStatusRequest request, AuthenticatedUserPrincipal user);
}
