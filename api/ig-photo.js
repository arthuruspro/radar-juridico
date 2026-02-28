const SEARCHAPI_KEY = 'Ukdduyf5VknGhiBUTGyH55ZF';
const SUPA_URL = 'https://qvetnjpjjsndlxoczwsu.supabase.co';
const SUPA_KEY = 'sb_secret_121GSIddP2B4y-lPPSB-RA_N-l6eJz0';
const SUPA_HDR = {
  'Content-Type': 'application/json',
  'apikey': SUPA_KEY,
  'Authorization': `Bearer ${SUPA_KEY}`
};

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'username obrigatório' });

  try {
    // 1. Verifica se já tem foto salva no banco
    const dbRes = await fetch(
      `${SUPA_URL}/rest/v1/diplomas?ig=eq.@${username}&select=foto_url&limit=1`,
      { headers: SUPA_HDR }
    );
    const dbData = await dbRes.json();
    const savedUrl = dbData?.[0]?.foto_url;

    let avatarUrl;

    if (savedUrl) {
      // Já tem no banco — usa direto
      avatarUrl = savedUrl;
    } else {
      // Busca na SearchAPI
      const r = await fetch(
        `https://www.searchapi.io/api/v1/search?engine=instagram_profile&username=${encodeURIComponent(username)}&api_key=${SEARCHAPI_KEY}`
      );
      if (!r.ok) throw new Error('Perfil não encontrado');
      const data = await r.json();
      avatarUrl = data?.profile?.profile_pic_url || data?.profile?.avatar || null;
      if (!avatarUrl) throw new Error('Avatar não encontrado');

      // Salva no banco pra não buscar de novo
      await fetch(
        `${SUPA_URL}/rest/v1/diplomas?ig=eq.@${username}`,
        {
          method: 'PATCH',
          headers: { ...SUPA_HDR, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ foto_url: avatarUrl })
        }
      );
    }

    // Stream da imagem pro browser
    const imgRes = await fetch(avatarUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!imgRes.ok) throw new Error('Erro ao buscar imagem');

    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const buffer = await imgRes.arrayBuffer();
    return res.send(Buffer.from(buffer));

  } catch (err) {
    return res.status(404).json({ error: err.message });
  }
}
