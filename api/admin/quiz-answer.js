const supabase = require('../../lib/supabase');
const { requireAdmin } = require('../../lib/auth');

async function parseBody(req) {
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
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'POST') {
    res.statusCode = 404;
    return res.end(JSON.stringify({ error: 'Not Found' }));
  }
  const body = await parseBody(req);
  const answer = String(body.answer || '').trim();
  const { data: cfg } = await supabase.from('config').select('*').limit(1).single().catch(() => ({ data: null }));
  if (!cfg) {
    const ins = await supabase.from('config').insert([{ unlock_messages: false, quiz_answer: answer }]);
    if (ins.error) {
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: ins.error.message }));
    }
    const { data: fresh } = await supabase.from('config').select('*').limit(1).single();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ ok: true, quiz_answer: fresh.quiz_answer }));
  }
  const { error } = await supabase.from('config').update({ quiz_answer: answer }).eq('id', cfg.id);
  if (error) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: error.message }));
  }
  const { data: updated } = await supabase.from('config').select('*').eq('id', cfg.id).single();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.end(JSON.stringify({ ok: true, quiz_answer: updated.quiz_answer }));
};
