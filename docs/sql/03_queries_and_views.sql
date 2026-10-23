-- =============================================================================
-- ARCHIVO: 03_queries_and_views.sql
-- DESCRIPCIÓN: Vistas y funciones operativas en ESPAÑOL sincronizadas con la arquitectura:
--              Empresa -> Sedes, Usuarios con Sedes Autorizadas, Menú RBAC
--              e Historial de Ventas Emitidas con detalle de Comprobante.
-- =============================================================================

-- =============================================================================
-- 1. FUNCIÓN: fn_obtener_menu_efectivo_usuario(p_usuario_id UUID)
--    Retorna el catálogo de opciones de menú permitidas para un usuario,
--    aplicando la precedencia: Excepción de Usuario (DENY/ALLOW) > Rol Activo.
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_obtener_menu_efectivo_usuario(p_usuario_id UUID)
RETURNS TABLE (
    opcion_menu_id UUID,
    padre_id UUID,
    codigo VARCHAR,
    etiqueta VARCHAR,
    icono VARCHAR,
    ruta_enlace VARCHAR,
    etiqueta_miga_pan VARCHAR,
    orden INT,
    es_grupo BOOLEAN,
    es_visible BOOLEAN,
    origen_permiso VARCHAR,
    puede_ver BOOLEAN,
    puede_crear BOOLEAN,
    puede_editar BOOLEAN,
    puede_eliminar BOOLEAN,
    puede_exportar BOOLEAN
)
LANGUAGE sql
STABLE
AS $$
    WITH permisos_rol AS (
        SELECT
            prm.opcion_menu_id,
            BOOL_OR(prm.puede_ver)      AS puede_ver,
            BOOL_OR(prm.puede_crear)    AS puede_crear,
            BOOL_OR(prm.puede_editar)   AS puede_editar,
            BOOL_OR(prm.puede_eliminar) AS puede_eliminar,
            BOOL_OR(prm.puede_exportar) AS puede_exportar
        FROM usuario_roles ur
        INNER JOIN roles r ON r.id = ur.rol_id AND r.activo = TRUE
        INNER JOIN permisos_rol_menu prm ON prm.rol_id = r.id
        WHERE ur.usuario_id = p_usuario_id
          AND (ur.fecha_expiracion IS NULL OR ur.fecha_expiracion > NOW())
        GROUP BY prm.opcion_menu_id
    ),
    excepciones_usuario AS (
        SELECT
            pum.opcion_menu_id,
            pum.tipo_permiso,
            pum.puede_ver,
            pum.puede_crear,
            pum.puede_editar,
            pum.puede_eliminar,
            pum.puede_exportar
        FROM permisos_usuario_menu pum
        WHERE pum.usuario_id = p_usuario_id
          AND (pum.fecha_expiracion IS NULL OR pum.fecha_expiracion > NOW())
    )
    SELECT
        m.id AS opcion_menu_id,
        m.padre_id,
        m.codigo,
        m.etiqueta,
        m.icono,
        m.ruta_enlace,
        m.etiqueta_miga_pan,
        m.orden,
        m.es_grupo,
        m.es_visible,
        CASE
            WHEN eu.tipo_permiso IS NOT NULL THEN 'USUARIO_' || eu.tipo_permiso
            ELSE 'HEREDADO_ROL'
        END AS origen_permiso,
        CASE
            WHEN eu.tipo_permiso = 'DENY'  THEN FALSE
            WHEN eu.tipo_permiso = 'ALLOW' THEN eu.puede_ver
            ELSE COALESCE(pr.puede_ver, FALSE)
        END AS puede_ver,
        COALESCE(eu.puede_crear, pr.puede_crear, FALSE) AS puede_crear,
        COALESCE(eu.puede_editar, pr.puede_editar, FALSE) AS puede_editar,
        COALESCE(eu.puede_eliminar, pr.puede_eliminar, FALSE) AS puede_eliminar,
        COALESCE(eu.puede_exportar, pr.puede_exportar, FALSE) AS puede_exportar
    FROM opciones_menu m
    LEFT JOIN permisos_rol AS pr ON pr.opcion_menu_id = m.id
    LEFT JOIN excepciones_usuario AS eu ON eu.opcion_menu_id = m.id
    WHERE m.activo = TRUE
      AND (
          CASE
              WHEN eu.tipo_permiso = 'DENY'  THEN FALSE
              WHEN eu.tipo_permiso = 'ALLOW' THEN eu.puede_ver
              ELSE COALESCE(pr.puede_ver, FALSE)
          END
      ) = TRUE
    ORDER BY m.padre_id NULLS FIRST, m.orden ASC;
