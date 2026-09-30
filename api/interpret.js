// Interpreta a mensagem do professor com o Claude e devolve JSON.
import { requireUser } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!(await requireUser(req))) return res.status(401).json({ error: 'login' });
  const prompt = String((req.body && req.body.prompt) || '').slice(0, 8000);
  if (!prompt) return res.status(400).json({ error: 'prompt' });
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.FLUID_AI_MODEL || 'claude-haiku-4-5-20251001', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] }),
    });
    if (r.status === 429) return res.status(429).json({ error: 'rate_limited' });
    if (!r.ok) return res.status(502).json({ error: 'ai' });
    const j = await r.json();
    const text = (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const m = text.match(/\{[\s\S]*\}/);
    res.status(200).json({ json: m ? JSON.parse(m[0]) : {} });
  } catch (e) {
    res.status(502).json({ error: 'ai' });
  }
}
