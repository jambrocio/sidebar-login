package com.elroble.bevadmin.modules.catalog.service;

import com.elroble.bevadmin.common.exception.BusinessRuleException;
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

        // Validación de unicidad de SKU si se especifica (campo opcional)
        String cleanSku = (request.sku() != null && !request.sku().trim().isBlank())
                ? request.sku().trim().toUpperCase()
                : null;

        if (cleanSku != null && catalogRepository.existsProductBySku(targetBusinessId, cleanSku)) {
            throw new BusinessRuleException("El código SKU '" + cleanSku + "' ya se encuentra registrado en otro producto de este negocio.");
        }

        // Regla de negocio: Determina el semáforo de stock según la cantidad de cajas iniciales
        String stockStatus = request.stockBoxes() == 0
                ? "Agotado"
                : (request.stockBoxes() < 20 ? "Stock Bajo" : "En Stock");

        catalogRepository.insertBeverageProduct(targetBusinessId, user.userId(), request, cleanSku, stockStatus);
        return Map.of("sku", cleanSku != null ? cleanSku : "—", "status", stockStatus, "businessId", targetBusinessId);
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

        String name = String.valueOf(request.getOrDefault("name", "")).trim();
        if (name.isBlank() || "null".equalsIgnoreCase(name)) {
            throw new BusinessRuleException("El nombre de la categoría es obligatorio.");
        }

        String rawCode = String.valueOf(request.getOrDefault("code", "")).trim();
        String code = (rawCode.isBlank() || "null".equalsIgnoreCase(rawCode))
                ? "CAT-" + System.currentTimeMillis() % 100000
                : rawCode.toUpperCase();

        String rawSlug = String.valueOf(request.getOrDefault("slug", "")).trim();
        String slug = (rawSlug.isBlank() || "null".equalsIgnoreCase(rawSlug))
                ? name.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "")
                : rawSlug.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");

        String margin = String.valueOf(request.getOrDefault("wholesaleMargin", "15% - 20%")).trim();

        // Validar unicidad de la categoría por negocio (código y nombre)
        if (catalogRepository.existsCategoryByNameOrCode(targetBusinessId, code, name)) {
            throw new BusinessRuleException(
                    "Ya existe una categoría con el nombre '" + name + "' o código '" + code + "' registrada para este negocio.");
        }

        catalogRepository.insertCategory(targetBusinessId, code, name, slug, margin);
        return Map.of("code", code, "name", name, "status", "Activo", "businessId", targetBusinessId);
    }
}
