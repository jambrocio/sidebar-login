package com.elroble.bevadmin.modules.customers.service;

import com.elroble.bevadmin.modules.customers.dto.CreateCustomerRequest;
import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;

import java.util.List;
import java.util.Map;

/**
 * Contrato de servicio para la gestión multi-tenant de Clientes Comerciales.
 */
public interface CustomersService {

    List<Map<String, Object>> listCustomers(String businessCode, AuthenticatedUserPrincipal user);

    Map<String, Object> registerCustomer(CreateCustomerRequest request, AuthenticatedUserPrincipal user);
}
