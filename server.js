const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DB_DIR = path.join(ROOT, 'db');
const CONFIG_PATH = path.join(DB_DIR, 'config.json');
const ATTENDANCE_PATH = path.join(DB_DIR, 'attendance.json');
const QUIZ_ENTRIES_PATH = path.join(DB_DIR, 'quiz_entries.json');
const MESSAGES_PATH = path.join(DB_DIR, 'messages.json');

function ensureDirsAndFiles() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(
      CONFIG_PATH,
      JSON.stringify({ unlock_messages: false, quiz_answer: '' }, null, 2),
      'utf-8'
    );
  }
  if (!fs.existsSync(ATTENDANCE_PATH)) fs.writeFileSync(ATTENDANCE_PATH, '[]', 'utf-8');
  if (!fs.existsSync(QUIZ_ENTRIES_PATH)) fs.writeFileSync(QUIZ_ENTRIES_PATH, '[]', 'utf-8');
  if (!fs.existsSync(MESSAGES_PATH)) fs.writeFileSync(MESSAGES_PATH, '[]', 'utf-8');
}

ensureDirsAndFiles();

function sendJSON(res, status, data) {
  const buf = Buffer.from(JSON.stringify(data));
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': buf.length,
  });
  res.end(buf);
}

function sendText(res, status, text, contentType = 'text/plain; charset=utf-8') {
  const buf = Buffer.from(text);
  res.writeHead(status, { 'Content-Type': contentType, 'Content-Length': buf.length });
  res.end(buf);
}

function serveStatic(req, res) {
  const parsed = url.parse(req.url);
  let filePath = path.join(PUBLIC_DIR, decodeURIComponent(parsed.pathname));
  if (parsed.pathname === '/' || parsed.pathname === '') {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }
  if (!filePath.startsWith(PUBLIC_DIR)) {
    return sendText(res, 400, 'Bad Request');
  }
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      return sendText(res, 404, 'Not Found');
    }
    const ext = path.extname(filePath).toLowerCase();
    const types = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
    };
    const ct = types[ext] || 'application/octet-stream';
    fs.readFile(filePath, (e, data) => {
      if (e) return sendText(res, 500, 'Internal Server Error');
      res.writeHead(200, { 'Content-Type': ct, 'Content-Length': data.length });
      res.end(data);
    });
  });
}

function parseBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf-8');
      const type = req.headers['content-type'] || '';
      if (type.includes('application/json')) {
        try {
          resolve(JSON.parse(raw || '{}'));
        } catch {
          resolve({});
        }
      } else if (type.includes('application/x-www-form-urlencoded')) {
        const obj = {};
        raw.split('&').forEach((pair) => {
          const [k, v] = pair.split('=');
          if (!k) return;
          obj[decodeURIComponent(k)] = decodeURIComponent((v || '').replace(/\+/g, ' '));
        });
        resolve(obj);
      } else {
        resolve({ raw });
      }
    });
  });
}

