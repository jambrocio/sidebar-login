package com.auth.identity.repository;

import com.auth.identity.core.security.AuthenticatedUserPrincipal;
import com.auth.identity.domain.model.User;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.*;

/**
 * Synchronous relational data access repository for identity management and user credentials,
 * querying schemas {@code auth} and {@code core}.
 */
@Repository
public class UserRepository {

    private final JdbcClient jdbcClient;

    public UserRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    /**
     * Finds user authentication and enterprise context by username or email.
     */
    public Optional<AuthenticatedUserPrincipal> findActivePrincipalByLoginOrEmail(String login) {
        String sql = """
                SELECT u.id, u.codigo_usuario, u.nombre_usuario, u.correo_electronico, u.nombre_completo,
                       u.empresa_id, b.codigo AS business_code,
                       u.sede_asignada_id, br.nombre AS assigned_branch_name,
                       COALESCE(r.codigo, 'ANALYST') AS role_code,
                       COALESCE(r.alcance, 'Nivel Local Asignado') AS role_scope,
                       (u.estado = 'ACTIVE') AS is_active
                FROM auth.usuarios u
                INNER JOIN core.empresas b ON b.id = u.empresa_id
                INNER JOIN core.sedes br ON br.id = u.sede_asignada_id
                LEFT JOIN rbac.usuario_roles ur ON ur.usuario_id = u.id
                LEFT JOIN rbac.roles r ON r.id = ur.rol_id
                WHERE (u.nombre_usuario = :login OR u.correo_electronico = :login)
                LIMIT 1
                """;

        return jdbcClient.sql(sql)
                .param("login", login)
                .query((rs, rowNum) -> {
                    UUID userId = UUID.fromString(rs.getString("id"));
                    List<UUID> authorizedBranches = findAuthorizedBranchIdsByUserId(userId);

                    return new AuthenticatedUserPrincipal(
                            userId,
                            rs.getString("codigo_usuario"),
                            rs.getString("nombre_usuario"),
                            rs.getString("correo_electronico"),
                            rs.getString("nombre_completo"),
                            UUID.fromString(rs.getString("empresa_id")),
                            rs.getString("business_code"),
                            UUID.fromString(rs.getString("sede_asignada_id")),
                            rs.getString("assigned_branch_name"),
                            authorizedBranches,
                            rs.getString("role_code"),
                            rs.getString("role_scope"),
                            rs.getBoolean("is_active")
                    );
                })
                .optional();
    }

    /**
     * Loads the complete User entity including password hash and security flags.
     */
    public Optional<User> findUserByLogin(String login) {
        String sql = """
                SELECT u.id, u.codigo_usuario, u.nombre_usuario, u.correo_electronico, u.hash_contrasena,
                       u.nombre_completo, u.iniciales_avatar, u.empresa_id, b.codigo AS business_code,
                       b.nombre_comercial AS business_name, u.sede_asignada_id, s.nombre AS branch_name,
                       u.tipo_cliente, u.estado, u.doble_factor_habilitado, u.intentos_fallidos_login,
                       u.debe_cambiar_contrasena, u.fecha_expiracion_contrasena, u.fecha_ultimo_acceso,
                       u.fecha_creacion, u.fecha_actualizacion
                FROM auth.usuarios u
                INNER JOIN core.empresas b ON b.id = u.empresa_id
                INNER JOIN core.sedes s ON s.id = u.sede_asignada_id
                WHERE u.nombre_usuario = :login OR u.correo_electronico = :login
                LIMIT 1
                """;

        return jdbcClient.sql(sql)
                .param("login", login)
                .query((rs, rowNum) -> {
                    UUID userId = UUID.fromString(rs.getString("id"));
                    List<UUID> branchIds = findAuthorizedBranchIdsByUserId(userId);

                    return new User(
                            userId,
                            rs.getString("codigo_usuario"),
                            rs.getString("nombre_usuario"),
                            rs.getString("correo_electronico"),
                            rs.getString("hash_contrasena"),
                            rs.getString("nombre_completo"),
                            rs.getString("iniciales_avatar"),
                            UUID.fromString(rs.getString("empresa_id")),
                            rs.getString("business_code"),
                            rs.getString("business_name"),
                            UUID.fromString(rs.getString("sede_asignada_id")),
                            rs.getString("branch_name"),
                            branchIds,
                            rs.getString("tipo_cliente"),
                            rs.getString("estado"),
                            rs.getBoolean("doble_factor_habilitado"),
                            rs.getInt("intentos_fallidos_login"),
                            rs.getBoolean("debe_cambiar_contrasena"),
                            rs.getObject("fecha_expiracion_contrasena", OffsetDateTime.class),
                            rs.getObject("fecha_ultimo_acceso", OffsetDateTime.class),
                            rs.getObject("fecha_creacion", OffsetDateTime.class),
                            rs.getObject("fecha_actualizacion", OffsetDateTime.class)
                    );
                })
                .optional();
    }

