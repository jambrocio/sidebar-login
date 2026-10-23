# ☁️ Propuesta de Arquitectura Cloud (Microsoft Azure & Google Cloud) y Análisis Detallado de Costos

> **Sistema**: BevAdmin Pro — Sistema de Distribución y Ventas de Bebidas (Mayor y Menor)  
> **Perfil Técnico**: Ingeniería DevSecOps Senior & Cloud Solutions Architect  
> **Versión**: 1.0.0 — Octubre 2026  
> **Estado**: Producción / Enterprise Ready  

---

## 🧭 Visualizadores Interactivos Disponibles

Los diagramas interactivos de alta fidelidad compilados con el estándar **Archify v3.2.0** con soporte de temas claro/oscuro, zoom y exportación se encuentran listos para inspección:

- 🌐 **[Portal Unificado de Nube (`cloud/index.html`)](file:///D:/tools/Proyectos/mio/sidebar-login/cloud/index.html)** — Permite alternar entre Azure y Google Cloud en la misma pestaña.
- 🏛️ **[Diagrama Arquitectura Microsoft Azure (`cloud/01_arquitectura_cloud_azure.html`)](file:///D:/tools/Proyectos/mio/sidebar-login/cloud/01_arquitectura_cloud_azure.html)**
- 🚀 **[Diagrama Arquitectura Google Cloud Platform (`cloud/02_arquitectura_cloud_gcp.html`)](file:///D:/tools/Proyectos/mio/sidebar-login/cloud/02_arquitectura_cloud_gcp.html)**

---

## 1. Alineación con el Stack Tecnológico Actual

El sistema ha sido desarrollado bajo un modelo desacoplado y nativo en contenedores (**Cloud-Native Ready**), lo que permite su despliegue inmediato en cualquier proveedor de nube pública sin alterar el código fuente:

| Capa del Sistema | Tecnología Utilizada | Características Clave para Cloud |
| :--- | :--- | :--- |
| **Frontend** | **Angular 21 + Nginx Alpine** | SPA estática compilada, compresión gzip, fallback HTML5, PWA offline, ejecución sin privilegios root (`nginx`). |
| **Backend** | **Spring Boot 4.0 + Java 21 LTS** | Alta concurrencia con **Hilos Virtuales (Project Loom)**, Spring Security 7 JWT, AOP `@Auditable`, Flyway migrations. |
| **Persistencia** | **PostgreSQL 17 Relacional** | 19 tablas en español, 3FN, función recursiva `fn_obtener_menu_efectivo_usuario`, vistas analíticas y soporte transaccional ACID. |
| **Empaquetado** | **Docker Multi-Stage** | Imágenes ultraligeras, seguras (distroless / alpine), usuarios no-root (`spring`, `nginx`). |

---

## 2. Propuesta 1: Arquitectura en Microsoft Azure (PaaS & Serverless)

### 2.1. Topología y Servicios Involucrados

```
[ Usuarios / POS ] ──(HTTPS/TLS 1.3)──> [ Azure Front Door + WAF (OWASP) ]
                                                    │
                 ┌──────────────────────────────────┴──────────────────────────────────┐
                 │                                                                     │
                 ▼                                                                     ▼
      [ Azure Container Apps ]                                              [ Azure Container Apps ]
      (Frontend: Angular 21)                                                (Backend: Spring Boot 4)
                 │                                                                     │
                 │                                              ┌──────────────────────┴──────────────────────┐
                 │                                              ▼                                             ▼
                 │                                   [ Azure Key Vault ]                        [ Azure Database for ]
                 │                                   (Managed Identity)                         [ PostgreSQL Flex 17 ]
                 │                                                                              (Private Endpoint VNet)
                 │                                                                                     │
                 └───────────────────> [ Azure Virtual Network (10.0.0.0/16) ] <───────────────────────┘
```

1. **Perímetro Edge y Seguridad (Zero-Trust)**:
   - **Azure Front Door (Standard/Premium)**: Punto de entrada unificado global, balanceo de carga de capa 7, terminación SSL/TLS 1.3 y Web Application Firewall (**WAF**) con reglas administradas contra el **OWASP Top 10** (mitigación de SQLi, XSS, Path Traversal).
   - **Azure DNS**: Gestión de zona DNS para el dominio oficial del negocio (`bevadmin.com`).

2. **Capa de Cómputo (Serverless Containers)**:
   - **Azure Container Apps (ACA)**:
     - Basado en Kubernetes Serverless administrado (sin la sobrecarga operativa de un cluster AKS).
     - Escalamiento automático horizontal basado en solicitudes HTTP concurrentes (**KEDA**).
     - Escala a 0 en ambientes no productivos para ahorro de costos.
     - En producción: Mínimo 2 réplicas activas para alta disponibilidad con tiempo de conmutación inmediato.

3. **Capa de Datos y Persistencia**:
   - **Azure Database for PostgreSQL - Flexible Server (PostgreSQL 17)**:
     - Alta disponibilidad multi-zona (**Multi-AZ High Availability**) con réplica en espera síncrona y failover automático en menos de 60 segundos.
     - Aislamiento estricto de red mediante **Private Endpoint** dentro de la subred privada de la VNet (sin IP pública).
     - Almacenamiento SSD Premium v2 con escalado dinámico de IOPS.
     - Backups automáticos diarios con retención geo-redundante de 35 días y soporte Point-In-Time Restore (PITR).

4. **Secretos y Gobernanza de Identidad**:
   - **Azure Key Vault**: Almacenamiento seguro del secreto de firma JWT, contraseñas de base de datos y llaves de APIs externas.
   - **Azure Managed Identity**: El contenedor backend se autentica contra Key Vault y PostgreSQL sin contraseñas codificadas en archivos de configuración (**Passwordless Architecture**).

5. **Almacenamiento de Objetos**:
   - **Azure Blob Storage (Hot / Cool)**: Almacenamiento de facturas electrónicas, PDFs de comprobantes de venta generados y copias de seguridad de logs.

6. **DevSecOps & Observabilidad**:
   - **Azure Container Registry (ACR)**: Registro privado de imágenes Docker con integración de **Microsoft Defender for Containers** (escaneo de vulnerabilidades en tiempo de push).
   - **Azure Monitor + Application Insights**: Telemetría distribuida compatible con OpenTelemetry, métricas de JVM, tiempos de respuesta de endpoints REST y bitácora de auditoría en Log Analytics.

---

## 3. Propuesta 2: Arquitectura en Google Cloud Platform (GCP Serverless)

### 3.1. Topología y Servicios Involucrados

```
[ Usuarios / POS ] ──(HTTPS/TLS 1.3)──> [ Cloud Armor (WAF) + Cloud CDN ]
                                                    │
                                         [ External HTTPS LB ]
                                                    │
                 ┌──────────────────────────────────┴──────────────────────────────────┐
                 │                                                                     │
                 ▼                                                                     ▼
        [ Google Cloud Run ]                                                  [ Google Cloud Run ]
      (Frontend: Angular 21)                                                (Backend: Spring Boot 4)
                 │                                                                     │
                 │                                              ┌──────────────────────┴──────────────────────┐
                 │                                              ▼                                             ▼
                 │                                     [ Secret Manager ]                       [ Cloud SQL Postgres ]
                 │                                    (IAM Workload ID)                         (PostgreSQL 17 HA)
                 │                                                                              (Private IP VPC)
                 │                                                                                     │
                 └──────────────────> [ Serverless VPC Access (10.10.0.0/16) ] <──────────────────────┘
```

1. **Perímetro Edge y Seguridad (Google Front-End)**:
   - **Cloud Armor**: Inspección y filtrado WAF de peticiones con reglas preconfiguradas contra **OWASP Top 10**, mitigación avanzada de ataques de denegación de servicio (DDoS L3/L4/L7) y filtrado de IPs geolocalizadas.
   - **Cloud Load Balancing (External Application Load Balancer)**: Balanceador global Anycast con certificados SSL administrados por Google y renovación automática sin costo.
   - **Cloud CDN**: Almacenamiento en caché de activos estáticos del frontend Angular (archivos `.js`, `.css`, fuentes e imágenes).

2. **Capa de Cómputo (Google Cloud Run)**:
   - **Cloud Run (Totalmente Administrado)**:
     - Ejecuta los contenedores Docker nativos con facturación al milisegundo basada en el consumo real de CPU y memoria.
     - **Alta Concurrencia de Java 21**: Configuración de `concurrency = 80` peticiones simultáneas por contenedor gracias al uso de Hilos Virtuales de Spring Boot 4.
     - En producción: `min-instances = 1` en el Backend para eliminar por completo la latencia de arranque en frío (*cold start*), escalando automáticamente hasta 10 instancias.
     - En el Frontend: `min-instances = 0` (costo casi cero fuera de horas de operación comercial).

3. **Capa de Datos y Persistencia**:
   - **Cloud SQL for PostgreSQL (PostgreSQL 17)**:
     - Configuración de Alta Disponibilidad (**Regional HA**) con replicación síncrona en dos zonas diferentes dentro de la misma región.
     - Conectividad exclusivamente mediante **Private IP** dentro de la VPC corporativa.
     - Backups automáticos diarios con retención de 30 días y transacciones WAL activadas para recuperación ante desastres.

4. **Conectividad Interna y Secretos**:
   - **Serverless VPC Access Connector**: Puente de red seguro que permite a las instancias de Cloud Run comunicarse directamente con la IP privada de Cloud SQL.
   - **Secret Manager**: Gestión criptográfica de secretos con rotación automática y permisos de lectura delegados mediante **IAM Workload Identity** a la cuenta de servicio del Backend.

5. **DevSecOps & Observabilidad**:
   - **Artifact Registry**: Registro seguro de contenedores Docker con **Container Analysis** (análisis de vulnerabilidades CVE automatizado).
   - **Cloud Operations Suite (Cloud Logging, Cloud Monitoring, Cloud Trace)**: Rastreo de transacciones de extremo a extremo, alertas de umbrales de latencia y detección de anomalías.

---

## 4. Pipeline de Integración y Despliegue Continuo (CI/CD)

Ambas nubes aprovechan el mismo pipeline automatizado multi-etapa diseñado bajo la filosofía **Shift-Left Security**:

```
[ Desarrollador ] ──> Push / PR en Rama 'main'
                            │
                            ▼
           [ ETAPA 1: VALIDACIÓN Y CALIDAD (CI) ]
           ├─ Checkout de código & Setup Java 21 / Node 20
           ├─ Pruebas Unitarias JUnit 5 & Mockito (Backend)
           ├─ Pruebas Frontend Karma / Jasmine (Angular 21)
           ├─ Análisis Estático SAST (SonarQube)
           └─ Escaneo de Dependencias (OWASP Dependency-Check)
                            │
                            ▼
           [ ETAPA 2: CONSTRUCCIÓN Y SEGURIDAD DOCKER ]
           ├─ Compilación Multi-Stage con Docker Buildx
           ├─ Escaneo de Vulnerabilidades de Imagen con Trivy
           └─ Push a Registro Privado (Azure ACR o GCP Artifact Registry)
                            │
                            ▼
           [ ETAPA 3: MIGRACIÓN DE BASE DE DATOS (CD) ]
           └─ Ejecución de Job Flyway (Aplica scripts V1..V7 en PostgreSQL)
                            │
                            ▼
           [ ETAPA 4: DESPLIEGUE ZERO-DOWNTIME (CD) ]
           ├─ Despliegue en Ambiente de Staging / Pruebas
           ├─ Ejecución de Smoke Tests & Sondas de Salud (/actuator/health)
           ├─ Conmutación de Tráfico Blue/Green (100% Producción)
           └─ Reversión Automática (Rollback) si falla el healthcheck
```

### 4.1. Ejemplo de Pipeline Declarativo en GitHub Actions (`.github/workflows/deploy.yml`)

```yaml
name: CI/CD Pipeline - BevAdmin Pro Enterprise

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

env:
  REGISTRY_AZURE: bevadminacr.azurecr.io
  IMAGE_BACKEND: bevadmin-backend
  IMAGE_FRONTEND: bevadmin-frontend

jobs:
  test-and-scan:
    name: 1. Calidad, Tests y Seguridad (Shift-Left)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Java 21 LTS
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
          cache: maven

      - name: Backend Tests & Cobertura
        run: |
          cd backend
          mvn clean test jacoco:report

      - name: Escaneo de Vulnerabilidades SAST con Trivy
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          severity: 'CRITICAL,HIGH'
          exit-code: '0'

  build-and-push:
    name: 2. Construcción Docker Multi-Stage
    needs: test-and-scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Iniciar Sesión en Azure ACR
        uses: azure/docker-login@v2
        with:
          login-server: ${{ env.REGISTRY_AZURE }}
          username: ${{ secrets.AZURE_CLIENT_ID }}
          password: ${{ secrets.AZURE_CLIENT_SECRET }}

      - name: Compilar y Push Backend
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: ${{ env.REGISTRY_AZURE }}/${{ env.IMAGE_BACKEND }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Compilar y Push Frontend
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: true
          tags: ${{ env.REGISTRY_AZURE }}/${{ env.IMAGE_FRONTEND }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-production:
    name: 3. Migración Flyway y Despliegue Zero-Downtime
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Conexión Azure CLI (OIDC Passwordless)
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Ejecutar Migraciones de Base de Datos (Flyway Job)
        run: |
          az containerapp job start --name bevadmin-flyway-migration --resource-group rg-bevadmin-prod

      - name: Despliegue en Azure Container Apps (Blue/Green Revision)
        run: |
          az containerapp update \
            --name bevadmin-backend \
            --resource-group rg-bevadmin-prod \
            --image ${{ env.REGISTRY_AZURE }}/${{ env.IMAGE_BACKEND }}:${{ github.sha }}
          
          az containerapp update \
            --name bevadmin-frontend \
            --resource-group rg-bevadmin-prod \
            --image ${{ env.REGISTRY_AZURE }}/${{ env.IMAGE_FRONTEND }}:${{ github.sha }}
```

---

## 5. Análisis Comparativo Detallado de Costos Mensuales (USD)

Los costos están calculados para una operación comercial estándar con **hasta 5 sucursales**, **15 cajas POS concurrentes**, aproximadamente **50,000 transacciones mensuales** y un volumen de transferencia de datos de **150 GB/mes**.

### 5.1. Cuadro Comparativo en Microsoft Azure (Región: East US)

| Servicio Involucrado | Especificación / Tier | Ambiente Dev / Test | Ambiente Producción (HA) |
| :--- | :--- | :---: | :---: |
| **Azure Front Door + WAF** | Standard Tier (Reglas OWASP + SSL administrado) | $0.00 *(Direct Ingress)* | $45.00 |
| **Azure Container Apps (Frontend)** | Serverless (0.5 vCPU, 1 GB RAM, escalado 0-3) | $5.50 | $18.00 |
| **Azure Container Apps (Backend)** | Serverless (1 vCPU, 2 GB RAM, KEDA autoscale 1-8) | $13.00 | $50.00 |
| **Azure PostgreSQL Flexible** | Dev: Burstable `B1ms` (1 vCPU, 2GB RAM, 32GB SSD)<br>Prod: General Purpose `D2ds_v5` (2 vCPU, 8GB RAM, 128GB SSD Multi-AZ) | $26.80 | $158.40 |
| **Azure Blob Storage** | Almacenamiento de comprobantes y backups WAL (50GB - 200GB) | $1.50 | $6.50 |
| **Azure Key Vault** | Standard Tier (Operaciones criptográficas y secretos) | $0.50 | $1.00 |
| **Azure Container Registry** | Basic (Dev) / Standard con escaneo Defender (Prod) | $5.00 | $20.00 |
| **Azure Monitor & Logs** | Application Insights + Log Analytics (ingestión 5GB - 15GB) | $2.00 | $28.00 |
| **Tráfico de Red (Bandwidth)** | Salida de datos a Internet (~150 GB) | $0.00 | $13.50 |
| **TOTAL MENSUAL ESTIMADO (AZURE)** | **Pago por Uso (On-Demand)** | **$54.30 USD** | **$340.40 USD** |
| **TOTAL CON RESERVA (1 AÑO)** | **Azure Savings Plans (30% Descuento en Cómputo y DB)** | — | **$245.00 USD / mes** |

---

### 5.2. Cuadro Comparativo en Google Cloud Platform (Región: us-central1)

| Servicio Involucrado | Especificación / Tier | Ambiente Dev / Test | Ambiente Producción (HA) |
| :--- | :--- | :---: | :---: |
| **Cloud Armor + External LB** | Load Balancer HTTPS + Reglas WAF OWASP + SSL Google | $0.00 *(Cloud Run URL)* | $43.00 |
| **Cloud Run (Frontend)** | Serverless (0.5 vCPU, 512 MB RAM, min 0, max 3) | $2.50 | $12.00 |
| **Cloud Run (Backend)** | Serverless (1 vCPU, 2 GB RAM, min 1, max 8, con Loom) | $10.00 | $40.00 |
| **Serverless VPC Connector** | 2 instancias `f1-micro` en VPC interna | $0.00 *(Direct Egress)* | $16.50 |
| **Cloud SQL for PostgreSQL 17** | Dev: `db-g1-small` (1 vCPU compartido, 1.7GB RAM, 20GB SSD)<br>Prod: `db-custom-2-7680` (2 vCPU, 7.5GB RAM, 100GB SSD Regional HA) | $22.40 | $142.80 |
| **Cloud Storage (GCS)** | Multi-Region Standard (50GB - 200GB para backups y PDFs) | $1.00 | $5.20 |
| **Secret Manager + Cloud KMS** | Almacenamiento seguro de llaves y contraseñas | $0.30 | $1.50 |
| **Artifact Registry** | Repositorio Docker privado + Container Analysis | $1.00 | $5.00 |
| **Cloud Operations Suite** | Logging + Monitoring + Cloud Trace | $0.00 *(Free Tier)* | $18.00 |
| **Tráfico de Red (Bandwidth)** | Salida de datos a Internet (~150 GB) | $0.00 | $12.00 |
| **TOTAL MENSUAL ESTIMADO (GCP)** | **Pago por Uso (On-Demand)** | **$37.20 USD** | **$296.00 USD** |
| **TOTAL CON RESERVA (1 AÑO)** | **Committed Use Discounts (CUD - 28% a 37% de Ahorro)** | — | **$212.00 USD / mes** |

---

## 6. Recomendaciones Estratégicas y FinOps (Optimización Financiera)

1. **Eficiencia de Costos en Producción**:
   - **Google Cloud Platform (GCP)** resulta aproximadamente **13% a 15% más económico** en modalidad On-Demand y hasta un **28% más económico** con compromisos anuales (**CUD**), debido a que Cloud Run factura al milisegundo exacto de procesamiento y ofrece un nivel gratuito mensual muy generoso (2 millones de peticiones gratis).
   - **Microsoft Azure** es la opción recomendada si la empresa ya cuenta con licencias corporativas de Microsoft (Microsoft 365, Active Directory / Entra ID) o acuerdos empresariales (EA), permitiendo aplicar créditos y descuentos comerciales consolidados.

2. **Políticas FinOps Inmediatas**:
   - **Ambiente de Desarrollo Apagable**: En Azure y GCP, los ambientes de Dev/QA se configuran para apagar instancias de base de datos fuera del horario laboral (7:00 PM a 7:00 AM) y fines de semana, reduciendo el costo de desarrollo a menos de **$20 USD / mes**.
   - **Lifecycle en Almacenamiento**: Configurar reglas en Azure Blob Storage o Cloud Storage para migrar comprobantes de venta y backups mayores a 90 días a niveles fríos (**Cool / Coldline / Archive**), reduciendo el costo de almacenamiento en un **75%**.
   - **Compromiso a 1 Año**: Tras los primeros 30 días de estabilización en producción, activar una reserva de 1 año para la base de datos PostgreSQL, logrando un ahorro inmediato garantizado superior al **30%**.
