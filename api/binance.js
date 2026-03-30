// api/binance.js — Proxy to Binance public API
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).end();
  }

  const url     = new URL(req.url, 'http://localhost');
  const subpath = url.pathname.replace(/^\/api\/binance/, '') || '/';
  const search  = url.search || '';
  const target  = `https://api.binance.com/api/v3${subpath}${search}`;

  try {
    const upstream = await fetch(target, {
      headers: { 'Accept': 'application/json' },
    });

    const data = await upstream.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=20');
    return res.status(upstream.status).json(data);
  } catch (err) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(502).json({ error: 'Binance upstream error', message: err.message });
  }
}
