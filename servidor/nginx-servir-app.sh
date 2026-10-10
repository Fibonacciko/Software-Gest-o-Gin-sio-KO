#!/bin/bash
# Serve a aplicacao Android no proprio site, num endereco curto:
#   https://ginasioko.site/app   -> a pagina com o botao de instalar
#   https://ginasioko.site/ko-gym.apk -> o ficheiro
#
# Fica antes do "location /", que encaminha tudo o resto para o site.
set -e

CONF=/etc/nginx/sites-enabled/ginasioko.site

if grep -q "ko-gym.apk" "$CONF"; then
  echo "ja estava configurado"
  exit 0
fi

python3 - <<'PY'
caminho = "/etc/nginx/sites-enabled/ginasioko.site"
s = open(caminho, encoding="utf-8").read()

bloco = '''
    # A aplicacao do socio, servida pelo proprio site: o endereco da Expo e
    # comprido e o Chrome desconfia dele. Aqui e curto e o dominio e o nosso.
    location = /ko-gym.apk {
        alias /var/www/ko-app/ko-gym.apk;
        default_type application/vnd.android.package-archive;
        add_header Content-Disposition 'attachment; filename="ko-gym.apk"';
        add_header Cache-Control "no-store";
    }

    location = /app {
        alias /var/www/ko-app/index.html;
        default_type text/html;
    }

    location = /app/ {
        alias /var/www/ko-app/index.html;
        default_type text/html;
    }

    location / {'''

alvo = "\n    location / {"
assert s.count(alvo) == 1, f"esperava uma 'location /', encontrei {s.count(alvo)}"
s = s.replace(alvo, bloco, 1)

open(caminho, "w", encoding="utf-8").write(s)
print("nginx actualizado")
PY

nginx -t && systemctl reload nginx && echo "nginx recarregado"
