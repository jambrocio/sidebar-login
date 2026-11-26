package com.elroble.bevadmin.modules.roles.repository;

import com.elroble.bevadmin.modules.roles.dto.CreateRoleRequest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * Repositorio síncrono de acceso a datos para Roles y Matriz de Permisos RBAC
 * ({@code rbac.roles}, {@code rbac.usuario_roles} y {@code rbac.permisos_rol_menu}).
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
                       TO_CHAR(r.fecha_creacion, 'YYYY-MM-DD HH24:MI:SS') AS "createdAt",
                       'Ana García López (agarcia)' AS "registeredBy",
                       COUNT(ur.id) AS "usersCount"
                FROM rbac.roles r
                LEFT JOIN rbac.usuario_roles ur ON ur.rol_id = r.id
                GROUP BY r.id, r.codigo, r.nombre, r.descripcion, r.alcance, r.es_sistema, r.activo, r.fecha_creacion
                ORDER BY r.fecha_creacion ASC
                """)
                .query()
                .listOfRows();
    }

    /**
     * Inserta un nuevo rol personalizado en la tabla {@code rbac.roles}.
     *
     * @param req DTO con los datos del rol a insertar
     */
    public void insertRole(CreateRoleRequest req) {
        jdbcClient.sql("""
                INSERT INTO rbac.roles (codigo, nombre, descripcion, alcance, es_sistema, activo)
                VALUES (:code, :name, :description, :scope, FALSE, TRUE)
                """)
                .param("code", req.code().toUpperCase())
                .param("name", req.name())
                .param("description", req.description())
                .param("scope", req.scope())
                .update();
    }

    /**
     * Consulta la matriz jerárquica de permisos de opciones de menú ({@code rbac.permisos_rol_menu})
     * para un rol específico mediante un CTE recursivo que preserva el orden de árbol y niveles exactos.
     * Si una opción de menú aún no tiene fila en la matriz, devuelve los valores predeterminados sin omitir el ítem.
     *
     * @param roleCode código técnico del rol (ej. {@code ADMIN})
     * @return filas de permisos de menú para el rol indicado ordenadas jerárquicamente
     */
    public List<Map<String, Object>> findRoleMenuMatrixByRoleCode(String roleCode) {
        return jdbcClient.sql("""
                WITH RECURSIVE arbol_menu AS (
                    SELECT
                        m.id,
                        m.padre_id,
                        m.codigo,
                        m.etiqueta,
                        m.ruta_enlace,
                        m.es_visible,
                        m.orden,
                        1 AS nivel,
                        ARRAY[m.orden] AS ruta_orden
                    FROM rbac.opciones_menu m
                    WHERE m.padre_id IS NULL

                    UNION ALL

                    SELECT
                        hijo.id,
                        hijo.padre_id,
                        hijo.codigo,
                        hijo.etiqueta,
                        hijo.ruta_enlace,
                        hijo.es_visible,
                        hijo.orden,
                        padre.nivel + 1 AS nivel,
                        padre.ruta_orden || hijo.orden AS ruta_orden
                    FROM rbac.opciones_menu hijo
                    INNER JOIN arbol_menu padre ON hijo.padre_id = padre.id
                )
                SELECT :roleCode AS "roleCode",
                       t.codigo AS code,
                       t.etiqueta AS label,
                       t.etiqueta AS module,
                       COALESCE(t.ruta_enlace, '— (Módulo / Grupo)') AS "routerLink",
                       t.nivel AS level,
                       COALESCE(rmp.visible_en_menu, t.es_visible) AS "visibleInSidebar",
                       COALESCE(rmp.puede_ver, FALSE) AS "canView",
                       COALESCE(rmp.puede_crear, FALSE) AS "canCreate",
                       COALESCE(rmp.puede_editar, FALSE) AS "canEdit",
                       COALESCE(rmp.puede_eliminar, FALSE) AS "canDelete",
                       COALESCE(rmp.puede_exportar, FALSE) AS "canExport"
                FROM arbol_menu t
                LEFT JOIN rbac.permisos_rol_menu rmp ON rmp.opcion_menu_id = t.id
                     AND rmp.rol_id = (SELECT id FROM rbac.roles WHERE codigo = :roleCode LIMIT 1)
                ORDER BY t.ruta_orden ASC
                """)
                .param("roleCode", roleCode.toUpperCase())
                .query()
                .listOfRows();
    }

    /**
     * Actualiza o inserta en lote la matriz de permisos de opciones de menú para un rol en {@code rbac.permisos_rol_menu}.
     *
     * @param roleCode    código del rol a modificar
     * @param permissions lista de filas con sus permisos actualizados
     */
    public void updateRolePermissions(String roleCode, List<Map<String, Object>> permissions) {
        var roleIdOpt = jdbcClient.sql("SELECT id::text FROM rbac.roles WHERE codigo = :roleCode LIMIT 1")
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
                    INSERT INTO rbac.permisos_rol_menu (
                        rol_id, opcion_menu_id, visible_en_menu, puede_ver, puede_crear, puede_editar, puede_eliminar, puede_exportar, fecha_actualizacion
                    )
                    SELECT :roleId::uuid, m.id, :visible, :view, :create, :edit, :delete, :export, NOW()
                    FROM rbac.opciones_menu m WHERE m.codigo = :code
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
