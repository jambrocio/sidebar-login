package com.elroble.bevadmin.modules.catalog.controller;

import com.elroble.bevadmin.audit.Auditable;
import com.elroble.bevadmin.modules.catalog.dto.CreateBeverageRequest;
import com.elroble.bevadmin.modules.catalog.service.CatalogService;
import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Controlador REST síncrono del Catálogo Maestro de Bebidas ({@code beverage_products}) y
 * Líneas / Categorías ({@code beverage_categories}).
 * <p>
 * Delega toda la lógica de negocio a {@link CatalogService}.
 * <p>
 * <b>Interfaces de Angular 21 que alimenta:</b>
 * <ul>
 *   <li>{@code ProductsListComponent} ({@code /dashboard/products/list})</li>
 *   <li>{@code ProductAddComponent} ({@code /dashboard/products/add})</li>
 *   <li>{@code CategoriesListComponent} ({@code /dashboard/categories})</li>
 *   <li>{@code CategoryAddComponent} ({@code /dashboard/categories/new})</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/v1")
@Tag(
        name = "06. Catálogo de Bebidas y Categorías",
        description = "Administración del inventario maestro de bebidas (Licores, Cervezas, Gaseosas y Otros) con precios por Mayor y Menor."
)
public class CatalogController {

    /** Servicio de negocio síncrono de catálogo de bebidas. */
    private final CatalogService catalogService;

    /**
     * Constructor con inyección de dependencias.
     *
     * @param catalogService servicio de catálogo
     */
    public CatalogController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    /**
     * Lista todas las bebidas del catálogo maestro pertenecientes al Negocio Matriz del usuario activo.
     *
     * @param user usuario autenticado
     * @return lista de bebidas con precios por mayor/menor, stock y usuario registrador
     */
    @GetMapping("/products")
    @Operation(
            summary = "Listar el Catálogo Maestro de Bebidas (Mayor y Menor)",
            description = "Devuelve todos los productos SKU registrados en 'beverage_products' para el negocio del usuario activo, incluyendo precio unitario, precio por caja y semáforo de stock."
    )
    @ApiResponse(responseCode = "200", description = "Catálogo de bebidas obtenido correctamente.")
    public List<Map<String, Object>> listBeverages(@AuthenticationPrincipal AuthenticatedUserPrincipal user) {
        return catalogService.listBeverages(user);
    }

    /**
     * Registra una nueva bebida (SKU) en el catálogo maestro.
     *
     * @param req  datos de la bebida a dar de alta
     * @param user usuario en sesión que registra el producto
     * @return mapa con el SKU registrado y su estado de stock calculado
     */
    @PostMapping("/products")
    @PreAuthorize("@menuPermissionEvaluator.hasAccess(authentication, 'PROD_ADD', 'CREATE')")
    @Auditable(module = "Inventario", eventType = "PRODUCT_REGISTERED")
    @Operation(
            summary = "Registrar una nueva bebida (SKU) en el Catálogo Maestro",
            description = "Da de alta un nuevo SKU en 'beverage_products' con precio por menor y por mayor, registrando automáticamente qué usuario lo creó."
    )
    @ApiResponse(responseCode = "200", description = "Bebida registrada exitosamente en el catálogo.")
    public Map<String, Object> registerBeverage(
            @Valid @RequestBody CreateBeverageRequest req,
            @AuthenticationPrincipal AuthenticatedUserPrincipal user) {
        return catalogService.registerBeverage(req, user);
    }

    /**
     * Lista las líneas o categorías comerciales de bebidas del negocio activo.
     *
     * @param user usuario autenticado
     * @return lista de categorías con su regla de margen mayorista
     */
    @GetMapping("/categories")
    @Operation(
            summary = "Listar Líneas y Categorías de Bebidas",
            description = "Consulta la tabla 'beverage_categories' y retorna las líneas comerciales junto con su margen mayorista."
    )
    @ApiResponse(responseCode = "200", description = "Categorías de bebidas obtenidas correctamente.")
    public List<Map<String, Object>> listCategories(@AuthenticationPrincipal AuthenticatedUserPrincipal user) {
        return catalogService.listCategories(user);
    }

    /**
     * Registra una nueva categoría de bebidas en el catálogo.
     */
    @PostMapping("/categories")
    @PreAuthorize("@menuPermissionEvaluator.hasAccess(authentication, 'CAT_ADD', 'CREATE')")
    @Auditable(module = "Categorías", eventType = "CATEGORY_CREATED")
    @Operation(
            summary = "Registrar nueva Categoría o Línea de Bebidas",
            description = "Inserta una nueva categoría en 'beverage_categories' para el negocio del usuario activo."
    )
    @ApiResponse(responseCode = "200", description = "Categoría registrada exitosamente.")
    public Map<String, Object> registerCategory(
            @RequestBody Map<String, Object> req,
            @AuthenticationPrincipal AuthenticatedUserPrincipal user) {
        return catalogService.registerCategory(req, user);
    }
}
