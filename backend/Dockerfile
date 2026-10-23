# ==============================================================================
# Dockerfile Multi-Etapa para BevAdmin Backend (Spring Boot 4 + Java 21)
# ==============================================================================

# ------------------------------------------------------------------------------
# Etapa 1: Compilación y empaquetado del artefacto con Maven y OpenJDK 21
# ------------------------------------------------------------------------------
FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder

WORKDIR /build

# Copiar configuración de dependencias para aprovechar la caché de Docker
COPY pom.xml .
RUN mvn dependency:go-offline -B || true

# Copiar el código fuente y empaquetar el JAR ejecutable
COPY src ./src
RUN mvn clean package -DskipTests -B

# ------------------------------------------------------------------------------
# Etapa 2: Imagen de ejecución mínima con JRE 21 Alpine y usuario sin privilegios
# ------------------------------------------------------------------------------
FROM eclipse-temurin:21-jre-alpine AS runner

# Metadatos del contenedor
LABEL maintainer="Equipo BevAdmin <dev@elroble.com>"
LABEL description="Contenedor de backend Spring Boot 4 para BevAdmin Pro"

# Seguridad: Crear usuario y grupo de sistema sin privilegios
RUN addgroup -S spring && adduser -S spring -G spring

# Directorio de trabajo corporativo
WORKDIR /app

# Copiar el artefacto generado desde la etapa de compilación
COPY --from=builder /build/target/bevadmin-backend.jar app.jar

# Asignar propiedad exclusiva al usuario de ejecución
RUN chown -R spring:spring /app

# Cambiar al usuario no privilegiado
USER spring:spring

# Parámetros JVM optimizados para contenedores y variables de entorno por defecto
ENV PORT=8080 \
    SPRING_PROFILES_ACTIVE=prod \
    JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError -Djava.security.egd=file:/dev/./urandom"

# Exponer el puerto de servicio HTTP de la API REST
EXPOSE 8080

# Sondeo de salud mediante Spring Boot Actuator
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD wget -qO- http://localhost:8080/actuator/health || exit 1

# Comando de arranque del servicio
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
