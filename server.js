// server.js — Mercado Pago SDK v2 (2.8.0)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mercadopago = require('mercadopago');

const app = express();
app.use(express.json());

// 🔒 CORS: restrinja ao seu site no Netlify
app.use(cors({
  origin: ['https://exquisite-semifreddo-a277d9.netlify.app'],
  methods: ['GET', 'POST'],
}));

// 🔑 Token via variável de ambiente (NUNCA no código)
mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN
});

// (opcional) Healthcheck
app.get('/', (_, res) => res.json({ ok: true, service: 'pedidos-api' }));

// (opcional) Webhook para confirmação automática
app.post('/webhook', express.json(), (req, res) => {
  // TODO: validar evento/status e atualizar pedido no seu sistema
  // console.log('Webhook recebido:', req.body);
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

    const preference = {
      items: itensValidos,
      payer: { name: nome, address: { street_name: endereco } },
      back_urls: {
        success: 'https://exquisite-semifreddo-a277d9.netlify.app/sucesso',
        failure: 'https://exquisite-semifreddo-a277d9.netlify.app/erro',
        pending: 'https://exquisite-semifreddo-a277d9.netlify.app/pendente',
      },
      auto_return: 'approved',
      // (opcional) Ative se estiver usando webhook acima:
      // notification_url: 'https://pedidos-cqiu.onrender.com/webhook',
    };

    const resp = await mercadopago.preferences.create(preference);
    const url = resp.body.init_point || resp.body.sandbox_init_point;
    return res.json({ init_point: url });
  } catch (e) {
    console.error('Erro /criar-pagamento:', e);
    return res.status(500).json({ error: e.message || 'Erro ao criar pagamento' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));
