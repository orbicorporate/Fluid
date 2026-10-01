// Busca de faixas para o Fluid.
// Com SPOTIFY_CLIENT_ID e SPOTIFY_CLIENT_SECRET usa a Web API do Spotify (links diretos para a faixa).
// Sem eles, usa a busca pública do iTunes, que não precisa de chave (o link vira uma busca no Spotify).
// Devolve no mesmo formato que o app já entende: { entities: [...] }.
import { requireUser } from './_auth.js';

let token = null, tokenExp = 0;
async function spotifyToken() {
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

async function viaSpotify(q) {
  const t = await spotifyToken();
  const r = await fetch('https://api.spotify.com/v1/search?type=track&limit=6&market=BR&q=' + encodeURIComponent(q), { headers: { Authorization: 'Bearer ' + t } });
  if (r.status === 429) { const e = new Error('rate'); e.status = 429; throw e; }
  if (!r.ok) throw new Error('spotify');
  const j = await r.json();
  return (j.tracks?.items || []).map(it => {
    const imgs = it.album?.images || [];
    return {
      entity_type: 'MUSIC', source: 'spotify',
      name: it.name,
      creators: (it.artists || []).map(a => ({ name: a.name })),
      url: it.external_urls?.spotify || '',
      parent: { name: it.album?.name || '' },
      playback: { duration_ms: String(it.duration_ms || '') },
      display: { covers: imgs.length ? [{ url: imgs[imgs.length - 1].url, size: 'SMALL' }] : [] },
    };
  });
}

async function viaItunes(q) {
  const r = await fetch('https://itunes.apple.com/search?media=music&entity=song&limit=6&country=BR&term=' + encodeURIComponent(q));
  if (!r.ok) throw new Error('itunes');
  const j = await r.json();
  return (j.results || []).map(it => ({
    entity_type: 'MUSIC', source: 'apple',
    name: it.trackName,
    creators: [{ name: it.artistName }],
    url: 'https://open.spotify.com/search/' + encodeURIComponent(`${it.trackName} ${it.artistName}`),
    parent: { name: it.collectionName || '' },
    playback: { duration_ms: String(it.trackTimeMillis || '') },
    display: { covers: it.artworkUrl100 ? [{ url: it.artworkUrl100, size: 'SMALL' }] : [] },
  }));
}

export default async function handler(req, res) {
  if (!(await requireUser(req))) return res.status(401).json({ error: 'login' });
  const q = String(req.query.q || '').trim().slice(0, 120);
  if (!q) return res.status(200).json({ entities: [] });
  const hasSpotify = !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
  try {
    let entities = [];
    if (hasSpotify) { try { entities = await viaSpotify(q); } catch (e) { if (e.status === 429) return res.status(429).json({ error: 'rate_limited' }); } }
    if (!entities.length) entities = await viaItunes(q);
    res.status(200).json({ entities });
  } catch (e) {
    res.status(502).json({ error: 'search' });
  }
}
