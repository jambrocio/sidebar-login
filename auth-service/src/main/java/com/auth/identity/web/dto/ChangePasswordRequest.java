package com.auth.identity.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Password renewal payload")
public record ChangePasswordRequest(
        @Schema(description = "Current active password")
        @NotBlank(message = "Current password is required")
        String currentPassword,

        @Schema(description = "New password conforming to security policy")
        @NotBlank(message = "New password is required")
        @Size(min = 8, message = "New password must contain at least 8 characters")
        String newPassword
) {}
