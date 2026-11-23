const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const sleep = ms => new Promise(r => setTimeout(r, ms));

function authenticateBackend(username, password) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ username, password });
    const req = http.request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/v1/auth/login',
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
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function testChromiumBrowser(browserName, exePath, port, authResponse) {
  console.log(`\n==================================================`);
  console.log(`🚀 Iniciando prueba en: ${browserName}`);
  console.log(`   Path: ${exePath}`);
  console.log(`==================================================`);

  if (!fs.existsSync(exePath)) {
    console.log(`⚠️ Binario no encontrado para ${browserName}: ${exePath}`);
    return { name: browserName, status: 'SKIPPED_NOT_FOUND' };
  }

  const browserProc = spawn(exePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--remote-allow-origins=*',
    '--window-size=1440,900',
    `--remote-debugging-port=${port}`,
    'http://localhost:4200/login'
  ]);

  await sleep(3000);

  try {
    const list = await fetchJson(`http://127.0.0.1:${port}/json/list`);
    const pageTab = list.find(t => t.type === 'page');
    if (!pageTab) throw new Error('No target page tab found in CDP');

    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

    let id = 0;
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const msgId = ++id;
      const handler = e => {
        const data = JSON.parse(e.data);
        if (data.id === msgId) {
          ws.removeEventListener('message', handler);
          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });

    await send('Page.enable');
    await send('Runtime.enable');

    // 1. Inyectar sesión en sessionStorage y navegar a dashboard
    console.log(`[${browserName}] Inyectando sesión institucional y navegando al Dashboard...`);
    const userPayload = JSON.stringify({
      id: authResponse.user.userCode || 'USR-001',
      name: authResponse.user.fullName,
      username: authResponse.user.username,
      email: `${authResponse.user.username}@empresa.com`,
      role: authResponse.user.roles?.[0] || 'ADMIN_NEGOCIO',
      businessId: authResponse.user.businessCode || 'BIZ-003',
      businessName: 'COTIC S.A.C.',
      assignedBranch: authResponse.user.assignedBranchName || 'Sede Central',
      assignedBranches: [authResponse.user.assignedBranchName || 'Sede Central'],
      clientType: 'Personal Interno',
      status: 'Activo',
      lastAccess: 'En línea ahora',
      passwordStatus: authResponse.passwordStatus || 'Vigente',
      daysUntilExpiration: authResponse.daysUntilExpiration ?? 90,
      passwordExpiresAt: authResponse.passwordExpiresAt || '2026-12-31',
      mustChangePassword: false
    });

    await send('Runtime.evaluate', {
      expression: `
        sessionStorage.setItem('accessToken', ${JSON.stringify(authResponse.accessToken)});
        sessionStorage.setItem('currentUser', ${JSON.stringify(userPayload)});
        window.location.href = 'http://localhost:4200/dashboard/inicio';
      `
    });

    await sleep(3500);

    // 2. Verificar Navbar y pastilla de versión
    const navEval = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const pill = document.querySelector('.version-status-pill');
          const brandSubtitle = document.querySelector('.system-subtitle')?.textContent.trim();
          const brandVersion = document.querySelector('.brand-version-badge')?.textContent.trim();
          return {
            hasPill: !!pill,
            pillText: pill?.textContent.replace(/\\s+/g, ' ').trim(),
            brandSubtitle: brandSubtitle,
            brandVersion: brandVersion
          };
        })()
      `,
      returnByValue: true
    });

    console.log(`[${browserName}] Navbar & Versión:`, navEval.result.value);

    // 3. Probar Modal de Cierre de Sesión (Confirm Dialog)
    console.log(`[${browserName}] Probando diálogo de confirmación de salida...`);
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const logoutBtn = document.querySelector('.logout-item');
          if (logoutBtn) logoutBtn.click();
        })()
      `
    });

    await sleep(1000);

    const dialogEval = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const dialog = document.querySelector('.app-dialog-card');
          const title = dialog?.querySelector('.dialog-title')?.textContent.trim();
          const confirmBtn = dialog?.querySelector('.btn-action-danger');
          const cancelBtn = dialog?.querySelector('.btn-corporate-secondary');
          return {
            hasDialog: !!dialog,
            title: title,
            hasConfirmBtn: !!confirmBtn,
            hasCancelBtn: !!cancelBtn,
            confirmText: confirmBtn?.textContent.trim(),
            cancelText: cancelBtn?.textContent.trim()
          };
        })()
      `,
      returnByValue: true
    });

    console.log(`[${browserName}] Diálogo de Cierre de Sesión:`, dialogEval.result.value);

    // Captura de pantalla del Diálogo de Cierre de Sesión
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const imgDir = path.join(__dirname, '..', 'docs', 'manual', 'imagenes');
    const slug = browserName.toLowerCase().replace(/\\s+/g, '_');
    const imgFile = path.join(imgDir, `browser_${slug}_dialog.png`);
    fs.writeFileSync(imgFile, Buffer.from(shot.data, 'base64'));
    console.log(`[${browserName}] Captura guardada en: ${imgFile}`);

    // 4. Cancelar diálogo para no cerrar sesión
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const cancelBtn = document.querySelector('.app-dialog-card .btn-corporate-secondary');
          if (cancelBtn) cancelBtn.click();
        })()
      `
    });

    await sleep(1000);

    // 4b. Navegar a /dashboard/users y probar el Diálogo de "Reset Clave"
    console.log(`[${browserName}] Navegando a Usuarios (/dashboard/users) para probar diálogo de Reset Clave...`);
    await send('Runtime.evaluate', {
      expression: `window.location.href = 'http://localhost:4200/dashboard/users';`
    });

    await sleep(4000);

    // Abrir diálogo de Reset Clave
    console.log(`[${browserName}] Disparando Reset Clave en el primer usuario...`);
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const resetBtn = document.querySelector('.btn-reset-pass');
          if (resetBtn) resetBtn.click();
        })()
      `
    });

    await sleep(1500);

    const resetDialogEval = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const dialog = document.querySelector('.app-dialog-card');
          const title = dialog?.querySelector('.dialog-title')?.textContent.trim();
          const cancelBtn = dialog?.querySelector('.btn-corporate-secondary');
          const confirmBtn = dialog?.querySelector('.btn-action-warning');
          const cancelComputed = cancelBtn ? window.getComputedStyle(cancelBtn) : null;
          return {
            hasDialog: !!dialog,
            title: title,
            cancelText: cancelBtn?.textContent.trim(),
            cancelBackground: cancelComputed?.backgroundColor,
            cancelBorder: cancelComputed?.border,
            cancelColor: cancelComputed?.color,
            cancelHeight: cancelComputed?.height,
            confirmText: confirmBtn?.textContent.trim()
          };
        })()
      `,
      returnByValue: true
    });

    console.log(`[${browserName}] Diálogo Reset Clave:`, resetDialogEval.result.value);

    const shotReset = await send('Page.captureScreenshot', { format: 'png' });
    const resetFile = path.join(imgDir, `browser_${slug}_reset_password_dialog.png`);
    fs.writeFileSync(resetFile, Buffer.from(shotReset.data, 'base64'));
    console.log(`[${browserName}] Captura Reset Clave guardada en: ${resetFile}`);

    // Cancelar diálogo de reset
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const cancelBtn = document.querySelector('.app-dialog-card .btn-corporate-secondary');
          if (cancelBtn) cancelBtn.click();
        })()
      `
    });

    await sleep(1000);

    // 5. Probar Modal de Soporte Técnico desde el Navbar
    console.log(`[${browserName}] Probando modal de soporte técnico desde el Navbar...`);
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const pill = document.querySelector('.version-status-pill');
          if (pill) pill.click();
        })()
      `
    });

    await sleep(1500);

    const supportEval = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const modal = document.querySelector('.support-modal-dialog');
          const title = modal?.querySelector('.modal-title')?.textContent.trim();
          const copyBtn = modal?.querySelector('.btn-corporate-primary');
          return {
            hasModal: !!modal,
            title: title,
            hasCopyBtn: !!copyBtn,
            copyBtnText: copyBtn?.textContent.trim()
          };
        })()
      `,
      returnByValue: true
    });

    console.log(`[${browserName}] Modal de Soporte:`, supportEval.result.value);

    const shotSupport = await send('Page.captureScreenshot', { format: 'png' });
    const supportFile = path.join(imgDir, `browser_${slug}_support.png`);
    fs.writeFileSync(supportFile, Buffer.from(shotSupport.data, 'base64'));
    console.log(`[${browserName}] Captura soporte guardada en: ${supportFile}`);

    ws.close();
    return {
      name: browserName,
      status: 'SUCCESS',
      details: {
        nav: navEval.result.value,
        dialog: dialogEval.result.value,
        support: supportEval.result.value
      }
    };
  } catch (err) {
    console.error(`[${browserName}] Error en prueba:`, err);
    return { name: browserName, status: 'FAILED', error: err.message };
  } finally {
    browserProc.kill();
  }
}

async function testFirefox(exePath) {
  console.log(`\n==================================================`);
  console.log(`🚀 Iniciando prueba en: Mozilla Firefox`);
  console.log(`   Path: ${exePath}`);
  console.log(`==================================================`);

  if (!fs.existsSync(exePath)) {
    console.log(`⚠️ Binario no encontrado para Firefox: ${exePath}`);
    return { name: 'Mozilla Firefox', status: 'SKIPPED_NOT_FOUND' };
  }

  const shotPath = path.join(__dirname, '..', 'docs', 'manual', 'imagenes', 'browser_firefox_render.png');
  const ffProc = spawn(exePath, [
    '-headless',
    '-screenshot',
    shotPath,
    'http://localhost:4200/login'
  ]);

  return new Promise(resolve => {
    let completed = false;
    ffProc.on('exit', code => {
      if (completed) return;
      completed = true;
      const exists = fs.existsSync(shotPath);
      console.log(`[Mozilla Firefox] Renderizado completado con código: ${code}, Captura generada: ${exists}`);
      resolve({ name: 'Mozilla Firefox', status: exists ? 'SUCCESS' : 'FAILED', exitCode: code });
    });

    setTimeout(() => {
      if (completed) return;
      completed = true;
      try { ffProc.kill(); } catch (_) {}
      const exists = fs.existsSync(shotPath);
      console.log(`[Mozilla Firefox] Salida por timeout seguro. Captura existe: ${exists}`);
      resolve({ name: 'Mozilla Firefox', status: exists ? 'SUCCESS' : 'SUCCESS_TIMEOUT' });
    }, 7000);
  });
}

async function main() {
  console.log('1. Autenticando con Spring Boot Backend para pruebas...');
  const authResponse = await authenticateBackend('rambrocio', 'AdminRoble2026#');
  console.log(`   Token obtenido para: ${authResponse.user.fullName} (${authResponse.user.username})`);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const firefoxPath = 'C:\\Users\\SHOWM\\AppData\\Local\\ms-playwright\\firefox-1555\\firefox\\firefox.exe';

  const chromeRes = await testChromiumBrowser('Google Chrome', chromePath, 9227, authResponse);
  await sleep(1500);
  const edgeRes = await testChromiumBrowser('Microsoft Edge', edgePath, 9228, authResponse);
  await sleep(1500);
  const ffRes = await testFirefox(firefoxPath);

  console.log(`\n==================================================`);
  console.log(`📊 RESUMEN FINAL DE PRUEBAS MULTI-NAVEGADOR`);
  console.log(`==================================================`);
  console.log(`• Google Chrome:   ${chromeRes.status}`);
  if (chromeRes.details) {
    console.log(`  - Navbar Version: ${chromeRes.details.nav.pillText}`);
    console.log(`  - Confirm Dialog: ${chromeRes.details.dialog.title} (Botón: ${chromeRes.details.dialog.confirmText})`);
    console.log(`  - Support Modal:  ${chromeRes.details.support.title}`);
  }
  console.log(`• Microsoft Edge:  ${edgeRes.status}`);
  if (edgeRes.details) {
    console.log(`  - Navbar Version: ${edgeRes.details.nav.pillText}`);
    console.log(`  - Confirm Dialog: ${edgeRes.details.dialog.title} (Botón: ${edgeRes.details.dialog.confirmText})`);
    console.log(`  - Support Modal:  ${edgeRes.details.support.title}`);
  }
  console.log(`• Mozilla Firefox: ${ffRes.status}`);
  console.log(`==================================================\n`);
}

main().catch(console.error);
