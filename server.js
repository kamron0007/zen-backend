const express    = require('express');
const cors       = require('cors');
const Anthropic  = require('@anthropic-ai/sdk');

const app    = express();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(cors());
app.use(express.json());

// ── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// ── MOLIYAVIY TAHLIL ─────────────────────────────────────────────────────────
app.post('/api/analyze', async (req, res) => {
  const { balance, income, expense, categories, lang = 'uz' } = req.body;

  const langMap = {
    uz: "O'zbek tilida (lotin) javob ber. 2-3 jumladan iborat qisqa maslahat.",
    ru: "Отвечай на русском языке. Дай краткий совет в 2-3 предложениях.",
    en: "Reply in English. Give a short 2-3 sentence financial tip."
  };

  const catStr = Object.entries(categories || {})
    .map(([k, v]) => `${k}: $${Number(v).toFixed(0)}`)
    .join(', ');

  const savings = income - expense;
  const savRate = income > 0 ? Math.round(savings / income * 100) : 0;

  try {
    const msg = await client.messages.create({
      model      : 'claude-haiku-4-5-20251001',
      max_tokens : 300,
      system     : `Sen ZenMoney moliyaviy AI yordamchisisisan. ${langMap[lang] || langMap.uz} Emoji ishlatish mumkin.`,
      messages   : [{
        role   : 'user',
        content: `Moliyaviy holat:\n- Balans: $${Number(balance).toFixed(2)}\n- Kirim: $${Number(income).toFixed(2)}\n- Chiqim: $${Number(expense).toFixed(2)}\n- Tejamkorlik: ${savRate}%\n- Kategoriyalar: ${catStr || "yo'q"}\n\nQisqa maslahat ber.`
      }]
    });
    res.json({ success: true, message: msg.content[0].text.trim() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── MAQSAD MASLAHATI ─────────────────────────────────────────────────────────
app.post('/api/goal-advice', async (req, res) => {
  const { title, current, target, daysLeft, lang = 'uz' } = req.body;

  const pct       = Math.round(current / target * 100);
  const dailyNeed = daysLeft > 0 ? (target - current) / daysLeft : 0;

  const langMap = {
    uz: "O'zbek tilida 2 jumlada motivatsion maslahat ber.",
    ru: "Дай мотивирующий совет на русском в 2 предложениях.",
    en: "Give a 2-sentence motivational tip in English."
  };

  try {
    const msg = await client.messages.create({
      model      : 'claude-haiku-4-5-20251001',
      max_tokens : 150,
      system     : `Sen moliyaviy yordamchisan. ${langMap[lang] || langMap.uz} Emoji ishlatish mumkin.`,
      messages   : [{
        role   : 'user',
        content: `Maqsad: "${title}"\nBajarilgan: ${pct}%\nQoldi: $${(target-current).toFixed(0)}\nKunlik: $${dailyNeed.toFixed(2)}\nVaqt: ${daysLeft} kun`
      }]
    });
    res.json({ success: true, message: msg.content[0].text.trim() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── AI CHAT (Yordam) ─────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { messages, lang = 'uz' } = req.body;

  const langMap = {
    uz: "O'zbek tilida javob ber. Max 3 gap. Emoji mumkin.",
    ru: "Отвечай на русском. Максимум 3 предложения. Эмодзи можно.",
    en: "Reply in English. Max 3 sentences. Emojis allowed."
  };

  const history = (messages || []).map(m => ({
    role   : m.role,
    content: m.content
  }));

  try {
    const msg = await client.messages.create({
      model      : 'claude-haiku-4-5-20251001',
      max_tokens : 400,
      system     : `Sen ZenMoney ilovasining AI yordamchisisisan. ${langMap[lang] || langMap.uz} Moliya, tejamkorlik, byudjet haqida yordam ber.`,
      messages   : history
    });
    res.json({ success: true, message: msg.content[0].text.trim() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── STREAMING CHAT ────────────────────────────────────────────────────────────
app.post('/api/chat/stream', async (req, res) => {
  const { messages, lang = 'uz' } = req.body;

  const langMap = {
    uz: "O'zbek tilida javob ber. Max 3 gap.",
    ru: "Отвечай на русском. Max 3 предложения.",
    en: "Reply in English. Max 3 sentences."
  };

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = client.messages.stream({
      model      : 'claude-haiku-4-5-20251001',
      max_tokens : 400,
      system     : `Sen ZenMoney AI yordamchisisisan. ${langMap[lang] || langMap.uz}`,
      messages   : messages || []
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ZenMoney AI Server — port ${PORT}`));
