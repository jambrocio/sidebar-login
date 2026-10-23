/**
 * Configuración de entorno para CONTROL DE CALIDAD / PRUEBAS (QA).
 * Se utiliza con `ng build --configuration=qa`.
 */
export const environment = {
  production: false,
  environmentName: 'qa',
  apiUrl: 'http://localhost:8080/api/v1',
  authUrl: 'http://localhost:8080/api/v1/auth',
  healthEndpoint: 'http://localhost:8080/api/v1/auth/health',
  actuatorEndpoint: 'http://localhost:8080/actuator/health',
  version: '1.0.0-qa',
};
