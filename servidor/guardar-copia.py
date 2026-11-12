"""Guarda uma cópia completa do KO Gym no computador do dono.

As cópias de segurança do servidor vivem **no próprio servidor**. Se a máquina
morrer, morrem com ela. Isto traz tudo para cá:

  * o **código**, em `git bundle` — um só ficheiro com a história toda, de que
    se recupera o repositório inteiro mesmo que o GitHub desapareça;
  * os **ficheiros locais que não estão no Git** (`backend/.env`,
    `frontend/.env`, `INICIAR-APP.bat`), que são os que ninguém tem noutro
    lado nenhum;
  * a **base de dados** de produção, a cópia mais recente do servidor;
  * as **fotografias e vídeos**, que vivem num volume do Docker e até aqui
    **não eram guardados em lado nenhum**.

Cada cópia fica numa pasta com a data, dentro de `CÓDIGO`, na raiz do
projeto. Guardam-se as últimas `A_GUARDAR`.

    cd servidor
    ../backend/venv/Scripts/python.exe guardar-copia.py           # simulação
    ../backend/venv/Scripts/python.exe guardar-copia.py --a-serio

Ou, no Windows, dois cliques em GUARDAR-COPIA.bat, na raiz.
"""
import datetime
import os
import shutil
import subprocess
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except (AttributeError, OSError):
    pass

RAIZ = Path(__file__).resolve().parent.parent
SERVIDOR = "root@187.77.90.171"
VOLUME = "ko-gym_uploads"

# Dentro do projeto, por decisao do dono: tudo o que e do KO Gym fica num so
# sitio. A pasta esta no .gitignore e tem de continuar la -- a copia da base
# de dados leva os dados pessoais de todos os socios.
DESTINO = Path(os.environ.get("KO_COPIAS") or (RAIZ / "CÓDIGO"))
A_GUARDAR = 8

# Ficheiros que estão fora do Git de propósito e que mais ninguém tem.
SO_EXISTEM_AQUI = [
    "backend/.env",
    "frontend/.env",
    "INICIAR-APP.bat",
    "ko-gym-mobile/.env",
]


def correr(comando, **kwargs):
    return subprocess.run(comando, capture_output=True, text=True,
                          encoding="utf-8", errors="replace", **kwargs)


def tamanho(caminho: Path) -> str:
    n = caminho.stat().st_size
    for unidade in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.0f} {unidade}"
        n /= 1024
    return f"{n:.1f} TB"


def o_codigo(pasta: Path, a_serio: bool) -> None:
    print("\n1. O código, com a história toda")

    r = correr(["git", "status", "--porcelain"], cwd=RAIZ)
    por_gravar = [l for l in r.stdout.splitlines() if l.strip()]
    if por_gravar:
        print(f"   AVISO: {len(por_gravar)} ficheiros por gravar no Git.")
        print("   O bundle leva só o que já foi gravado (git commit).")
        for l in por_gravar[:5]:
            print("     ", l)

    if not a_serio:
        print("   -> ko-gym-codigo.bundle")
        return

    destino = pasta / "ko-gym-codigo.bundle"
    r = correr(["git", "bundle", "create", str(destino), "--all"], cwd=RAIZ)
    if r.returncode != 0:
        print("   FALHOU:", r.stderr.strip()[:200])
        return
    print(f"   -> {destino.name} ({tamanho(destino)})")

    # Uma cópia que não se sabe repor não é uma cópia.
    r = correr(["git", "bundle", "verify", str(destino)])
    print("   conferido:", "ok" if r.returncode == 0 else "FALHOU")


def o_que_so_existe_aqui(pasta: Path, a_serio: bool) -> None:
    print("\n2. Os ficheiros que estão fora do Git")
    for relativo in SO_EXISTEM_AQUI:
        origem = RAIZ / relativo
        if not origem.exists():
            print(f"   (não existe: {relativo})")
            continue
        print(f"   -> {relativo}")
        if a_serio:
            destino = pasta / "fora-do-git" / relativo
            destino.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(origem, destino)


