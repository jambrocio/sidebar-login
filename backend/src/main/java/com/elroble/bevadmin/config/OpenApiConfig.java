package com.elroble.bevadmin.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.ExternalDocumentation;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * Configuración OpenAPI 3.0 / Swagger UI para la documentación de los microservicios
 * y controladores REST del backend (Distribuidora El Roble).
 * <p>
 * Proporciona el esquema de autenticación Bearer JWT para pruebas interactivas en
 * {@code http://localhost:8080/swagger-ui/index.html}.
 */
@Configuration
public class OpenApiConfig {

    private static final String BEARER_AUTH_SCHEME = "BearerAuth";

    /**
     * Define la metadata institucional, servidores de prueba y el esquema de seguridad JWT.
     *
     * @return bean {@link OpenAPI} con la configuración completa
     */
    @Bean
    public OpenAPI bevAdminOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("El Roble — API REST de Compra y Venta de Bebidas (Mayor y Menor)")
                        .version("v1.0.0 (Spring Boot 4.0 + Java 21)")
                        .description("""
                                **Documentación Web Interactiva del Backend Corporativo (El Roble — Bebidas & Licores).**
                                
                                ### Reglas de Negocio y Seguridad Implementadas:
                                1. **Jerarquía Multi-Empresa y Multi-Sede (`1 Empresa Matriz -> N Sedes`)**:
                                   Cada usuario pertenece a una Empresa Matriz (`empresas`), tiene una **Sede Principal Asignada** (`sede_asignada_id`) y una lista de **Sedes Autorizadas** (`usuario_sedes`).
                                2. **Aislamiento Operativo a la Sede Asignada**:
                                   Las operaciones de **Ventas (`/api/v1/sales`)**, **Compras (`/api/v1/purchases`)** y **Arqueo de Caja (`/api/v1/cash-register/audits`)** se registran automáticamente en la Sede Asignada del token JWT del operador activo.
                                3. **Privacidad en Historial de Ventas Emitidas (`/api/v1/sales/my-history`)**:
                                   Filtra estrictamente por `usuario_vendedor_id = usuarioAutenticado` sobre la vista `vw_ventas_con_detalles_comprobante`.
                                4. **Autorización Híbrida RBAC + Excepciones (`fn_obtener_menu_efectivo_usuario`)**:
                                   Valida permisos granulares (`VIEW`, `CREATE`, `EDIT`, `DELETE`, `EXPORT`) por módulo del menú lateral.
                                5. **Auditoría Automática (`@Auditable` -> `auditoria_autenticacion`)**:
                                   Toda transacción registra automáticamente el usuario autor, la sede, el módulo y la fecha/hora.
                                """)
                        .contact(new Contact()
                                .name("Arquitectura & Soporte TI — Grupo El Roble")
                                .email("soporte@elroble-bebidas.com"))
                        .license(new License()
                                .name("Uso Corporativo Interno — El Roble S.A.C.")))
                .externalDocs(new ExternalDocumentation()
                        .description("Diccionario de las 19 Tablas SQL y Guía de Integración Angular 21")
                        .url("http://localhost:8080/index.html"))
                .servers(List.of(
                        new Server()
                                .url("http://localhost:8080")
                                .description("Servidor Local de Desarrollo (Spring Boot 4 + Java 21)")
                ))
                .addSecurityItem(new SecurityRequirement().addList(BEARER_AUTH_SCHEME))
                .components(new Components()
                        .addSecuritySchemes(BEARER_AUTH_SCHEME, new SecurityScheme()
                                .name(BEARER_AUTH_SCHEME)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Ingrese el token JWT obtenido del endpoint de inicio de sesión (`/api/v1/auth/login`).")));
    }
}
