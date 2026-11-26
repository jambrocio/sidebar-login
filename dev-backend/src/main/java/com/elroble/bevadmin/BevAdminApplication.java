package com.elroble.bevadmin;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Clase principal de arranque para el Backend Corporativo de <b>El Roble — Bebidas &amp; Licores</b>
 * desarrollado sobre <b>Spring Boot 4.0</b> y <b>Java 21 LTS</b> (con Virtual Threads habilitados).
 * <p>
 * Al iniciar la aplicación, quedan disponibles los siguientes servicios:
 * <ul>
 *   <li><b>API REST Base:</b> {@code http://localhost:8080/api/v1}</li>
 *   <li><b>Documentación Web Swagger UI:</b> {@code http://localhost:8080/swagger-ui.html}</li>
 *   <li><b>Portal de Documentación en Español:</b> {@code http://localhost:8080/index.html}</li>
 *   <li><b>Contrato OpenAPI 3.1 JSON:</b> {@code http://localhost:8080/v3/api-docs}</li>
 * </ul>
 */
@SpringBootApplication
public class BevAdminApplication {

    /**
     * Punto de entrada principal de la aplicación Java 21.
     *
     * @param args argumentos de línea de comandos pasados al iniciar el servidor
     */
    public static void main(String[] args) {
        SpringApplication.run(BevAdminApplication.class, args);
    }
}
