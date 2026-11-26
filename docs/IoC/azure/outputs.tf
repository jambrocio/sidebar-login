output "resource_group_name" {
  description = "Nombre del Resource Group creado"
  value       = azurerm_resource_group.main.name
}

output "frontdoor_url" {
  description = "URL pública HTTPS protegida por Azure Front Door + WAF"
  value       = "https://${azurerm_cdn_frontdoor_endpoint.main.host_name}"
}

output "acr_login_server" {
  description = "Servidor de Azure Container Registry para push de imágenes"
  value       = azurerm_container_registry.main.login_server
}

output "key_vault_uri" {
  description = "URI del Azure Key Vault corporativo"
  value       = azurerm_key_vault.main.vault_uri
}

output "postgres_fqdn" {
  description = "FQDN privado de Azure Database for PostgreSQL 17"
  value       = azurerm_postgresql_flexible_server.main.fqdn
}

output "frontend_internal_fqdn" {
  description = "FQDN del Container App dev-frontend"
  value       = azurerm_container_app.frontend.ingress[0].fqdn
}

output "backend_internal_fqdn" {
  description = "FQDN del Container App dev-backend"
  value       = azurerm_container_app.backend.ingress[0].fqdn
}

output "managed_identity_client_id" {
  description = "Client ID de la Managed Identity compartida"
  value       = azurerm_user_assigned_identity.apps.client_id
}
