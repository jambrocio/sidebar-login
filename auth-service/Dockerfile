# ==============================================================================
# Multi-stage Dockerfile for Centralized Identity Service (Spring Boot 3.4 + Java 21)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build & Package with Maven and Eclipse Temurin 21
# ------------------------------------------------------------------------------
FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder

WORKDIR /build

COPY pom.xml .
RUN mvn dependency:go-offline -B || true

COPY src ./src
RUN mvn clean package -DskipTests -B

# ------------------------------------------------------------------------------
# Stage 2: Distroless/Minimal Alpine JRE 21 with unprivileged user
# ------------------------------------------------------------------------------
FROM eclipse-temurin:21-jre-alpine AS runner

LABEL maintainer="Security Architecture Team <security@enterprise.internal>"
LABEL description="Centralized Identity and Access Management (IAM / IdP) Service"

# Configuración de zona horaria America/Lima (Perú)
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/America/Lima /etc/localtime && \
    echo "America/Lima" > /etc/timezone

RUN addgroup -S spring && adduser -S spring -G spring

WORKDIR /app

COPY --from=builder /build/target/auth-service.jar app.jar

RUN chown -R spring:spring /app

USER spring:spring

ENV PORT=8081 \
    SPRING_PROFILES_ACTIVE=prod \
    TZ=America/Lima \
    JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError -Djava.security.egd=file:/dev/./urandom -Duser.timezone=America/Lima"

EXPOSE 8081

HEALTHCHECK --interval=10s --timeout=3s --retries=5 --start-period=15s \
  CMD wget -qO- http://127.0.0.1:8081/api/v1/auth/health || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
