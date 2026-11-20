const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function loginApi() {
  const passwords = ['Cotic2026#', 'AdminRoble2026#'];
  for (const password of passwords) {
    try {
      const res = await new Promise((resolve, reject) => {
        const data = JSON.stringify({ username: 'rambrocio', password });
        const req = http.request('http://localhost:8080/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
        }, r => {
          let b = ''; r.on('data', d => b += d);
          r.on('end', () => {
            if (r.statusCode === 200) resolve(JSON.parse(b));
            else reject(new Error(`Status ${r.statusCode}: ${b}`));
          });
        });
        req.on('error', reject);
        req.write(data); req.end();
      });
      console.log(`Autenticado exitosamente con clave: ${password}`);
      return res;
    } catch (e) {
      console.log(`Fallo intento con ${password}: ${e.message}`);
    }
  }
  throw new Error('No se pudo autenticar a rambrocio con ninguna de las contraseñas.');
}

async function run() {
  const authResponse = await loginApi();
  console.log('Usuario autenticado:', authResponse.user?.fullName);

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edgeProcess = spawn(edgePath, [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--remote-allow-origins=*',
    '--window-size=1440,900',
    '--remote-debugging-port=9222',
    'http://localhost:4200/dashboard/products/list'
  ]);

  await sleep(2500);

  try {
    const list = await new Promise((res, rej) => {
      http.get('http://127.0.0.1:9222/json/list', r => {
        let d = ''; r.on('data', c => d += c);
        r.on('end', () => res(JSON.parse(d)));
      }).on('error', rej);
    });

    const page = list.find(t => t.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
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

    await send('Runtime.evaluate', {
      expression: `
        sessionStorage.setItem('accessToken', ${JSON.stringify(authResponse.accessToken)});
        sessionStorage.setItem('currentUser', ${JSON.stringify(JSON.stringify(authResponse.user))});
        sessionStorage.setItem('currentUserProfile', ${JSON.stringify(JSON.stringify(authResponse.user))});
      `
    });

    // 1. Capturar Piscano Histórico
    console.log('Navegando a productos list...');
    await send('Page.navigate', { url: 'http://localhost:4200/dashboard/products/list' });
    await sleep(2500);

    // Buscar Piscano y clickear en su botón de histórico
    const clickResult = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const rows = Array.from(document.querySelectorAll('tr'));
          const piscanoRow = rows.find(r => r.innerText.includes('Piscano') || r.innerText.includes('PRD-118'));
          if (piscanoRow) {
            const btn = piscanoRow.querySelector('.btn-history') || piscanoRow.querySelector('button[title*="histórico" i]') || piscanoRow.querySelector('button i.bi-clock-history')?.closest('button');
            if (btn) {
              btn.click();
              return 'Piscano history button clicked';
            }
            return 'Piscano row found, but no history button';
          }
          // Si no está en la primera página, intentar buscar en el input de búsqueda
          const searchInput = document.querySelector('input[placeholder*="Buscar" i]') || document.querySelector('input[type="search"]') || document.querySelector('input.form-control');
          if (searchInput) {
            searchInput.value = 'Piscano';
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            return 'Search filtered for Piscano';
          }
          return 'No Piscano found';
        })()
      `
    });
    console.log('Resultado de búsqueda/clic Piscano:', clickResult.result?.value);

    // Si filtró, esperar un momento y clickear el botón
    await sleep(1500);
    const clickAfterSearch = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const rows = Array.from(document.querySelectorAll('tr'));
          const piscanoRow = rows.find(r => r.innerText.includes('Piscano') || r.innerText.includes('PRD-118'));
          if (piscanoRow) {
            const btn = piscanoRow.querySelector('.btn-history') || piscanoRow.querySelector('button[title*="histórico" i]') || piscanoRow.querySelector('button i.bi-clock-history')?.closest('button');
            if (btn) {
              btn.click();
              return 'Clicked Piscano history button after filter';
            }
          }
          const anyHistory = document.querySelector('.btn-history');
          if (anyHistory) {
            anyHistory.click();
            return 'Fallback clicked first history button';
          }
          return 'No button clicked';
        })()
      `
    });
    console.log('Segundo clic modal:', clickAfterSearch.result?.value);
    await sleep(2000);

    const shotPiscano = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('docs/manual/imagenes/05b_historico_producto_modal.png', Buffer.from(shotPiscano.data, 'base64'));
    console.log('✅ Captura 05b_historico_producto_modal.png guardada con éxito!');

    // 2. Capturar Módulo 15: Sesiones Activas
    console.log('Navegando a sesiones...');
    await send('Page.navigate', { url: 'http://localhost:4200/dashboard/sessions' });
    await sleep(2500);

    const shotSessions = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('docs/manual/imagenes/15_sesiones_activas.png', Buffer.from(shotSessions.data, 'base64'));
    console.log('✅ Captura 15_sesiones_activas.png guardada con éxito!');

    ws.close();
  } finally {
    edgeProcess.kill();
  }
}

run().catch(console.error);
