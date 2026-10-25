/**
 * Configuración de entorno para QA / STAGING.
 * Se utiliza con `ng build --configuration=qa`.
 * Utiliza rutas relativas para integrarse con Traefik / Nginx en HTTPS sin errores de Mixed Content.
 */
export const environment = {
  production: false,
  environmentName: 'qa',
  apiUrl: '/api/v1',
  authUrl: '/api/v1/auth',
  healthEndpoint: '/api/v1/auth/health',
  actuatorEndpoint: '/actuator/health',
  version: '1.0.0-qa',
};
