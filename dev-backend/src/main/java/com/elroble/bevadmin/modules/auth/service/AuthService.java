package com.elroble.bevadmin.modules.auth.service;

import com.elroble.bevadmin.modules.auth.dto.ChangePasswordRequest;
import com.elroble.bevadmin.modules.auth.dto.LoginRequest;
import com.elroble.bevadmin.modules.auth.dto.LoginResponse;
import jakarta.servlet.http.HttpServletRequest;

/**
 * Contrato de servicio síncrono para la lógica de negocio de Autenticación y Sesión.
 */
public interface AuthService {

    /**
     * Valida las credenciales del usuario y emite un token JWT firmado con su contexto multi-local.
     *
     * @param request credenciales de acceso ({@code username} y {@code password})
     * @return {@link LoginResponse} con el token JWT y el perfil organizacional del usuario
     */
    LoginResponse authenticate(LoginRequest request);

    /**
     * Valida credenciales capturando además la información de red (IP, User-Agent) para auditoría.
     *
     * @param request credenciales de acceso
     * @param httpRequest petición HTTP para registrar IP y navegador
     * @return {@link LoginResponse} con la nueva sesión autenticada
     */
    LoginResponse authenticate(LoginRequest request, HttpServletRequest httpRequest);

    /**
     * Procesa la renovación o cambio de contraseña de un usuario (por expiración o voluntario)
     * y genera una nueva sesión con token JWT activo.
     *
     * @param request datos con usuario, contraseña actual y nueva contraseña
     * @return {@link LoginResponse} con la nueva sesión autenticada
     */
    LoginResponse changePassword(ChangePasswordRequest request);
}
