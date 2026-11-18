package com.auth.identity.service;

import com.auth.identity.core.exception.BusinessRuleException;
import com.auth.identity.core.exception.ResourceNotFoundException;
import com.auth.identity.domain.model.Role;
import com.auth.identity.domain.model.User;
import com.auth.identity.repository.AuditRepository;
import com.auth.identity.repository.RbacRepository;
import com.auth.identity.repository.UserRepository;
import com.auth.identity.web.dto.CreateUserRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class UserServiceImpl implements UserService {

    private static final Logger log = LoggerFactory.getLogger(UserServiceImpl.class);

    private final UserRepository userRepository;
    private final RbacRepository rbacRepository;
    private final AuditRepository auditRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcClient jdbcClient;

    public UserServiceImpl(
            UserRepository userRepository,
            RbacRepository rbacRepository,
            AuditRepository auditRepository,
            PasswordEncoder passwordEncoder,
            JdbcClient jdbcClient
    ) {
        this.userRepository = userRepository;
        this.rbacRepository = rbacRepository;
        this.auditRepository = auditRepository;
        this.passwordEncoder = passwordEncoder;
        this.jdbcClient = jdbcClient;
    }

    @Override
    @Transactional
    public User createUser(CreateUserRequest request, UUID registeredByUserId) {
        if (userRepository.findUserByLogin(request.username()).isPresent()) {
            throw new BusinessRuleException("Username '" + request.username() + "' is already registered.");
        }
        if (userRepository.findUserByLogin(request.email()).isPresent()) {
            throw new BusinessRuleException("Email '" + request.email() + "' is already registered.");
        }

        Role role = rbacRepository.findRoleByCode(request.roleCode())
                .orElseThrow(() -> new ResourceNotFoundException("Role '" + request.roleCode() + "' not found."));

        UUID userId = UUID.randomUUID();
        String hash = passwordEncoder.encode(request.password());
        String initials = computeInitials(request.fullName());

        String insertUserSql = """
                INSERT INTO auth.usuarios (
                    id, codigo_usuario, nombre_usuario, correo_electronico, hash_contrasena,
                    nombre_completo, iniciales_avatar, empresa_id, sede_asignada_id,
                    tipo_cliente, estado, doble_factor_habilitado, intentos_fallidos_login,
                    debe_cambiar_contrasena, fecha_creacion, fecha_actualizacion
                ) VALUES (
                    :id, :code, :username, :email, :hash,
                    :fullName, :initials, :businessId, :branchId,
                    :clientType, 'ACTIVE', FALSE, 0,
                    FALSE, NOW(), NOW()
                )
                """;

        jdbcClient.sql(insertUserSql)
                .param("id", userId)
                .param("code", request.userCode())
                .param("username", request.username())
                .param("email", request.email())
                .param("hash", hash)
                .param("fullName", request.fullName())
                .param("initials", initials)
                .param("businessId", request.businessId())
                .param("branchId", request.assignedBranchId())
                .param("clientType", request.clientType() != null ? request.clientType() : "Personal Interno")
                .update();

        // Assign Role
        String insertRoleSql = """
                INSERT INTO rbac.usuario_roles (id, usuario_id, rol_id, asignado_por_id, fecha_asignacion)
                VALUES (gen_random_uuid(), :userId, :roleId, :assignedBy, NOW())
                """;
        jdbcClient.sql(insertRoleSql)
                .param("userId", userId)
                .param("roleId", role.id())
                .param("assignedBy", registeredByUserId)
                .update();

        // Assign Primary Branch
        String insertBranchSql = """
                INSERT INTO core.usuario_sedes (id, usuario_id, sede_id, es_principal, fecha_asignacion)
                VALUES (gen_random_uuid(), :userId, :branchId, TRUE, NOW())
                """;
        jdbcClient.sql(insertBranchSql)
                .param("userId", userId)
                .param("branchId", request.assignedBranchId())
                .update();

        // Assign other authorized branches
        if (request.authorizedBranchIds() != null) {
            for (UUID extraBranchId : request.authorizedBranchIds()) {
                if (!extraBranchId.equals(request.assignedBranchId())) {
                    String extraSql = """
                            INSERT INTO core.usuario_sedes (id, usuario_id, sede_id, es_principal, fecha_asignacion)
                            VALUES (gen_random_uuid(), :userId, :branchId, FALSE, NOW())
                            ON CONFLICT DO NOTHING
                            """;
                    jdbcClient.sql(extraSql)
                            .param("userId", userId)
                            .param("branchId", extraBranchId)
                            .update();
                }
            }
        }

        auditRepository.logSecurityEvent(
                userId, request.assignedBranchId(), "USER_CREATED",
                "User " + request.username() + " created with role " + role.code(),
                "Seguridad", null, null
        );

        log.info("Successfully registered new user {} with ID {}", request.username(), userId);
        return userRepository.findById(userId).orElseThrow();
    }

    @Override
    public User getUserById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));
    }

    @Override
    @Transactional
    public void lockUserAccount(UUID id, String reason) {
        userRepository.updateAccountStatus(id, "LOCKED");
        auditRepository.logSecurityEvent(id, null, "ACCOUNT_LOCKED", "Locked by admin: " + reason, "Seguridad", null, null);
        log.warn("Account {} locked by administrator", id);
    }

    @Override
    @Transactional
    public void unlockUserAccount(UUID id) {
        userRepository.updateAccountStatus(id, "ACTIVE");
        userRepository.resetFailedAttempts(id);
        auditRepository.logSecurityEvent(id, null, "ACCOUNT_UNLOCKED", "Unlocked by admin", "Seguridad", null, null);
        log.info("Account {} unlocked by administrator", id);
    }

    @Override
    public List<Map<String, Object>> getAllUsersConsolidated() {
        return userRepository.findAllUsersConsolidated();
    }

    private String computeInitials(String name) {
        if (name == null || name.isBlank()) return "US";
        String[] parts = name.trim().split("\\s+");
        if (parts.length == 1) {
            return parts[0].substring(0, Math.min(2, parts[0].length())).toUpperCase();
        }
        return ("" + parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
}
