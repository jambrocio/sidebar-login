package com.elroble.bevadmin.modules.vulnerabilities.service;

import com.elroble.bevadmin.common.exception.BusinessRuleException;
import com.elroble.bevadmin.common.exception.ResourceNotFoundException;
import com.elroble.bevadmin.modules.vulnerabilities.dto.CreateVulnerabilityRequest;
import com.elroble.bevadmin.modules.vulnerabilities.dto.UpdateVulnerabilityStatusRequest;
import com.elroble.bevadmin.modules.vulnerabilities.repository.VulnerabilitiesRepository;
import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Implementación de negocio síncrona para la auditoría y gestión de vulnerabilidades de seguridad.
 */
@Service
public class VulnerabilitiesServiceImpl implements VulnerabilitiesService {

    private final VulnerabilitiesRepository vulnerabilitiesRepository;

    public VulnerabilitiesServiceImpl(VulnerabilitiesRepository vulnerabilitiesRepository) {
        this.vulnerabilitiesRepository = vulnerabilitiesRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listVulnerabilities(AuthenticatedUserPrincipal user) {
        return vulnerabilitiesRepository.findAll();
    }

    @Override
    @Transactional
    public Map<String, Object> createVulnerability(CreateVulnerabilityRequest request, AuthenticatedUserPrincipal user) {
        String cleanCode = request.code().trim().toUpperCase();

        if (vulnerabilitiesRepository.existsByCode(cleanCode)) {
            throw new BusinessRuleException(
                    "El código de hallazgo '" + cleanCode + "' ya se encuentra registrado en el catálogo de auditoría. " +
                    "Los identificadores de vulnerabilidad deben ser únicos."
            );
        }

        vulnerabilitiesRepository.insertVulnerability(user.userId(), request);
        return Map.of("code", cleanCode, "status", "ABIERTO", "message", "Vulnerabilidad registrada correctamente en la base de datos.");
    }

    @Override
    @Transactional
    public Map<String, Object> updateStatus(UUID id, UpdateVulnerabilityStatusRequest request, AuthenticatedUserPrincipal user) {
        int rows = vulnerabilitiesRepository.updateStatus(
                user.userId(),
                id,
                request.status(),
                request.mitigationNotes()
        );
        if (rows == 0) {
            throw new ResourceNotFoundException("Vulnerabilidad de seguridad", id);
        }
        return Map.of("id", id, "status", request.status().toUpperCase(), "message", "Estado de la vulnerabilidad actualizado.");
    }
}
