package com.elroble.bevadmin.security;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

/**
 * Evaluador de permisos de menú que invoca directamente la función almacenada
 * fn_obtener_menu_efectivo_usuario(p_usuario_id UUID) definida en sql/03_queries_and_views.sql,
 * aplicando la regla híbrida: Excepción Individual (ALLOW/DENY) > Rol Activo.
 */
@Component("menuPermissionEvaluator")
public class MenuPermissionEvaluator {

    private final JdbcClient jdbcClient;

    public MenuPermissionEvaluator(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public boolean hasAccess(Authentication authentication, String menuCode, String action) {
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedUserPrincipal user)) {
            return false;
        }

        String column = switch (action.toUpperCase()) {
            case "CREATE" -> "puede_crear";
            case "EDIT" -> "puede_editar";
            case "DELETE" -> "puede_eliminar";
            case "EXPORT" -> "puede_exportar";
            default -> "puede_ver";
        };

        String sql = "SELECT COALESCE(BOOL_OR(" + column + "), FALSE) " +
                     "FROM fn_obtener_menu_efectivo_usuario(:userId) " +
                     "WHERE codigo = :menuCode";

        Boolean allowed = jdbcClient.sql(sql)
                .param("userId", user.userId())
                .param("menuCode", menuCode)
                .query(Boolean.class)
                .single();

        return Boolean.TRUE.equals(allowed);
    }
}
