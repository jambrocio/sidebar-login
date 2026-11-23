const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const HTML_FILE = path.resolve(__dirname, '..', 'docs', 'manual', 'index.html');
const PDF_FILE = path.resolve(__dirname, '..', 'docs', 'manual', 'MANUAL_DE_USUARIO_COTIC.pdf');

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
  console.log('1. Iniciando Edge Headless para generación de PDF...');
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edgeProcess = spawn(edgePath, [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--remote-allow-origins=*',
    '--window-size=1440,900',
    '--remote-debugging-port=9224',
    `file:///${HTML_FILE.replace(/\\/g, '/')}`
  ]);

  await sleep(2500);

  try {
    const list = await fetchJson('http://127.0.0.1:9224/json/list');
    const pageTab = list.find(t => t.type === 'page');
    if (!pageTab) throw new Error('No se encontró pestaña tipo page en Edge');
    console.log('Pestaña conectada:', pageTab.id, pageTab.url);

    const cdp = new CdpClient(pageTab.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    console.log('2. Esperando carga de todos los assets y fuentes...');
    await cdp.send('Runtime.evaluate', {
      expression: `
        new Promise(resolve => {
          // Forzar carga de todas las imágenes
          const images = Array.from(document.querySelectorAll('img'));
          images.forEach(img => {
            img.removeAttribute('loading');
          });
          const promises = images.map(img => {
            if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
            return new Promise(res => {
              img.onload = img.onerror = res;
            });
          });
          Promise.all(promises).then(() => {
            // Esperar que document.fonts termine
            if (document.fonts && document.fonts.ready) {
              document.fonts.ready.then(resolve);
            } else {
              resolve();
            }
          });
        })
      `,
      awaitPromise: true
    });

    await sleep(2000);

    console.log('3. Generando documento PDF a partir de index.html...');
    const pdf = await cdp.send('Page.printToPDF', {
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      paperWidth: 8.27, // A4 estándar
      paperHeight: 11.69,
      marginTop: 0.4,
      marginBottom: 0.4,
      marginLeft: 0.4,
      marginRight: 0.4
    });

    const pdfBuffer = Buffer.from(pdf.data, 'base64');
    fs.writeFileSync(PDF_FILE, pdfBuffer);
    const sizeMb = (pdfBuffer.length / (1024 * 1024)).toFixed(2);
    console.log(`¡PDF generado exitosamente en ${PDF_FILE}! Tamaño: ${sizeMb} MB`);

    cdp.close();
  } finally {
    edgeProcess.kill();
  }
}

main().catch(err => {
  console.error('Error generando PDF:', err);
  process.exit(1);
});
