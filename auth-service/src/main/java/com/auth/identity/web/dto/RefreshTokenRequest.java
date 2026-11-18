package com.auth.identity.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "Refresh token renewal request")
public record RefreshTokenRequest(
        @Schema(description = "High-entropy Opaque Refresh Token")
        @NotBlank(message = "Refresh token is required")
        String refreshToken
) {}
