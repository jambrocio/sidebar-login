package com.auth.identity.core.security;

import com.nimbusds.jwt.JWTClaimsSet;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

/**
 * Filtro de autenticación por solicitud que intercepta los encabezados HTTP {@code Authorization: Bearer <token>}.
 *
 * <p>Valida la firma asimétrica RS256 contra la clave pública del servicio y, en caso de éxito,
 * puebla el {@link SecurityContextHolder} de Spring Security con los roles y el identificador del usuario.</p>
 *
 * @author Equipo de Arquitectura e Identidad
 * @version 1.0
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenService jwtTokenService;

    /**
     * Constructor con inyección del servicio de validación de tokens JWT.
     *
     * @param jwtTokenService Servicio criptográfico de validación de tokens.
     */
    public JwtAuthenticationFilter(JwtTokenService jwtTokenService) {
        this.jwtTokenService = jwtTokenService;
    }

    /**
     * Procesa cada petición HTTP extrayendo y validando el token Bearer en el encabezado de autorización.
     *
     * @param request     Solicitud HTTP entrante.
     * @param response    Respuesta HTTP saliente.
     * @param filterChain Cadena de filtros de Spring Security.
     * @throws ServletException En caso de anomalía en el ciclo de filtros.
     * @throws IOException      En caso de error de lectura/escritura de E/S.
     */
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            Optional<JWTClaimsSet> claimsOpt = jwtTokenService.verifyToken(token);

            if (claimsOpt.isPresent() && SecurityContextHolder.getContext().getAuthentication() == null) {
                JWTClaimsSet claims = claimsOpt.get();
                String userIdStr = claims.getSubject();
                String role = (String) claims.getClaim("role");

                List<SimpleGrantedAuthority> authorities = role != null && !role.isBlank()
                        ? List.of(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()))
                        : Collections.emptyList();

                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        userIdStr,
                        null,
                        authorities
                );
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }

        filterChain.doFilter(request, response);
    }
}
