package com.auth.identity.core.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

/**
 * Spring Security UserDetails representation of an authenticated principal.
 */
public record AuthenticatedUserPrincipal(
        UUID id,
        String userCode,
        String username,
        String email,
        String fullName,
        UUID businessId,
        String businessCode,
        UUID assignedBranchId,
        String assignedBranchName,
        List<UUID> authorizedBranchIds,
        String roleCode,
        String roleScope,
        boolean active
) implements UserDetails {

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        if (roleCode == null || roleCode.isBlank()) {
            return Collections.emptyList();
        }
        return List.of(new SimpleGrantedAuthority("ROLE_" + roleCode.toUpperCase()));
    }

    @Override
    public String getPassword() {
        return "";
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return active;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }
}
