/**
 * Configuración de entorno para DESARROLLO (DEV).
 * Se utiliza con `ng serve` o `ng build --configuration=development`.
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
