package com.auth.identity.domain.model;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Domain entity representing an immutable security audit entry.
 */
public record SecurityAuditLog(
        Long id,
        UUID userId,
        UUID branchId,
        String eventType,
        String actionDetail,
        String moduleBadge,
        String ipAddress,
        String metadataJson,
        OffsetDateTime createdAt
) {}