def a_base_de_dados(pasta: Path, a_serio: bool) -> None:
    print("\n3. A base de dados de produção")
    r = correr(["ssh", SERVIDOR, "ls -1t /root/backups/*.archive.gz | head -1"])
    recente = r.stdout.strip()
    if r.returncode != 0 or not recente:
        print("   FALHOU: não consegui falar com o servidor.")
        print("  ", (r.stderr or "").strip()[:160])
        return

    print(f"   a mais recente do servidor: {Path(recente).name}")
    if not a_serio:
        return

    destino = pasta / Path(recente).name
    r = correr(["scp", "-q", f"{SERVIDOR}:{recente}", str(destino)])
    if r.returncode != 0 or not destino.exists():
        print("   FALHOU a transferência:", (r.stderr or "").strip()[:160])
        return
    print(f"   -> {destino.name} ({tamanho(destino)})")


def as_fotografias(pasta: Path, a_serio: bool) -> None:
    print("\n4. As fotografias e os vídeos")
    # O volume do Docker não se lê de fora: monta-se num contentor de uma vez
    # só, que escreve o tar para o stdout e desaparece.
    comando = (
        f"docker run --rm -v {VOLUME}:/u alpine "
        f"sh -c 'cd /u && tar czf - .'"
    )
    if not a_serio:
        r = correr(["ssh", SERVIDOR,
                    f"docker run --rm -v {VOLUME}:/u alpine "
                    f"sh -c 'du -sh /u; find /u -type f | wc -l'"])
        print("  ", " ".join(r.stdout.split()) or "não consegui contar")
        print("   -> ko-gym-fotografias.tar.gz")
        return

    destino = pasta / "ko-gym-fotografias.tar.gz"
    with open(destino, "wb") as ficheiro:
        r = subprocess.run(["ssh", SERVIDOR, comando], stdout=ficheiro,
                           stderr=subprocess.PIPE)
    if r.returncode != 0 or destino.stat().st_size < 100:
        print("   FALHOU:", r.stderr.decode("utf-8", "replace").strip()[:160])
        destino.unlink(missing_ok=True)
        return
    print(f"   -> {destino.name} ({tamanho(destino)})")


def arrumar(a_serio: bool) -> None:
    copias = sorted([p for p in DESTINO.iterdir() if p.is_dir()], reverse=True)
    if len(copias) <= A_GUARDAR:
        return
    print(f"\n5. A arrumar (guardam-se as últimas {A_GUARDAR})")
    for antiga in copias[A_GUARDAR:]:
        print("   apagada:", antiga.name)
        if a_serio:
            shutil.rmtree(antiga, ignore_errors=True)


def main() -> None:
    a_serio = "--a-serio" in sys.argv

    print("Cópia de segurança do KO Gym")
    print(f"Para: {DESTINO}")
    if not a_serio:
        print("\nSIMULAÇÃO - nada vai ser escrito.")

    hoje = datetime.datetime.now().strftime("%Y-%m-%d_%H%M")
    pasta = DESTINO / hoje
    if a_serio:
        pasta.mkdir(parents=True, exist_ok=True)

    o_codigo(pasta, a_serio)
    o_que_so_existe_aqui(pasta, a_serio)
    a_base_de_dados(pasta, a_serio)
    as_fotografias(pasta, a_serio)
    if a_serio:
        arrumar(a_serio)

    if a_serio:
        total = sum(f.stat().st_size for f in pasta.rglob("*") if f.is_file())
        print(f"\nFeito: {pasta}  ({total / 1024 / 1024:.1f} MB)")
        print("\nPara repor o código a partir do bundle:")
        print(f"   git clone \"{pasta / 'ko-gym-codigo.bundle'}\" ko-gym")
    else:
        print("\nNada foi escrito. Para guardar mesmo, corra com --a-serio.")


if __name__ == "__main__":
    main()
