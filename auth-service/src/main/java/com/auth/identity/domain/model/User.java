package com.auth.identity.domain.model;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Domain entity representing an authenticated user identity in the system.
 */
public record User(
        UUID id,
        String userCode,
        String username,
        String email,
        String passwordHash,
        String fullName,
        String avatarInitials,
        UUID businessId,
        String businessCode,
        String businessName,
        UUID assignedBranchId,
        String assignedBranchName,
        List<UUID> authorizedBranchIds,
        String clientType,
        String status,
        boolean twoFactorEnabled,
        int failedLoginAttempts,
        boolean mustChangePassword,
        OffsetDateTime passwordExpiresAt,
        OffsetDateTime lastLoginAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    public boolean isActive() {
        return "ACTIVE".equalsIgnoreCase(status);
    }

    public boolean isLocked() {
        return "LOCKED".equalsIgnoreCase(status);
    }
}
