export default async function handler(req, res) {
  // Só aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { cpf, whatsapp, anual } = req.body;

  if (!cpf || !whatsapp) {
    return res.status(400).json({ error: 'CPF e WhatsApp são obrigatórios' });
  }

  const ASAAS_KEY  = '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjM4YjQ2MTM0LWUwZDctNDVmOS05YjBjLThlMWFmZDMzMDQ2MTo6JGFhY2hfNGI1YWMzNzgtNTU0YS00YjdlLTg1M2MtMjY2NWY3NTI0Mzg3';
  const ASAAS_BASE = 'https://www.asaas.com/api/v3';
  const HEADERS    = {
    'Content-Type': 'application/json',
    'access_token': ASAAS_KEY
  };

  const valor = anual ? 997 : 147;
  const ciclo = anual ? 'YEARLY' : 'MONTHLY';

  try {
    // 1. Busca ou cria cliente
    let customerId;
    const searchRes  = await fetch(`${ASAAS_BASE}/customers?cpfCnpj=${cpf}`, { headers: HEADERS });
    const searchData = await searchRes.json();

    if (searchData.data && searchData.data.length > 0) {
      customerId = searchData.data[0].id;
      // Atualiza whatsapp se necessário
      await fetch(`${ASAAS_BASE}/customers/${customerId}`, {
        method: 'PUT', headers: HEADERS,
        body: JSON.stringify({ mobilePhone: whatsapp })
      });
    } else {
      const custRes  = await fetch(`${ASAAS_BASE}/customers`, {
        method: 'POST', headers: HEADERS,
        body: JSON.stringify({
          name:                cpf,
          cpfCnpj:             cpf,
          mobilePhone:         whatsapp,
          notificationDisabled: true
        })
      });
      const custData = await custRes.json();
      if (!custRes.ok) throw new Error(custData.errors?.[0]?.description || 'Erro ao criar cliente');
      customerId = custData.id;
    }

    // 2. Cria autorização PIX Automático
    const nextDue    = new Date();
    nextDue.setDate(nextDue.getDate() + 1);
    const nextDueStr = nextDue.toISOString().split('T')[0];
    const contractId = `RJ-${cpf}-${Date.now()}`;

    const authRes  = await fetch(`${ASAAS_BASE}/pix/automatic/authorizations`, {
      method: 'POST', headers: HEADERS,
      body: JSON.stringify({
        customerId,
        value:       valor,
        originalValue: valor,
        nextDueDate: nextDueStr,
        startDate:   nextDueStr,
        cycle:       ciclo,
        frequency:   ciclo,
        contractId,
        description: 'Radar Juridico - Monitoramento CPF',
        immediateQrCode: {
          value:             valor,
          originalValue:     valor,
          dueDate:           nextDueStr,
          expirationSeconds: 3600
        }
      })
    });

    const authData = await authRes.json();
    if (!authRes.ok) throw new Error(authData.errors?.[0]?.description || 'Erro ao criar autorização PIX Automático');

    // Retorna tudo para debug
    const qrCode = authData.immediateQrCode || authData.qrCode || authData.pixQrCode || {};
    const payload = qrCode.payload || qrCode.encodedText || qrCode.copyAndPaste || authData.payload || '';
    const encodedImage = qrCode.encodedImage || qrCode.image || authData.encodedImage || '';

    return res.status(200).json({
      authorizationId: authData.id,
      encodedImage,
      payload,
      // manda tudo para debug
      _debug: authData
    });

  } catch (err) {
    console.error('Asaas error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
