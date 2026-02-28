const SEARCHAPI_KEY = 'Ukdduyf5VknGhiBUTGyH55ZF';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'username obrigatório' });

  try {
    // 1. Busca URL do avatar via SearchAPI
    const r = await fetch(
      `https://www.searchapi.io/api/v1/search?engine=instagram_profile&username=${encodeURIComponent(username)}&api_key=${SEARCHAPI_KEY}`
    );
    if (!r.ok) throw new Error('Perfil não encontrado');
    const data = await r.json();
    const avatarUrl = data?.profile?.profile_pic_url || data?.profile?.avatar || null;
    if (!avatarUrl) throw new Error('Avatar não encontrado');

    // 2. Stream da imagem direto pro browser
    const imgRes = await fetch(avatarUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!imgRes.ok) throw new Error('Erro ao buscar imagem');

    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // cache 24h
    
    const buffer = await imgRes.arrayBuffer();
    return res.send(Buffer.from(buffer));

  } catch (err) {
    return res.status(404).json({ error: err.message });
  }
}
