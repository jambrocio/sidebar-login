package com.elroble.bevadmin.modules.users.service;

import com.elroble.bevadmin.common.exception.ResourceNotFoundException;
import com.elroble.bevadmin.modules.users.dto.CreateUserWithBranchesRequest;
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
    public List<Map<String, Object>> listUsersWithBusinessAndBranches() {
        return usersRepository.findAllUsersWithBusinessAndBranches();
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
                .orElseThrow(() -> new ResourceNotFoundException("Local Principal", request.primaryBranchName()));

        UUID newUserId = UUID.randomUUID();
        String encodedPassword = passwordEncoder.encode(request.password());

        usersRepository.insertUser(newUserId, request, encodedPassword, businessId, primaryBranchId);

        for (String branchName : request.authorizedBranchNames()) {
            usersRepository.insertUserBranchAssignment(newUserId, businessId, branchName, request.primaryBranchName());
        }

        usersRepository.insertUserRoleAssignment(newUserId, request.roleCode());

        return Map.of(
                "userId", newUserId,
                "userCode", request.userCode(),
                "status", "Registrado"
        );
    }
}
