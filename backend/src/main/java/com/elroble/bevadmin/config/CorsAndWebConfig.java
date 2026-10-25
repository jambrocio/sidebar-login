package com.elroble.bevadmin.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.ArrayList;
import java.util.List;

/**
 * Configuración global de CORS para permitir peticiones seguras desde el
 * Frontend en Angular 21 PWA tanto en HTTP directo (localhost:4200) como en HTTPS
 * a través de proxies inversos como Traefik (https://localhost, https://app.bevadmin.com).
 */
@Configuration
public class CorsAndWebConfig {

    @Value("${bevadmin.security.cors.allowed-origin-patterns:http://localhost*,https://localhost*,http://127.0.0.1*,https://127.0.0.1*,http://*.bevadmin.com*,https://*.bevadmin.com*}")
    private List<String> allowedOriginPatterns;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        
        // Soporta comodines y puertos dinámicos de forma compatible con allowCredentials(true)
        List<String> patterns = new ArrayList<>(allowedOriginPatterns);
        if (!patterns.contains("http://localhost*")) patterns.add("http://localhost*");
        if (!patterns.contains("https://localhost*")) patterns.add("https://localhost*");
        if (!patterns.contains("http://127.0.0.1*")) patterns.add("http://127.0.0.1*");
        if (!patterns.contains("https://127.0.0.1*")) patterns.add("https://127.0.0.1*");

        config.setAllowedOriginPatterns(patterns);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("Authorization", "Link", "X-Total-Count"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
