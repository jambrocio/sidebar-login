package com.auth.identity.repository;

import com.auth.identity.domain.model.MenuItemPermission;
import com.auth.identity.domain.model.Role;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Synchronous relational data access repository for RBAC roles,
 * dynamic hierarchical menus, and effective permissions in schema {@code rbac}.
 */
@Repository
public class RbacRepository {

    private final JdbcClient jdbcClient;

    public RbacRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public List<Role> findAllActiveRoles() {
        String sql = """
                SELECT id, codigo, nombre, descripcion, alcance, es_sistema, activo,
                       fecha_creacion, fecha_actualizacion
                FROM rbac.roles
                WHERE activo = TRUE
                ORDER BY codigo ASC
                """;

        return jdbcClient.sql(sql)
                .query((rs, rowNum) -> new Role(
                        UUID.fromString(rs.getString("id")),
                        rs.getString("codigo"),
                        rs.getString("nombre"),
                        rs.getString("descripcion"),
                        rs.getString("alcance"),
                        rs.getBoolean("es_sistema"),
                        rs.getBoolean("activo"),
                        rs.getObject("fecha_creacion", OffsetDateTime.class),
                        rs.getObject("fecha_actualizacion", OffsetDateTime.class)
                ))
                .list();
    }

    public Optional<Role> findRoleByCode(String code) {
        String sql = """
                SELECT id, codigo, nombre, descripcion, alcance, es_sistema, activo,
                       fecha_creacion, fecha_actualizacion
                FROM rbac.roles
                WHERE codigo = :code
                LIMIT 1
                """;

        return jdbcClient.sql(sql)
                .param("code", code)
                .query((rs, rowNum) -> new Role(
                        UUID.fromString(rs.getString("id")),
                        rs.getString("codigo"),
                        rs.getString("nombre"),
                        rs.getString("descripcion"),
                        rs.getString("alcance"),
                        rs.getBoolean("es_sistema"),
                        rs.getBoolean("activo"),
                        rs.getObject("fecha_creacion", OffsetDateTime.class),
                        rs.getObject("fecha_actualizacion", OffsetDateTime.class)
                ))
                .optional();
    }

    public List<MenuItemPermission> findEffectiveMenuPermissionsByUserId(UUID userId) {
        String sql = "SELECT * FROM rbac.fn_obtener_menu_efectivo_usuario(:userId)";

        return jdbcClient.sql(sql)
                .param("userId", userId)
                .query((rs, rowNum) -> {
                    String parentIdStr = rs.getString("padre_id");
                    UUID parentId = parentIdStr != null ? UUID.fromString(parentIdStr) : null;

                    return new MenuItemPermission(
                            UUID.fromString(rs.getString("opcion_menu_id")),
                            parentId,
                            rs.getString("codigo"),
                            rs.getString("etiqueta"),
                            rs.getString("icono"),
                            rs.getString("ruta_enlace"),
                            rs.getString("etiqueta_miga_pan"),
                            rs.getInt("orden"),
                            rs.getBoolean("es_grupo"),
                            rs.getBoolean("es_visible"),
                            rs.getString("origen_permiso"),
                            rs.getBoolean("puede_ver"),
                            rs.getBoolean("puede_crear"),
                            rs.getBoolean("puede_editar"),
                            rs.getBoolean("puede_eliminar"),
                            rs.getBoolean("puede_exportar")
                    );
                })
                .list();
    }
}
