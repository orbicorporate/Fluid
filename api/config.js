// Diz ao app quais recursos opcionais estão ligados nesta instalação.
// A busca de músicas sempre funciona (Spotify se configurado, senão a busca pública do iTunes).
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    spotify: true,
    spotifyDirect: !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET),
    ai: !!process.env.ANTHROPIC_API_KEY,
  });
}