    /**
     * Loads the complete User entity by its unique UUID.
     */
    public Optional<User> findById(UUID id) {
        String sql = """
                SELECT u.id, u.codigo_usuario, u.nombre_usuario, u.correo_electronico, u.hash_contrasena,
                       u.nombre_completo, u.iniciales_avatar, u.empresa_id, b.codigo AS business_code,
                       b.nombre_comercial AS business_name, u.sede_asignada_id, s.nombre AS branch_name,
                       u.tipo_cliente, u.estado, u.doble_factor_habilitado, u.intentos_fallidos_login,
                       u.debe_cambiar_contrasena, u.fecha_expiracion_contrasena, u.fecha_ultimo_acceso,
                       u.fecha_creacion, u.fecha_actualizacion
                FROM auth.usuarios u
                INNER JOIN core.empresas b ON b.id = u.empresa_id
                INNER JOIN core.sedes s ON s.id = u.sede_asignada_id
                WHERE u.id = :id
                LIMIT 1
                """;

        return jdbcClient.sql(sql)
                .param("id", id)
                .query((rs, rowNum) -> {
                    UUID userId = UUID.fromString(rs.getString("id"));
                    List<UUID> branchIds = findAuthorizedBranchIdsByUserId(userId);

                    return new User(
                            userId,
                            rs.getString("codigo_usuario"),
                            rs.getString("nombre_usuario"),
                            rs.getString("correo_electronico"),
                            rs.getString("hash_contrasena"),
                            rs.getString("nombre_completo"),
                            rs.getString("iniciales_avatar"),
                            UUID.fromString(rs.getString("empresa_id")),
                            rs.getString("business_code"),
                            rs.getString("business_name"),
                            UUID.fromString(rs.getString("sede_asignada_id")),
                            rs.getString("branch_name"),
                            branchIds,
                            rs.getString("tipo_cliente"),
                            rs.getString("estado"),
                            rs.getBoolean("doble_factor_habilitado"),
                            rs.getInt("intentos_fallidos_login"),
                            rs.getBoolean("debe_cambiar_contrasena"),
                            rs.getObject("fecha_expiracion_contrasena", OffsetDateTime.class),
                            rs.getObject("fecha_ultimo_acceso", OffsetDateTime.class),
                            rs.getObject("fecha_creacion", OffsetDateTime.class),
                            rs.getObject("fecha_actualizacion", OffsetDateTime.class)
                    );
                })
                .optional();
    }

    /**
     * Lists all authorized branch IDs assigned to a user in {@code core.usuario_sedes}.
     */
    public List<UUID> findAuthorizedBranchIdsByUserId(UUID userId) {
        String sql = "SELECT sede_id FROM core.usuario_sedes WHERE usuario_id = :userId";
        return jdbcClient.sql(sql)
                .param("userId", userId)
                .query((rs, rowNum) -> UUID.fromString(rs.getString("sede_id")))
                .list();
    }

    public void incrementFailedAttempts(UUID userId) {
        String sql = """
                UPDATE auth.usuarios
                SET intentos_fallidos_login = intentos_fallidos_login + 1,
                    estado = CASE WHEN intentos_fallidos_login + 1 >= 5 THEN 'LOCKED' ELSE estado END,
                    fecha_actualizacion = NOW()
                WHERE id = :id
                """;
        jdbcClient.sql(sql).param("id", userId).update();
    }

    public void resetFailedAttempts(UUID userId) {
        String sql = """
                UPDATE auth.usuarios
                SET intentos_fallidos_login = 0,
                    fecha_ultimo_acceso = NOW(),
                    fecha_actualizacion = NOW()
                WHERE id = :id
                """;
        jdbcClient.sql(sql).param("id", userId).update();
    }

    public void updatePassword(UUID userId, String newPasswordHash) {
        String sql = """
                UPDATE auth.usuarios
                SET hash_contrasena = :hash,
                    debe_cambiar_contrasena = FALSE,
                    fecha_expiracion_contrasena = NOW() + INTERVAL '90 days',
                    intentos_fallidos_login = 0,
                    estado = 'ACTIVE',
                    fecha_actualizacion = NOW()
                WHERE id = :id
                """;
        jdbcClient.sql(sql)
                .param("hash", newPasswordHash)
                .param("id", userId)
                .update();
    }

    public void updateAccountStatus(UUID userId, String status) {
        String sql = """
                UPDATE auth.usuarios
                SET estado = :status,
                    fecha_actualizacion = NOW()
                WHERE id = :id
                """;
        jdbcClient.sql(sql)
                .param("status", status)
                .param("id", userId)
                .update();
    }

    public List<Map<String, Object>> findAllUsersConsolidated() {
        String sql = "SELECT * FROM core.vw_usuarios_empresas_sedes ORDER BY id ASC";
        return jdbcClient.sql(sql).query().listOfRows();
    }
}
