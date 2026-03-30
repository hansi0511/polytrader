// api/gamma/[...path].js — Catch-all proxy to Polymarket Gamma API
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).end();
  }

  const pathSegments = req.query.path || [];
  const subpath = '/' + (Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments);

  const queryParams = new URLSearchParams();
  for (const [key, val] of Object.entries(req.query)) {
    if (key !== 'path') queryParams.append(key, val);
  }
  const search = queryParams.toString() ? '?' + queryParams.toString() : '';
  const target = `https://gamma-api.polymarket.com${subpath}${search}`;

  try {
    const upstream = await fetch(target, { headers: { 'Accept': 'application/json' } });
    const ct = upstream.headers.get('content-type') || '';
    const data = ct.includes('json') ? await upstream.json() : await upstream.text();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    return res.status(upstream.status).json(data);
  } catch (err) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(502).json({ error: 'Gamma API error', message: err.message });
  }
}
