package com.elroble.bevadmin.security;

import com.elroble.bevadmin.modules.sessions.service.SessionService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Configuración central de seguridad en <b>Spring Security 7 (Spring Boot 4)</b>.
 * <p>
 * Responsabilidades principales:
 * <ul>
 *   <li>Establecer política de sesiones {@code STATELESS} basada en tokens JWT.</li>
 *   <li>Habilitar el acceso público a la documentación web interactiva (Swagger UI y OpenAPI 3.1)
 *       así como a los endpoints de inicio de sesión {@code /api/v1/auth/login}, renovación de clave
 *       {@code /api/v1/auth/change-password} y verificación de salud {@code /actuator/health}.</li>
 *   <li>Proteger todos los demás endpoints bajo {@code /api/v1/**} exigiendo un token JWT válido.</li>
 *   <li>Habilitar la seguridad declarativa a nivel de método con {@code @PreAuthorize}.</li>
 * </ul>
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    /** Servicio de validación y decodificación de tokens JWT. */
    private final JwtTokenService jwtTokenService;

    /** Servicio de auditoría y verificación de revocación remota de sesiones. */
    private final SessionService sessionService;

    /**
     * Constructor con inyección de dependencias.
     *
     * @param jwtTokenService servicio encargado de verificar la firma y vigencia del JWT
     * @param sessionService  servicio de verificación de estado y revocación de sesiones
     */
    public SecurityConfig(JwtTokenService jwtTokenService, SessionService sessionService) {
        this.jwtTokenService = jwtTokenService;
        this.sessionService = sessionService;
    }

    /**
     * Define el codificador de contraseñas institucional usando el algoritmo BCrypt con factor de costo 12.
     *
     * @return instancia de {@link PasswordEncoder} para cifrar y verificar {@code users.password_hash}
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    /**
     * Configura la cadena de filtros HTTP de Spring Security 7.
     *
     * @param http constructor de seguridad HTTP
     * @return cadena de filtros {@link SecurityFilterChain} compilada
     * @throws Exception si ocurre un error al configurar las políticas HTTP
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // Habilita CORS utilizando la configuración definida en CorsAndWebConfig
                .cors(Customizer.withDefaults())
                // Deshabilita CSRF dado que la API opera con tokens Bearer JWT sin cookies de sesión
                .csrf(csrf -> csrf.disable())
                // No se mantiene estado de sesión en memoria del servidor (100% Stateless)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // Reglas de autorización de rutas HTTP
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(
                                "/",
                                "/error",
                                "/api/v1/auth/login",
                                "/api/v1/auth/refresh",
                                "/api/v1/auth/change-password",
                                "/api/v1/auth/heartbeat",
                                "/api/v1/auth/health",
                                "/actuator/health",
                                "/actuator/info",
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html"
                        ).permitAll()
                        .anyRequest().authenticated()
                )
                // Registra el filtro interceptor JWT antes del filtro estándar de usuario/contraseña
                .addFilterBefore(jwtAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * Filtro HTTP que se ejecuta una sola vez por cada petición entrante para extraer el encabezado
     * {@code Authorization: Bearer <token>}, validar su firma criptográfica y poblar el
     * {@link SecurityContextHolder} con el {@link AuthenticatedUserPrincipal}.
     *
     * @return filtro {@link OncePerRequestFilter} configurado
     */
    @Bean
    public OncePerRequestFilter jwtAuthenticationFilter() {
        return new OncePerRequestFilter() {
            @Override
            protected void doFilterInternal(
                    HttpServletRequest request,
                    HttpServletResponse response,
                    FilterChain filterChain) throws ServletException, IOException {

                String authHeader = request.getHeader("Authorization");
                if (authHeader != null && authHeader.startsWith("Bearer ")) {
                    String token = authHeader.substring(7);

                    // Si la sesión fue revocada remotamente por un Administrador, corta la petición de inmediato
                    if (sessionService.isTokenRevoked(token)) {
                        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                        response.setContentType("application/json");
                        response.setCharacterEncoding("UTF-8");
                        response.getWriter().write("""
                            {
                                "code": "SESSION_REVOKED_BY_ADMIN",
                                "message": "Su sesión ha sido revocada remotamente por un Administrador de Seguridad.",
                                "revoked": true
                            }
                        """);
                        return;
                    }

                    // Si el token es válido y no ha expirado, inyecta el contexto organizacional del usuario
                    jwtTokenService.parseAndValidateToken(token).ifPresent(principal -> {
                        var authorities = principal.roles().stream()
                                .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                                .toList();
                        var authentication = new UsernamePasswordAuthenticationToken(
                                principal,
                                null,
                                authorities
                        );
                        SecurityContextHolder.getContext().setAuthentication(authentication);
                    });
                }
                filterChain.doFilter(request, response);
            }
        };
    }
}
