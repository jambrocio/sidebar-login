package com.auth.identity.web.dto;

import com.auth.identity.domain.model.MenuItemPermission;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;
import java.util.UUID;

@Schema(description = "Token issuance and enterprise context response")
public record LoginResponse(
        @Schema(description = "RS256 Asymmetric Signed JWT Access Token")
        String accessToken,

        @Schema(description = "Access token lifespan in seconds", example = "1800")
        long expiresIn,

        @Schema(description = "High-entropy Opaque Refresh Token")
        String refreshToken,

        @Schema(description = "Token type", example = "Bearer")
        String tokenType,

        @Schema(description = "User unique UUID")
        UUID userId,

        @Schema(description = "Corporate user code", example = "USR-001")
        String userCode,

        @Schema(description = "Unique username", example = "agarcia")
        String username,

        @Schema(description = "User email", example = "agarcia@elroble.com")
        String email,

        @Schema(description = "Full name", example = "Ana Garcia")
        String fullName,

        @Schema(description = "Assigned RBAC role", example = "ADMIN")
        String role,

        @Schema(description = "Role scope", example = "Nivel Negocio (Multi-Local)")
        String roleScope,

        @Schema(description = "Enterprise business UUID")
        UUID businessId,

        @Schema(description = "Enterprise business code", example = "BIZ-001")
        String businessCode,

        @Schema(description = "Assigned branch UUID")
        UUID assignedBranchId,

        @Schema(description = "Assigned branch name", example = "Sede Central Matriz")
        String assignedBranchName,

        @Schema(description = "List of all authorized branch UUIDs")
        List<UUID> authorizedBranchIds,

        @Schema(description = "True if password is near expiration (<= 7 days)", example = "false")
        boolean passwordExpiringSoon,

        @Schema(description = "Days remaining before password expires", example = "45")
        long daysUntilPasswordExpiration,

        @Schema(description = "Effective dynamic menu items and permissions")
        List<MenuItemPermission> permissions
) {}
