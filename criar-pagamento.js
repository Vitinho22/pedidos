app.post('/criar-pagamento', async (req, res) => {
  try {
    const { items = [], nome = 'Cliente', endereco = 'Não informado' } = req.body;

    const itensValidos = Array.isArray(items) && items.length
      ? items.map(i => ({
          title: i.name || 'Item',
          quantity: Number(i.qty || 1),
          unit_price: Number(i.price || 0),
          currency_id: 'BRL',
        }))
      : [{ title: `Pedido de ${nome}`, quantity: 1, unit_price: 0, currency_id: 'BRL' }];

    const preferenceBase = {
      items: itensValidos,
      payer: { name: nome, address: { street_name: endereco } },
      back_urls: {
        success: 'https://exquisite-semifreddo-a277d9.netlify.app/sucesso',
        failure: 'https://exquisite-semifreddo-a277d9.netlify.app/erro',
        pending: 'https://exquisite-semifreddo-a277d9.netlify.app/pendente',
      },
      auto_return: 'approved',
    };

    let initPoint;

    // 1) Tenta via SDK (v2 ou v3)
    try {
      if (isV2) {
        const resp = await mp.preferences.create(preferenceBase);
        initPoint = resp?.body?.init_point || resp?.body?.sandbox_init_point;
      } else {
        const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
        const preferenceClient = new Preference(client);
        const resp = await preferenceClient.create({ body: preferenceBase });
        initPoint = resp?.init_point || resp?.sandbox_init_point;
      }
    } catch (sdkErr) {
      console.warn('[MP] SDK falhou, tentando fetch direto...', sdkErr?.message);

      // 2) Fallback com fetch nativo (Node 18+)
      const r = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferenceBase)
      });

      const text = await r.text(); // lê como texto p/ log
      if (!r.ok) {
        console.error('MP fallback status:', r.status);
        console.error('MP fallback body:', text);
        throw new Error(`MP error ${r.status}`);
      }
      const j = JSON.parse(text);
      initPoint = j?.init_point || j?.sandbox_init_point;
    }

    if (!initPoint) throw new Error('Não foi possível obter init_point');
    return res.json({ init_point: initPoint });

  } catch (e) {
    console.error('Erro /criar-pagamento:', e?.message);
    return res.status(500).json({ error: e.message || 'Erro ao criar pagamento' });
  }
});