$$;

COMMENT ON FUNCTION fn_obtener_menu_efectivo_usuario(UUID) IS 'Función almacenada que resuelve el árbol de opciones de menú permitidas para un usuario aplicando precedencia híbrida: Excepción Individual (permisos_usuario_menu ALLOW/DENY) > Permisos de Rol Activo (permisos_rol_menu).';

-- Función de compatibilidad
CREATE OR REPLACE FUNCTION fn_get_user_effective_menu(p_user_id UUID)
RETURNS TABLE (
    menu_id UUID,
    parent_id UUID,
    code VARCHAR,
    label VARCHAR,
    icon VARCHAR,
    router_link VARCHAR,
    breadcrumb_label VARCHAR,
    sort_order INT,
    is_group BOOLEAN,
    is_visible BOOLEAN,
    permission_source VARCHAR,
    can_view BOOLEAN,
    can_create BOOLEAN,
    can_edit BOOLEAN,
    can_delete BOOLEAN,
    can_export BOOLEAN
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        opcion_menu_id AS menu_id,
        padre_id AS parent_id,
        codigo AS code,
        etiqueta AS label,
        icono AS icon,
        ruta_enlace AS router_link,
        etiqueta_miga_pan AS breadcrumb_label,
        orden AS sort_order,
        es_grupo AS is_group,
        es_visible AS is_visible,
        origen_permiso AS permission_source,
        puede_ver AS can_view,
        puede_crear AS can_create,
        puede_editar AS can_edit,
        puede_eliminar AS can_delete,
        puede_exportar AS can_export
    FROM fn_obtener_menu_efectivo_usuario(p_user_id);
$$;

-- =============================================================================
-- 2. VISTA: vw_arbol_jerarquia_menu
-- =============================================================================
CREATE OR REPLACE VIEW vw_arbol_jerarquia_menu AS
WITH RECURSIVE arbol_menu AS (
    SELECT
        m.id,
        m.padre_id,
        m.codigo,
        m.etiqueta,
        m.icono,
        m.ruta_enlace,
        m.es_grupo,
        m.es_visible,
        m.orden,
        1 AS nivel_profundidad,
        m.etiqueta::TEXT AS ruta_completa
    FROM opciones_menu m
    WHERE m.padre_id IS NULL

    UNION ALL

    SELECT
        hijo.id,
        hijo.padre_id,
        hijo.codigo,
        hijo.etiqueta,
        hijo.icono,
        hijo.ruta_enlace,
        hijo.es_grupo,
        hijo.es_visible,
        hijo.orden,
        padre.nivel_profundidad + 1 AS nivel_profundidad,
        (padre.ruta_completa || ' > ' || hijo.etiqueta)::TEXT AS ruta_completa
    FROM opciones_menu hijo
    INNER JOIN arbol_menu padre ON hijo.padre_id = padre.id
)
SELECT * FROM arbol_menu
ORDER BY ruta_completa;

COMMENT ON VIEW vw_arbol_jerarquia_menu IS 'Vista recursiva (CTE) que aplana y ordena los 4 niveles jerárquicos del menú lateral (opciones_menu) mostrando la ruta visual completa (ruta_completa).';

-- Vista alias compatibilidad
CREATE OR REPLACE VIEW vw_menu_hierarchy_tree AS
SELECT * FROM vw_arbol_jerarquia_menu;

-- =============================================================================
-- 3. VISTA: vw_usuarios_empresas_sedes
-- =============================================================================
CREATE OR REPLACE VIEW vw_usuarios_empresas_sedes AS
SELECT
    u.codigo_usuario AS id,
    u.nombre_completo AS name,
    u.nombre_usuario AS username,
    u.correo_electronico AS email,
    r.nombre AS role,
    r.alcance AS role_scope,
    emp.codigo AS business_id,
    emp.razon_social AS business_name,
    sed_pri.nombre AS assigned_branch,
    COALESCE(
        JSONB_AGG(sed_auth.nombre ORDER BY us.es_principal DESC, sed_auth.codigo ASC)
        FILTER (WHERE sed_auth.id IS NOT NULL),
        '[]'::jsonb
    ) AS assigned_branches,
    u.tipo_cliente AS client_type,
    u.estado AS status
FROM usuarios u
INNER JOIN empresas emp ON emp.id = u.empresa_id
INNER JOIN sedes sed_pri ON sed_pri.id = u.sede_asignada_id
LEFT JOIN usuario_roles ur ON ur.usuario_id = u.id
LEFT JOIN roles r ON r.id = ur.rol_id
LEFT JOIN usuario_sedes us ON us.usuario_id = u.id
LEFT JOIN sedes sed_auth ON sed_auth.id = us.sede_id
GROUP BY
    u.id, u.codigo_usuario, u.nombre_completo, u.nombre_usuario, u.correo_electronico,
    r.nombre, r.alcance, emp.codigo, emp.razon_social, sed_pri.nombre,
    u.tipo_cliente, u.estado;

COMMENT ON VIEW vw_usuarios_empresas_sedes IS 'Vista consolidada de usuarios que expone la Empresa Matriz asignada, la Sede Principal de operación y el arreglo JSONB de Sedes Autorizadas (assigned_branches).';

-- Vista alias compatibilidad
CREATE OR REPLACE VIEW vw_user_business_and_branches AS
SELECT * FROM vw_usuarios_empresas_sedes;

-- =============================================================================
-- 4. VISTA: vw_ventas_con_detalles_comprobante
-- =============================================================================
CREATE OR REPLACE VIEW vw_ventas_con_detalles_comprobante AS
SELECT
    v.codigo_venta AS id,
    v.tipo_comprobante AS document_type,
    v.empresa_id AS business_id,
    emp.razon_social AS business_legal_name,
    emp.identificacion_fiscal AS business_ruc,
    sed.nombre AS branch_name,
    sed.serie_facturacion AS invoice_series,
    v.nombre_cliente AS client_name,
    v.modalidad,
    v.metodo_pago AS payment_method,
    v.resumen_items AS items_summary,
    v.cantidad_total_items AS total_items_count,
    v.subtotal,
    v.codigo_cupon AS coupon_code,
    v.monto_descuento AS discount_amount,
    v.impuesto_igv AS tax_igv,
    v.total,
    u.id AS seller_user_id,
    (u.nombre_completo || ' (' || u.nombre_usuario || ')') AS seller_user,
    v.fecha_emision AS emitted_at,
    COALESCE(
        JSONB_AGG(
            JSONB_BUILD_OBJECT(
                'sku', dv.sku_producto,
                'productName', dv.nombre_producto,
                'modality', dv.modalidad,
                'unitLabel', dv.etiqueta_unidad,
                'quantity', dv.cantidad,
                'unitPrice', dv.precio_unitario,
                'lineSubtotal', dv.subtotal_linea
            )
        ) FILTER (WHERE dv.id IS NOT NULL),
        '[]'::jsonb
    ) AS items
FROM ventas v
INNER JOIN empresas emp ON emp.id = v.empresa_id
INNER JOIN sedes sed ON sed.id = v.sede_id
INNER JOIN usuarios u ON u.id = v.usuario_vendedor_id
LEFT JOIN detalles_venta dv ON dv.venta_id = v.id
GROUP BY
    v.id, v.codigo_venta, v.tipo_comprobante, v.empresa_id, emp.razon_social, emp.identificacion_fiscal,
    sed.nombre, sed.serie_facturacion, v.nombre_cliente, v.modalidad, v.metodo_pago,
    v.resumen_items, v.cantidad_total_items, v.subtotal, v.codigo_cupon,
    v.monto_descuento, v.impuesto_igv, v.total, u.id, u.nombre_completo, u.nombre_usuario, v.fecha_emision
ORDER BY v.fecha_emision DESC;

COMMENT ON VIEW vw_ventas_con_detalles_comprobante IS 'Vista de comprobantes electrónicos de venta (Facturas y Boletas) que empaqueta el detalle multiproducto (detalles_venta) en un arreglo JSONB (items).';

-- Vista alias compatibilidad
CREATE OR REPLACE VIEW vw_sales_with_receipt_items AS
SELECT * FROM vw_ventas_con_detalles_comprobante;
