const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'docs', 'manual', 'imagenes');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function loginApi() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ username: 'rambrocio', password: 'AdminRoble2026#' });
    const req = http.request('http://localhost:8080/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode === 200) {
            resolve(parsed);
          } else {
            reject(new Error(`Login failed (${res.statusCode}): ${body}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 0;
    this.callbacks = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = err => reject(err);
      this.ws.onmessage = msg => {
        const data = JSON.parse(msg.data);
        if (data.id && this.callbacks.has(data.id)) {
          const { res, rej } = this.callbacks.get(data.id);
          this.callbacks.delete(data.id);
          if (data.error) rej(data.error);
          else res(data.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      this.callbacks.set(id, { res: resolve, rej: reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('1. Autenticando rambrocio contra API backend...');
  const authResponse = await loginApi();
  console.log('Login exitoso. Usuario:', authResponse.user?.fullName);

  console.log('2. Iniciando Edge Headless con CDP...');
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edgeProcess = spawn(edgePath, [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--remote-allow-origins=*',
    '--window-size=1440,900',
    '--remote-debugging-port=9222',
    'http://localhost:4200/login'
  ]);

  await sleep(2500);

  try {
    const list = await fetchJson('http://127.0.0.1:9222/json/list');
    const pageTab = list.find(t => t.type === 'page');
    if (!pageTab) throw new Error('No se encontró pestaña tipo page en Edge');
    console.log('Pestaña conectada:', pageTab.id, pageTab.url);

    const cdp = new CdpClient(pageTab.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });

    console.log('3. Capturando 01_login.png...');
    await sleep(2500);
    let screenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUTPUT_DIR, '01_login.png'), Buffer.from(screenshot.data, 'base64'));

    console.log('4. Inyectando sesión institucional en sessionStorage...');
    const userJson = JSON.stringify(authResponse.user);
    const token = authResponse.accessToken;
    await cdp.send('Runtime.evaluate', {
      expression: `
        sessionStorage.setItem('accessToken', ${JSON.stringify(token)});
        sessionStorage.setItem('currentUser', ${JSON.stringify(userJson)});
        sessionStorage.setItem('currentUserProfile', ${JSON.stringify(userJson)});
      `
    });

    const routes = [
      { path: '/dashboard/inicio', file: '02_dashboard_inicio.png', name: 'Dashboard Principal e Indicadores' },
      { path: '/dashboard/sales', file: '03_ventas_pos.png', name: 'Terminal POS (Mayor/Menor)' },
      { path: '/dashboard/sales-history', file: '04_historial_ventas.png', name: 'Historial de Ventas' },
      { path: '/dashboard/products/list', file: '05_inventario_productos.png', name: 'Inventario de Productos & Histórico' },
      { path: '/dashboard/categories', file: '06_categorias_productos.png', name: 'Categorías de Productos' },
      { path: '/dashboard/purchases', file: '07_compras_abastecimiento.png', name: 'Compras y Abastecimiento' },
      { path: '/dashboard/suppliers', file: '08_proveedores.png', name: 'Gestión de Proveedores' },
      { path: '/dashboard/cash-register', file: '09_arqueo_caja.png', name: 'Arqueo y Cierre de Caja' },
      { path: '/dashboard/coupons', file: '10_cupones_descuento.png', name: 'Cupones de Descuento' },
      { path: '/dashboard/customers', file: '11_clientes.png', name: 'Cartera de Clientes' },
      { path: '/dashboard/branches', file: '12_negocio_sedes.png', name: 'Negocio y Gestión de Sedes' },
      { path: '/dashboard/users', file: '13_usuarios.png', name: 'Control de Usuarios del Sistema' },
      { path: '/dashboard/roles', file: '14_roles_permisos.png', name: 'Roles y Permisos RBAC' },
      { path: '/dashboard/sessions', file: '15_sesiones_activas.png', name: 'Monitoreo de Sesiones Activas' }
    ];

    for (let i = 0; i < routes.length; i++) {
      const r = routes[i];
      console.log(`Navegando a [${r.file}] -> http://localhost:4200${r.path}...`);
      await cdp.send('Page.navigate', { url: `http://localhost:4200${r.path}` });
      await sleep(2200); // Esperar carga de Angular y peticiones API
      screenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
      const targetFile = path.join(OUTPUT_DIR, r.file);
      fs.writeFileSync(targetFile, Buffer.from(screenshot.data, 'base64'));
      console.log(`  Guardado: ${r.file} (${(fs.statSync(targetFile).size / 1024).toFixed(1)} KB)`);
    }

    cdp.close();
    console.log('¡Todas las capturas se generaron exitosamente!');
  } finally {
    edgeProcess.kill();
  }
}

main().catch(err => {
  console.error('Error durante la captura:', err);
  process.exit(1);
});
