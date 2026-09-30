# Fluid

Caderno de violão para registrar o que o professor passa em aula e treinar em casa.

## O que faz

- Colar a mensagem do professor: entende link, capotraste, bpm, acordes na notação corda+casa (`21-42-32`), dedilhados (`60·60·45↑·42`) e batida com setas (`↓ ↓↑ ↑↓↑`). Quando o formato é novo, pode interpretar com IA.
- Acordes com diagrama, nome detectado automaticamente, visão em Números ou Cifra e "soa como" considerando o capotraste.
- Ouvir o acorde e o dedilhado (síntese Karplus-Strong no navegador) e afinação de referência das 6 cordas.
- Praticar com metrônomo, batida destacada, violão guia e letra acompanhando os acordes.
- Treino de troca de acordes em 1 minuto, por música, com o caminho dos dedos animado e recordes.
- Letra com acordes marcados em cima das palavras.
- Diário de aula com lição de casa e dúvidas para a próxima aula.
- Órbita de progresso: acordes que você já sabe, que está aprendendo e músicas prontas para tocar.
- Pastilhas (tags) editáveis por música.

## Como roda

- `src/app.html`: o app (a mesma fonte usada no Fluid dentro do Claude).
- `web.js`: camada web com login (e-mail e senha), cadernos, convite para o professor e o banco no Supabase em tempo real.
- `index.html`: gerado por `node tools/build.mjs` a partir dos dois acima. É o que a Vercel serve.
- `config.js`: URL e chave pública (anon) do Supabase.
- `supabase/migrations/001_fluid.sql`: tabelas, regras de acesso (RLS), convites e tempo real.
- `api/`: funções da Vercel. `spotify-search` (precisa de `SPOTIFY_CLIENT_ID` e `SPOTIFY_CLIENT_SECRET`), `interpret` (precisa de `ANTHROPIC_API_KEY`) e `config`. As duas primeiras exigem login e usam `SUPABASE_URL` e `SUPABASE_ANON_KEY`.

## Cadernos e convites

Cada pessoa que cria conta ganha um caderno. O dono gera um link de convite no botão da conta (canto inferior direito) e manda para o professor. O professor cria a conta pelo link e passa a ver e editar o caderno. Um professor pode ter vários alunos e troca de caderno pelo mesmo botão.