function readJSON(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data || '[]');
  } catch {
    if (filePath === CONFIG_PATH) return { unlock_messages: false, quiz_answer: '' };
    return [];
  }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function handleAPI(req, res) {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname || '';

  if (req.method === 'GET' && pathname === '/api/config') {
    const cfg = readJSON(CONFIG_PATH);
    return sendJSON(res, 200, cfg);
  }

  if (req.method === 'POST' && pathname === '/api/attendance') {
    return parseBody(req).then((body) => {
      const { name } = body;
      if (!name || String(name).trim().length === 0) {
        return sendJSON(res, 400, { error: 'Nama wajib diisi' });
      }
      const list = readJSON(ATTENDANCE_PATH);
      const entry = { name: String(name).trim(), at: new Date().toISOString() };
      list.push(entry);
      writeJSON(ATTENDANCE_PATH, list);
      return sendJSON(res, 200, { ok: true });
    });
  }

  if (req.method === 'GET' && pathname === '/api/admin/attendance') {
    const list = readJSON(ATTENDANCE_PATH);
    const withId = list.map((item, index) => ({
      id: index + 1,
      name: item.name,
      at: item.at,
    }));
    return sendJSON(res, 200, { items: withId });
  }

  if (req.method === 'POST' && pathname === '/api/admin/attendance/delete') {
    return parseBody(req).then((body) => {
      const { ids } = body;
      if (!Array.isArray(ids)) return sendJSON(res, 400, { error: 'IDs tidak valid' });
      const list = readJSON(ATTENDANCE_PATH);
      const kept = list.filter((_, index) => !ids.includes(index + 1));
      writeJSON(ATTENDANCE_PATH, kept);
      return sendJSON(res, 200, { ok: true });
    });
  }

  if (req.method === 'GET' && pathname === '/api/admin/quiz') {
    const list = readJSON(QUIZ_ENTRIES_PATH);
    const withId = list.map((item, index) => ({
      id: index + 1,
      name: item.name,
      answer: item.answer,
      at: item.at,
    }));
    return sendJSON(res, 200, { items: withId });
  }

  if (req.method === 'POST' && pathname === '/api/admin/quiz/delete') {
    return parseBody(req).then((body) => {
      const { ids } = body;
      if (!Array.isArray(ids)) return sendJSON(res, 400, { error: 'IDs tidak valid' });
      const list = readJSON(QUIZ_ENTRIES_PATH);
      const kept = list.filter((_, index) => !ids.includes(index + 1));
      writeJSON(QUIZ_ENTRIES_PATH, kept);
      return sendJSON(res, 200, { ok: true });
    });
  }

  if (req.method === 'GET' && pathname === '/api/admin/messages') {
    const list = readJSON(MESSAGES_PATH);
    const withId = list.map((item, index) => ({
      id: index + 1,
      name: item.name,
      message: item.message,
      at: item.at,
    }));
    return sendJSON(res, 200, { items: withId });
  }

  if (req.method === 'POST' && pathname === '/api/admin/messages/delete') {
    return parseBody(req).then((body) => {
      const { ids } = body;
      if (!Array.isArray(ids)) return sendJSON(res, 400, { error: 'IDs tidak valid' });
      const list = readJSON(MESSAGES_PATH);
      const kept = list.filter((_, index) => !ids.includes(index + 1));
      writeJSON(MESSAGES_PATH, kept);
      return sendJSON(res, 200, { ok: true });
    });
  }

  if (req.method === 'POST' && pathname === '/api/quiz') {
    return parseBody(req).then((body) => {
      const { name, answer } = body;
      if (!name || !answer) {
        return sendJSON(res, 400, { error: 'Nama dan jawaban wajib diisi' });
      }
      const list = readJSON(QUIZ_ENTRIES_PATH);
      const entry = {
        name: String(name).trim(),
        answer: String(answer).trim(),
        at: new Date().toISOString(),
      };
      list.push(entry);
      writeJSON(QUIZ_ENTRIES_PATH, list);
      return sendJSON(res, 200, { ok: true });
    });
  }

  if (req.method === 'GET' && pathname === '/api/winners') {
    const cfg = readJSON(CONFIG_PATH);
    const list = readJSON(QUIZ_ENTRIES_PATH);
    const correct = cfg.quiz_answer
      ? list.filter((e) => e.answer.toLowerCase().trim() === String(cfg.quiz_answer).toLowerCase().trim())
      : [];
    const winner =
      correct.length > 0 ? correct[Math.floor(Math.random() * correct.length)] : null;
    return sendJSON(res, 200, { correct, winner });
  }

  if (req.method === 'POST' && pathname === '/api/messages') {
    const cfg = readJSON(CONFIG_PATH);
    if (!cfg.unlock_messages) {
      return sendJSON(res, 403, { error: 'Form pesan & kesan belum dibuka' });
    }
    return parseBody(req).then((body) => {
      const { name, message } = body;
      if (!name || !message) {
        return sendJSON(res, 400, { error: 'Nama dan pesan wajib diisi' });
      }
      const list = readJSON(MESSAGES_PATH);
      const entry = { name: String(name).trim(), message: String(message).trim(), at: new Date().toISOString() };
      list.push(entry);
      writeJSON(MESSAGES_PATH, list);
      return sendJSON(res, 200, { ok: true });
    });
  }

  if (req.method === 'GET' && pathname === '/api/messages') {
    const list = readJSON(MESSAGES_PATH);
    return sendJSON(res, 200, { messages: list });
  }

  if (req.method === 'POST' && pathname === '/api/admin/unlock') {
    return parseBody(req).then((body) => {
      const { unlock } = body;
      const cfg = readJSON(CONFIG_PATH);
      cfg.unlock_messages = Boolean(unlock === 'true' || unlock === true);
      writeJSON(CONFIG_PATH, cfg);
      return sendJSON(res, 200, { ok: true, unlock_messages: cfg.unlock_messages });
    });
  }

  if (req.method === 'POST' && pathname === '/api/admin/quiz-answer') {
    return parseBody(req).then((body) => {
      const { answer } = body;
      const cfg = readJSON(CONFIG_PATH);
      cfg.quiz_answer = String(answer || '').trim();
      writeJSON(CONFIG_PATH, cfg);
      return sendJSON(res, 200, { ok: true, quiz_answer: cfg.quiz_answer });
    });
  }

  return false;
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url);
  if ((parsed.pathname || '').startsWith('/api/')) {
    const handled = handleAPI(req, res);
    if (handled === false) {
      sendText(res, 404, 'Not Found');
    }
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
