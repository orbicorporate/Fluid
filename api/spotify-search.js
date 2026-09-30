// Busca de faixas no Spotify (Web API, client credentials).
// Devolve no mesmo formato que o app já entende: { entities: [...] }.
import { requireUser } from './_auth.js';

let token = null, tokenExp = 0;
async function getToken() {
  if (token && Date.now() < tokenExp - 60000) return token;
  const id = process.env.SPOTIFY_CLIENT_ID, secret = process.env.SPOTIFY_CLIENT_SECRET;
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + Buffer.from(id + ':' + secret).toString('base64') },
    body: 'grant_type=client_credentials',
  });
  if (!r.ok) throw new Error('spotify_token');
  const j = await r.json(); token = j.access_token; tokenExp = Date.now() + j.expires_in * 1000;
  return token;
}

export default async function handler(req, res) {
  if (!(await requireUser(req))) return res.status(401).json({ error: 'login' });
  const q = String(req.query.q || '').trim().slice(0, 120);
  if (!q) return res.status(200).json({ entities: [] });
  try {
    const t = await getToken();
    const r = await fetch('https://api.spotify.com/v1/search?type=track&limit=6&market=BR&q=' + encodeURIComponent(q), { headers: { Authorization: 'Bearer ' + t } });
    if (r.status === 429) return res.status(429).json({ error: 'rate_limited' });
    if (!r.ok) return res.status(502).json({ error: 'spotify' });
    const j = await r.json();
    const entities = (j.tracks?.items || []).map(it => ({
      entity_type: 'MUSIC',
      name: it.name,
      creators: (it.artists || []).map(a => ({ name: a.name })),
      url: it.external_urls?.spotify || '',
      parent: { name: it.album?.name || '' },
      playback: { duration_ms: String(it.duration_ms || '') },
    }));
    res.status(200).json({ entities });
  } catch (e) {
    res.status(502).json({ error: 'spotify' });
  }
}
