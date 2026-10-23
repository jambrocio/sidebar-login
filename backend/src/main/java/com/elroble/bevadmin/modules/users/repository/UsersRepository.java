package com.elroble.bevadmin.modules.users.repository;

import com.elroble.bevadmin.modules.users.dto.CreateUserWithBranchesRequest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Repositorio síncrono de acceso a datos para Usuarios, Asignación de Sedes y Roles
 * ({@code usuarios}, {@code usuario_sedes}, {@code usuario_roles} y vista {@code vw_usuarios_empresas_sedes}).
 */
@Repository
public class UsersRepository {

    /** Cliente JDBC síncrono de Spring. */
    private final JdbcClient jdbcClient;

    /**
     * Constructor con inyección de dependencias.
     *
     * @param jdbcClient cliente JDBC conectado a PostgreSQL
     */
    public UsersRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    /**
     * Consulta la vista consolidada {@code vw_usuarios_empresas_sedes}.
     *
     * @return lista de usuarios con su Empresa Matriz, Sede Principal y arreglo de Sedes Autorizadas
     */
    public List<Map<String, Object>> findAllUsersWithBusinessAndBranches() {
        return jdbcClient.sql("SELECT * FROM vw_usuarios_empresas_sedes ORDER BY id ASC")
                .query()
                .listOfRows();
    }

    /**
     * Busca el UUID de una Empresa Matriz por su código único.
     *
     * @param businessCode código de la empresa (ej. {@code BIZ-001})
     * @return {@link Optional} con el UUID de la empresa
     */
    public Optional<UUID> findBusinessIdByCode(String businessCode) {
        return jdbcClient.sql("SELECT id FROM empresas WHERE codigo = :code")
                .param("code", businessCode)
                .query(UUID.class)
                .optional();
    }

    /**
     * Busca el UUID de una Sede por su nombre dentro de una Empresa Matriz.
     *
     * @param businessId identificador UUID de la empresa
     * @param branchName nombre de la sede/sucursal
     * @return {@link Optional} con el UUID de la sede
     */
    public Optional<UUID> findBranchIdByBusinessAndName(UUID businessId, String branchName) {
        return jdbcClient.sql("SELECT id FROM sedes WHERE empresa_id = :businessId AND nombre = :name")
                .param("businessId", businessId)
                .param("name", branchName)
                .query(UUID.class)
                .optional();
    }

    /**
     * Inserta el registro principal del usuario en la tabla {@code usuarios}.
     *
     * @param userId          UUID generado para el usuario
     * @param req             DTO con los datos del usuario
     * @param encodedPassword contraseña ya cifrada con BCrypt
     * @param businessId      UUID de la Empresa Matriz
     * @param primaryBranchId UUID de la Sede Principal Asignada
     */
    public void insertUser(
            UUID userId,
            CreateUserWithBranchesRequest req,
            String encodedPassword,
            UUID businessId,
            UUID primaryBranchId) {
        jdbcClient.sql("""
                INSERT INTO usuarios (id, codigo_usuario, nombre_usuario, correo_electronico, hash_contrasena, nombre_completo, empresa_id, sede_asignada_id, tipo_cliente, estado)
                VALUES (:id, :userCode, :username, :email, :passwordHash, :fullName, :businessId, :branchId, :clientType, 'ACTIVE')
                """)
                .param("id", userId)
                .param("userCode", req.userCode())
                .param("username", req.username())
                .param("email", req.email())
                .param("passwordHash", encodedPassword)
                .param("fullName", req.fullName())
                .param("businessId", businessId)
                .param("branchId", primaryBranchId)
                .param("clientType", req.clientType())
                .update();
    }

    /**
     * Asocia una sede autorizada al usuario en la tabla intermedia {@code usuario_sedes}.
     *
     * @param userId            UUID del usuario
     * @param businessId        UUID de la empresa matriz
     * @param branchName        nombre de la sede autorizada
     * @param primaryBranchName nombre de la sede principal para marcar {@code es_principal = true}
     */
    public void insertUserBranchAssignment(UUID userId, UUID businessId, String branchName, String primaryBranchName) {
        jdbcClient.sql("""
                INSERT INTO usuario_sedes (usuario_id, sede_id, es_principal)
                SELECT :userId, id, (nombre = :primaryName)
                FROM sedes
                WHERE empresa_id = :businessId AND nombre = :branchName
                ON CONFLICT (usuario_id, sede_id) DO NOTHING
                """)
                .param("userId", userId)
                .param("primaryName", primaryBranchName)
                .param("businessId", businessId)
                .param("branchName", branchName)
                .update();
    }

    /**
     * Asigna un rol al usuario en la tabla {@code usuario_roles}.
     *
     * @param userId   UUID del usuario
     * @param roleCode código del rol (ej. {@code ANALYST})
     */
    public void insertUserRoleAssignment(UUID userId, String roleCode) {
        jdbcClient.sql("""
                INSERT INTO usuario_roles (usuario_id, rol_id)
                SELECT :userId, id FROM roles WHERE codigo = :roleCode
                """)
                .param("userId", userId)
                .param("roleCode", roleCode)
                .update();
    }
}
