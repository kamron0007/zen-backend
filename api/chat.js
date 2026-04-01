import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { messages=[], lang='uz' } = req.body;
  const langMap = {
    uz: "O'zbek tilida javob ber. Max 3 gap. Emoji mumkin.",
    ru: "На русском. Макс 3 предложения. Эмодзи можно.",
    en: "In English. Max 3 sentences. Emojis allowed."
  };
  const history = messages.slice(-10).map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: String(m.content || m.text || '')
  }));
  if (!history.length) return res.status(400).json({ success: false, error: 'No messages' });
  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: `Sen ZenMoney AI yordamchisisisan. ${langMap[lang]||langMap.uz} Moliya, tejamkorlik, byudjet haqida yordam ber.`,
      messages: history
    });
    res.json({ success: true, message: msg.content[0].text.trim() });
  } catch(err) { res.status(500).json({ success: false, error: err.message }); }
}
