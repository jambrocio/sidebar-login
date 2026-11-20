package com.auth.identity.domain.model;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Entidad de dominio inmutable que representa la identidad de un usuario corporativo en el sistema.
 *
 * <p>Mapea la tabla {@code auth.usuarios} y encapsula el estado de seguridad, credenciales,
 * conteo de intentos fallidos, políticas de expiración y alcance empresarial de la cuenta.</p>
 *
 * @param id Identificador UUID único del usuario.
 * @param userCode Código identificador corporativo (ej. USR-001).
 * @param username Nombre de usuario para autenticación.
 * @param email Correo electrónico corporativo registrado.
 * @param passwordHash Resumen criptográfico de la contraseña en algoritmo BCrypt.
 * @param fullName Nombre completo del colaborador.
 * @param avatarInitials Iniciales generadas para el avatar visual en la interfaz.
 * @param businessId Identificador UUID de la empresa a la que pertenece.
 * @param businessCode Código corporativo del negocio (ej. BIZ-001).
 * @param businessName Razón social o nombre comercial de la empresa.
 * @param assignedBranchId Identificador UUID de la sucursal o sede principal asignada.
 * @param assignedBranchName Nombre descriptivo de la sede principal asignada.
 * @param authorizedBranchIds Lista de UUIDs de todas las sedes autorizadas para operar.
 * @param clientType Clasificación o perfil operativo (ej. "Personal Interno").
 * @param status Estado de la cuenta ("ACTIVE", "LOCKED", "INACTIVE").
 * @param twoFactorEnabled Indicador de activación de autenticación de dos factores (2FA).
 * @param failedLoginAttempts Conteo acumulado de intentos fallidos consecutivos de acceso.
 * @param mustChangePassword Bandera que obliga a renovar contraseña en el siguiente inicio de sesión.
 * @param passwordExpiresAt Fecha y hora límite de vigencia de la contraseña actual.
 * @param lastLoginAt Fecha y hora del último inicio de sesión exitoso.
 * @param createdAt Fecha y hora de creación del registro.
 * @param updatedAt Fecha y hora de la última modificación del registro.
 *
 * @author Equipo de Arquitectura e Identidad
 * @version 1.0
 */
public record User(
        UUID id,
        String userCode,
        String username,
        String email,
        String passwordHash,
        String fullName,
        String avatarInitials,
        UUID businessId,
        String businessCode,
        String businessName,
        UUID assignedBranchId,
        String assignedBranchName,
        List<UUID> authorizedBranchIds,
        String clientType,
        String status,
        boolean twoFactorEnabled,
        int failedLoginAttempts,
        boolean mustChangePassword,
        OffsetDateTime passwordExpiresAt,
        OffsetDateTime lastLoginAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    /**
     * Determina si la cuenta de usuario se encuentra en estado plenamente activo.
     *
     * @return true si el estado es exactamente "ACTIVE" ignorando mayúsculas/minúsculas.
     */
    public boolean isActive() {
        return "ACTIVE".equalsIgnoreCase(status);
    }

    /**
     * Determina si la cuenta ha sido bloqueada por políticas de seguridad o superación de intentos fallidos.
     *
     * @return true si el estado es "LOCKED".
     */
    public boolean isLocked() {
        return "LOCKED".equalsIgnoreCase(status);
    }
}
