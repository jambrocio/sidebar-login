package com.auth.identity.service;

import com.auth.identity.web.dto.ChangePasswordRequest;
import com.auth.identity.web.dto.LoginRequest;
import com.auth.identity.web.dto.LoginResponse;
import com.auth.identity.web.dto.TokenIntrospectResponse;
import jakarta.servlet.http.HttpServletRequest;

import java.util.UUID;

/**
 * Interfaz de servicio para el flujo centralizado de autenticación, rotación de tokens y gobierno de contraseñas.
 *
 * <p>Define las operaciones esenciales para validar credenciales corporativas, controlar bloqueos
 * por fuerza bruta, caducidad de contraseñas (política de 90 días), emisión de pares de tokens (RS256 y refresco),
 * introspección RFC 7662 y registro inmutable de auditoría.</p>
 *
 * @author Equipo de Arquitectura e Identidad
 * @version 1.0
 */
public interface AuthService {

    /**
     * Autentica las credenciales de un usuario corporativo, evalúa políticas de bloqueo y expiración,
     * y genera un par de tokens criptográficos (Access Token RS256 y Refresh Token opaco).
     *
     * @param request Datos de la solicitud con usuario/correo y contraseña.
     * @param httpRequest Solicitud HTTP entrante para extracción de dirección IP y User-Agent.
     * @return {@link LoginResponse} con tokens emitidos, contexto corporativo y permisos de menú.
     */
    LoginResponse login(LoginRequest request, HttpServletRequest httpRequest);

    /**
     * Valida la vigencia de un token de refresco, revoca la sesión previa e implementa rotación de tokens
     * emitiendo un nuevo par de tokens criptográficos.
     *
     * @param refreshToken Token de refresco opaco enviado por el cliente.
     * @param httpRequest Solicitud HTTP entrante para trazabilidad de red.
     * @return {@link LoginResponse} con los nuevos tokens generados y contexto de sesión actualizado.
     */
    LoginResponse refreshToken(String refreshToken, HttpServletRequest httpRequest);

    /**
     * Introspecciona un token de acceso según el estándar RFC 7662 para que servicios consumidores
     * y gateways puedan consultar su validez, rol y reclamos.
     *
     * @param token Cadena compacta del token JWT a evaluar.
     * @return {@link TokenIntrospectResponse} con el estado activo y los metadatos decodificados.
     */
    TokenIntrospectResponse introspectToken(String token);

    /**
     * Modifica la contraseña de un usuario validando su clave actual, actualiza la fecha de vencimiento a 90 días
     * y revoca de forma inmediata todas las sesiones activas concurrentes.
     *
     * @param userId Identificador UUID del usuario autenticado.
     * @param request Carga útil con la contraseña actual y la nueva contraseña.
     * @param ipAddress Dirección IP de origen de la solicitud para auditoría.
     */
    void changePassword(UUID userId, ChangePasswordRequest request, String ipAddress);

    /**
     * Cierra la sesión activa del usuario invalidando el token de refresco en la base de datos
     * y registrando el evento correspondiente en la bitácora de auditoría.
     *
     * @param refreshToken Token de refresco a invalidar.
     * @param ipAddress Dirección IP del cliente para la traza forense.
     */
    void logout(String refreshToken, String ipAddress);
}
