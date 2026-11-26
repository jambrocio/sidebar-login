package com.auth.identity.domain.model;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Entidad de dominio inmutable que representa un registro forense de auditoría de seguridad.
 *
 * <p>Mapea la tabla {@code auth.auditoria_autenticacion} registrando cada suceso relevante
 * del ciclo de autenticación: inicios de sesión, intentos fallidos, bloqueos, rotación de tokens y cambios de clave.</p>
 *
 * @param id Identificador secuencial autonumérico del evento.
 * @param userId Identificador UUID del usuario asociado al evento (o null si el usuario no existía).
 * @param branchId Identificador UUID de la sede en la que se produjo la acción.
 * @param eventType Código de tipología del evento (ej. "LOGIN_SUCCESS", "LOGIN_FAILED", "ACCOUNT_LOCKED").
 * @param actionDetail Descripción textual concisa de la acción realizada.
 * @param moduleBadge Distintivo del módulo funcional emisor (ej. "Seguridad").
 * @param ipAddress Dirección IP de origen de la solicitud de red.
 * @param metadataJson Carga complementaria estructurada en formato JSON/JSONB.
 * @param createdAt Fecha y hora exacta de registro del evento en UTC.
 *
 * @author Equipo de Arquitectura e Identidad
 * @version 1.0
 */
public record SecurityAuditLog(
        Long id,
        UUID userId,
        UUID branchId,
        String eventType,
        String actionDetail,
        String moduleBadge,
        String ipAddress,
        String metadataJson,
        OffsetDateTime createdAt
) {}
