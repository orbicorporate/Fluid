// Assistente do Fluid: repassa uma rodada de conversa ao Claude (com ferramentas que rodam no app).
// O app guarda a conversa e executa as ferramentas; aqui só fazemos a chamada autenticada.
import { requireUser } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!(await requireUser(req))) return res.status(401).json({ error: 'login' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: 'no_key' });
  const b = req.body || {};
  const messages = Array.isArray(b.messages) ? b.messages.slice(-40) : [];
  const tools = Array.isArray(b.tools) ? b.tools.slice(0, 20) : undefined;
  if (!messages.length || JSON.stringify(messages).length > 300000) return res.status(400).json({ error: 'input' });
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.FLUID_CHAT_MODEL || 'claude-sonnet-5-5', max_tokens: 2500, messages, ...(tools && tools.length ? { tools } : {}) }),
    });
    if (r.status === 429) return res.status(429).json({ error: 'rate_limited' });
    if (!r.ok) return res.status(502).json({ error: 'ai', detail: (await r.text()).slice(0, 300) });
    const j = await r.json();
    res.status(200).json({ content: j.content || [], stop_reason: j.stop_reason });
  } catch (e) {
    res.status(502).json({ error: 'ai' });
  }
}
