const ASAAS_KEY  = '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmI3MWE3MWQxLTU5OGQtNDJhYy1hYmRjLWYyYWU5NjVmY2Q4YTo6JGFhY2hfODYxMDRkYzEtNzZjNy00MzVkLTg5YjUtZTdiZGM3NDQwOGRi';
const ASAAS_BASE = 'https://www.asaas.com/api/v3';
const ASAAS_HDR  = { 'Content-Type': 'application/json', 'access_token': ASAAS_KEY };

const SUPA_URL = 'https://qvetnjpjjsndlxoczwsu.supabase.co';
const SUPA_KEY = 'sb_secret_121GSIddP2B4y-lPPSB-RA_N-l6eJz0';
const SUPA_HDR = {
  'Content-Type': 'application/json',
  'apikey': SUPA_KEY,
  'Authorization': `Bearer ${SUPA_KEY}`
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { ig, valor, cpf, frase } = req.body;
  console.log('[diploma-pix] body recebido:', JSON.stringify({ ig, valor, cpf, frase }));
  if (!ig || !valor || !cpf) return res.status(400).json({ error: 'ig, valor e cpf são obrigatórios' });
  if (valor < 30) return res.status(400).json({ error: 'Valor mínimo é R$30' });

  try {
    // 1. Busca customer existente ou cria novo
    let customerId;
    const searchRes = await fetch(`${ASAAS_BASE}/customers?cpfCnpj=${cpf}`, { headers: ASAAS_HDR });
    const searchData = await searchRes.json();

    if (searchData.data && searchData.data.length > 0) {
      customerId = searchData.data[0].id;
    } else {
      const username = ig.replace('@', '');
      const custRes  = await fetch(`${ASAAS_BASE}/customers`, {
        method: 'POST', headers: ASAAS_HDR,
        body: JSON.stringify({
          name: ig, cpfCnpj: cpf,
          email: `${username}@diplomaderico.com`,
          notificationDisabled: true
        })
      });
      const custData = await custRes.json();
      if (!custRes.ok) throw new Error(custData.errors?.[0]?.description || 'Erro ao criar cliente');
      customerId = custData.id;
    }

    // 2. Criar cobrança PIX
    const due = new Date();
    due.setDate(due.getDate() + 1);
    const dueDate = due.toISOString().split('T')[0];

    const payRes  = await fetch(`${ASAAS_BASE}/payments`, {
      method: 'POST', headers: ASAAS_HDR,
      body: JSON.stringify({
        customer: customerId,
        billingType: 'PIX',
        value: Number(valor),
        dueDate,
        description: `Diploma de Rico — ${ig}`
      })
    });
    const payData = await payRes.json();
    if (!payRes.ok) throw new Error(payData.errors?.[0]?.description || 'Erro ao criar cobrança');

    // 3. Buscar QR Code
    const qrRes  = await fetch(`${ASAAS_BASE}/payments/${payData.id}/pixQrCode`, { headers: ASAAS_HDR });
    const qrData = await qrRes.json();
    if (!qrRes.ok) throw new Error(qrData.errors?.[0]?.description || 'Erro ao buscar QR Code');

    // 4. Salvar pedido pendente no Supabase
    const fraseVal = (typeof frase === 'string' && frase.trim().length > 0) ? frase.trim() : null;
    await fetch(`${SUPA_URL}/rest/v1/diplomas`, {
      method: 'POST', headers: SUPA_HDR,
      body: JSON.stringify({
        ig, cpf,
        valor: Number(valor),
        frase: fraseVal,
        payment_id: payData.id,
        status: 'pending'
      })
    });

    return res.status(200).json({
      paymentId:      payData.id,
      encodedImage:   qrData.encodedImage,
      payload:        qrData.payload,
      expirationDate: qrData.expirationDate
    });

  } catch (err) {
    console.error('[diploma-pix]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
