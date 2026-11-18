package com.auth.identity.web.controller;

import com.auth.identity.domain.model.User;
import com.auth.identity.service.UserService;
import com.auth.identity.web.dto.CreateUserRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Endpoints for centralized user directory governance and status control.
 */
@RestController
@RequestMapping("/api/v1/users")
@Tag(name = "User Directory & Governance", description = "Centralized identity provisioning, status locking, and directory queries")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'AUDITOR', 'SUPERVISOR')")
    @Operation(summary = "List all consolidated users", description = "Returns users with their corporate enterprise, default branch, and authorized branches.")
    public ResponseEntity<List<Map<String, Object>>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsersConsolidated());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'AUDITOR') or #userIdStr == #id.toString()")
    @Operation(summary = "Get user details by UUID")
    public ResponseEntity<User> getUserById(
            @PathVariable UUID id,
            @AuthenticationPrincipal String userIdStr
    ) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Provision a new user", description = "Registers a new user identity, assigns an RBAC role, and links enterprise branches.")
    public ResponseEntity<User> createUser(
            @Valid @RequestBody CreateUserRequest request,
            @AuthenticationPrincipal String adminUserIdStr
    ) {
        UUID adminId = adminUserIdStr != null ? UUID.fromString(adminUserIdStr) : null;
        User created = userService.createUser(request, adminId);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}/lock")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Lock user account", description = "Enforces account lockout, preventing login.")
    public ResponseEntity<Map<String, String>> lockUser(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "Locked by administrator") String reason
    ) {
        userService.lockUserAccount(id, reason);
        return ResponseEntity.ok(Map.of("message", "User " + id + " has been locked."));
    }

    @PutMapping("/{id}/unlock")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Unlock user account", description = "Restores user status to ACTIVE and clears failed attempts.")
    public ResponseEntity<Map<String, String>> unlockUser(@PathVariable UUID id) {
        userService.unlockUserAccount(id);
        return ResponseEntity.ok(Map.of("message", "User " + id + " has been unlocked."));
    }
}
