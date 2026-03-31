// api/[...path].js — Master Proxy Router
// Routes: /api/btc/* → Kraken, /api/gamma/* → Polymarket GraphQL, /api/clob/* → CLOB

const CLOB_AUTH = ['content-type','poly_address','poly_signature','poly_timestamp','poly_nonce','poly_api_key','poly_passphrase'];

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,PUT,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    return res.status(200).end();
  }
  res.setHeader('Access-Control-Allow-Origin', '*');

  const segs = Array.isArray(req.query.path) ? req.query.path
    : req.query.path ? [req.query.path] : [];
  const service = segs[0] || '';
  const subPath = '/' + segs.slice(1).join('/');

  const qp = new URLSearchParams();
  for (const [k, v] of Object.entries(req.query)) {
    if (k !== 'path') qp.append(k, v);
  }
  const qs = qp.toString() ? '?' + qp.toString() : '';

  // ── BTC via Kraken ──────────────────────────────────────
  if (service === 'btc') {
    res.setHeader('Cache-Control', 's-maxage=10,stale-while-revalidate=20');
    try {
      if (subPath.includes('klines')) {
        const limit = parseInt(req.query.limit) || 100;
        const r = await fetch('https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=1');
        if (!r.ok) throw new Error('Kraken OHLC ' + r.status);
        const d = await r.json();
        if (d.error && d.error.length) throw new Error(d.error[0]);
        const candles = d.result.XXBTZUSD || d.result.XBTUSD || Object.values(d.result)[0];
        return res.status(200).json(
          candles.slice(-limit).map(c => [
            c[0]*1000, c[1], c[2], c[3], c[4], c[6],
            (c[0]+60)*1000, (parseFloat(c[5])*parseFloat(c[6])).toString(),
            c[7], '0', '0', '0'
          ])
        );
      }
      if (subPath.includes('ticker')) {
        const r = await fetch('https://api.kraken.com/0/public/Ticker?pair=XBTUSD');
        if (!r.ok) throw new Error('Kraken Ticker ' + r.status);
        const d = await r.json();
        if (d.error && d.error.length) throw new Error(d.error[0]);
        const t = d.result.XXBTZUSD || d.result.XBTUSD || Object.values(d.result)[0];
        return res.status(200).json({
          symbol: 'BTCUSDT',
          openPrice: t.o, highPrice: t.h[1], lowPrice: t.l[1], lastPrice: t.c[0],
          volume: t.v[1],
          quoteVolume: (parseFloat(t.p[1]) * parseFloat(t.v[1])).toString(),
          priceChange: (parseFloat(t.c[0]) - parseFloat(t.o)).toString(),
          priceChangePercent: (((parseFloat(t.c[0]) - parseFloat(t.o)) / parseFloat(t.o)) * 100).toString()
        });
      }
      return res.status(404).json({ error: 'Unknown BTC endpoint', path: subPath });
    } catch (err) {
      return res.status(502).json({ error: 'Kraken error', message: err.message });
    }
  }

  // ── Gamma: markets via GraphQL ──────────────────────────
  if (service === 'gamma' && subPath.startsWith('/markets')) {
    res.setHeader('Cache-Control', 's-maxage=30,stale-while-revalidate=60');
    try {
      const query = '{ markets(where:{active:true,closed:false},first:100,orderBy:volume,orderByDirection:DESC) { id question volume clobTokenIds } }';
      const r = await fetch('https://gamma-api.polymarket.com/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ query })
      });
      if (!r.ok) throw new Error('Gamma GraphQL ' + r.status);
      const d = await r.json();
      const markets = (d.data && d.data.markets) ? d.data.markets : [];
      return res.status(200).json(markets);
    } catch (err) {
      return res.status(502).json({ error: 'Gamma GraphQL error', message: err.message });
    }
  }

  // ── Generic CLOB / Gamma proxy ──────────────────────────
  const bases = {
    gamma: 'https://gamma-api.polymarket.com',
    clob:  'https://clob.polymarket.com'
  };
  const base = bases[service];
  if (!base) return res.status(404).json({ error: 'Unknown service: ' + service });

  const target = base + subPath + qs;
  const fwd = { 'Accept': 'application/json' };

  if (service === 'clob') {
    for (const h of CLOB_AUTH) {
      const v = req.headers[h] || req.headers[h.toLowerCase()];
      if (v) fwd[h.toUpperCase()] = v;
    }
  }

  let body;
  if (['POST', 'DELETE', 'PUT'].includes(req.method)) {
    body = JSON.stringify(req.body);
    fwd['CONTENT-TYPE'] = 'application/json';
  }

  try {
    const up = await fetch(target, { method: req.method, headers: fwd, body });
    const ct = up.headers.get('content-type') || '';
    const data = ct.includes('json') ? await up.json() : await up.text();
    res.setHeader('Cache-Control', service === 'clob' ? 'no-store' : 's-maxage=30,stale-while-revalidate=60');
    return res.status(up.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: service + ' upstream error', message: err.message });
  }
}
