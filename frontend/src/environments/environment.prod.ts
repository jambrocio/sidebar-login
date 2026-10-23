/**
 * Configuración de entorno para PRODUCCIÓN (PROD).
 * Se utiliza con `ng build --configuration=production`.
 */
export const environment = {
  production: true,
  environmentName: 'produccion',
  apiUrl: 'http://localhost:8080/api/v1',
  authUrl: 'http://localhost:8080/api/v1/auth',
  healthEndpoint: 'http://localhost:8080/api/v1/auth/health',
  actuatorEndpoint: 'http://localhost:8080/actuator/health',
  version: '1.0.0-prod',
};
