// api/btc/[...path].js — BTC via Kraken (no US geo-block)
async function getKlines(limit = 100) {
  const r = await fetch('https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=1');
  if (!r.ok) throw new Error('Kraken OHLC ' + r.status);
  const d = await r.json();
  if (d.error && d.error.length) throw new Error(d.error[0]);
  const candles = d.result.XXBTZUSD || d.result.XBTUSD || Object.values(d.result)[0];
  return candles.slice(-limit).map(c => [
    c[0]*1000, c[1], c[2], c[3], c[4], c[6],
    (c[0]+60)*1000, (parseFloat(c[5])*parseFloat(c[6])).toString(), c[7], '0','0','0'
  ]);
}

async function getTicker24hr() {
  const r = await fetch('https://api.kraken.com/0/public/Ticker?pair=XBTUSD');
  if (!r.ok) throw new Error('Kraken Ticker ' + r.status);
  const d = await r.json();
  if (d.error && d.error.length) throw new Error(d.error[0]);
  const t = d.result.XXBTZUSD || d.result.XBTUSD || Object.values(d.result)[0];
  return {
    symbol:'BTCUSDT', openPrice:t.o, highPrice:t.h[1], lowPrice:t.l[1],
    lastPrice:t.c[0], volume:t.v[1],
    quoteVolume:(parseFloat(t.p[1])*parseFloat(t.v[1])).toString(),
    priceChange:(parseFloat(t.c[0])-parseFloat(t.o)).toString(),
    priceChangePercent:(((parseFloat(t.c[0])-parseFloat(t.o))/parseFloat(t.o))*100).toString(),
  };
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin','*');
    return res.status(200).end();
  }
  const segs = Array.isArray(req.query.path) ? req.query.path : [req.query.path||''];
  const sub = segs.join('/');
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','s-maxage=10,stale-while-revalidate=20');
  try {
    if (sub.includes('klines')) return res.status(200).json(await getKlines(parseInt(req.query.limit)||100));
    if (sub.includes('ticker')) return res.status(200).json(await getTicker24hr());
    return res.status(404).json({error:'Unknown endpoint'});
  } catch(err) {
    return res.status(502).json({error:'Kraken error',message:err.message});
  }
}
