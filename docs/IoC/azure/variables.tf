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

variable "location" {
  description = "Región de Microsoft Azure"
  type        = string
  default     = "eastus2"
}

variable "domain_name" {
  description = "Dominio personalizado opcional para Azure Front Door (ej. app.bevadmin.com)"
  type        = string
  default     = ""
}

variable "db_admin_username" {
  description = "Usuario administrador de PostgreSQL Flexible Server"
  type        = string
  default     = "bevadmin_pg"
}

variable "db_name" {
  description = "Nombre de la base de datos relacional"
  type        = string
  default     = "admin_dashboard_db"
}

variable "db_sku_name" {
  description = "SKU de Azure Database for PostgreSQL Flexible Server"
  type        = string
  default     = "GP_Standard_D2s_v3"
}

variable "acr_sku" {
  description = "SKU de Azure Container Registry (Basic, Standard, Premium)"
  type        = string
  default     = "Standard"
}

variable "frontend_image_tag" {
  description = "Tag de la imagen Docker de dev-frontend en ACR"
  type        = string
  default     = "latest"
}

variable "backend_image_tag" {
  description = "Tag de la imagen Docker de dev-backend en ACR"
  type        = string
  default     = "latest"
}

variable "auth_image_tag" {
  description = "Tag de la imagen Docker de dev-auth-service en ACR"
  type        = string
  default     = "latest"
}

variable "jwt_secret" {
  description = "Secreto criptográfico para firma JWT (mínimo 64 caracteres)"
  type        = string
  sensitive   = true
}

variable "tags" {
  description = "Etiquetas comunes aplicadas a todos los recursos"
  type        = map(string)
  default = {
    Project   = "BevAdmin-COTIC"
    ManagedBy = "Terraform"
  }
}
