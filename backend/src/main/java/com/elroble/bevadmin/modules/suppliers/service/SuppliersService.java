package com.elroble.bevadmin.modules.suppliers.service;

import com.elroble.bevadmin.modules.suppliers.dto.CreateSupplierRequest;
import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Contrato de servicio de negocio para la administración de Proveedores Comerciales.
 */
public interface SuppliersService {

    /**
     * Lista los proveedores correspondientes al negocio del usuario o según el filtro seleccionado.
     */
    List<Map<String, Object>> listSuppliers(String businessCode, AuthenticatedUserPrincipal user);

    /**
     * Da de alta a un nuevo proveedor validando unicidad de documento y aislamiento por negocio.
     */
    Map<String, Object> registerSupplier(CreateSupplierRequest request, AuthenticatedUserPrincipal user);

    /**
     * Modifica el estado operativo (Activo/Inactivo) de un proveedor con control de pertenencia.
     */
    Map<String, Object> updateSupplierStatus(UUID supplierId, boolean active, AuthenticatedUserPrincipal user);
}
