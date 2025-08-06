const twilio = require('twilio');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FB_PROJECT_ID,
      clientEmail: process.env.FB_CLIENT_EMAIL,
      privateKey: process.env.FB_PRIVATE_KEY.replace(/\\n/g, '\n')
    }),
    databaseURL: process.env.FB_DB_URL
  });
}

const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_TOKEN;
const whatsappFrom = process.env.WHATSAPP_FROM;
const whatsappTo = process.env.WHATSAPP_TO;

exports.handler = async function(event, context) {
  try {
    const pedido = JSON.parse(event.body);

    // Salvar pedido no Firebase
    const db = admin.database();
    const ref = db.ref('pedidos');
    const newPedido = ref.push();
    await newPedido.set({
      ...pedido,
      data: new Date().toISOString()
    });

    // Montar mensagem
    const msg = `
🛒 *Novo Pedido MultiCenter*
Nome: ${pedido.nome}
WhatsApp: ${pedido.telefone}
Endereço: ${pedido.endereco}
CEP: ${pedido.cep}
CPF/CNPJ: ${pedido.cpfcnpj}
Itens:
${pedido.itens.map(i=>`- ${i.nome} (x${i.qtd}) Cód: ${i.codigo||'-'}`).join('\n')}
`.trim();

    // Enviar WhatsApp via Twilio
    const client = twilio(accountSid, authToken);
    await client.messages.create({
      from: whatsappFrom,
      to: whatsappTo,
      body: msg
    });

    return { statusCode: 200, body: JSON.stringify({ok:true}) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ok:false, error: String(e)}) };
  }
};
