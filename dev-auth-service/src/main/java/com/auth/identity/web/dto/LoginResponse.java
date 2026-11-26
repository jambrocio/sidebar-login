package com.auth.identity.web.dto;

import com.auth.identity.domain.model.MenuItemPermission;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;
import java.util.UUID;

/**
 * Carga útil de respuesta tras un inicio de sesión o rotación de tokens exitosa.
 *
 * <p>Contiene el par de tokens criptográficos (Access Token RS256 y Refresh Token opaco),
 * el perfil y alcance corporativo del usuario autenticado, advertencias de caducidad
 * y la jerarquía de opciones del menú dinámico con sus permisos efectivos.</p>
 *
 * @param accessToken Token de acceso firmado con algoritmo asimétrico RS256.
 * @param expiresIn Tiempo de vida útil del token de acceso en segundos.
 * @param refreshToken Token de refresco opaco de alta entropía.
 * @param tokenType Esquema del token de autorización (típicamente "Bearer").
 * @param userId Identificador UUID único del usuario autenticado.
 * @param userCode Código identificador corporativo (ej. USR-001).
 * @param username Nombre de usuario.
 * @param email Correo electrónico corporativo.
 * @param fullName Nombre completo del colaborador.
 * @param role Código del rol de seguridad asignado (ej. "ADMIN", "SUPERVISOR", "ANALYST").
 * @param roleScope Alcance operativo del rol asignado.
 * @param businessId Identificador UUID de la empresa perteneciente.
 * @param businessCode Código corporativo del negocio.
 * @param assignedBranchId Identificador UUID de la sede principal asignada.
 * @param assignedBranchName Nombre descriptivo de la sede principal.
 * @param authorizedBranchIds Lista de UUIDs de todas las sedes autorizadas para operar.
 * @param passwordExpiringSoon Indicador de si la contraseña vence en 7 días o menos.
 * @param daysUntilPasswordExpiration Días restantes antes de que expire la contraseña actual.
 * @param permissions Lista de opciones y permisos efectivos de menú asignados.
 *
 * @author Equipo de Arquitectura e Identidad
 * @version 1.0
 */
@Schema(description = "Respuesta de emisión de tokens y contexto corporativo del usuario")
public record LoginResponse(
        @Schema(description = "Token de acceso firmado con algoritmo asimétrico RS256")
        String accessToken,

        @Schema(description = "Tiempo de validez del token de acceso en segundos", example = "1800")
        long expiresIn,

        @Schema(description = "Token de refresco opaco de alta entropía")
        String refreshToken,

        @Schema(description = "Tipo de esquema de token", example = "Bearer")
        String tokenType,

        @Schema(description = "Identificador UUID del usuario")
        UUID userId,

        @Schema(description = "Código corporativo del usuario", example = "USR-001")
        String userCode,

        @Schema(description = "Nombre de usuario", example = "agarcia")
        String username,

        @Schema(description = "Correo electrónico corporativo", example = "agarcia@elroble.com")
        String email,

        @Schema(description = "Nombre completo del usuario", example = "Ana García")
        String fullName,

        @Schema(description = "Código del rol RBAC asignado", example = "ADMIN")
        String role,

        @Schema(description = "Nivel de alcance operativo del rol", example = "Nivel Negocio (Multi-Local)")
        String roleScope,

        @Schema(description = "Identificador UUID de la empresa")
        UUID businessId,

        @Schema(description = "Código corporativo de la empresa", example = "BIZ-001")
        String businessCode,

        @Schema(description = "Identificador UUID de la sede principal asignada")
        UUID assignedBranchId,

        @Schema(description = "Nombre descriptivo de la sede asignada", example = "Sede Central Matriz")
        String assignedBranchName,

        @Schema(description = "Lista de identificadores UUID de todas las sedes autorizadas")
        List<UUID> authorizedBranchIds,

        @Schema(description = "Indica si la contraseña está próxima a vencer (<= 7 días)", example = "false")
        boolean passwordExpiringSoon,

        @Schema(description = "Días restantes antes de la expiración de la contraseña", example = "45")
        long daysUntilPasswordExpiration,

        @Schema(description = "Jerarquía de opciones de menú y permisos efectivos")
        List<MenuItemPermission> permissions
) {}
