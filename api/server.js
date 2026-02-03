const { URL } = require('url');

// Route table: map pathname -> handler (handler is a function (req,res))
const routes = {
  '/api/config': require('../lib/handlers/config'),
  '/api/attendance': require('../lib/handlers/attendance'),
  '/api/quiz': require('../lib/handlers/quiz'),
  '/api/messages': require('../lib/handlers/messages'),
  '/api/winners': require('../lib/handlers/winners'),
  // admin
  '/api/admin/attendance': require('../lib/handlers/admin/attendance'),
  '/api/admin/attendance/delete': require('../lib/handlers/admin/attendance/delete'),
  '/api/admin/quiz': require('../lib/handlers/admin/quiz'),
  '/api/admin/quiz/delete': require('../lib/handlers/admin/quiz/delete'),
  '/api/admin/messages': require('../lib/handlers/admin/messages'),
  '/api/admin/messages/delete': require('../lib/handlers/admin/messages/delete'),
  '/api/admin/unlock': require('../lib/handlers/admin/unlock'),
  '/api/admin/quiz-answer': require('../lib/handlers/admin/quiz-answer'),
};

module.exports = (req, res) => {
  // normalize pathname
  const host = req.headers.host || 'localhost';
  const url = new URL(req.url, `http://${host}`);
  const pathname = url.pathname;

  const handler = routes[pathname];
  if (!handler) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Not Found' }));
    return;
  }

  // Delegate to handler; handlers are written to read request body themselves.
  try {
    return handler(req, res);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: String(err && err.message ? err.message : err) }));
  }
};
