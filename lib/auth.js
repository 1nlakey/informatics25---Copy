function getReqSecret(req) {
  const hdr = req.headers['x-admin-secret'] || req.headers['X-Admin-Secret'] || '';
  if (hdr) return hdr;
  const auth = req.headers['authorization'] || req.headers['Authorization'] || '';
  if (!auth) return '';
  const parts = String(auth).split(' ');
  return parts.length === 2 && parts[0].toLowerCase() === 'bearer' ? parts[1] : '';
}

function requireAdmin(req, res) {
  const secret = process.env.ADMIN_SECRET || '';
  const token = getReqSecret(req);
  if (!secret || !token || token !== secret) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return false;
  }
  return true;
}

module.exports = { requireAdmin };
