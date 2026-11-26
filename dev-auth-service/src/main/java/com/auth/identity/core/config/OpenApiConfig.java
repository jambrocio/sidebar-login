package com.auth.identity.core.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * Configuración de documentación interactiva OpenAPI 3.1 y Swagger UI.
 * <p>
 * Define la especificación formal del contrato REST del Proveedor de Identidad (IdP),
 * detallando el esquema de seguridad {@code BearerAuth} (tokens JWT asimétricos RS256),
 * información de contacto del equipo de arquitectura y versiones de API.
 */
@Configuration
public class OpenApiConfig {

    /**
     * Construye el modelo de especificación OpenAPI para la documentación interactiva Swagger.
     *
     * @return instancia de {@link OpenAPI} con información institucional y esquemas de autenticación
     */
    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("API del Servicio Centralizado de Identidad y Accesos (IAM / IdP)")
                        .description("Servicio REST de Proveedor de Identidad (IdP / IAM) para inicio de sesión unificado (SSO), emisión de tokens asimétricos RS256, descubrimiento de claves JWKS y control de sesiones.")
                        .version("1.0.0")
                        .contact(new Contact().name("Equipo de Arquitectura de Seguridad").email("seguridad@enterprise.internal")))
                .servers(List.of(
                        new Server().url("/").description("Instancia del Servidor Activo")
                ))
                .components(new Components()
                        .addSecuritySchemes("BearerAuth", new SecurityScheme()
                                .name("BearerAuth")
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Token de Acceso JWT Asimétrico firmado con algoritmo RS256")))
                .addSecurityItem(new SecurityRequirement().addList("BearerAuth"));
    }
}
