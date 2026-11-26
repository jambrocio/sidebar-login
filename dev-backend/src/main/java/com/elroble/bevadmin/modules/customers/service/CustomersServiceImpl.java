package com.elroble.bevadmin.modules.customers.service;

import com.elroble.bevadmin.common.exception.BusinessRuleException;
import com.elroble.bevadmin.common.exception.ResourceNotFoundException;
import com.elroble.bevadmin.modules.customers.dto.CreateCustomerRequest;
import com.elroble.bevadmin.modules.customers.repository.CustomersRepository;
import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Implementación de la gestión de Clientes Comerciales con aislamiento multi-tenant por negocio.
 */
@Service
public class CustomersServiceImpl implements CustomersService {

    private final CustomersRepository customersRepository;

    public CustomersServiceImpl(CustomersRepository customersRepository) {
        this.customersRepository = customersRepository;
    }

    private boolean isUserAdmin(AuthenticatedUserPrincipal user) {
        return user != null && user.isSuperAdmin();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listCustomers(String businessCode, AuthenticatedUserPrincipal user) {
        if (isUserAdmin(user)) {
            if (businessCode != null && !businessCode.isBlank() && !"ALL".equalsIgnoreCase(businessCode)) {
                UUID businessId = customersRepository.findBusinessIdByCode(businessCode)
                        .orElseThrow(() -> new ResourceNotFoundException("Negocio Matriz", businessCode));
                return customersRepository.findCustomersByBusinessId(businessId);
            }
            return customersRepository.findAllCustomers();
        }

        return customersRepository.findCustomersByBusinessId(user.businessId());
    }

    @Override
    @Transactional
    public Map<String, Object> registerCustomer(CreateCustomerRequest request, AuthenticatedUserPrincipal user) {
        UUID targetBusinessId;

        if (isUserAdmin(user) && request.businessCode() != null && !request.businessCode().isBlank()) {
            targetBusinessId = customersRepository.findBusinessIdByCode(request.businessCode())
                    .orElseThrow(() -> new ResourceNotFoundException("Negocio Matriz", request.businessCode()));
        } else {
            targetBusinessId = user.businessId();
        }

        if (customersRepository.existsByDocumentInBusiness(targetBusinessId, request.documentNumber())) {
            throw new BusinessRuleException(
                    "Ya existe un cliente con el documento " + request.documentNumber() + " registrado en este negocio."
            );
        }

        String code = request.customerCode();
        if (code == null || code.isBlank()) {
            code = customersRepository.findNextCustomerCode(targetBusinessId);
        }

        UUID newCustomerId = customersRepository.insertCustomer(targetBusinessId, user.userId(), code, request);

        return Map.of(
                "customerId", newCustomerId,
                "customerCode", code,
                "status", "Registrado",
                "businessId", targetBusinessId
        );
    }
}
