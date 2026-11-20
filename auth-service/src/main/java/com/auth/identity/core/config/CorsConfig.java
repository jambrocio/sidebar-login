package com.auth.identity.core.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.List;

/**
 * Configuración de Intercambio de Recursos de Origen Cruzado (CORS) para aplicaciones cliente.
 * <p>
 * Habilita la comunicación segura entre el Frontend SPA (Angular 21) y este servicio IdP,
 * definiendo orígenes autorizados, cabeceras expuestas y métodos HTTP permitidos para mitigar
 * riesgos de ataques Cross-Origin no deseados.
 */
@Configuration
public class CorsConfig {

    /** Lista de orígenes autorizados inyectada desde la configuración de ambiente. */
    @Value("${auth.security.cors.allowed-origins:http://localhost:4200,http://127.0.0.1:4200}")
    private List<String> allowedOrigins;

    /**
     * Construye y registra el filtro CORS para interceptar todas las peticiones entrantes.
     *
     * @return bean del filtro de configuración CORS
     */
    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(allowedOrigins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin"));
        config.setExposedHeaders(List.of("Authorization", "Content-Disposition"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}
