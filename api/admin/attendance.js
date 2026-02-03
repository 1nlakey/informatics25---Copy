const supabase = require('../../lib/supabase');
const { requireAdmin } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (!requireAdmin(req, res)) return;

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('attendance').select('id, name, at').order('id', { ascending: true });
    if (error) {
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: error.message }));
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ items: data }));
  }

  if (req.method === 'POST') {
    // Expect body like { ids: [1,2,3] }
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
        const { error } = await supabase.from('attendance').delete().in('id', ids);
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
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'Not Found' }));
};
