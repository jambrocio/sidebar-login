package com.auth.identity.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "RFC 7662 OAuth2 Token Introspection Request")
public record TokenIntrospectRequest(
        @Schema(description = "Access token string to introspect")
        @NotBlank(message = "Token is required")
        String token
) {}
