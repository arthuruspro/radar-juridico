const SUPA_URL = 'https://qvetnjpjjsndlxoczwsu.supabase.co';
const SUPA_KEY = 'sb_secret_121GSIddP2B4y-lPPSB-RA_N-l6eJz0';
const SUPA_HDR = {
  'apikey': SUPA_KEY,
  'Authorization': `Bearer ${SUPA_KEY}`
};

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const r = await fetch(
      `${SUPA_URL}/rest/v1/diplomas?status=eq.paid&order=valor.desc&select=ig,valor,frase,created_at`,
      { headers: SUPA_HDR }
    );
    const data = await r.json();

    // Cache de 30s no Vercel pra não sobrecarregar o Supabase
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate');
    return res.status(200).json(data);

  } catch (err) {
    console.error('[ranking]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
