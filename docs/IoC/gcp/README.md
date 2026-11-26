# Infraestructura como Código (IaC) — Google Cloud Platform (Terraform)

Este directorio contiene la definición declarativa en **Terraform** para desplegar la arquitectura Serverless de **BevAdmin / COTIC** en **Google Cloud Platform (GCP)**, tomando como base el diagrama [02_arquitectura_cloud_gcp.html](../../cloud/02_arquitectura_cloud_gcp.html).

---

## 1. Arquitectura Desplegada

| Capa | Servicio GCP | Propósito |
| :--- | :--- | :--- |
| **Edge & WAF** | **Cloud Armor + External HTTPS LB + Cloud CDN** | Reglas WAF contra **OWASP Top 10** (`sqli`, `xss`, `lfi`, `rce`), rate limiting anti-DDoS, SSL administrado por Google y caché CDN para Angular. |
| **Cómputo** | **Google Cloud Run v2** | Ejecuta `dev-frontend` (`min=0`), `dev-backend` (`concurrency=80`, `min=1` en `prod` para Java 21 Virtual Threads) y `dev-auth-service` (`:8081`). |
| **Red Privada** | **VPC (`10.10.0.0/16`) + Serverless VPC Access** | Conecta Cloud Run con la IP privada de Cloud SQL sin exponer la base de datos a Internet. |
| **Base de Datos** | **Cloud SQL for PostgreSQL 17** | Alta disponibilidad `REGIONAL` en `prod`, SSL obligatorio (`ENCRYPTED_ONLY`), IP privada exclusiva y backups con PITR (30 días). |
| **Identidad & Secretos** | **IAM Service Account + Secret Manager** | Acceso sin contraseñas codificadas (*Workload Identity*) a `db-password` y `jwt-secret`. |
| **Registro** | **Artifact Registry (Docker)** | Almacenamiento privado de imágenes OCI con escaneo de vulnerabilidades. |

---

## 2. Prerrequisitos

1. **Terraform** `>= 1.6.0` instalado ([descargar](https://developer.hashicorp.com/terraform/install)).
2. **Google Cloud SDK (`gcloud`)** instalado y autenticado.
3. **Docker** (para compilar y subir las imágenes de `dev-frontend`, `dev-backend` y `dev-auth-service` a Artifact Registry).
4. Proyecto en GCP con facturación habilitada y permisos de **Owner** o **Editor + Security Admin + Service Networking Admin**.

Verificá tu sesión antes de iniciar:

```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project TU_PROJECT_ID
terraform version
```

---

## 3. Configuración Previa

Copiá el archivo de ejemplo y completá `project_id` y `domain_name` (recordá no subir `terraform.tfvars` al repositorio):

```bash
cd docs/IoC/gcp
cp terraform.tfvars.example terraform.tfvars
```

Para no guardar el secreto JWT en disco, podés exportarlo como variable de entorno:

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

### Paso 2: Crear Artifact Registry y subir las imágenes Docker

```bash
# Habilitar APIs y crear primero Artifact Registry
terraform apply -target=google_artifact_registry_repository.docker

# Configurar autenticación de Docker hacia Artifact Registry
REGION=$(grep '^region' terraform.tfvars | cut -d'"' -f2)
gcloud auth configure-docker "${REGION:-us-central1}-docker.pkg.dev"

AR_URL=$(terraform output -raw artifact_registry_url)

# Compilar y subir las 3 imágenes desde docs/IoC/gcp
docker build -t "$AR_URL/dev-auth-service:latest" ../../../dev-auth-service
docker build -t "$AR_URL/dev-backend:latest" ../../../dev-backend
docker build -t "$AR_URL/dev-frontend:latest" ../../../dev-frontend

docker push "$AR_URL/dev-auth-service:latest"
docker push "$AR_URL/dev-backend:latest"
docker push "$AR_URL/dev-frontend:latest"
```

### Paso 3: Desplegar toda la infraestructura

```bash
terraform plan -out=tfplan
terraform apply tfplan
```

### Paso 4: Configurar DNS para el Certificado SSL Administrado

Obtené la IP pública Anycast del Load Balancer y creá un registro DNS tipo `A` apuntando tu `domain_name` hacia esa IP (necesario para que Google Cloud emita y active el certificado TLS):

```bash
terraform output -raw load_balancer_ip
```

### Paso 5: Inicializar el esquema SQL en Cloud SQL

Como Cloud SQL tiene **solo IP privada**, ejecutá los scripts de `docs/sql/` mediante **Cloud SQL Auth Proxy** o desde una VM bastion en la misma VPC apuntando a `terraform output -raw cloud_sql_private_ip`.

---

## 5. Consideraciones FinOps y Limpieza

- Para ambientes `dev` o `qa`, definí `environment = "dev"` en `terraform.tfvars`: esto cambia Cloud SQL a `ZONAL`, reduce el disco inicial a 20 GB y deja `min_instance_count = 0` en todos los servicios de Cloud Run.
- Para eliminar todos los recursos creados y evitar cargos:

```bash
terraform destroy
```
