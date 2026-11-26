locals {
  name_prefix = "${var.project_name}-${var.environment}"
  is_prod     = var.environment == "prod"
  registry    = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker.repository_id}"
}

resource "random_password" "db_password" {
  length           = 28
  special          = true
  override_special = "!#$%&*()-_=+[]{}:?"
}

# ==============================================================================
# 1. HABILITACIÓN DE APIS REQUERIDAS EN GCP
# ==============================================================================
resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "secretmanager.googleapis.com",
    "vpcaccess.googleapis.com",
    "servicenetworking.googleapis.com",
    "artifactregistry.googleapis.com",
    "compute.googleapis.com",
    "monitoring.googleapis.com"
  ])

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

# ==============================================================================
# 2. VPC PRIVADA (10.10.0.0/16) + SERVERLESS VPC ACCESS CONNECTOR
# ==============================================================================
resource "google_compute_network" "vpc" {
  name                    = "vpc-${local.name_prefix}"
  auto_create_subnetworks = false
  depends_on              = [google_project_service.apis]
}

resource "google_compute_subnetwork" "app" {
  name                     = "snet-${local.name_prefix}-app"
  ip_cidr_range            = "10.10.0.0/20"
  region                   = var.region
  network                  = google_compute_network.vpc.id
  private_ip_google_access = true
}

resource "google_compute_global_address" "private_ip_range" {
  name          = "psa-${local.name_prefix}-sql"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]
}

resource "google_vpc_access_connector" "serverless" {
  name          = "vpcc-${local.name_prefix}"
  region        = var.region
  network       = google_compute_network.vpc.name
  ip_cidr_range = "10.10.16.0/28"
  min_instances = 2
  max_instances = local.is_prod ? 5 : 3
  depends_on    = [google_project_service.apis]
}

# ==============================================================================
# 3. ARTIFACT REGISTRY (DOCKER + CONTAINER ANALYSIS)
# ==============================================================================
resource "google_artifact_registry_repository" "docker" {
  location      = var.region
  repository_id = "${local.name_prefix}-images"
  description   = "Registro privado de imágenes Docker para BevAdmin / COTIC"
  format        = "DOCKER"
  depends_on    = [google_project_service.apis]
}

# ==============================================================================
# 4. IAM WORKLOAD IDENTITY & SECRET MANAGER
# ==============================================================================
resource "google_service_account" "runtime" {
  account_id   = "${local.name_prefix}-run-sa"
  display_name = "Cuenta de Servicio Cloud Run (${local.name_prefix})"
}

resource "google_project_iam_member" "runtime_roles" {
  for_each = toset([
    "roles/cloudsql.client",
    "roles/secretmanager.secretAccessor",
    "roles/logging.logWriter",
    "roles/cloudtrace.agent"
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.runtime.email}"
}

resource "google_secret_manager_secret" "db_password" {
  secret_id = "${local.name_prefix}-db-password"

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = random_password.db_password.result
}

resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "${local.name_prefix}-jwt-secret"

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "jwt_secret" {
  secret      = google_secret_manager_secret.jwt_secret.id
  secret_data = var.jwt_secret
}

# ==============================================================================
# 5. CLOUD SQL FOR POSTGRESQL 17 (REGIONAL HA + PRIVATE IP)
# ==============================================================================
resource "google_sql_database_instance" "postgres" {
  name                = "sql-${local.name_prefix}"
  database_version    = "POSTGRES_17"
  region              = var.region
  deletion_protection = local.is_prod

  settings {
    tier              = var.db_tier
    availability_type = local.is_prod ? "REGIONAL" : "ZONAL"
    disk_type         = "PD_SSD"
    disk_size         = local.is_prod ? 50 : 20
    disk_autoresize   = true

    ip_configuration {
      ipv4_enabled                                  = false
      private_network                               = google_compute_network.vpc.id
      enable_private_path_for_google_cloud_services = true
      ssl_mode                                      = "ENCRYPTED_ONLY"
    }

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = local.is_prod ? 30 : 7
      }
    }
  }

  depends_on = [google_service_networking_connection.private_vpc_connection]
}

