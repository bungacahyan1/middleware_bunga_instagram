import express from 'express';
import fetch from 'node-fetch';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(bodyParser.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const FLOWISE_API = process.env.FLOWISE_API;
const FLOWISE_TOKEN = process.env.FLOWISE_TOKEN;

// 🌐 Verifikasi Webhook dari Meta
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// 📩 Tangani pesan masuk dari Instagram
app.post('/webhook', async (req, res) => {
  const body = req.body;

  if (body.object === 'instagram') {
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const messages = change.value?.messages || [];

        for (const msg of messages) {
          const message = msg.text?.body;
          const senderId = msg.from;

          if (message && senderId) {
            console.log("📥 Pesan masuk:", message);
            console.log("👤 Dari pengguna:", senderId);

            const flowiseResponse = await queryFlowise(message);
            const reply = flowiseResponse.text || flowiseResponse.answer || "Maaf, saya tidak mengerti.";

            console.log("🤖 Jawaban Flowise:", reply);

            await sendInstagramDM(senderId, reply);
          }
        }
      }
    }

    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

// 🔁 Fungsi query ke Flowise
async function queryFlowise(question) {
  const response = await fetch(FLOWISE_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${FLOWISE_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ question })
  });
  return response.json();
}

// 📤 Kirim pesan ke Instagram
async function sendInstagramDM(recipientId, message) {
  const url = `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;

  const payload = {
    messaging_product: "instagram",  // WAJIB untuk Instagram DM
    recipient: { id: recipientId },
    message: { text: message }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("❌ Gagal kirim DM:", data);
  } else {
    console.log("✅ DM berhasil dikirim:", data);
  }
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server is running on port ${PORT}`));
