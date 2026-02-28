export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ig, valor } = req.body;
  if (!ig || !valor) {
    return res.status(400).json({ error: 'ig e valor são obrigatórios' });
  }
  if (valor < 30) {
    return res.status(400).json({ error: 'Valor mínimo é R$30' });
  }

  const ASAAS_KEY  = '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmI3MWE3MWQxLTU5OGQtNDJhYy1hYmRjLWYyYWU5NjVmY2Q4YTo6JGFhY2hfODYxMDRkYzEtNzZjNy00MzVkLTg5YjUtZTdiZGM3NDQwOGRi';
  const ASAAS_BASE = 'https://www.asaas.com/api/v3';
  const HEADERS    = {
    'Content-Type': 'application/json',
    'access_token': ASAAS_KEY
  };

  try {
    // 1. Cria customer (ig como nome + email fake)
    const username = ig.replace('@', '');
    const custRes  = await fetch(`${ASAAS_BASE}/customers`, {
      method: 'POST', headers: HEADERS,
      body: JSON.stringify({
        name:                ig,
        email:               `${username}@diplomaderico.com`,
        notificationDisabled: true
      })
    });
    const custData = await custRes.json();
    if (!custRes.ok) throw new Error(custData.errors?.[0]?.description || 'Erro ao criar cliente');
    const customerId = custData.id;

    // 2. Cria cobrança PIX avulsa (vencimento D+1)
    const due = new Date();
    due.setDate(due.getDate() + 1);
    const dueDate = due.toISOString().split('T')[0];

    const payRes  = await fetch(`${ASAAS_BASE}/payments`, {
      method: 'POST', headers: HEADERS,
      body: JSON.stringify({
        customer:    customerId,
        billingType: 'PIX',
        value:       Number(valor),
        dueDate,
        description: `Diploma de Rico — ${ig}`
      })
    });
    const payData = await payRes.json();
    if (!payRes.ok) throw new Error(payData.errors?.[0]?.description || 'Erro ao criar cobrança');

    // 3. Busca QR Code
    const qrRes  = await fetch(`${ASAAS_BASE}/payments/${payData.id}/pixQrCode`, { headers: HEADERS });
    const qrData = await qrRes.json();
    if (!qrRes.ok) throw new Error(qrData.errors?.[0]?.description || 'Erro ao buscar QR Code');

    return res.status(200).json({
      paymentId:    payData.id,
      encodedImage: qrData.encodedImage,
      payload:      qrData.payload,
      expirationDate: qrData.expirationDate
    });

  } catch (err) {
    console.error('[diploma-pix]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
