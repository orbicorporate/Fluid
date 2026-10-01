// Monta o index.html a partir de src/app.html (a mesma fonte do Fluid no Claude)
// acrescentando o Supabase, a configuração e a camada web (login, cadernos, convites).
// Uso: node tools/build.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/app.html', import.meta.url), 'utf8');
const head = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#EDEFF6">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=3">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Fluid">
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"></script>
<script src="/config.js"></script>
</head>
<body>
`;
// a camada web precisa rodar antes do script do app
const i = app.indexOf('<script>');
const out = head + app.slice(0, i) + '<script src="/web.js"></script>\n' + app.slice(i) + '\n</body>\n</html>\n';
writeFileSync(new URL('../index.html', import.meta.url), out);
console.log('index.html gerado', out.length, 'bytes');
