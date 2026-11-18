package com.auth.identity.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "RFC 7662 OAuth2 Token Introspection Response")
public record TokenIntrospectResponse(
        @Schema(description = "Boolean indicator of whether or not the presented token is currently active", example = "true")
        boolean active,

        @Schema(description = "Subject identifier (user UUID)")
        String sub,

        @Schema(description = "Corporate user code")
        String userCode,

        @Schema(description = "Username")
        String username,

        @Schema(description = "Email")
        String email,

        @Schema(description = "Assigned RBAC role")
        String role,

        @Schema(description = "Assigned role scope")
        String roleScope,

        @Schema(description = "Business UUID")
        String businessId,

        @Schema(description = "Assigned branch UUID")
        String assignedBranchId,

        @Schema(description = "Authorized branch UUIDs")
        List<String> authorizedBranches,

        @Schema(description = "Token expiration timestamp (epoch seconds)")
        Long exp,

        @Schema(description = "Token issuance timestamp (epoch seconds)")
        Long iat,

        @Schema(description = "Token issuer URI")
        String iss
) {
    public static TokenIntrospectResponse inactive() {
        return new TokenIntrospectResponse(
                false, null, null, null, null, null, null, null, null, null, null, null, null
        );
    }
}
