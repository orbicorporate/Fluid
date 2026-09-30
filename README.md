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

É um único `index.html`, sem build. Abra no navegador ou publique como site estático (Vercel, Netlify, GitHub Pages).

Dentro do Claude (como Artifact), o app usa recursos da plataforma: banco compartilhado entre aparelhos, busca no Spotify pelo conector e interpretação com IA. Fora do Claude, esses recursos ficam indisponíveis e o app salva tudo no `localStorage` do navegador (só naquele aparelho), escondendo a busca no Spotify e o botão de IA.

## Próximos passos

- Trocar o armazenamento local por Supabase (auth + banco) para sincronizar entre aparelhos fora do Claude.
- Busca no Spotify via Web API com uma função no servidor.
- Afinador pelo microfone (bloqueado dentro do Claude, possível no site próprio).
