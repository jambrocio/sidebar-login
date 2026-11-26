output "load_balancer_ip" {
  description = "IP pública Anycast del External HTTPS Load Balancer (apuntar DNS A hacia esta IP)"
  value       = google_compute_global_address.lb_ip.address
}

output "artifact_registry_url" {
  description = "URL del repositorio Docker en Artifact Registry"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker.repository_id}"
}

output "cloud_sql_private_ip" {
  description = "IP privada de Cloud SQL PostgreSQL 17 dentro de la VPC"
  value       = google_sql_database_instance.postgres.private_ip_address
}

output "runtime_service_account" {
  description = "Email de la Service Account utilizada por Cloud Run"
  value       = google_service_account.runtime.email
}

output "cloud_run_services" {
  description = "URLs internas de los servicios desplegados en Cloud Run"
  value = {
    frontend     = google_cloud_run_v2_service.frontend.uri
    backend      = google_cloud_run_v2_service.backend.uri
    auth_service = google_cloud_run_v2_service.auth_service.uri
  }
}
