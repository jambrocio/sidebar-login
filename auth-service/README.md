# 🛡️ Centralized Identity & Access Management (IAM / IdP) Service

An enterprise-grade, synchronous Centralized Authentication, RBAC Authorization, and Token Issuance Service built with **Spring Boot 3.4**, **Java 21 LTS**, and **Virtual Threads (Project Loom)**.

This service acts as the **Single Source of Truth** for user authentication, password rotation, session lifecycle governance, and security auditing across multiple satellite applications and microservices.

---

## 1. Key Architectural Principles

```
  ┌─────────────────────────────────────────────────────────────┐
  │         Satellite Application A / Frontend Client           │
  └──────────────────────────────┬──────────────────────────────┘
                                 │ 1. POST /api/v1/auth/login
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │            Centralized Auth Service (Port 8081)             │
  │  • Signs JWTs via Asymmetric RS256 (Private Key)            │
  │  • Issues High-Entropy Opaque Refresh Tokens                │
  │  • Enforces Lockout, Expiration & Kill Session              │
  └──────────────┬──────────────────────────────┬───────────────┘
                 │ 2. Queries auth & rbac       │ Exposes JWKS
                 ▼                              ▼
  ┌──────────────────────────────┐  ┌───────────────────────────┐
  │ PostgreSQL (admin_dashboard) │  │  GET /.well-known/jwks.json
  │ • Schema auth                │  │  (Public Keys for local   │
  │ • Schema rbac                │  │   zero-latency validation)│
  │ • Schema core                │  └─────────────┬─────────────┘
  └──────────────────────────────┘                │
                                                  ▼
                 ┌──────────────────────────────────────────────┐
                 │  Satellite Services (e.g. Sales, Inventory)  │
                 │  Validate JWT signatures LOCALLY with JWKS   │
                 │  (Zero network roundtrip to Auth on requests)│
                 └──────────────────────────────────────────────┘
```

1. **Asymmetric Tokens (RS256 + JWKS)**:
   - The Auth Service signs access tokens with an **RSA 2048-bit Private Key**.
   - It exposes the public key set via `GET /.well-known/jwks.json`.
   - Consumer applications configure their JWT decoder to download and cache the JWKS, verifying incoming requests **locally without sending HTTP traffic to the Auth Service**.
2. **RFC 7662 Token Introspection**:
   - For applications or API Gateways that prefer synchronous validation or need real-time revocation checks, `POST /api/v1/auth/introspect` provides standard token status introspection.
3. **Database Isolation (`auth` & `rbac` Schemas)**:
   - Fully decoupled from commercial, sales, or inventory modules. Connects exclusively to PostgreSQL schemas `auth`, `rbac`, and `core`.
4. **RFC 7807 Standard Error Payloads**:
   - All errors return structured `ProblemDetail` JSON responses with machine-readable URIs and property bags.

---

## 2. API Endpoints

### Identity Provider (IdP) & Authentication

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Authenticates credentials, checks lockout & expiration, emits RS256 JWT + Refresh Token. | Public |
| `POST` | `/api/v1/auth/refresh` | Validates active refresh token, performs token rotation, and issues a new pair. | Public |
| `POST` | `/api/v1/auth/introspect` | RFC 7662 Token Introspection endpoint for API Gateways and microservices. | Public |
| `GET` | `/.well-known/jwks.json` | RFC 7517 JSON Web Key Set containing the public key for signature verification. | Public |
| `POST` | `/api/v1/auth/logout` | Revokes the current session and invalidates the refresh token. | Authenticated |
| `POST` | `/api/v1/auth/change-password` | Updates password, resets expiration/lockout, and revokes active sessions. | Authenticated |
| `GET` | `/api/v1/auth/health` | Service health status probe. | Public |

### Session Lifecycle & Remote Kill

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/sessions` | Lists active sessions with device, IP, and location metadata. | ADMIN, AUDITOR |
| `POST` | `/api/v1/sessions/revoke` | Remote session termination (Kill Session). | ADMIN |
| `POST` | `/api/v1/sessions/{id}/heartbeat`| Updates the heartbeat timestamp for an active connection. | Authenticated |

### User Directory & Governance

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/users` | Lists all users with assigned business, primary branch, and authorized branches. | ADMIN, AUDITOR |
| `GET` | `/api/v1/users/{id}` | Fetches user identity details by UUID. | ADMIN, Self |
| `POST` | `/api/v1/users` | Provisions a new user, assigns RBAC roles and authorized branches. | ADMIN |
| `PUT` | `/api/v1/users/{id}/lock` | Enforces account lockout. | ADMIN |
| `PUT` | `/api/v1/users/{id}/unlock` | Clears failed attempts and restores account status to `ACTIVE`. | ADMIN |

---

## 3. How Other Applications Validate Tokens

Satellite services (such as Spring Boot, Express, Fastify, Go, etc.) can validate tokens in two ways:

### Option A: Zero-Latency Local Validation (Recommended via JWKS)

In Spring Boot (Spring Security OAuth2 Resource Server):
```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          jwk-set-uri: http://auth-service:8081/.well-known/jwks.json
```

In Node.js (`jwks-rsa` + `jsonwebtoken`):
```javascript
const jwksClient = require('jwks-rsa');
const client = jwksClient({
  jwksUri: 'http://auth-service:8081/.well-known/jwks.json'
});
```

### Option B: Synchronous RFC 7662 Introspection

Send a `POST` request to:
```http
POST /api/v1/auth/introspect
Content-Type: application/json

{
  "token": "eyJhbGciOiJSUzI1NiIs..."
}
```

Response:
```json
{
  "active": true,
  "sub": "11111111-1111-4111-8111-111111111101",
  "username": "agarcia",
  "email": "agarcia@elroble.com",
  "role": "ADMIN",
  "roleScope": "Nivel Negocio (Multi-Local)",
  "businessId": "a0000000-0000-4000-8000-000000000001",
  "exp": 1731885600
}
```

---

## 4. Running the Service

### Prerequisites
- Java 21 LTS
- PostgreSQL 14+ / 17 (with schemas `auth`, `rbac`, `core` initialized)

### Execution
```bash
cd auth-service
mvn spring-boot:run
```

Or with Docker:
```bash
docker build -t auth-service .
docker run -p 8081:8081 -e DB_URL=jdbc:postgresql://host.docker.internal:5432/admin_dashboard_db auth-service
```

Interactive Swagger UI documentation:
`http://localhost:8081/swagger-ui.html`
