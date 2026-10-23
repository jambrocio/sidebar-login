---
name: dba-senior
description: >-
  Estándar y guía maestra de Administración de Bases de Datos Senior (Senior DBA & Data Architect)
  para el modelado relacional y no relacional, optimización de consultas, alta disponibilidad,
  integridad de datos, migraciones automatizadas y endurecimiento de seguridad (PostgreSQL 14-17,
  MySQL, Oracle, SQL Server, MongoDB, Redis). Enfoque prioritario en normalización formal (3FN),
  índices avanzados, CTEs recursivos, diccionarios de datos nativos documentados y mitigación
  de amenazas OWASP sobre el motor de base de datos para cualquier tipo de requerimiento.
---

# 🗄️ Estándar Maestro de Administración de Bases de Datos Senior (DBA & Data Architect)

Este documento establece el marco universal de ingeniería de datos, diseño de modelos relacionales/no relacionales, optimización de rendimiento, integridad referencial estricta, documentación en catálogo y seguridad de bases de datos (**OWASP Database Security & Hardening**) para Administradores de Bases de Datos (DBA) y Arquitectos de Datos de nivel Senior.

El conocimiento aquí compilado es **estándar, agnóstico y reutilizable** para proyectos de cualquier escala y vertical (ERP, CRM, Finanzas, Logística, Plataformas B2B/B2C, Big Data y Analítica).

> [!NOTE]
> **Experiencia de Referencia**: Este marco ha sido consolidado en entornos de producción de misión crítica, como la base de datos empresarial de **BevAdmin Pro** (PostgreSQL 17 sobre contenedores orquestados, esquema multi-sede con UUIDs nativos `pgcrypto`, CTEs recursivos para árboles de navegación de 4 niveles, vistas consolidadas de sesiones activas con semaforización, catálogo autodocumentado con `COMMENT ON` e inicialización secuencial desacoplada de Flyway).

---

## 1. Perfil, Rol y Capacidades del Senior DBA

Un Senior DBA y Arquitecto de Datos es el custodio de la verdad, integridad y rendimiento del activo más crítico de la organización: los datos.

1. **Modelado Conceptual, Lógico y Físico**: Diseña modelos de datos sólidos comenzando por el diagrama entidad-relación (ERD), normalizando formalmente hasta Tercera Forma Normal (3FN) o Forma Normal de Boyce-Codd (BCNF), aplicando desnormalizaciones controladas únicamente cuando el rendimiento analítico o de lectura lo justifique.
2. **Integridad de Datos Garantizada**: Reglas de negocio forzadas a nivel de motor mediante llaves primarias (`PRIMARY KEY`), foráneas (`FOREIGN KEY`) con políticas explícitas (`ON DELETE RESTRICT / CASCADE`), restricciones de unicidad (`UNIQUE`) y restricciones de verificación (`CHECK`).
3. **Optimización Proactiva (Tuning)**: Interpreta planes de ejecución (`EXPLAIN (ANALYZE, BUFFERS)`), elimina lecturas secuenciales (*Seq Scans*) en tablas masivas y diseña estrategias de indexación adaptadas al patrón de consulta.
4. **Idempotencia y Versionamiento de Esquemas**: Diseña scripts DDL/DML modulares, reproducibles e idempotentes capaces de ejecutarse tanto en pipelines de migración (Flyway/Liquibase) como en la inicialización nativa de contenedores (`/docker-entrypoint-initdb.d/`).

---

## 2. Buenas Prácticas de Diseño y Documentación de Esquemas SQL

### 2.1. Diccionario de Datos Nativo en el Catálogo

Toda tabla, vista, función y columna debe registrar su propósito técnico y de negocio en el catálogo del motor mediante sentencias `COMMENT ON`:

```sql
CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE,
    commercial_name VARCHAR(150) NOT NULL,
    legal_name VARCHAR(200) NOT NULL,
    tax_id VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE businesses IS 'Entidad Matriz de la arquitectura multi-tenant que representa a las empresas o razones sociales registradas.';
COMMENT ON COLUMN businesses.code IS 'Código mnemotécnico institucional único (ej. BIZ-001) para parametrización en sistemas externos.';
COMMENT ON COLUMN businesses.tax_id IS 'Identificador tributario oficial (RUC / RFC / CIF / NIF / Tax ID) único y validado.';
```

### 2.2. Jerarquías y Consultas Complejas con CTEs Recursivos

Para representar estructuras arbóreas (menús multinivel, categorías de productos, organigramas), emplear expresiones de tabla comunes recursivas (*Recursive Common Table Expressions*), evitando bucles procedurales costosos:

```sql
CREATE OR REPLACE VIEW vw_menu_hierarchy_tree AS
WITH RECURSIVE menu_tree AS (
    -- Miembro Ancla: Raíces jerárquicas
    SELECT
        m.id, m.parent_id, m.code, m.label, m.icon, m.router_link,
        1 AS depth_level,
        m.label::TEXT AS full_path
    FROM menu_items m
    WHERE m.parent_id IS NULL AND m.is_active = TRUE

    UNION ALL

    -- Miembro Recursivo: Hijos sucesivos
    SELECT
        child.id, child.parent_id, child.code, child.label, child.icon, child.router_link,
        parent.depth_level + 1 AS depth_level,
        (parent.full_path || ' > ' || child.label)::TEXT AS full_path
    FROM menu_items child
    INNER JOIN menu_tree parent ON child.parent_id = parent.id
    WHERE child.is_active = TRUE
)
SELECT * FROM menu_tree ORDER BY full_path;
```

