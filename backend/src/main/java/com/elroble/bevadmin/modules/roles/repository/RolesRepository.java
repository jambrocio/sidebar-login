package com.elroble.bevadmin.modules.roles.repository;

import com.elroble.bevadmin.modules.roles.dto.CreateRoleRequest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * Repositorio síncrono de acceso a datos para Roles y Matriz de Permisos RBAC
 * ({@code roles}, {@code usuario_roles} y {@code permisos_rol_menu}).
 */
@Repository
public class RolesRepository {

    /** Cliente JDBC síncrono de Spring. */
    private final JdbcClient jdbcClient;

    /**
     * Constructor con inyección de dependencias.
     *
     * @param jdbcClient cliente JDBC conectado a PostgreSQL
     */
    public RolesRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    /**
     * Consulta todos los roles registrados junto con la cantidad de usuarios asignados.
     *
     * @return lista de roles del sistema
     */
    public List<Map<String, Object>> findAllRolesWithUsersCount() {
        return jdbcClient.sql("""
                SELECT r.codigo AS code, r.nombre AS name, r.descripcion AS description, r.alcance AS scope, r.es_sistema AS "isSystem",
                       CASE WHEN r.activo THEN 'Activo' ELSE 'Inactivo' END AS status,
                       COUNT(ur.id) AS "usersCount"
                FROM roles r
                LEFT JOIN usuario_roles ur ON ur.rol_id = r.id
                GROUP BY r.id, r.codigo, r.nombre, r.descripcion, r.alcance, r.es_sistema, r.activo
                ORDER BY r.fecha_creacion ASC
                """)
                .query()
                .listOfRows();
    }

    /**
     * Inserta un nuevo rol personalizado en la tabla {@code roles}.
     *
     * @param req DTO con los datos del rol a insertar
     */
    public void insertRole(CreateRoleRequest req) {
        jdbcClient.sql("""
                INSERT INTO roles (codigo, nombre, descripcion, alcance, es_sistema, activo)
                VALUES (:code, :name, :description, :scope, FALSE, TRUE)
                """)
                .param("code", req.code().toUpperCase())
                .param("name", req.name())
                .param("description", req.description())
                .param("scope", req.scope())
                .update();
    }

    /**
     * Consulta la matriz de permisos de opciones de menú ({@code permisos_rol_menu}) para un rol específico.
     * Si una opción de menú aún no tiene fila en la matriz, devuelve los valores predeterminados sin omitir el ítem.
     *
     * @param roleCode código técnico del rol (ej. {@code ADMIN})
     * @return filas de permisos de menú para el rol indicado
     */
    public List<Map<String, Object>> findRoleMenuMatrixByRoleCode(String roleCode) {
        return jdbcClient.sql("""
                SELECT :roleCode AS "roleCode",
                       m.codigo AS code,
                       m.etiqueta AS label,
                       m.etiqueta AS module,
                       COALESCE(m.ruta_enlace, '— (Módulo / Grupo)') AS "routerLink",
                       CASE WHEN m.padre_id IS NULL THEN 1 ELSE 2 END AS level,
                       COALESCE(rmp.visible_en_menu, m.es_visible) AS "visibleInSidebar",
                       COALESCE(rmp.puede_ver, FALSE) AS "canView",
                       COALESCE(rmp.puede_crear, FALSE) AS "canCreate",
                       COALESCE(rmp.puede_editar, FALSE) AS "canEdit",
                       COALESCE(rmp.puede_eliminar, FALSE) AS "canDelete",
                       COALESCE(rmp.puede_exportar, FALSE) AS "canExport"
                FROM opciones_menu m
                LEFT JOIN permisos_rol_menu rmp ON rmp.opcion_menu_id = m.id
                     AND rmp.rol_id = (SELECT id FROM roles WHERE codigo = :roleCode LIMIT 1)
                ORDER BY m.padre_id NULLS FIRST, m.orden ASC
                """)
                .param("roleCode", roleCode.toUpperCase())
                .query()
                .listOfRows();
    }

    /**
     * Actualiza o inserta en lote la matriz de permisos de opciones de menú para un rol.
     *
     * @param roleCode    código del rol a modificar
     * @param permissions lista de filas con sus permisos actualizados
     */
    public void updateRolePermissions(String roleCode, List<Map<String, Object>> permissions) {
        var roleIdOpt = jdbcClient.sql("SELECT id::text FROM roles WHERE codigo = :roleCode LIMIT 1")
                .param("roleCode", roleCode.toUpperCase())
                .query(String.class)
                .optional();

        if (roleIdOpt.isEmpty()) {
            return;
        }

        String roleId = roleIdOpt.get();

        for (Map<String, Object> perm : permissions) {
            String menuCode = (String) perm.get("code");
            if (menuCode == null || menuCode.isBlank()) continue;

            boolean visibleInSidebar = Boolean.TRUE.equals(perm.get("visibleInSidebar"));
            boolean canView = Boolean.TRUE.equals(perm.get("canView"));
            boolean canCreate = Boolean.TRUE.equals(perm.get("canCreate"));
            boolean canEdit = Boolean.TRUE.equals(perm.get("canEdit"));
            boolean canDelete = Boolean.TRUE.equals(perm.get("canDelete"));
            boolean canExport = Boolean.TRUE.equals(perm.get("canExport"));

            jdbcClient.sql("""
                    INSERT INTO permisos_rol_menu (
                        rol_id, opcion_menu_id, visible_en_menu, puede_ver, puede_crear, puede_editar, puede_eliminar, puede_exportar, fecha_actualizacion
                    )
                    SELECT :roleId::uuid, m.id, :visible, :view, :create, :edit, :delete, :export, NOW()
                    FROM opciones_menu m WHERE m.codigo = :code
                    ON CONFLICT (rol_id, opcion_menu_id) DO UPDATE SET
                        visible_en_menu = EXCLUDED.visible_en_menu,
                        puede_ver = EXCLUDED.puede_ver,
                        puede_crear = EXCLUDED.puede_crear,
                        puede_editar = EXCLUDED.puede_editar,
                        puede_eliminar = EXCLUDED.puede_eliminar,
                        puede_exportar = EXCLUDED.puede_exportar,
                        fecha_actualizacion = NOW()
                    """)
                    .param("roleId", roleId)
                    .param("code", menuCode)
                    .param("visible", visibleInSidebar)
                    .param("view", canView)
                    .param("create", canCreate)
                    .param("edit", canEdit)
                    .param("delete", canDelete)
                    .param("export", canExport)
                    .update();
        }
    }
}
