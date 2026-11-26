const fs = require('fs');
const path = require('path');

/**
 * Script de Actualización Automática de Versión y Cache-Busting (COTIC Frontend).
 *
 * Se ejecuta automáticamente antes de cada compilación (`npm run prebuild`)
 * para asegurar la sincronización exacta entre `public/version.json`,
 * los entornos de Angular (`environments/*.ts`) y el `package.json`.
 */
function updateVersion() {
  const rootDir = path.resolve(__dirname, '..');
  const versionJsonPath = path.join(rootDir, 'public', 'version.json');
  const pkgPath = path.join(rootDir, 'package.json');
  const envDir = path.join(rootDir, 'src', 'environments');

  // 1. Obtener fecha y hora en zona horaria America/Lima (Perú)
  const now = new Date();
  const limaFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const todayStr = limaFormatter.format(now); // YYYY-MM-DD
  const dateCompact = todayStr.replace(/-/g, '');

  const timeFormatter = new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const timeStr = `${todayStr} ${timeFormatter.format(now)}`;

  // 2. Leer version.json actual
  let versionInfo = {
    version: '2.4.2',
    buildDate: todayStr,
    buildTime: timeStr,
    release: `${dateCompact}-01`,
    app: 'COTIC: SISTEMA POS & GESTIÓN DE PRODUCTOS',
    environment: 'production'
  };

  if (fs.existsSync(versionJsonPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
      versionInfo = { ...versionInfo, ...existing };

      // Auto-incremento de release si es del mismo día
      if (existing.release && existing.release.startsWith(dateCompact)) {
        const parts = existing.release.split('-');
        const currentCounter = parseInt(parts[1] || '1', 10);
        versionInfo.release = `${dateCompact}-${String(currentCounter + 1).padStart(2, '0')}`;
      } else {
        versionInfo.release = `${dateCompact}-01`;
      }
      versionInfo.buildDate = todayStr;
      versionInfo.buildTime = timeStr;
    } catch (e) {
      console.warn('Advertencia al leer version.json:', e.message);
    }
  }

  // 3. Escribir version.json
  fs.writeFileSync(versionJsonPath, JSON.stringify(versionInfo, null, 2) + '\n', 'utf8');

  // 4. Actualizar package.json
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      pkg.version = versionInfo.version;
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    } catch (_) {}
  }

  // 5. Actualizar archivos de entorno (environments/*.ts)
  const envFiles = [
    'environment.ts',
    'environment.prod.ts',
    'environment.qa.ts',
    'environment.development.ts'
  ];

  envFiles.forEach(file => {
    const fullPath = path.join(envDir, file);
    if (fs.existsSync(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      content = content.replace(/version:\s*['"][^'"]+['"]/, `version: '${versionInfo.version}'`);
      content = content.replace(/buildDate:\s*['"][^'"]+['"]/, `buildDate: '${todayStr}'`);
      fs.writeFileSync(fullPath, content, 'utf8');
    }
  });

  console.log(`[VersionManager] Versión sincronizada: v${versionInfo.version} • Release: ${versionInfo.release} • Build: ${todayStr}`);
}

updateVersion();
