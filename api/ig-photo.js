const SEARCHAPI_KEY = 'Ukdduyf5VknGhiBUTGyH55ZF';
const SUPA_URL = 'https://qvetnjpjjsndlxoczwsu.supabase.co';
const SUPA_KEY = 'sb_secret_121GSIddP2B4y-lPPSB-RA_N-l6eJz0';
const SUPA_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2ZXRuanBqanNuZGx4b2N6d3N1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI1MDE0MCwiZXhwIjoyMDg3ODI2MTQwfQ.h3DGgp30oBehIuZJ5hylybG4SkgGTLHEs8__Ot1Owu4';
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
    // 1. Verifica se já tem foto salva no Storage
    const storageUrl = `${SUPA_URL}/storage/v1/object/public/fotos/${username}.jpg`;
    const checkRes = await fetch(storageUrl, { method: 'HEAD' });

    if (checkRes.ok) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.redirect(302, storageUrl);
    }

    // 2. Busca na SearchAPI
    const r = await fetch(
      `https://www.searchapi.io/api/v1/search?engine=instagram_profile&username=${encodeURIComponent(username)}&api_key=${SEARCHAPI_KEY}`
    );
    if (!r.ok) throw new Error('Perfil não encontrado');
    const data = await r.json();
    const avatarUrl = data?.profile?.profile_pic_url || data?.profile?.avatar || null;
    if (!avatarUrl) throw new Error('Avatar não encontrado');

    // 3. Baixa a imagem
    const imgRes = await fetch(avatarUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!imgRes.ok) throw new Error('Erro ao buscar imagem');
    const buffer = await imgRes.arrayBuffer();

    // 4. Salva no Supabase Storage usando service_role key
    const uploadRes = await fetch(
      `${SUPA_URL}/storage/v1/object/fotos/${username}.jpg`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPA_SERVICE_KEY}`,
          'Content-Type': 'image/jpeg',
          'x-upsert': 'true'
        },
        body: buffer
      }
    );
    console.log('[storage upload]', uploadRes.status, await uploadRes.text());

    // 5. Serve a imagem pro browser
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(Buffer.from(buffer));

  } catch (err) {
    console.error('[ig-photo]', err.message);
    return res.status(404).json({ error: err.message });
  }
}
