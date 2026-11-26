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

/**
 * Implementación del servicio de gestión de usuarios y gobierno de identidades corporativas.
 *
 * <p>Asegura la unicidad de nombres de usuario y correos electrónicos, cifra las contraseñas
 * mediante BCrypt, asigna el rol y las sedes primarias y autorizadas, y registra las acciones
 * en la bitácora de auditoría inmutable.</p>
 *
 * @author Equipo de Arquitectura e Identidad
 * @version 1.0
 */
@Service
public class UserServiceImpl implements UserService {

    private static final Logger log = LoggerFactory.getLogger(UserServiceImpl.class);

    private final UserRepository userRepository;
    private final RbacRepository rbacRepository;
    private final AuditRepository auditRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcClient jdbcClient;

    /**
     * Constructor con inyección de repositorios y componentes de seguridad requeridos.
     *
     * @param userRepository Repositorio de persistencia de usuarios.
     * @param rbacRepository Repositorio de roles RBAC.
     * @param auditRepository Repositorio de auditoría de seguridad.
     * @param passwordEncoder Codificador criptográfico BCrypt.
     * @param jdbcClient Cliente JDBC para operaciones de asignación relacional.
     */
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

    /**
     * Aprovisiona un nuevo usuario de forma transaccional, asociando rol RBAC y sucursales operativas.
     *
     * @param request Datos de la solicitud de registro.
     * @param registeredByUserId Identificador UUID del administrador responsable.
     * @return Entidad {@link User} creada.
     */
    @Override
    @Transactional
    public User createUser(CreateUserRequest request, UUID registeredByUserId) {
        if (userRepository.findUserByLogin(request.username()).isPresent()) {
            throw new BusinessRuleException("El nombre de usuario '" + request.username() + "' ya se encuentra registrado.");
        }
        if (userRepository.findUserByLogin(request.email()).isPresent()) {
            throw new BusinessRuleException("El correo electrónico '" + request.email() + "' ya se encuentra registrado.");
        }

        Role role = rbacRepository.findRoleByCode(request.roleCode())
                .orElseThrow(() -> new ResourceNotFoundException("El rol '" + request.roleCode() + "' no fue encontrado."));

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

        // Asignar Rol RBAC
        String insertRoleSql = """
                INSERT INTO rbac.usuario_roles (id, usuario_id, rol_id, asignado_por_id, fecha_asignacion)
                VALUES (gen_random_uuid(), :userId, :roleId, :assignedBy, NOW())
                """;
        jdbcClient.sql(insertRoleSql)
                .param("userId", userId)
                .param("roleId", role.id())
                .param("assignedBy", registeredByUserId)
                .update();

        // Asignar Sede Principal
        String insertBranchSql = """
                INSERT INTO core.usuario_sedes (id, usuario_id, sede_id, es_principal, fecha_asignacion)
                VALUES (gen_random_uuid(), :userId, :branchId, TRUE, NOW())
                """;
        jdbcClient.sql(insertBranchSql)
                .param("userId", userId)
                .param("branchId", request.assignedBranchId())
                .update();

        // Asignar Sedes Adicionales Autorizadas
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
                "Usuario " + request.username() + " creado con rol " + role.code(),
                "Seguridad", null, null
        );

        log.info("Nuevo usuario registrado exitosamente: {} con ID {}", request.username(), userId);
        return userRepository.findById(userId).orElseThrow();
    }

    /**
     * Obtiene los datos del usuario por su identificador UUID.
     *
     * @param id Identificador UUID del usuario.
     * @return Entidad {@link User}.
     */
    @Override
    public User getUserById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con ID: " + id));
    }

    /**
     * Bloquea administrativamente una cuenta de usuario e ingresa la auditoría respectiva.
     *
     * @param id Identificador UUID del usuario.
     * @param reason Motivo del bloqueo administrativo.
     */
    @Override
    @Transactional
    public void lockUserAccount(UUID id, String reason) {
        userRepository.updateAccountStatus(id, "LOCKED");
        auditRepository.logSecurityEvent(id, null, "ACCOUNT_LOCKED", "Bloqueado por administrador: " + reason, "Seguridad", null, null);
        log.warn("Cuenta de usuario {} bloqueada por el administrador", id);
    }

    /**
     * Desbloquea administrativamente una cuenta, restableciendo el estado a ACTIVE y reiniciando intentos fallidos.
     *
     * @param id Identificador UUID del usuario.
     */
    @Override
    @Transactional
    public void unlockUserAccount(UUID id) {
        userRepository.updateAccountStatus(id, "ACTIVE");
        userRepository.resetFailedAttempts(id);
        auditRepository.logSecurityEvent(id, null, "ACCOUNT_UNLOCKED", "Desbloqueado por administrador", "Seguridad", null, null);
        log.info("Cuenta de usuario {} desbloqueada por el administrador", id);
    }

    /**
     * Consulta todos los usuarios del sistema de forma consolidada.
     *
     * @return Lista de usuarios con datos de negocio y sedes.
     */
    @Override
    public List<Map<String, Object>> getAllUsersConsolidated() {
        return userRepository.findAllUsersConsolidated();
    }

    /**
     * Genera automáticamente las iniciales del avatar a partir del nombre completo del usuario.
     *
     * @param name Nombre completo.
     * @return Iniciales en mayúsculas (1 o 2 letras).
     */
    private String computeInitials(String name) {
        if (name == null || name.isBlank()) return "US";
        String[] parts = name.trim().split("\\s+");
        if (parts.length == 1) {
            return parts[0].substring(0, Math.min(2, parts[0].length())).toUpperCase();
        }
        return ("" + parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
}
