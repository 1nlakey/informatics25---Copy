const supabase = require('../supabase');

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
    const body = req.body || (await parseBody(req));
    const name = (body && body.name) ? String(body.name).trim() : '';
    if (!name) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'Nama wajib diisi' }));
    }
    const { error } = await supabase.from('attendance').insert([{ name }]);
    if (error) {
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: error.message }));
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ ok: true }));
  }
  // For other methods, explicitly return 405 Method Not Allowed
  res.statusCode = 405;
  res.setHeader('Allow', 'POST');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ error: 'Method Not Allowed' }));
};
