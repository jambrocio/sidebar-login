package com.elroble.bevadmin.modules.auth.repository;

import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repositorio síncrono de acceso a datos para el módulo de Autenticación ({@code usuarios},
 * {@code empresas}, {@code sedes}, {@code usuario_sedes} y {@code roles}).
 * <p>
 * Sigue una arquitectura 100% imperativa utilizando {@link JdbcClient} sobre JDBC bloqueante tradicional.
 */
@Repository
public class AuthRepository {

    /** Cliente JDBC síncrono de Spring Framework 7. */
    private final JdbcClient jdbcClient;

    /**
     * Constructor con inyección de dependencias.
     *
     * @param jdbcClient cliente JDBC síncrono conectado a PostgreSQL
     */
    public AuthRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    /**
     * Busca un usuario activo por su nombre de usuario o correo electrónico y construye
     * su contexto organizacional completo (Negocio Matriz, Local Principal y Locales Autorizados).
     *
     * @param loginOrEmail username o email ingresado en el formulario de login
     * @return {@link Optional} con el {@link AuthenticatedUserPrincipal} si existe y está activo
     */
    public Optional<AuthenticatedUserPrincipal> findActiveUserByLoginOrEmail(String loginOrEmail) {
        return jdbcClient.sql("""
                SELECT u.id, u.codigo_usuario AS user_code, u.nombre_usuario AS username, u.nombre_completo AS full_name,
                       u.empresa_id AS business_id, b.codigo AS business_code,
                       u.sede_asignada_id AS assigned_branch_id, br.nombre AS assigned_branch_name,
                       COALESCE(r.codigo, 'ANALYST') AS role_code,
                       COALESCE(r.alcance, 'Nivel Local Asignado') AS role_scope
                FROM usuarios u
                INNER JOIN empresas b ON b.id = u.empresa_id
                INNER JOIN sedes br ON br.id = u.sede_asignada_id
                LEFT JOIN usuario_roles ur ON ur.usuario_id = u.id
                LEFT JOIN roles r ON r.id = ur.rol_id
                WHERE (u.nombre_usuario = :login OR u.correo_electronico = :login)
                  AND u.estado = 'ACTIVE'
                LIMIT 1
                """)
                .param("login", loginOrEmail)
                .query((rs, rowNum) -> {
                    UUID userId = UUID.fromString(rs.getString("id"));
                    List<UUID> authorizedBranches = findAuthorizedBranchIdsByUserId(userId);

                    return new AuthenticatedUserPrincipal(
                            userId,
                            rs.getString("user_code"),
                            rs.getString("username"),
                            rs.getString("full_name"),
                            UUID.fromString(rs.getString("business_id")),
                            rs.getString("business_code"),
                            UUID.fromString(rs.getString("assigned_branch_id")),
                            rs.getString("assigned_branch_name"),
                            authorizedBranches,
                            List.of(rs.getString("role_code")),
                            rs.getString("role_scope")
                    );
                })
                .optional();
    }

    /**
     * Recupera los identificadores UUID de todos los locales autorizados para un usuario.
     *
     * @param userId identificador UUID del usuario
     * @return lista de UUIDs de los locales habilitados en {@code usuario_sedes}
     */
    public List<UUID> findAuthorizedBranchIdsByUserId(UUID userId) {
        return jdbcClient.sql("SELECT sede_id AS branch_id FROM usuario_sedes WHERE usuario_id = :userId")
                .param("userId", userId)
                .query((rs, rowNum) -> UUID.fromString(rs.getString("branch_id")))
                .list();
    }

    /**
     * Registro auxiliar inmutable para comprobaciones de credenciales de seguridad, expiración y bloqueo.
     */
    public record UserSecurityRecord(
            UUID id,
            String username,
            String passwordHash,
            String status,
            int failedLoginAttempts,
            boolean mustChangePassword,
            java.time.OffsetDateTime passwordExpiresAt
    ) {}

    /**
     * Busca los datos de seguridad, expiración y hash de contraseña por username o correo electrónico.
     *
     * @param loginOrEmail username o correo institucional
     * @return {@link Optional} con el registro de credenciales si existe
     */
    public Optional<UserSecurityRecord> findSecurityRecordByLogin(String loginOrEmail) {
        return jdbcClient.sql("""
                SELECT id, nombre_usuario AS username, hash_contrasena AS password_hash, estado AS status,
                       intentos_fallidos_login AS failed_login_attempts,
                       COALESCE(debe_cambiar_contrasena, FALSE) AS must_change_password,
                       COALESCE(fecha_expiracion_contrasena, NOW() + INTERVAL '90 days') AS password_expires_at
                FROM usuarios
                WHERE (nombre_usuario = :login OR correo_electronico = :login)
                LIMIT 1
                """)
                .param("login", loginOrEmail)
                .query((rs, rowNum) -> new UserSecurityRecord(
                        UUID.fromString(rs.getString("id")),
                        rs.getString("username"),
                        rs.getString("password_hash"),
                        rs.getString("status"),
                        rs.getInt("failed_login_attempts"),
                        rs.getBoolean("must_change_password"),
                        rs.getObject("password_expires_at", java.time.OffsetDateTime.class)
                ))
                .optional();
    }

    /**
     * Incrementa los intentos fallidos de autenticación y bloquea la cuenta si alcanza 5 intentos consecutivos.
     *
     * @param userId identificador UUID del usuario
     * @return nuevo número de intentos fallidos registrados
     */
    public int recordFailedLoginAttempt(UUID userId) {
        jdbcClient.sql("""
                UPDATE usuarios
                SET intentos_fallidos_login = intentos_fallidos_login + 1,
                    estado = CASE WHEN intentos_fallidos_login + 1 >= 5 THEN 'LOCKED' ELSE estado END,
                    fecha_actualizacion = NOW()
                WHERE id = :userId
                """)
                .param("userId", userId)
                .update();

        return jdbcClient.sql("SELECT intentos_fallidos_login FROM usuarios WHERE id = :userId")
                .param("userId", userId)
                .query(Integer.class)
                .single();
    }

    /**
     * Restablece el contador de intentos fallidos y actualiza la fecha/hora de último acceso exitoso.
     *
     * @param userId identificador UUID del usuario
     */
    public void recordSuccessfulLogin(UUID userId) {
        jdbcClient.sql("""
                UPDATE usuarios
                SET intentos_fallidos_login = 0,
                    fecha_ultimo_acceso = NOW(),
                    fecha_actualizacion = NOW()
                WHERE id = :userId
                """)
                .param("userId", userId)
                .update();
    }

    /**
     * Actualiza el hash de la contraseña en la base de datos, restablece los intentos fallidos,
     * limpia el flag de cambio obligatorio y extiende la vigencia por 90 días.
     *
     * @param userId          identificador UUID del usuario
     * @param newPasswordHash nuevo hash BCrypt de la contraseña
     * @return número de filas afectadas
     */
    public int updatePasswordHash(UUID userId, String newPasswordHash) {
        return jdbcClient.sql("""
                UPDATE usuarios
                SET hash_contrasena = :hash,
                    intentos_fallidos_login = 0,
                    debe_cambiar_contrasena = FALSE,
                    fecha_expiracion_contrasena = NOW() + INTERVAL '90 days',
                    estado = 'ACTIVE',
                    fecha_actualizacion = NOW()
                WHERE id = :userId
                """)
                .param("hash", newPasswordHash)
                .param("userId", userId)
                .update();
    }
}
