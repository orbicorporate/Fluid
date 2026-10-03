# Insere src/extras.js dentro do script do app (src/app.html), entre marcadores.
import re
app = open('src/app.html').read(); ex = open('src/extras.js').read() + '\n' + open('src/ux.js').read()
A, B = '/* @@EXTRAS@@ */', '/* @@END-EXTRAS@@ */'
block = A + '\n' + ex + '\n' + B
if A in app:
    i = app.index(A); j = app.index(B) + len(B); app = app[:i] + block + app[j:]
else:
    k = app.index('/* ---------- global wiring ---------- */'); app = app[:k] + block + '\n\n' + app[k:]
css = open('src/extras.css').read() + '\n' + open('src/ux.css').read(); C1, C2 = '/* @@EXTRAS-CSS@@ */', '/* @@END-EXTRAS-CSS@@ */'
cblock = C1 + '\n' + css + '\n' + C2
if C1 in app:
    i = app.index(C1); j = app.index(C2) + len(C2); app = app[:i] + cblock + app[j:]
else:
    k = app.rindex('</style>'); app = app[:k] + cblock + '\n' + app[k:]
open('src/app.html','w').write(app); print('extras inline ok')
