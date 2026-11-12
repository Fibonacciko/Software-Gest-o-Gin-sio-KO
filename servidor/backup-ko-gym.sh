#!/bin/bash
# Copia de seguranca diaria do KO Gym, no servidor.
#
# Guarda duas coisas, com o mesmo carimbo de data:
#   * a base de dados   (ko-gym-AAAAMMDD-HHMM.archive.gz)
#   * as fotografias    (ko-gym-AAAAMMDD-HHMM.fotos.tar.gz)
#
# As fotografias ficaram de fora durante muito tempo: o mongodump nao lhes
# toca, porque elas vivem num volume do Docker e nao na base de dados. Uma
# copia sem elas repoe um ginasio sem uma unica fotografia de artigo, de
# parceiro ou de socio.
#
# Guarda as ultimas DIAS_A_GUARDAR de cada, e apaga as mais antigas.
# Corre todas as noites as 3h30, pelo cron (crontab -l).
#
# Este ficheiro vive no repositorio; o que corre e a copia em
# /root/backup-ko-gym.sh. Depois de o mudar, volte a instala-lo:
#   scp servidor/backup-ko-gym.sh root@187.77.90.171:/root/backup-ko-gym.sh
#   ssh root@187.77.90.171 "chmod +x /root/backup-ko-gym.sh"
set -u

DESTINO="/root/backups"
DIAS_A_GUARDAR=30
CARIMBO="$(date +%Y%m%d-%H%M)"
FICHEIRO="$DESTINO/ko-gym-$CARIMBO.archive.gz"
FOTOS="$DESTINO/ko-gym-$CARIMBO.fotos.tar.gz"
VOLUME="ko-gym_uploads"
LOG="/var/log/ko-gym-backup.log"

mkdir -p "$DESTINO"

registar() { echo "$(date '+%F %T') $*" >> "$LOG"; }

if ! docker ps --format '{{.Names}}' | grep -q '^ko-gym-mongo-1$'; then
  registar "ERRO: contentor da base de dados nao esta a correr"
  exit 1
fi

# ------------------------------------------------------- a base de dados
if docker exec ko-gym-mongo-1 sh -c \
     'mongodump --username admin --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --archive --gzip' \
     > "$FICHEIRO" 2>/dev/null; then
  TAMANHO=$(du -h "$FICHEIRO" | cut -f1)
  # Uma copia vazia ou minuscula significa que algo correu mal
  if [ "$(stat -c%s "$FICHEIRO")" -lt 10000 ]; then
    registar "ERRO: copia demasiado pequena ($TAMANHO), apagada"
    rm -f "$FICHEIRO"
    exit 1
  fi
  registar "OK: $FICHEIRO ($TAMANHO)"
else
  registar "ERRO: mongodump falhou"
  rm -f "$FICHEIRO"
  exit 1
fi

# -------------------------------------------------------- as fotografias
# O volume nao se le de fora: monta-se num contentor de uma vez so, que
# escreve o tar para o stdout e desaparece.
if docker run --rm -v "$VOLUME":/u alpine sh -c 'cd /u && tar czf - .' \
     > "$FOTOS" 2>/dev/null && [ "$(stat -c%s "$FOTOS")" -gt 100 ]; then
  registar "OK: $FOTOS ($(du -h "$FOTOS" | cut -f1))"
else
  # Sem fotografias ainda ha copia da base de dados: avisa-se e segue-se.
  registar "AVISO: nao consegui guardar as fotografias do volume $VOLUME"
  rm -f "$FOTOS"
fi

# ------------------------------------------- manter apenas as mais recentes
for padrao in "ko-gym-*.archive.gz" "ko-gym-*.fotos.tar.gz"; do
  # shellcheck disable=SC2086
  ls -1t $DESTINO/$padrao 2>/dev/null | tail -n +$((DIAS_A_GUARDAR + 1)) | while read -r antigo; do
    rm -f "$antigo"
    registar "apagada copia antiga: $antigo"
  done
done
