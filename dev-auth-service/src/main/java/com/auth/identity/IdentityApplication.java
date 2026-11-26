package com.auth.identity;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/**
 * Punto de entrada principal del Servicio Centralizado de Gestión de Identidad y Accesos (IAM / IdP).
 * <p>
 * Este microservicio actúa como Proveedor de Identidad (Identity Provider) centralizado para la plataforma,
 * proporcionando autenticación robusta, emisión de tokens criptográficos asimétricos (RS256 / JWKS),
 * control de acceso basado en roles (RBAC), gobernanza del ciclo de vida de sesiones de usuario y
 * auditoría de seguridad inmutable.
 * <p>
 * Diseñado con Spring Boot 3.4 y Java 21 LTS bajo el modelo de Hilos Virtuales (Project Loom) para
 * atender altos volúmenes de concurrencia con latencia ultrabaja.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
public class IdentityApplication {

    /**
     * Método principal de arranque de la aplicación Spring Boot.
     *
     * @param args argumentos de línea de comandos pasados en tiempo de ejecución
     */
    public static void main(String[] args) {
        SpringApplication.run(IdentityApplication.class, args);
    }
}
