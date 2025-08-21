const express = require('express');
const { MercadoPagoConfig, Preference } = require('mercadopago');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Nova configuração do Mercado Pago (SDK 3.x+)
const client = new MercadoPagoConfig({
  accessToken: 'APP_USR-1576844588957876-081908-e4965a91f36605690cc9006a7af8653e-1205734045',
});

app.post('/criar-pagamento', async (req, res) => {
  try {
    const { items, nome, endereco } = req.body;
    const preference = {
      items: items.map(item => ({
        title: item.name,
        quantity: item.qty,
        unit_price: Number(item.price),
        currency_id: "BRL"
      })),
      payer: {
        name: nome,
        address: { street_name: endereco }
      }
    };
    // Usando a classe Preference (SDK 3.x+)
    const preferenceClient = new Preference(client);
    const response = await preferenceClient.create({ body: preference });
    res.json({ init_point: response.init_point });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(4000, () => console.log("API rodando na porta 4000"));