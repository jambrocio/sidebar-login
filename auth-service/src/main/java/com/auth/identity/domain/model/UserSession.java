package com.auth.identity.domain.model;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Domain entity representing an active client connection/session.
 */
public record UserSession(
        UUID id,
        UUID userId,
        String refreshTokenHash,
        String ipAddress,
        String userAgent,
        String deviceType,
        String browserName,
        String locationName,
        BigDecimal latitude,
        BigDecimal longitude,
        OffsetDateTime lastActivityAt,
        boolean isRevoked,
        boolean revokedByAdmin,
        String revocationReason,
        OffsetDateTime revocationAt,
        OffsetDateTime expiresAt,
        OffsetDateTime createdAt
) {}
