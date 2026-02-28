const SEARCHAPI_KEY = 'Ukdduyf5VknGhiBUTGyH55ZF';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'username obrigatório' });

  try {
    const r = await fetch(
      `https://www.searchapi.io/api/v1/search?engine=instagram_profile&username=${encodeURIComponent(username)}&api_key=${SEARCHAPI_KEY}`
    );
    if (!r.ok) throw new Error('Perfil não encontrado');
    const data = await r.json();
    const avatar = data?.profile?.profile_pic_url || data?.profile?.avatar || null;
    if (!avatar) throw new Error('Avatar não encontrado');
    return res.status(200).json({ avatar });
  } catch (err) {
    return res.status(404).json({ error: err.message });
  }
}
