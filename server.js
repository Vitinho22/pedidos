// server.js — compatível com SDK v2 e v3 do Mercado Pago
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());

// 🔒 CORS: restrinja ao seu site do Netlify
app.use(cors({
  origin: ['https://exquisite-semifreddo-a277d9.netlify.app'],
  methods: ['GET', 'POST'],
}));

// Healthcheck
app.get('/', (_, res) => res.json({ ok: true, service: 'pedidos-api' }));

// ===== Integração Mercado Pago (v2 OU v3) =====
let isV2 = false;
let mp, Preference, MercadoPagoConfig;

try {
  mp = require('mercadopago');
  // Se existir "configure", estamos na v2
  if (mp && typeof mp.configure === 'function') {
    isV2 = true;
    console.log('[MP] Detectado SDK v2');
    mp.configure({ access_token: process.env.MP_ACCESS_TOKEN });
  } else {
    // Tentativa v3 (classes)
    ({ Preference, MercadoPagoConfig } = mp);
    if (Preference && MercadoPagoConfig) {
      console.log('[MP] Detectado SDK v3');
    } else {
      throw new Error('SDK do Mercado Pago não reconhecida (nem v2 nem v3).');
    }
  }
} catch (e) {
  console.error('[MP] Falha ao carregar SDK:', e);
  process.exit(1);
}

// (opcional) webhook
app.post('/webhook', express.json(), (req, res) => {
  // console.log('Webhook:', req.body);
  res.sendStatus(200);
});

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
      // notification_url: 'https://pedidos-cqiu.onrender.com/webhook', // se for usar webhook
    };

    let initPoint;

    if (isV2) {
      // ===== Fluxo v2 =====
      const resp = await mp.preferences.create(preferenceBase);
      initPoint = resp?.body?.init_point || resp?.body?.sandbox_init_point;
    } else {
      // ===== Fluxo v3 =====
      const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
      const preferenceClient = new Preference(client);
      const resp = await preferenceClient.create({ body: preferenceBase });
      initPoint = resp?.init_point || resp?.sandbox_init_point;
    }

    if (!initPoint) throw new Error('Não foi possível obter init_point');
    return res.json({ init_point: initPoint });
  } catch (e) {
    console.error('Erro /criar-pagamento:', e);
    return res.status(500).json({ error: e.message || 'Erro ao criar pagamento' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));
