// api/handler.js — Master Proxy (via vercel.json routes)
// /api/(.*) → /api/handler?_path=$1

const CLOB_AUTH = ['content-type','poly_address','poly_signature','poly_timestamp','poly_nonce','poly_api_key','poly_passphrase'];
const CLOB_BASE = 'https://clob.polymarket.com';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin','*');
    res.setHeader('Access-Control-Allow-Methods','GET,POST,DELETE,PUT,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers','*');
    return res.status(200).end();
  }
  res.setHeader('Access-Control-Allow-Origin','*');

  const rawPath = decodeURIComponent(req.query._path || '');
  const segs = rawPath.split('/').filter(Boolean);
  const service = segs[0] || '';
  const subPath = segs.length > 1 ? '/' + segs.slice(1).join('/') : '/';

  const qp = new URLSearchParams();
  for (const [k,v] of Object.entries(req.query)) {
    if (k !== '_path') qp.append(k,v);
  }
  const qs = qp.toString() ? '?'+qp.toString() : '';

  // ── Gamma/Markets → use CLOB markets (public, no auth needed) ──────────
  if (service === 'gamma' && subPath.startsWith('/markets')) {
    res.setHeader('Cache-Control','s-maxage=30,stale-while-revalidate=60');
    try {
      const r = await fetch(CLOB_BASE + '/markets?next_cursor=MA==' + (qs ? '&' + qs.slice(1) : ''), {
        headers:{'Accept':'application/json'}
      });
      if (!r.ok) throw new Error('CLOB markets '+r.status);
      const d = await r.json();
      // CLOB format: {data: [...markets], next_cursor: "..."}
      const markets = d.data || d || [];
      return res.status(200).json(markets);
    } catch(err) { return res.status(502).json({error:'Markets error',message:err.message}); }
  }

  // ── Generic CLOB / Gamma proxy ──────────────────────────────────────────
  const bases = {
    gamma: 'https://gamma-api.polymarket.com',
    clob:  CLOB_BASE
  };
  const base = bases[service];
  if (!base) return res.status(404).json({error:'Unknown service: '+service, path: rawPath});

  const target = base + subPath + qs;
  const fwd = {'Accept':'application/json'};

  if (service === 'clob') {
    for (const h of CLOB_AUTH) {
      const v = req.headers[h] || req.headers[h.toLowerCase()];
      if (v) fwd[h.toUpperCase()] = v;
    }
  }

  let body;
  if (['POST','DELETE','PUT'].includes(req.method)) {
    body = JSON.stringify(req.body);
    fwd['CONTENT-TYPE'] = 'application/json';
  }

  try {
    const up = await fetch(target, {method:req.method, headers:fwd, body});
    const ct = up.headers.get('content-type') || '';
    const data = ct.includes('json') ? await up.json() : await up.text();
    res.setHeader('Cache-Control', service==='clob' ? 'no-store' : 's-maxage=30,stale-while-revalidate=60');
    return res.status(up.status).json(data);
  } catch(err) {
    return res.status(502).json({error:service+' error', message:err.message});
  }
}
