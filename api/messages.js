const supabase = require('../lib/supabase');

function parseBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8') || '{}';
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
  });
}

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    // check config unlock
    const { data: cfg } = await supabase.from('config').select('*').limit(1).single().catch(() => ({ data: null }));
    if (!cfg || !cfg.unlock_messages) {
      res.statusCode = 403;
      return res.end(JSON.stringify({ error: 'Form pesan & kesan belum dibuka' }));
    }
    const body = req.body || (await parseBody(req));
    const name = (body && body.name) ? String(body.name).trim() : '';
    const message = (body && body.message) ? String(body.message).trim() : '';
    if (!name || !message) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'Nama dan pesan wajib diisi' }));
    }
    const { error } = await supabase.from('messages').insert([{ name, message }]);
    if (error) {
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: error.message }));
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ ok: true }));
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('messages').select('id, name, message, at').order('id', { ascending: true });
    if (error) {
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: error.message }));
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ messages: data }));
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'Not Found' }));
};