resource "google_sql_database" "app" {
  name     = var.db_name
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "app" {
  name     = var.db_user
  instance = google_sql_database_instance.postgres.name
  password = random_password.db_password.result
}

# ==============================================================================
# 6. GOOGLE CLOUD RUN (DEV-AUTH-SERVICE, DEV-BACKEND, DEV-FRONTEND)
# ==============================================================================
resource "google_cloud_run_v2_service" "auth_service" {
  name     = "${local.name_prefix}-auth-service"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"

  template {
    service_account                  = google_service_account.runtime.email
    max_instance_request_concurrency = 80

    scaling {
      min_instance_count = local.is_prod ? 1 : 0
      max_instance_count = 5
    }

    vpc_access {
      connector = google_vpc_access_connector.serverless.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    containers {
      image = "${local.registry}/dev-auth-service:${var.auth_image_tag}"

      ports {
        container_port = 8081
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "1Gi"
        }
      }

      env {
        name  = "DB_URL"
        value = "jdbc:postgresql://${google_sql_database_instance.postgres.private_ip_address}:5432/${var.db_name}?sslmode=require"
      }
      env {
        name  = "DB_USER"
        value = var.db_user
      }
      env {
        name = "DB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_password.secret_id
            version = "latest"
          }
        }
      }
      env {
        name  = "SPRING_PROFILES_ACTIVE"
        value = var.environment
      }
    }
  }

  depends_on = [google_secret_manager_secret_version.db_password]
}

resource "google_cloud_run_v2_service" "backend" {
  name     = "${local.name_prefix}-backend"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"

  template {
    service_account                  = google_service_account.runtime.email
    max_instance_request_concurrency = 80

    scaling {
      min_instance_count = local.is_prod ? 1 : 0
      max_instance_count = 10
    }

    vpc_access {
      connector = google_vpc_access_connector.serverless.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    containers {
      image = "${local.registry}/dev-backend:${var.backend_image_tag}"

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "2"
          memory = "2Gi"
        }
      }

      env {
        name  = "DB_URL"
        value = "jdbc:postgresql://${google_sql_database_instance.postgres.private_ip_address}:5432/${var.db_name}?sslmode=require"
      }
      env {
        name  = "DB_USER"
        value = var.db_user
      }
      env {
        name = "DB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_password.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "JWT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt_secret.secret_id
            version = "latest"
          }
        }
      }
      env {
        name  = "SPRING_PROFILES_ACTIVE"
        value = var.environment
      }
    }
  }

  depends_on = [
    google_secret_manager_secret_version.db_password,
    google_secret_manager_secret_version.jwt_secret
  ]
}

resource "google_cloud_run_v2_service" "frontend" {
  name     = "${local.name_prefix}-frontend"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"

  template {
    service_account = google_service_account.runtime.email

    scaling {
      min_instance_count = 0
      max_instance_count = 6
    }

    containers {
      image = "${local.registry}/dev-frontend:${var.frontend_image_tag}"

      ports {
        container_port = 80
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }
  }
}

resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  for_each = {
    frontend     = google_cloud_run_v2_service.frontend.name
    backend      = google_cloud_run_v2_service.backend.name
    auth_service = google_cloud_run_v2_service.auth_service.name
  }

  project  = var.project_id
  location = var.region
  name     = each.value
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ==============================================================================
# 7. CLOUD ARMOR (WAF OWASP TOP 10) + EXTERNAL HTTPS LB + CLOUD CDN
# ==============================================================================
resource "google_compute_security_policy" "waf" {
  name = "waf-${local.name_prefix}"

  rule {
    action   = "deny(403)"
    priority = 1000
    match {
      expr {
        expression = "evaluatePreconfiguredWaf('sqli-v33-stable') || evaluatePreconfiguredWaf('xss-v33-stable') || evaluatePreconfiguredWaf('lfi-v33-stable') || evaluatePreconfiguredWaf('rce-v33-stable')"
      }
    }
    description = "Reglas WAF OWASP Top 10 (SQLi, XSS, LFI, RCE)"
  }

  rule {
    action   = "throttle"
    priority = 2000
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"
      enforce_on_key = "IP"
      rate_limit_threshold {
        count        = 300
        interval_sec = 60
      }
    }
    description = "Rate limiting anti-DDoS por IP"
  }

  rule {
    action   = "allow"
    priority = 2147483647
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "Permitir tráfico legítimo"
  }
}

