package com.elroble.bevadmin.modules.catalog.service;

import com.elroble.bevadmin.modules.catalog.dto.CreateBeverageRequest;
import com.elroble.bevadmin.modules.catalog.repository.CatalogRepository;
import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

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
    public List<Map<String, Object>> listBeverages(AuthenticatedUserPrincipal user) {
        return catalogRepository.findBeveragesByBusinessId(user.businessId());
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional
    public Map<String, Object> registerBeverage(CreateBeverageRequest request, AuthenticatedUserPrincipal user) {
        // Regla de negocio: Determina el semáforo de stock según la cantidad de cajas iniciales
        String stockStatus = request.stockBoxes() == 0
                ? "Agotado"
                : (request.stockBoxes() < 20 ? "Stock Bajo" : "En Stock");

        catalogRepository.insertBeverageProduct(user.businessId(), user.userId(), request, stockStatus);
        return Map.of("sku", request.sku().toUpperCase(), "status", stockStatus);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listCategories(AuthenticatedUserPrincipal user) {
        return catalogRepository.findCategoriesByBusinessId(user.businessId());
    }

    @Override
    @Transactional
    public Map<String, Object> registerCategory(Map<String, Object> request, AuthenticatedUserPrincipal user) {
        String code = String.valueOf(request.getOrDefault("code", "CAT-" + System.currentTimeMillis())).toUpperCase();
        String name = String.valueOf(request.getOrDefault("name", "Nueva Línea"));
        String slug = String.valueOf(request.getOrDefault("slug", name.toLowerCase().replace(" ", "-")));
        String margin = String.valueOf(request.getOrDefault("wholesaleMargin", "15% - 20%"));

        catalogRepository.insertCategory(user.businessId(), code, name, slug, margin);
        return Map.of("code", code, "name", name, "status", "Activo");
    }
}
