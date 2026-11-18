package com.auth.identity.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

@Schema(description = "Remote session termination request (Kill Session)")
public record RevokeSessionRequest(
        @Schema(description = "UUID of the session to terminate")
        @NotNull(message = "Session ID is required")
        UUID sessionId,

        @Schema(description = "Administrative reason for terminating the session", example = "Suspicious location change")
        String reason
) {}
