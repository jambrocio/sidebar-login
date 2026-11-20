package com.auth.identity.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/**
 * Carga útil de respuesta para la introspección de tokens OAuth2 según RFC 7662.
 *
 * <p>Indica si el token está activo y, en caso afirmativo, expone sus reclamos estándar
 * y reclamos empresariales (rol, alcance, empresa y sucursales autorizadas).</p>
 *
 * @param active Indica si el token presentado es válido, íntegro y vigente en tiempo.
 * @param sub Identificador de sujeto (UUID del usuario).
 * @param userCode Código corporativo del usuario (ej. USR-001).
 * @param username Nombre de usuario.
 * @param email Correo electrónico.
 * @param role Rol RBAC asignado.
 * @param roleScope Alcance operativo del rol.
 * @param businessId Identificador UUID de la empresa.
 * @param assignedBranchId Identificador UUID de la sucursal asignada.
 * @param authorizedBranches Lista de UUIDs de sucursales autorizadas en texto.
 * @param exp Marca temporal de expiración en segundos Unix (epoch).
 * @param iat Marca temporal de emisión en segundos Unix (epoch).
 * @param iss Emisor del token (URI del Identity Provider).
 *
 * @author Equipo de Arquitectura e Identidad
 * @version 1.0
 */
@Schema(description = "Respuesta de introspección de token OAuth2 RFC 7662")
public record TokenIntrospectResponse(
        @Schema(description = "Indica si el token presentado es válido y está vigente", example = "true")
        boolean active,

        @Schema(description = "Identificador del sujeto (UUID del usuario)")
        String sub,

        @Schema(description = "Código corporativo del usuario", example = "USR-001")
        String userCode,

        @Schema(description = "Nombre de usuario", example = "agarcia")
        String username,

        @Schema(description = "Correo electrónico del usuario", example = "agarcia@elroble.com")
        String email,

        @Schema(description = "Código del rol RBAC asignado", example = "ADMIN")
        String role,

        @Schema(description = "Alcance operativo del rol", example = "Nivel Negocio (Multi-Local)")
        String roleScope,

        @Schema(description = "Identificador UUID de la empresa")
        String businessId,

        @Schema(description = "Identificador UUID de la sede asignada")
        String assignedBranchId,

        @Schema(description = "Lista de identificadores de sedes autorizadas")
        List<String> authorizedBranches,

        @Schema(description = "Marca de tiempo de expiración en segundos Unix (epoch)")
        Long exp,

        @Schema(description = "Marca de tiempo de emisión en segundos Unix (epoch)")
        Long iat,

        @Schema(description = "URI del emisor del token")
        String iss
) {
    /**
     * Construye una respuesta inerte indicando token inactivo o inválido.
     *
     * @return {@link TokenIntrospectResponse} con bandera active en false y campos nulos.
     */
    public static TokenIntrospectResponse inactive() {
        return new TokenIntrospectResponse(
                false, null, null, null, null, null, null, null, null, null, null, null, null
        );
    }
}
