package com.auth.identity.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

@Schema(description = "Identity creation payload")
public record CreateUserRequest(
        @Schema(description = "Readable corporate user code", example = "USR-010")
        @NotBlank(message = "User code is required")
        String userCode,

        @Schema(description = "Unique username for authentication", example = "jdoe")
        @NotBlank(message = "Username is required")
        @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
        String username,

        @Schema(description = "Corporate email address", example = "jdoe@elroble.com")
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        String email,

        @Schema(description = "Initial password")
        @NotBlank(message = "Initial password is required")
        @Size(min = 8, message = "Password must be at least 8 characters")
        String password,

        @Schema(description = "Full legal name", example = "John Doe")
        @NotBlank(message = "Full name is required")
        String fullName,

        @Schema(description = "Enterprise business UUID")
        @NotNull(message = "Business ID is required")
        UUID businessId,

        @Schema(description = "Default assigned branch UUID")
        @NotNull(message = "Assigned branch ID is required")
        UUID assignedBranchId,

        @Schema(description = "List of all branch UUIDs the user is authorized to operate in")
        List<UUID> authorizedBranchIds,

        @Schema(description = "Assigned security role code (ADMIN, SUPERVISOR, ANALYST, AUDITOR)", example = "ANALYST")
        @NotBlank(message = "Role code is required")
        String roleCode,

        @Schema(description = "Client classification profile", example = "Personal Interno")
        String clientType
) {}
