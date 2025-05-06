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

// 📩 Tangani pesan masuk
app.post('/webhook', async (req, res) => {
  const body = req.body;

  if (body.object === 'instagram') {
    for (const entry of body.entry || []) {
      const messaging = entry.messaging || entry.changes;

      for (const change of messaging || []) {
        const message = change.message?.text || change.value?.messages?.[0]?.text?.body;
        const senderId = change.sender?.id || change.value?.messages?.[0]?.from;

        if (message && senderId) {
          const flowiseResponse = await queryFlowise(message);

          const reply = flowiseResponse.text || flowiseResponse.answer || "Maaf, saya tidak mengerti.";

          await sendInstagramDM(senderId, reply);
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
    recipient: { id: recipientId },
    message: { text: message }
  };

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server is running on port ${PORT}`));
