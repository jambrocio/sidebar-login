package com.elroble.bevadmin.modules.users.service;

import com.elroble.bevadmin.common.exception.ResourceNotFoundException;
import com.elroble.bevadmin.modules.users.dto.CreateUserWithBranchesRequest;
import com.elroble.bevadmin.modules.users.dto.UpdateUserWithBranchesRequest;
import com.elroble.bevadmin.modules.users.repository.UsersRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Implementación imperativa y síncrona del servicio de Usuarios y Asignación de Locales ({@link UsersService}).
 */
@Service
public class UsersServiceImpl implements UsersService {

    /** Repositorio síncrono de usuarios y asignación de locales. */
    private final UsersRepository usersRepository;

    /** Codificador BCrypt para cifrar contraseñas. */
    private final PasswordEncoder passwordEncoder;

    /**
     * Constructor con inyección de dependencias.
     *
     * @param usersRepository repositorio de usuarios
     * @param passwordEncoder codificador BCrypt
     */
    public UsersServiceImpl(UsersRepository usersRepository, PasswordEncoder passwordEncoder) {
        this.usersRepository = usersRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listUsersWithBusinessAndBranches(String businessCode) {
        return usersRepository.findAllUsersWithBusinessAndBranches(businessCode);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listUsersWithBusinessAndBranches() {
        return usersRepository.findAllUsersWithBusinessAndBranches(null);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional
    public Map<String, Object> registerUserWithBusinessAndBranches(CreateUserWithBranchesRequest request) {
        UUID businessId = usersRepository.findBusinessIdByCode(request.businessCode())
                .orElseThrow(() -> new ResourceNotFoundException("Negocio Matriz", request.businessCode()));

        UUID primaryBranchId = usersRepository.findBranchIdByBusinessAndName(businessId, request.primaryBranchName())
                .or(() -> usersRepository.findFirstBranchIdByBusiness(businessId))
                .orElseThrow(() -> new ResourceNotFoundException("Local Principal", request.primaryBranchName()));

        String userCode = request.userCode();
        if (userCode == null || userCode.isBlank() || usersRepository.existsByUserCode(userCode)) {
            userCode = usersRepository.findNextAvailableUserCode();
        }

        UUID newUserId = UUID.randomUUID();
        String encodedPassword = passwordEncoder.encode(request.password());

        CreateUserWithBranchesRequest resolvedRequest = new CreateUserWithBranchesRequest(
                userCode,
                request.fullName(),
                request.username(),
                request.email(),
                request.password(),
                request.roleCode(),
                request.businessCode(),
                request.primaryBranchName(),
                request.authorizedBranchNames(),
                request.clientType()
        );

        usersRepository.insertUser(newUserId, resolvedRequest, encodedPassword, businessId, primaryBranchId);

        for (String branchName : request.authorizedBranchNames()) {
            usersRepository.insertUserBranchAssignment(newUserId, businessId, branchName, request.primaryBranchName());
        }

        usersRepository.insertUserRoleAssignment(newUserId, request.roleCode());

        return Map.of(
                "userId", newUserId,
                "userCode", userCode,
                "status", "Registrado"
        );
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional
    public Map<String, Object> updateUserWithBusinessAndBranches(String identifier, UpdateUserWithBranchesRequest request) {
        UUID userId = usersRepository.findUserIdByIdentifier(identifier)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario", identifier));

        UUID businessId;
        if (request.businessCode() != null && !request.businessCode().isBlank()) {
            businessId = usersRepository.findBusinessIdByCode(request.businessCode())
                    .orElseGet(() -> usersRepository.findBusinessIdByUserId(userId));
        } else {
            businessId = usersRepository.findBusinessIdByUserId(userId);
        }

        UUID primaryBranchId;
        if (request.primaryBranchName() != null && !request.primaryBranchName().isBlank()) {
            primaryBranchId = usersRepository.findBranchIdByBusinessAndName(businessId, request.primaryBranchName())
                    .or(() -> usersRepository.findFirstBranchIdByBusiness(businessId))
                    .orElseGet(() -> usersRepository.findPrimaryBranchIdByUserId(userId));
        } else {
            primaryBranchId = usersRepository.findPrimaryBranchIdByUserId(userId);
        }

        String encodedPassword = null;
        if (request.password() != null && !request.password().isBlank()
                && !"Admin123*".equals(request.password())
                && !"Temporal2026*".equals(request.password())) {
            encodedPassword = passwordEncoder.encode(request.password());
        }

        usersRepository.updateUser(userId, request, encodedPassword, businessId, primaryBranchId);

        if (request.roleCode() != null && !request.roleCode().isBlank()) {
            usersRepository.updateUserRoleAssignment(userId, request.roleCode());
        }

        if (request.authorizedBranchNames() != null && !request.authorizedBranchNames().isEmpty()) {
            usersRepository.deleteUserBranchAssignments(userId);
            for (String branchName : request.authorizedBranchNames()) {
                usersRepository.insertUserBranchAssignment(userId, businessId, branchName, request.primaryBranchName());
            }
        }

        return Map.of(
                "userId", userId,
                "status", "Actualizado",
                "role", request.roleCode()
        );
    }
}
