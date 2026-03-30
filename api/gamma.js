// api/gamma.js — Proxy to Polymarket Gamma Markets API
export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    return res.status(200).end();
  }

  // Build path from URL - strip /api/gamma prefix
  const url = new URL(req.url, 'http://localhost');
  const subpath = url.pathname.replace(/^\/api\/gamma/, '') || '/markets';
  const search  = url.search || '';

  const target = `https://gamma-api.polymarket.com${subpath}${search}`;

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    const contentType = upstream.headers.get('content-type') || 'application/json';
    const data = contentType.includes('json') ? await upstream.json() : await upstream.text();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    res.status(upstream.status).json(data);
  } catch (err) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(502).json({ error: 'Gamma API upstream error', message: err.message });
  }
}
