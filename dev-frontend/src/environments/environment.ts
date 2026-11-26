/**
 * Configuración de entorno para el Frontend Angular 21.
 * Entorno por defecto: DESARROLLO (DEV)
 * Utiliza rutas relativas para soportar proxy inverso (Traefik HTTPS / Nginx) sin violar Mixed Content.
 */
export const environment = {
  production: false,
  environmentName: 'desarrollo',
  apiUrl: '/api/v1',
  authUrl: '/api/v1/auth',
  healthEndpoint: '/api/v1/auth/health',
  actuatorEndpoint: '/actuator/health',
  version: '2.4.1',
  buildDate: '2026-11-26',
};
