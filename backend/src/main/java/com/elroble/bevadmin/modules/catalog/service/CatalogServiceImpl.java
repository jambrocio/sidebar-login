package com.elroble.bevadmin.modules.catalog.service;

import com.elroble.bevadmin.modules.catalog.dto.CreateBeverageRequest;
import com.elroble.bevadmin.modules.catalog.repository.CatalogRepository;
import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Implementación imperativa y síncrona del servicio de Catálogo de Bebidas ({@link CatalogService}).
 */
@Service
public class CatalogServiceImpl implements CatalogService {

    /** Repositorio síncrono del catálogo de bebidas y categorías. */
    private final CatalogRepository catalogRepository;

    /**
     * Constructor con inyección de dependencias.
     *
     * @param catalogRepository repositorio de catálogo
     */
    public CatalogServiceImpl(CatalogRepository catalogRepository) {
        this.catalogRepository = catalogRepository;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listBeverages(String businessCode, AuthenticatedUserPrincipal user) {
        if (user != null && user.isSuperAdmin()) {
            if (businessCode != null && !businessCode.isBlank() && !"ALL".equalsIgnoreCase(businessCode)) {
                UUID businessId = catalogRepository.findBusinessIdByCode(businessCode)
                        .orElse(user.businessId());
                return catalogRepository.findBeveragesByBusinessId(businessId);
            }
            return catalogRepository.findAllBeverages();
        }
        return catalogRepository.findBeveragesByBusinessId(user.businessId());
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listBeverages(AuthenticatedUserPrincipal user) {
        return listBeverages(null, user);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional
    public Map<String, Object> registerBeverage(CreateBeverageRequest request, AuthenticatedUserPrincipal user) {
        UUID targetBusinessId = user.businessId();
        boolean isSuperAdmin = user != null && user.isSuperAdmin();

        if (isSuperAdmin && request.businessCode() != null && !request.businessCode().isBlank()) {
            targetBusinessId = catalogRepository.findBusinessIdByCode(request.businessCode())
                    .orElse(user.businessId());
        }

        // Regla de negocio: Determina el semáforo de stock según la cantidad de cajas iniciales
        String stockStatus = request.stockBoxes() == 0
                ? "Agotado"
                : (request.stockBoxes() < 20 ? "Stock Bajo" : "En Stock");

        catalogRepository.insertBeverageProduct(targetBusinessId, user.userId(), request, stockStatus);
        return Map.of("sku", request.sku().toUpperCase(), "status", stockStatus, "businessId", targetBusinessId);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listCategories(String businessCode, AuthenticatedUserPrincipal user) {
        if (user != null && user.isSuperAdmin()) {
            if (businessCode != null && !businessCode.isBlank() && !"ALL".equalsIgnoreCase(businessCode)) {
                UUID businessId = catalogRepository.findBusinessIdByCode(businessCode)
                        .orElse(user.businessId());
                return catalogRepository.findCategoriesByBusinessId(businessId);
            }
            return catalogRepository.findAllCategories();
        }
        return catalogRepository.findCategoriesByBusinessId(user.businessId());
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listCategories(AuthenticatedUserPrincipal user) {
        return listCategories(null, user);
    }

    @Override
    @Transactional
    public Map<String, Object> registerCategory(Map<String, Object> request, AuthenticatedUserPrincipal user) {
        UUID targetBusinessId = user.businessId();
        String requestedBizCode = (String) request.get("businessCode");
        if (user != null && user.isSuperAdmin() && requestedBizCode != null && !requestedBizCode.isBlank()) {
            targetBusinessId = catalogRepository.findBusinessIdByCode(requestedBizCode)
                    .orElse(user.businessId());
        }

        String code = String.valueOf(request.getOrDefault("code", "CAT-" + System.currentTimeMillis())).toUpperCase();
        String name = String.valueOf(request.getOrDefault("name", "Nueva Línea"));
        String slug = String.valueOf(request.getOrDefault("slug", name.toLowerCase().replace(" ", "-")));
        String margin = String.valueOf(request.getOrDefault("wholesaleMargin", "15% - 20%"));

        catalogRepository.insertCategory(targetBusinessId, code, name, slug, margin);
        return Map.of("code", code, "name", name, "status", "Activo");
    }
}
