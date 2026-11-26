# Infraestructura como Código (IaC) — Microsoft Azure (Terraform)

Este directorio contiene la definición declarativa en **Terraform** para desplegar la arquitectura PaaS y Serverless de **BevAdmin / COTIC** en **Microsoft Azure**, tomando como base el diagrama [01_arquitectura_cloud_azure.html](../../cloud/01_arquitectura_cloud_azure.html).

---

## 1. Arquitectura Desplegada

| Capa | Servicio Azure | Propósito |
| :--- | :--- | :--- |
| **Edge & WAF** | **Azure Front Door Premium + WAF** | Terminación TLS 1.3, redirección HTTPS y reglas administradas **OWASP Top 10** (`Microsoft_DefaultRuleSet 2.1` + `BotManager 1.0`). |
| **Red Zero-Trust** | **Azure Virtual Network (`10.0.0.0/16`)** | Subredes aisladas para Container Apps (`10.0.0.0/23`), Private Endpoints (`10.0.2.0/24`) y PostgreSQL (`10.0.3.0/24`). |
| **Cómputo** | **Azure Container Apps (ACA)** | Ejecuta `dev-frontend` (Angular 21 + Nginx Alpine), `dev-backend` (Spring Boot 4 + Java 21) y `dev-auth-service` (IdP). |
| **Base de Datos** | **Azure Database for PostgreSQL 17 Flexible Server** | Acceso 100% privado vía VNet/Private DNS, Multi-AZ (`ZoneRedundant`) en `prod` y backups geo-redundantes (35 días). |
| **Identidad & Secretos** | **Azure Key Vault + Managed Identity** | Arquitectura *passwordless*: `dev-backend` y `dev-auth-service` leen secretos y descargan imágenes de ACR sin credenciales fijas. |
| **Registro & Storage** | **Azure Container Registry (ACR) + Blob Storage** | Almacenamiento privado de imágenes OCI y contenedor privado `comprobantes-pdf`. |
| **Observabilidad** | **Log Analytics + Application Insights** | Telemetría distribuida, logs centralizados y métricas JVM. |

---

## 2. Prerrequisitos

1. **Terraform** `>= 1.6.0` instalado ([descargar](https://developer.hashicorp.com/terraform/install)).
2. **Azure CLI (`az`)** `>= 2.60.0` instalado y autenticado.
3. **Docker** (para compilar y subir las imágenes de `dev-frontend`, `dev-backend` y `dev-auth-service` al ACR).
4. Permisos en la suscripción de Azure: **Contributor** + **User Access Administrator** (necesario para crear asignaciones RBAC sobre ACR y Key Vault).

Verificá tu sesión antes de iniciar:

```bash
az login
az account show
terraform version
```

---

## 3. Configuración Previa

Copiá el archivo de ejemplo y completá tus variables (nunca subas `terraform.tfvars` al repositorio si contiene secretos):

```bash
cd docs/IoC/azure
cp terraform.tfvars.example terraform.tfvars
```

Para mayor seguridad, podés pasar el secreto JWT por variable de entorno en lugar de escribirlo en disco:

```bash
export TF_VAR_jwt_secret="TU_SECRETO_JWT_DE_64_O_MAS_CARACTERES"
```

---

## 4. Despliegue Paso a Paso

### Paso 1: Inicializar y validar Terraform

```bash
terraform init
terraform fmt -check
terraform validate
```

### Paso 2: Previsualizar el plan de infraestructura

```bash
terraform plan -out=tfplan
```

### Paso 3: Aplicar la infraestructura base

> **Importante:** Al ser el primer despliegue, las imágenes en ACR aún no existen; si querés primero levantar ACR/PostgreSQL/Key Vault y luego los Container Apps, podés construir y subir las imágenes inmediatamente después del `apply` o usar `-target=azurerm_container_registry.main` primero.

```bash
# Opción recomendada en primer despliegue: crear primero el ACR
terraform apply -target=azurerm_container_registry.main

# Obtener el servidor de login del ACR
ACR_LOGIN=$(terraform output -raw acr_login_server)
az acr login --name "${ACR_LOGIN%%.*}"

# Compilar y subir las 3 imágenes desde la raíz del repositorio
docker build -t "$ACR_LOGIN/dev-auth-service:latest" ../../../dev-auth-service
docker build -t "$ACR_LOGIN/dev-backend:latest" ../../../dev-backend
docker build -t "$ACR_LOGIN/dev-frontend:latest" ../../../dev-frontend

docker push "$ACR_LOGIN/dev-auth-service:latest"
docker push "$ACR_LOGIN/dev-backend:latest"
docker push "$ACR_LOGIN/dev-frontend:latest"

# Desplegar toda la plataforma
terraform apply
```

### Paso 4: Inicializar el esquema SQL en PostgreSQL 17

Como PostgreSQL Flexible Server no tiene IP pública, ejecutá los scripts de `docs/sql/` desde un contenedor temporal dentro de la VNet o vía Azure Bastion / VPN apuntando al FQDN obtenido con `terraform output -raw postgres_fqdn`.

---

## 5. Verificación Post-Despliegue

```bash
# Obtener la URL pública protegida por Front Door + WAF
terraform output -raw frontdoor_url

# Probar salud del backend a través de Front Door
curl -i "$(terraform output -raw frontdoor_url)/api/v1/auth/health"
```

---

## 6. Consideraciones FinOps y Limpieza

- Para ambientes `dev` o `qa`, definí `environment = "dev"` en `terraform.tfvars`: esto desactiva Multi-AZ y geo-redundancia en PostgreSQL y configura `min_replicas = 0` en Container Apps para escalar a cero fuera de horario laboral.
- Para eliminar todos los recursos creados y evitar cargos:

```bash
terraform destroy
```
