package com.auth.identity.domain.model;

import java.util.UUID;

/**
 * Domain entity representing an effective menu item permission for a user.
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
