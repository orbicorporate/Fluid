// Diz ao app quais recursos opcionais estão configurados nesta instalação.
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    spotify: !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET),
    ai: !!process.env.ANTHROPIC_API_KEY,
  });
}
