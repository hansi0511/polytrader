// api/clob/[...path].js — Catch-all proxy to Polymarket CLOB API
const CLOB_BASE = 'https://clob.polymarket.com';

const FORWARD_HEADERS = [
  'content-type','poly_address','poly_signature',
  'poly_timestamp','poly_nonce','poly_api_key','poly_passphrase',
];

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,PUT,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    return res.status(200).end();
  }

  const pathSegments = req.query.path || [];
  const subpath = '/' + (Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments);

  const queryParams = new URLSearchParams();
  for (const [key, val] of Object.entries(req.query)) {
    if (key !== 'path') queryParams.append(key, val);
  }
  const search = queryParams.toString() ? '?' + queryParams.toString() : '';
  const target = `${CLOB_BASE}${subpath}${search}`;

  const fwdHeaders = { 'Accept': 'application/json' };
  for (const h of FORWARD_HEADERS) {
    const v = req.headers[h] || req.headers[h.toLowerCase()];
    if (v) fwdHeaders[h.toUpperCase()] = v;
  }

  let body = undefined;
  if (['POST','DELETE','PUT'].includes(req.method)) {
    body = JSON.stringify(req.body);
    fwdHeaders['CONTENT-TYPE'] = 'application/json';
  }

  try {
    const upstream = await fetch(target, { method: req.method, headers: fwdHeaders, body });
    const ct = upstream.headers.get('content-type') || '';
    const data = ct.includes('json') ? await upstream.json() : await upstream.text();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(upstream.status).json(data);
  } catch (err) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(502).json({ error: 'CLOB upstream error', message: err.message });
  }
}
