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

async function ensureConfig() {
  const { data } = await supabase.from('config').select('*').limit(1).single().catch(() => ({ data: null }));
  if (!data) {
    await supabase.from('config').insert([{ unlock_messages: false, quiz_answer: '' }]);
    const { data: newData } = await supabase.from('config').select('*').limit(1).single();
    return newData;
  }
  return data;
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const cfg = await ensureConfig();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify(cfg));
  }

  if (req.method === 'POST') {
    const { requireAdmin } = require('../lib/auth');
    if (!requireAdmin(req, res)) return;
    // Update config fields. Body may contain unlock or answer keys.
    const body = req.body || (await parseBody(req));
    const fields = {};
    if (body.hasOwnProperty('unlock')) fields.unlock_messages = (body.unlock === true || body.unlock === 'true');
    if (body.hasOwnProperty('answer')) fields.quiz_answer = String(body.answer || '').trim();
    const cfg = await ensureConfig();
    const { error } = await supabase.from('config').update(fields).eq('id', cfg.id);
    if (error) {
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: error.message }));
    }
    const { data: updated } = await supabase.from('config').select('*').eq('id', cfg.id).single();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ ok: true, ...updated }));
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'Not Found' }));
};
