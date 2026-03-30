// api/clob.js — Proxy to Polymarket CLOB API (clob.polymarket.com)
// Transparently forwards Polymarket auth headers so signing stays client-side.

const CLOB_BASE = 'https://clob.polymarket.com';

// Headers to forward from client → upstream
const FORWARD_HEADERS = [
  'content-type',
  'poly_address',
  'poly_signature',
  'poly_timestamp',
  'poly_nonce',
  'poly_api_key',
  'poly_passphrase',
];

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,PUT,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    return res.status(200).end();
  }

  // Build upstream path — strip /api/clob prefix
  const url     = new URL(req.url, 'http://localhost');
  const subpath = url.pathname.replace(/^\/api\/clob/, '') || '/';
  const search  = url.search || '';
  const target  = `${CLOB_BASE}${subpath}${search}`;

  // Forward allowed auth headers
  const fwdHeaders = { 'Accept': 'application/json' };
  for (const h of FORWARD_HEADERS) {
    const v = req.headers[h] || req.headers[h.toLowerCase()];
    if (v) fwdHeaders[h.toUpperCase()] = v;
  }

  // Body for POST/DELETE
  let body = undefined;
  if (['POST','DELETE','PUT'].includes(req.method)) {
    body = JSON.stringify(req.body);
    fwdHeaders['CONTENT-TYPE'] = 'application/json';
  }

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers: fwdHeaders,
      body,
    });

    const ct   = upstream.headers.get('content-type') || '';
    const data = ct.includes('json') ? await upstream.json() : await upstream.text();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(upstream.status).json(data);
  } catch (err) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(502).json({ error: 'CLOB upstream error', message: err.message });
  }
}
