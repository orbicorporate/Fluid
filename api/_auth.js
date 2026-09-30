// Confere o login do Supabase antes de liberar as funções (evita uso por terceiros).
export async function requireUser(req) {
  const auth = req.headers.authorization || '';
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_ANON_KEY;
  if (!auth.startsWith('Bearer ') || !url || !key) return null;
  const r = await fetch(url + '/auth/v1/user', { headers: { Authorization: auth, apikey: key } });
  if (!r.ok) return null;
  return r.json();
}
