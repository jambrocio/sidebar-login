package com.elroble.bevadmin.modules.suppliers.service;

import com.elroble.bevadmin.common.exception.BusinessRuleException;
import com.elroble.bevadmin.modules.suppliers.dto.CreateSupplierRequest;
import com.elroble.bevadmin.modules.suppliers.repository.SuppliersRepository;
import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Implementación del servicio de negocio de Proveedores Comerciales con aislamiento multi-tenant.
 */
@Service
public class SuppliersServiceImpl implements SuppliersService {

    private final SuppliersRepository suppliersRepository;

    public SuppliersServiceImpl(SuppliersRepository suppliersRepository) {
        this.suppliersRepository = suppliersRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listSuppliers(String businessCode, AuthenticatedUserPrincipal user) {
        if (!user.isSuperAdmin()) {
            return suppliersRepository.findSuppliersByBusinessId(user.businessId());
        }

        if (businessCode != null && !businessCode.isBlank() && !"ALL".equalsIgnoreCase(businessCode.trim())) {
            UUID targetBizId = suppliersRepository.findBusinessIdByCode(businessCode.trim())
                    .orElseThrow(() -> new BusinessRuleException("Negocio no encontrado con código: " + businessCode));
            return suppliersRepository.findSuppliersByBusinessId(targetBizId);
        }

        return suppliersRepository.findAllSuppliers();
    }

    @Override
    @Transactional
    public Map<String, Object> registerSupplier(CreateSupplierRequest request, AuthenticatedUserPrincipal user) {
        UUID targetBusinessId;

        if (user.isSuperAdmin()) {
            if (request.businessCode() != null && !request.businessCode().isBlank()) {
                targetBusinessId = suppliersRepository.findBusinessIdByCode(request.businessCode().trim())
                        .orElseThrow(() -> new BusinessRuleException("El negocio matriz indicado (" + request.businessCode() + ") no existe."));
            } else {
                targetBusinessId = user.businessId();
            }
        } else {
            targetBusinessId = user.businessId();
        }

        String docNumber = request.documentNumber().trim();
        if (suppliersRepository.existsByDocumentInBusiness(targetBusinessId, docNumber)) {
            throw new BusinessRuleException(String.format(
                    "Ya existe un proveedor registrado con el documento %s para este negocio matriz.",
                    docNumber
            ));
        }

        String supplierCode = suppliersRepository.findNextSupplierCode(targetBusinessId);
        UUID newSupplierId = suppliersRepository.insertSupplier(targetBusinessId, user.userId(), supplierCode, request);

        return Map.of(
                "id", newSupplierId,
                "supplierCode", supplierCode,
                "legalName", request.legalName().trim(),
                "documentNumber", docNumber,
                "status", "success",
                "active", true
        );
    }

    @Override
    @Transactional
    public Map<String, Object> updateSupplierStatus(UUID supplierId, boolean active, AuthenticatedUserPrincipal user) {
        int updatedRows = suppliersRepository.updateSupplierStatus(user.businessId(), supplierId, active, user.isSuperAdmin());

        if (updatedRows == 0) {
            throw new BusinessRuleException("No se encontró el proveedor o no tienes permisos para modificarlo en tu negocio.");
        }

        return Map.of(
                "id", supplierId,
                "active", active,
                "message", active ? "Proveedor activado exitosamente." : "Proveedor desactivado exitosamente."
        );
    }
}
