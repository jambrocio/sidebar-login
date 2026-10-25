/**
 * Configuración de entorno para PRODUCCIÓN (PROD).
 * Se utiliza con `ng build --configuration=production`.
 * Utiliza rutas relativas para integrarse con Traefik / Nginx en HTTPS sin errores de Mixed Content.
 */
export const environment = {
  production: true,
  environmentName: 'produccion',
  apiUrl: '/api/v1',
  authUrl: '/api/v1/auth',
  healthEndpoint: '/api/v1/auth/health',
  actuatorEndpoint: '/actuator/health',
  version: '1.0.0-prod',
};
