package com.elroble.bevadmin.modules.auth.controller;

import com.elroble.bevadmin.modules.auth.dto.ChangePasswordRequest;
import com.elroble.bevadmin.modules.auth.dto.LoginRequest;
import com.elroble.bevadmin.modules.auth.dto.LoginResponse;
import com.elroble.bevadmin.modules.auth.service.AuthService;
import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controlador REST síncrono de Autenticación y Sesión de Usuario ({@code /api/v1/auth}).
 * <p>
 * Actúa exclusivamente como puerta de entrada HTTP, delegando toda la lógica de negocio
 * a {@link AuthService} para mantener una arquitectura limpia y fácil de mantener.
 * <p>
 * <b>Interfaces de Angular 21 que alimenta:</b>
 * <ul>
 *   <li>{@code Login} ({@code /login})</li>
 *   <li>{@code NavbarComponent} (Barra superior con indicador de Negocio y Local Asignado)</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/v1/auth")
@Tag(
        name = "01. Autenticación y Sesión",
        description = "Inicio de sesión corporativo, emisión de token JWT y consulta del contexto de Negocio y Local Asignado del usuario activo."
)
public class AuthController {

    /** Servicio de negocio síncrono de autenticación. */
    private final AuthService authService;

    /**
     * Constructor con inyección de dependencias.
     *
     * @param authService servicio de autenticación
     */
    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * Autentica a un usuario y genera un token JWT con su Negocio Matriz, su Local Principal y sus Locales Autorizados.
     *
     * @param request DTO con el usuario/correo y contraseña
     * @return {@link LoginResponse} con el token JWT y el perfil del usuario
     */
    @PostMapping("/login")
    @Operation(
            summary = "Iniciar sesión y obtener Token JWT",
            description = "Valida las credenciales contra la tabla 'users', registra la IP y User-Agent en 'user_sessions' y 'auth_audit_logs', y devuelve un token JWT firmado."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Autenticación exitosa. Devuelve el accessToken JWT y el contexto del usuario."),
            @ApiResponse(responseCode = "401", description = "Credenciales inválidas o cuenta bloqueada/inactiva.", content = @Content)
    })
    public LoginResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        return authService.authenticate(request, httpRequest);
    }

    /**
     * Renueva la contraseña de un usuario (por expiración o reseteo forzado) y emite un nuevo JWT.
     *
     * @param request datos con usuario, contraseña actual y nueva contraseña
     * @return {@link LoginResponse} con el nuevo token JWT y perfil activo
     */
    @PostMapping("/change-password")
    @Operation(
            summary = "Renovar contraseña por expiración o cambio obligatorio",
            description = "Permite a un usuario con clave vencida actualizar su contraseña a una nueva válida (mínimo 8 caracteres) y retornar una nueva sesión con token JWT activo."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Contraseña actualizada exitosamente. Devuelve el nuevo token JWT y contexto."),
            @ApiResponse(responseCode = "400", description = "Datos de entrada inválidos o longitud insuficiente.", content = @Content),
            @ApiResponse(responseCode = "401", description = "Contraseña actual incorrecta o usuario inexistente.", content = @Content)
    })
    public LoginResponse changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        return authService.changePassword(request);
    }

    @GetMapping("/health")
    @Operation(
            summary = "Sonda de disponibilidad y salud del servicio Backend",
            description = "Endpoint público y ultraliviano para que el frontend monitoree si el servidor está en línea o fuera de servicio."
    )
    @ApiResponse(responseCode = "200", description = "Servidor en línea y listo para recibir peticiones.")
    public java.util.Map<String, Object> checkHealth() {
        return java.util.Map.of(
                "status", "UP",
                "service", "bevadmin-backend",
                "timestamp", java.time.OffsetDateTime.now()
        );
    }

    /**
     * Devuelve la información de sesión del usuario autenticado actualmente a partir de su Token JWT.
     *
     * @param user contexto del usuario extraído automáticamente por Spring Security
     * @return {@link AuthenticatedUserPrincipal} con los datos del usuario, negocio y local asignado
     */
    @GetMapping("/me")
    @Operation(
            summary = "Obtener perfil y Local Asignado del usuario en sesión",
            description = "Retorna los datos del usuario autenticado extraídos del token JWT activo para mostrar el Negocio Matriz y el Local Asignado en la barra superior (NavbarComponent)."
    )
    @ApiResponse(responseCode = "200", description = "Perfil recuperado correctamente.")
    public AuthenticatedUserPrincipal getCurrentSession(@AuthenticationPrincipal AuthenticatedUserPrincipal user) {
        return user;
    }
}
