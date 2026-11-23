/**
 * Configuración de entorno para DESARROLLO (DEV).
 * Se utiliza con `ng build --configuration=development`.
 * Utiliza rutas relativas para integrarse con Traefik / Nginx en HTTPS sin errores de Mixed Content.
 */
export const environment = {
  production: false,
  environmentName: 'desarrollo',
  apiUrl: '/api/v1',
  authUrl: '/api/v1/auth',
  healthEndpoint: '/api/v1/auth/health',
  actuatorEndpoint: '/actuator/health',
  version: '2.4.1',
  buildDate: '2026-11-23',
};
