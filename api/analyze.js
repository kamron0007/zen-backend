import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { balance=0, income=0, expense=0, categories={}, lang='uz' } = req.body;
  const langMap = {
    uz: "O'zbek tilida 2-3 jumlada qisqa maslahat ber. Emoji mumkin.",
    ru: "На русском 2-3 предложения. Эмодзи можно.",
    en: "In English 2-3 sentences. Emojis allowed."
  };
  const catStr = Object.entries(categories).map(([k,v]) => `${k}: $${Number(v).toFixed(0)}`).join(', ');
  const savRate = income > 0 ? Math.round((income-expense)/income*100) : 0;
  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: `Sen ZenMoney moliyaviy AI yordamchisisisan. ${langMap[lang]||langMap.uz}`,
      messages: [{ role: 'user', content: `Balans: $${Number(balance).toFixed(2)}\nKirim: $${Number(income).toFixed(2)}\nChiqim: $${Number(expense).toFixed(2)}\nTejamkorlik: ${savRate}%\nKategoriyalar: ${catStr||"yo'q"}\nMaslahat ber.` }]
    });
    res.json({ success: true, message: msg.content[0].text.trim() });
  } catch(err) { res.status(500).json({ success: false, error: err.message }); }
}
