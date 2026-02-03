const supabase = require('../supabase');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.statusCode = 404;
    return res.end(JSON.stringify({ error: 'Not Found' }));
  }
  const { data: cfg } = await supabase.from('config').select('*').limit(1).single().catch(() => ({ data: null }));
  const listRes = await supabase.from('quiz_entries').select('id, name, answer, at');
  if (listRes.error) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: listRes.error.message }));
  }
  const list = listRes.data || [];
  const correct = (cfg && cfg.quiz_answer)
    ? list.filter((e) => String(e.answer || '').toLowerCase().trim() === String(cfg.quiz_answer || '').toLowerCase().trim())
    : [];
  const winner = correct.length > 0 ? correct[Math.floor(Math.random() * correct.length)] : null;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.end(JSON.stringify({ correct, winner }));
};