resource "google_compute_region_network_endpoint_group" "frontend" {
  name                  = "neg-${local.name_prefix}-frontend"
  network_endpoint_type = "SERVERLESS"
  region                = var.region
  cloud_run {
    service = google_cloud_run_v2_service.frontend.name
  }
}

resource "google_compute_region_network_endpoint_group" "backend" {
  name                  = "neg-${local.name_prefix}-backend"
  network_endpoint_type = "SERVERLESS"
  region                = var.region
  cloud_run {
    service = google_cloud_run_v2_service.backend.name
  }
}

resource "google_compute_region_network_endpoint_group" "auth_service" {
  name                  = "neg-${local.name_prefix}-auth"
  network_endpoint_type = "SERVERLESS"
  region                = var.region
  cloud_run {
    service = google_cloud_run_v2_service.auth_service.name
  }
}

resource "google_compute_backend_service" "frontend" {
  name            = "bs-${local.name_prefix}-frontend"
  protocol        = "HTTP"
  enable_cdn      = true
  security_policy = google_compute_security_policy.waf.id

  backend {
    group = google_compute_region_network_endpoint_group.frontend.id
  }
}

resource "google_compute_backend_service" "backend" {
  name            = "bs-${local.name_prefix}-backend"
  protocol        = "HTTP"
  enable_cdn      = false
  security_policy = google_compute_security_policy.waf.id

  backend {
    group = google_compute_region_network_endpoint_group.backend.id
  }
}

resource "google_compute_backend_service" "auth_service" {
  name            = "bs-${local.name_prefix}-auth"
  protocol        = "HTTP"
  enable_cdn      = false
  security_policy = google_compute_security_policy.waf.id

  backend {
    group = google_compute_region_network_endpoint_group.auth_service.id
  }
}

resource "google_compute_url_map" "https" {
  name            = "lb-${local.name_prefix}-urlmap"
  default_service = google_compute_backend_service.frontend.id

  host_rule {
    hosts        = ["*"]
    path_matcher = "allpaths"
  }

  path_matcher {
    name            = "allpaths"
    default_service = google_compute_backend_service.frontend.id

    path_rule {
      paths   = ["/api/*", "/actuator/*"]
      service = google_compute_backend_service.backend.id
    }

    path_rule {
      paths   = ["/auth/*"]
      service = google_compute_backend_service.auth_service.id
    }
  }
}

resource "google_compute_managed_ssl_certificate" "default" {
  name = "ssl-${local.name_prefix}"

  managed {
    domains = [var.domain_name]
  }
}

resource "google_compute_target_https_proxy" "default" {
  name             = "https-proxy-${local.name_prefix}"
  url_map          = google_compute_url_map.https.id
  ssl_certificates = [google_compute_managed_ssl_certificate.default.id]
}

resource "google_compute_global_address" "lb_ip" {
  name = "ip-${local.name_prefix}-lb"
}

resource "google_compute_global_forwarding_rule" "https" {
  name                  = "fr-${local.name_prefix}-https"
  target                = google_compute_target_https_proxy.default.id
  port_range            = "443"
  ip_address            = google_compute_global_address.lb_ip.address
  load_balancing_scheme = "EXTERNAL_MANAGED"
}
