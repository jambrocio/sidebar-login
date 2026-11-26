variable "project_id" {
  description = "ID del proyecto de Google Cloud Platform"
  type        = string
}

variable "region" {
  description = "Región principal de GCP (ej. us-central1, southamerica-east1)"
  type        = string
  default     = "us-central1"
}

variable "project_name" {
  description = "Nombre base del proyecto utilizado como prefijo de recursos"
  type        = string
  default     = "bevadmin"
}

variable "environment" {
  description = "Ambiente de despliegue (dev, qa, prod)"
  type        = string
  default     = "prod"

  validation {
    condition     = contains(["dev", "qa", "prod"], var.environment)
    error_message = "El ambiente debe ser dev, qa o prod."
  }
}

variable "domain_name" {
  description = "Dominio FQDN para el certificado SSL administrado de Google (ej. app.bevadmin.com)"
  type        = string
}

variable "db_name" {
  description = "Nombre de la base de datos en Cloud SQL PostgreSQL 17"
  type        = string
  default     = "admin_dashboard_db"
}

variable "db_user" {
  description = "Usuario de aplicación en PostgreSQL"
  type        = string
  default     = "bevadmin_pg"
}

variable "db_tier" {
  description = "Tier de máquina de Cloud SQL (ej. db-custom-2-7680)"
  type        = string
  default     = "db-custom-2-7680"
}

variable "frontend_image_tag" {
  description = "Tag de la imagen Docker de dev-frontend en Artifact Registry"
  type        = string
  default     = "latest"
}

variable "backend_image_tag" {
  description = "Tag de la imagen Docker de dev-backend en Artifact Registry"
  type        = string
  default     = "latest"
}

variable "auth_image_tag" {
  description = "Tag de la imagen Docker de dev-auth-service en Artifact Registry"
  type        = string
  default     = "latest"
}

variable "jwt_secret" {
  description = "Secreto criptográfico para firma JWT (mínimo 64 caracteres)"
  type        = string
  sensitive   = true
}
