package com.auth.identity.web.controller;

import com.auth.identity.domain.model.User;
import com.auth.identity.service.UserService;
import com.auth.identity.web.dto.CreateUserRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
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
 * Controlador REST para la administración y gobierno del directorio centralizado de usuarios.
 *
 * <p>Proporciona puntos de enlace para aprovisionar usuarios, consultar detalles de perfil,
 * listar usuarios consolidados y ejecutar bloqueos/desbloqueos de cuentas.</p>
 *
 * @author Equipo de Arquitectura e Identidad
 * @version 1.0
 */
@RestController
@RequestMapping("/api/v1/users")
@Tag(name = "Directorio y Gobierno de Usuarios", description = "Aprovisionamiento de identidades, bloqueo/desbloqueo de cuentas y consultas de directorio")
public class UserController {

    private final UserService userService;

    /**
     * Constructor con inyección del servicio de usuarios.
     *
     * @param userService Servicio de gestión de usuarios.
     */
    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * Obtiene el listado consolidado de todos los usuarios corporativos en el sistema.
     *
     * @return Lista de usuarios con datos de negocio y sedes autorizadas.
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'AUDITOR', 'SUPERVISOR')")
    @Operation(
            summary = "Listar todos los usuarios consolidados",
            description = "Retorna el directorio completo de usuarios con su empresa asignada, sede principal y sedes autorizadas."
    )
    @ApiResponse(responseCode = "200", description = "Directorio de usuarios obtenido exitosamente")
    public ResponseEntity<List<Map<String, Object>>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsersConsolidated());
    }

    /**
     * Obtiene el detalle completo de un usuario por su identificador UUID.
     *
     * @param id Identificador UUID del usuario.
     * @param userIdStr Identificador del usuario autenticado en la sesión.
     * @return Datos del usuario solicitado.
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'AUDITOR') or #userIdStr == #id.toString()")
    @Operation(
            summary = "Obtener detalle de usuario por UUID",
            description = "Consulta la entidad de usuario por su identificador único asegurando control de acceso por rol o propiedad de cuenta."
    )
    @ApiResponse(responseCode = "200", description = "Usuario localizado exitosamente")
    @ApiResponse(responseCode = "404", description = "Usuario no encontrado")
    public ResponseEntity<User> getUserById(
            @PathVariable UUID id,
            @AuthenticationPrincipal String userIdStr
    ) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    /**
     * Aprovisiona un nuevo usuario en el sistema asociando rol y sedes.
     *
     * @param request Datos del nuevo usuario a registrar.
     * @param adminUserIdStr Identificador del administrador autenticado.
     * @return Entidad de usuario creada con código HTTP 201 Created.
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
            summary = "Aprovisionar nuevo usuario",
            description = "Registra una nueva identidad corporativa, asigna el rol RBAC y vincula las sucursales autorizadas."
    )
    @ApiResponse(responseCode = "201", description = "Usuario registrado exitosamente")
    @ApiResponse(responseCode = "422", description = "Nombre de usuario o correo ya registrado")
    public ResponseEntity<User> createUser(
            @Valid @RequestBody CreateUserRequest request,
            @AuthenticationPrincipal String adminUserIdStr
    ) {
        UUID adminId = adminUserIdStr != null ? UUID.fromString(adminUserIdStr) : null;
        User created = userService.createUser(request, adminId);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Bloquea administrativamente una cuenta de usuario impidiendo futuros accesos.
     *
     * @param id Identificador UUID del usuario a bloquear.
     * @param reason Motivo justificado del bloqueo.
     * @return Mensaje confirmatorio de bloqueo.
     */
    @PutMapping("/{id}/lock")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
            summary = "Bloquear cuenta de usuario",
            description = "Establece el estado de la cuenta en LOCKED impidiendo inicios de sesión."
    )
    @ApiResponse(responseCode = "200", description = "Cuenta bloqueada exitosamente")
    public ResponseEntity<Map<String, String>> lockUser(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "Bloqueado por el administrador") String reason
    ) {
        userService.lockUserAccount(id, reason);
        return ResponseEntity.ok(Map.of("message", "El usuario " + id + " ha sido bloqueado exitosamente."));
    }

    /**
     * Desbloquea administrativamente una cuenta de usuario restaurando su operatividad.
     *
     * @param id Identificador UUID del usuario a desbloquear.
     * @return Mensaje confirmatorio de desbloqueo.
     */
    @PutMapping("/{id}/unlock")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
            summary = "Desbloquear cuenta de usuario",
            description = "Restaura el estado a ACTIVE y reinicia los intentos fallidos acumulados."
    )
    @ApiResponse(responseCode = "200", description = "Cuenta desbloqueada exitosamente")
    public ResponseEntity<Map<String, String>> unlockUser(@PathVariable UUID id) {
        userService.unlockUserAccount(id);
        return ResponseEntity.ok(Map.of("message", "El usuario " + id + " ha sido desbloqueado exitosamente."));
    }
}
