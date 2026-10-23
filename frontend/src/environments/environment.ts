/**
 * Configuración de entorno para el Frontend Angular 21.
 * Entorno por defecto: DESARROLLO (DEV)
 */
export const environment = {
  production: false,
  environmentName: 'desarrollo',
  apiUrl: 'http://localhost:8080/api/v1',
  authUrl: 'http://localhost:8080/api/v1/auth',
  healthEndpoint: 'http://localhost:8080/api/v1/auth/health',
  actuatorEndpoint: 'http://localhost:8080/actuator/health',
  version: '1.0.0-dev',
};
