const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run() {
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

    const loginRes = await new Promise((resolve, reject) => {
      const data = JSON.stringify({ username: 'rambrocio', password: 'AdminRoble2026#' });
      const req = http.request('http://localhost:8080/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
      }, res => {
        let b = ''; res.on('data', d => b += d);
        res.on('end', () => resolve(JSON.parse(b)));
      });
      req.on('error', reject);
      req.write(data); req.end();
    });

    await send('Runtime.evaluate', {
      expression: `
        sessionStorage.setItem('accessToken', ${JSON.stringify(loginRes.accessToken)});
        sessionStorage.setItem('currentUser', ${JSON.stringify(JSON.stringify(loginRes.user))});
        sessionStorage.setItem('currentUserProfile', ${JSON.stringify(JSON.stringify(loginRes.user))});
      `
    });

    await send('Page.navigate', { url: 'http://localhost:4200/dashboard/products/list' });
    await sleep(2200);

    // Clic en el primer botón de histórico
    await send('Runtime.evaluate', {
      expression: `
        const btn = document.querySelector('.btn-history');
        if (btn) btn.click();
      `
    });
    await sleep(1200);

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('docs/manual/imagenes/05b_historico_producto_modal.png', Buffer.from(shot.data, 'base64'));
    console.log('Captura 05b_historico_producto_modal.png guardada con éxito!');
    ws.close();
  } finally {
    edgeProcess.kill();
  }
}

run().catch(console.error);
