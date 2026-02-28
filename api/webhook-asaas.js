const SUPA_URL = 'https://qvetnjpjjsndlxoczwsu.supabase.co';
const SUPA_KEY = 'sb_secret_121GSIddP2B4y-lPPSB-RA_N-l6eJz0';
const SUPA_HDR = {
  'Content-Type': 'application/json',
  'apikey': SUPA_KEY,
  'Authorization': `Bearer ${SUPA_KEY}`
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { event, payment } = req.body;

  // Só processa pagamentos confirmados
  if (event !== 'PAYMENT_RECEIVED' && event !== 'PAYMENT_CONFIRMED') {
    return res.status(200).json({ ok: true, ignored: true });
  }

  const paymentId = payment?.id;
  if (!paymentId) return res.status(400).json({ error: 'payment.id ausente' });

  try {
    // Atualiza status para 'paid' no Supabase
    const upRes = await fetch(
      `${SUPA_URL}/rest/v1/diplomas?payment_id=eq.${paymentId}`,
      {
        method: 'PATCH',
        headers: { ...SUPA_HDR, 'Prefer': 'return=representation' },
        body: JSON.stringify({ status: 'paid' })
      }
    );

    const upData = await upRes.json();
    console.log('[webhook-asaas] pagamento confirmado:', paymentId, upData);

    return res.status(200).json({ ok: true, updated: upData });

  } catch (err) {
    console.error('[webhook-asaas]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
