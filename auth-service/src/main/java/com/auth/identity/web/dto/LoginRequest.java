package com.auth.identity.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Payload to authenticate against the Centralized Identity Service")
public record LoginRequest(
        @Schema(description = "Unique username or registered corporate email", example = "agarcia")
        @NotBlank(message = "Username or email is required")
        @Size(min = 3, max = 150, message = "Identifier must be between 3 and 150 characters")
        String username,

        @Schema(description = "Plain text password", example = "Password123!")
        @NotBlank(message = "Password is required")
        String password
) {}
