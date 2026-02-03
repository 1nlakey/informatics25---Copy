const supabase = require('../../../lib/supabase');
const { requireAdmin } = require('../../../lib/auth');

module.exports = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'POST') {
    res.statusCode = 404;
    return res.end(JSON.stringify({ error: 'Not Found' }));
  }
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', async () => {
    try {
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
      const ids = Array.isArray(body.ids) ? body.ids : [];
      if (!ids.length) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: 'IDs tidak valid' }));
      }
      const { error } = await supabase.from('messages').delete().in('id', ids);
      if (error) {
        res.statusCode = 500;
        return res.end(JSON.stringify({ error: error.message }));
      }
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ ok: true }));
    } catch (e) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'Bad Request' }));
    }
  });
};
