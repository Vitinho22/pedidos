const fetch = require('node-fetch'); // instale com `npm install node-fetch`

async function criarPagamento() {
  const accessToken = 'APP_USR-1576844588957876-081908-e4965a91f36605690cc9006a7af8653e-1205734045';
  const preference = {
    items: [
      {
        title: 'Produto de exemplo',
        quantity: 1,
        unit_price: 50.0,
        currency_id: "BRL"
      }
    ]
  };

  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(preference)
  });

  if (!response.ok) {
    console.error('Erro ao criar preferência:', await response.text());
    return;
  }
  const data = await response.json();
  console.log('Link de pagamento:', data.init_point);
}

criarPagamento();