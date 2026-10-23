package com.elroble.bevadmin.modules.organization.service;

import com.elroble.bevadmin.modules.organization.dto.CreateBusinessRequest;
import com.elroble.bevadmin.modules.organization.repository.OrganizationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * Implementación imperativa y síncrona del servicio de Negocios Matriz y Locales ({@link OrganizationService}).
 */
@Service
public class OrganizationServiceImpl implements OrganizationService {

    /** Repositorio síncrono de negocios y locales. */
    private final OrganizationRepository organizationRepository;

    /**
     * Constructor con inyección de dependencias.
     *
     * @param organizationRepository repositorio de estructura organizacional
     */
    public OrganizationServiceImpl(OrganizationRepository organizationRepository) {
        this.organizationRepository = organizationRepository;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listBusinesses() {
        return organizationRepository.findAllBusinesses();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional
    public Map<String, Object> createBusiness(CreateBusinessRequest request) {
        organizationRepository.insertBusiness(request);
        return Map.of("id", request.code().toUpperCase(), "status", "Creado");
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listBranches(String businessCode) {
        return organizationRepository.findBranchesByBusinessCode(businessCode);
    }
}
