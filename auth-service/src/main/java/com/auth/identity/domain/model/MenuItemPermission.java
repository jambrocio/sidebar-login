package com.auth.identity.domain.model;

import java.util.UUID;

/**
 * Entidad de dominio inmutable que representa un elemento del menú dinámico con los permisos efectivos de un usuario.
 *
 * <p>Representa la estructura calculada mediante la función de base de datos {@code rbac.fn_obtener_menu_efectivo_usuario},
 * permitiendo al frontend renderizar navegación adaptativa y validar permisos CRUD a nivel de interfaz.</p>
 *
 * @param menuItemId Identificador UUID de la opción o grupo de menú.
 * @param parentId Identificador UUID del elemento contenedor padre (null para elementos raíz).
 * @param code Código semántico único de la opción (ej. "CAT_PRODUCTS", "MGMT_USERS").
 * @param label Etiqueta visible en la interfaz para el usuario.
 * @param icon Nombre de la clase de ícono asociada (ej. "bi-box-seam", "bi-people").
 * @param routerLink Ruta de navegación SPA asociada en el frontend Angular.
 * @param breadcrumbLabel Etiqueta descriptiva para el historial de migas de pan.
 * @param sortOrder Índice numérico para el ordenamiento de opciones dentro del mismo nivel.
 * @param isGroup Indica si el elemento es una categoría agrupadora sin ruta directa.
 * @param isVisible Indica si la opción debe visualizarse en el sidebar lateral.
 * @param permissionSource Origen del permiso aplicado ("ROL", "PERSONALIZADO", "SISTEMA").
 * @param canView Autorización efectiva de solo lectura y visualización.
 * @param canCreate Autorización efectiva para crear y registrar nuevos registros.
 * @param canEdit Autorización efectiva para modificar datos existentes.
 * @param canDelete Autorización efectiva para dar de baja o eliminar registros.
 * @param canExport Autorización efectiva para exportar datos en formatos externos (PDF, Excel, CSV).
 *
 * @author Equipo de Arquitectura e Identidad
 * @version 1.0
 */
public record MenuItemPermission(
        UUID menuItemId,
        UUID parentId,
        String code,
        String label,
        String icon,
        String routerLink,
        String breadcrumbLabel,
        int sortOrder,
        boolean isGroup,
        boolean isVisible,
        String permissionSource,
        boolean canView,
        boolean canCreate,
        boolean canEdit,
        boolean canDelete,
        boolean canExport
) {}
