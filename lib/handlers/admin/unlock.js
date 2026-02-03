const supabase = require('../../supabase');
const { requireAdmin } = require('../../auth');

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
  const unlock = body && (body.unlock === true || body.unlock === 'true');
  // ensure config exists
  const { data: cfg } = await supabase.from('config').select('*').limit(1).single().catch(() => ({ data: null }));
  if (!cfg) {
    const ins = await supabase.from('config').insert([{ unlock_messages: !!unlock, quiz_answer: '' }]);
    if (ins.error) {
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: ins.error.message }));
    }
    const { data: fresh } = await supabase.from('config').select('*').limit(1).single();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ ok: true, unlock_messages: fresh.unlock_messages }));
  }
  const { error } = await supabase.from('config').update({ unlock_messages: !!unlock }).eq('id', cfg.id);
  if (error) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: error.message }));
  }
  const { data: updated } = await supabase.from('config').select('*').eq('id', cfg.id).single();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.end(JSON.stringify({ ok: true, unlock_messages: updated.unlock_messages }));
};
