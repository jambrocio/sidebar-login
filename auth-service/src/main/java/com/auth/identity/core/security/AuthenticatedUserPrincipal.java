package com.auth.identity.core.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

/**
 * Representación inmutable de la identidad del usuario autenticado en el contexto de Spring Security ({@link UserDetails}).
 *
 * <p>Encapsula tanto los datos de control de acceso (roles y autoridades) como el contexto multitenant
 * corporativo (empresa, sede primaria y sedes autorizadas para la sucursal).</p>
 *
 * @param id Identificador UUID único del usuario.
 * @param userCode Código corporativo legible (ej. USR-001).
 * @param username Nombre de usuario de acceso.
 * @param email Correo electrónico corporativo.
 * @param fullName Nombre completo del usuario.
 * @param businessId Identificador UUID de la empresa a la que pertenece.
 * @param businessCode Código corporativo del negocio.
 * @param assignedBranchId Identificador UUID de la sede principal asignada.
 * @param assignedBranchName Nombre descriptivo de la sede principal.
 * @param authorizedBranchIds Lista de UUIDs de todas las sedes autorizadas para operar.
 * @param roleCode Código del rol asignado (ADMIN, SUPERVISOR, ANALYST, AUDITOR).
 * @param roleScope Alcance operativo del rol en el sistema.
 * @param active Estado de habilitación de la cuenta de usuario.
 *
 * @author Equipo de Arquitectura e Identidad
 * @version 1.0
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

    /**
     * Retorna las autoridades concedidas en base al rol corporativo asignado con prefijo "ROLE_".
     *
     * @return Colección inmutable de autoridades {@link GrantedAuthority}.
     */
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        if (roleCode == null || roleCode.isBlank()) {
            return Collections.emptyList();
        }
        return List.of(new SimpleGrantedAuthority("ROLE_" + roleCode.toUpperCase()));
    }

    /**
     * Retorna una cadena vacía para resguardar el secreto de contraseña en el principal autenticado.
     *
     * @return Cadena vacía por seguridad.
     */
    @Override
    public String getPassword() {
        return "";
    }

    /**
     * Retorna el identificador de acceso (nombre de usuario).
     *
     * @return Nombre de usuario.
     */
    @Override
    public String getUsername() {
        return username;
    }

    /**
     * Indica si la cuenta no ha expirado. Siempre activo en este modelo.
     *
     * @return true.
     */
    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    /**
     * Indica si la cuenta no está bloqueada por políticas de seguridad o intentos fallidos.
     *
     * @return true si la cuenta está activa; false si se encuentra bloqueada.
     */
    @Override
    public boolean isAccountNonLocked() {
        return active;
    }

    /**
     * Indica si las credenciales no han caducado.
     *
     * @return true.
     */
    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    /**
     * Indica si la cuenta está habilitada en el sistema.
     *
     * @return true si está activa.
     */
    @Override
    public boolean isEnabled() {
        return active;
    }
}
