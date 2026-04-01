import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { title='', current=0, target=1, daysLeft=30, lang='uz' } = req.body;
  const pct = Math.round(current/target*100);
  const daily = daysLeft > 0 ? ((target-current)/daysLeft).toFixed(2) : '0';
  const langMap = {
    uz: "O'zbek tilida 2 jumlada motivatsion maslahat ber. Emoji mumkin.",
    ru: "На русском 2 предложения мотивации. Эмодзи можно.",
    en: "2 motivational sentences in English. Emojis allowed."
  };
  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      system: `Sen moliyaviy yordamchisan. ${langMap[lang]||langMap.uz}`,
      messages: [{ role: 'user', content: `Maqsad: "${title}"\nBajarildi: ${pct}%\nQoldi: $${(target-current).toFixed(0)}\nKunlik: $${daily}\nVaqt: ${daysLeft} kun` }]
    });
    res.json({ success: true, message: msg.content[0].text.trim() });
  } catch(err) { res.status(500).json({ success: false, error: err.message }); }
}
