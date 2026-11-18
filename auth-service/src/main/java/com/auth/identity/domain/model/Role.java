package com.auth.identity.domain.model;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Domain entity representing an RBAC security role.
 */
public record Role(
        UUID id,
        String code,
        String name,
        String description,
        String scope,
        boolean isSystem,
        boolean active,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