### 2.3. Funciones Almacenadas con Declaración de Volatilidad

Toda función o procedimiento debe declarar explícitamente su categoría de volatilidad (`VOLATILE`, `STABLE`, `IMMUTABLE`) para permitir al optimizador del motor calcular planes en caché y paralelizar consultas.

---

## 3. Rendimiento, Indexación y Estrategias de Escalamiento

### 3.1. Estrategia de Índices Especializados

- **Índices Parciales (Filtered Indexes)**: Para tablas de alto volumen donde las consultas filtran un subconjunto específico (ej. sesiones no revocadas o registros activos):
  ```sql
  -- Ahorra hasta 90% de espacio en disco frente a un índice global
  CREATE INDEX idx_user_sessions_active 
  ON user_sessions (user_id, last_activity_at) 
  WHERE is_revoked = FALSE;
  ```
- **Índices Compuestos (Composite Indexes)**: Diseñados siguiendo la regla de cardinalidad y orden de cláusula `WHERE` (primero columnas de igualdad, luego de rango o ordenamiento).
- **Índices GIN / GiST**: Para campos JSONB (`jsonb_ops` o `jsonb_path_ops`), búsquedas textuales de catálogo (*Full Text Search* con `to_tsvector`) y coordenadas geoespaciales.

### 3.2. Estrategia de Particionamiento de Tablas

Para tablas con crecimiento desmedido (auditorías, telemetría, logs transaccionales):
- **Particionamiento por Rango (Range Partitioning)** mensual o anual sobre marcas de tiempo (`TIMESTAMPTZ`).
- Facilita la depuración de datos históricos mediante `DROP TABLE partition_2024_01` (instantáneo) en lugar de un `DELETE` masivo costoso que genera fragmentación (*table bloat*).

---

## 4. Seguridad y Endurecimiento de Base de Datos (OWASP Database Hardening)

Un Senior DBA protege la base de datos como la última línea de defensa:

### 4.1. Mitigación Total de Inyección SQL (OWASP A03)
- En funciones PL/pgSQL que requieran SQL dinámico, forzar el uso de `EXECUTE ... USING param1, param2` con identificadores sanitizados mediante `quote_ident()` o `quote_literal()`.
- Prohibir funciones con privilegios elevados (`SECURITY DEFINER`) a menos que tengan un `search_path` explícito y seguro (`SET search_path = public, pg_temp;`).

### 4.2. Principio de Menor Privilegio (Least Privilege)
- **Nunca conectar las aplicaciones con el usuario `postgres` o `root` en entornos de producción.**
- Diseñar roles con privilegios granulares:
  ```sql
  -- Rol de solo lectura para auditoría y analítica
  CREATE ROLE app_read_only WITH LOGIN PASSWORD '...';
  GRANT CONNECT ON DATABASE admin_dashboard_db TO app_read_only;
  GRANT USAGE ON SCHEMA public TO app_read_only;
  GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_read_only;

  -- Rol de la aplicación de producción (DML restringido, sin DDL)
  CREATE ROLE app_runtime WITH LOGIN PASSWORD '...';
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_runtime;
  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_runtime;
  REVOKE CREATE, DROP, ALTER ON SCHEMA public FROM app_runtime;
  ```

### 4.3. Cifrado y Protección de Datos Sensibles (OWASP A02)
- Habilitar **Cifrado en Tránsito (SSL/TLS)** obligatorio en `pg_hba.conf`:
  ```text
  hostssl all all 0.0.0.0/0 scram-sha-256
  ```
- Almacenar credenciales usando algoritmos seguros (autenticación nativa `scram-sha-256`).
- Para datos clasificados como PII (tarjetas, datos médicos, contraseñas), emplear extensiones criptográficas como `pgcrypto` (`crypt(plain, gen_salt('bf', 12))`).

### 4.4. Trazabilidad Inmutable y Auditoría (OWASP A09)
- Diseñar tablas de auditoría de solo inserción (`auth_audit_logs`, `audit_events`) donde ningún usuario o proceso de aplicación tenga permisos de `UPDATE` o `DELETE`.
- Uso de disparadores (*Triggers*) de auditoría automáticos para registrar quién, cuándo y qué cambió antes y después de cada modificación crítica.

---

## 5. Checklist de Calidad del Senior DBA

- [ ] **Sintaxis Idempotente**: Scripts DDL con `IF EXISTS` / `IF NOT EXISTS` para garantizar re-ejecución segura.
- [ ] **Restricciones de Integridad**: 100% de las llaves foráneas indexadas para prevenir bloqueos de tabla (*table locks*) en operaciones de cascada o verificación.
- [ ] **Catálogo Documentado**: Cada tabla y columna posee su correspondiente sentencia `COMMENT ON`.
- [ ] **Sin Consultas Huérfanas ni Datos Dummy en Producción**: Tablas limpias, con datos semilla únicamente para catálogos estructurales y roles.
- [ ] **Estrategia de Backup Probada**: Procedimientos documentados de copias de seguridad lógicas (`pg_dump`) y físicas (WAL archiving / Point-In-Time Recovery - PITR).
