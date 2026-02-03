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
    const body = req.body || (await parseBody(req));
    const name = (body && body.name) ? String(body.name).trim() : '';
    const answer = (body && body.answer) ? String(body.answer).trim() : '';
    if (!name || !answer) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'Nama dan jawaban wajib diisi' }));
    }
    const { error } = await supabase.from('quiz_entries').insert([{ name, answer }]);
    if (error) {
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: error.message }));
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ ok: true }));
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'Not Found' }));
};
