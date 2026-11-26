package com.elroble.bevadmin.modules.roles.service;

import com.elroble.bevadmin.modules.roles.dto.CreateRoleRequest;
import com.elroble.bevadmin.modules.roles.repository.RolesRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * Implementación imperativa y síncrona del servicio de Roles y Matriz RBAC ({@link RolesService}).
 */
@Service
public class RolesServiceImpl implements RolesService {

    /** Repositorio síncrono de roles y permisos RBAC. */
    private final RolesRepository rolesRepository;

    /**
     * Constructor con inyección de dependencias.
     *
     * @param rolesRepository repositorio de roles
     */
    public RolesServiceImpl(RolesRepository rolesRepository) {
        this.rolesRepository = rolesRepository;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listRoles() {
        return rolesRepository.findAllRolesWithUsersCount();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional
    public Map<String, Object> createRole(CreateRoleRequest request) {
        rolesRepository.insertRole(request);
        return Map.of("code", request.code().toUpperCase(), "status", "Creado");
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getRoleMenuMatrix(String roleCode) {
        return rolesRepository.findRoleMenuMatrixByRoleCode(roleCode);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional
    public void updateRoleMenuPermissions(String roleCode, List<Map<String, Object>> permissions) {
        rolesRepository.updateRolePermissions(roleCode, permissions);
    }
}
