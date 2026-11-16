"""Guarda uma cópia completa do KO Gym no computador do dono.

As cópias de segurança do servidor vivem **no próprio servidor**. Se a máquina
morrer, morrem com ela. Isto traz tudo para cá, arrumado em seis pastas com
nomes que se percebem sem saber de informática:

    CÓPIAS DE SEGURANÇA/
      2026-11-15_0040/
        LEIA-ME.txt
        1 - CODIGO APP MOBILE/        os ficheiros da aplicação do sócio
        2 - CODIGO SOFTWARE/          o site de gestão e o servidor
        3 - BASE DE DADOS DE PRODUCAO/ os sócios, pagamentos e presenças
        4 - FOTOGRAFIAS/              as fotografias e os vídeos
        5 - FORA DO GIT/              os ficheiros com as senhas
        6 - REPOSITORIO INTEIRO/      tudo outra vez, com a história toda

As pastas 1 e 2 são para **abrir e ler**: são os ficheiros como estão. A 6 é
um só ficheiro, de que se recupera o projeto inteiro com todos os commits
mesmo que o GitHub desapareça — é a que interessa a quem for repor isto.

    cd servidor
    ../backend/venv/Scripts/python.exe guardar-copia.py           # simulação
    ../backend/venv/Scripts/python.exe guardar-copia.py --a-serio

Ou, no Windows, dois cliques em GUARDAR-COPIA.bat, na raiz.
"""
import datetime
import io
import os
import shutil
import subprocess
import sys
import zipfile
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
DESTINO = Path(os.environ.get("KO_COPIAS") or (RAIZ / "CÓPIAS DE SEGURANÇA"))
A_GUARDAR = 8

# As seis pastas, pela ordem em que o dono as pediu. Sem acentos nos nomes:
# sao escritos por programas e lidos por pessoas, e os acentos so dao
# trabalho a quem as copia de um computador para outro.
APP = "1 - CODIGO APP MOBILE"
SOFTWARE = "2 - CODIGO SOFTWARE"
BASE_DE_DADOS = "3 - BASE DE DADOS DE PRODUCAO"
FOTOGRAFIAS = "4 - FOTOGRAFIAS"
FORA_DO_GIT = "5 - FORA DO GIT"
REPOSITORIO = "6 - REPOSITORIO INTEIRO"

# O que entra em cada pasta de codigo. Sao os caminhos do Git, por isso o que
# vai e so o que esta gravado -- nunca o node_modules nem o venv.
CODIGO = {
    APP: ["ko-gym-mobile"],
    SOFTWARE: ["frontend", "backend", "servidor", "docker-compose.yml",
               "CLAUDE.md", "README.md"],
}

# Ficheiros que estão fora do Git de propósito e que mais ninguém tem.
SO_EXISTEM_AQUI = [
    "backend/.env",
    "frontend/.env",
    "INICIAR-APP.bat",
    "ko-gym-mobile/.env",
]

# **O `.env` do servidor não é o mesmo que o daqui**, e tem coisas que não
# existem em mais lado nenhum: a palavra-passe de aplicação do Gmail, com que
# o sócio recebe o código para recuperar o PIN, e a chave que assina os
# tokens da aplicação.
#
# Nenhuma das duas é insubstituível — faz-se outra palavra-passe no Gmail, e
# uma chave nova só obriga toda a gente a entrar outra vez. Mas é trabalho a
# mais num dia que já vai ser mau, e custa um ficheiro de duas linhas trazê-lo.
#
# Fica numa pasta à parte, com o nome do que é: um `.env` ao lado do outro,
# com o mesmo nome, trocava-se por ele a repor.
ENV_DO_SERVIDOR = "/root/ko-gym/backend/.env"
PASTA_DO_SERVIDOR = "do servidor"

LEIA_ME = """CÓPIA DE SEGURANÇA DO KO GYM
{data}

Esta pasta tem tudo o que é preciso para voltar a pôr o ginásio a
trabalhar, mesmo que o servidor e o GitHub desapareçam os dois.

{app}
   Os ficheiros da aplicação do sócio, como estão. Podem abrir-se e
   ler-se.

{software}
   O site de gestão (frontend), o servidor (backend) e os guiões da
   máquina. Também se abrem e leem.

{base}
   A base de dados de produção: os sócios, os pagamentos, as presenças,
   as aulas. É a cópia mais recente feita pelo servidor, da noite
   anterior. LEVA DADOS PESSOAIS DE TODOS OS SÓCIOS -- não a ponha em
   lado nenhum público.

{fotos}
   As fotografias e os vídeos: os dos artigos da loja, os dos treinos e
   os retratos dos sócios. Vivem num volume do Docker no servidor e não
   estão no Git.

{fora}
   Os ficheiros com as senhas e os atalhos desta máquina. São os únicos
   que não existem em mais lado nenhum.

   Lá dentro, a pasta "do servidor" tem o .env da máquina de produção,
   que NÃO é o mesmo que o deste computador: leva a palavra-passe de
   aplicação do Gmail e a chave que assina os tokens da aplicação do
   sócio. A repor, é esse que vai para o servidor -- o outro é o de
   trabalhar aqui.

{repo}
   Tudo outra vez, num só ficheiro, com a história completa do projeto
   -- todas as versões, desde o princípio. É esta que interessa a quem
   for repor o projeto. Lá dentro há um COMO REPOR.txt a explicar.

As pastas 1 e 2 são para ver. A 6 é para repor.
"""

COMO_REPOR = """COMO REPOR O PROJETO INTEIRO

O ficheiro ko-gym-codigo.bundle é o repositório completo, com todas as
versões e todos os ramos, num ficheiro só.

Para o abrir, num computador com o Git instalado:

    git clone "ko-gym-codigo.bundle" ko-gym

Fica uma pasta "ko-gym" igual ao projeto, com a história toda. Falta-lhe
só o que nunca esteve no Git: copie para lá os ficheiros da pasta
"{fora}" (as senhas) e, se precisar, reponha a base de dados e as
fotografias das pastas 3 e 4.

ATENÇÃO aos dois .env: o que está em "{fora}/backend/.env" é o deste
computador, para trabalhar; o que está em "{fora}/do servidor/
backend.env" é o da máquina de produção, e é esse que leva a
palavra-passe do Gmail e a chave dos tokens. Trocá-los deixa o servidor
sem conseguir mandar email e põe toda a gente fora da aplicação.

Para conferir que o ficheiro está bom, sem o abrir:

    git bundle verify "ko-gym-codigo.bundle"
"""


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


def avisar_do_que_falta() -> None:
    r = correr(["git", "status", "--porcelain"], cwd=RAIZ)
    por_gravar = [l for l in r.stdout.splitlines() if l.strip()]
    if por_gravar:
        print(f"   AVISO: {len(por_gravar)} ficheiros por gravar no Git.")
        print("   A cópia leva só o que já foi gravado (git commit).")
        for l in por_gravar[:5]:
            print("     ", l)


def o_codigo(pasta: Path, a_serio: bool) -> None:
    """As pastas 1 e 2: os ficheiros como estão, para se poderem ler."""
    for n, (nome, caminhos) in enumerate(CODIGO.items(), start=1):
        print(f"\n{n}. {nome}")
        if not a_serio:
            print("   ->", ", ".join(caminhos))
            continue
        # `git archive` dá exatamente o que está gravado: nunca o
        # node_modules, nunca o venv, nunca as pastas de trabalho.
        r = subprocess.run(["git", "archive", "--format=zip", "HEAD", *caminhos],
                           cwd=RAIZ, capture_output=True)
        if r.returncode != 0:
            print("   FALHOU:", r.stderr.decode("utf-8", "replace")[:160])
            continue
        destino = pasta / nome
        destino.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(io.BytesIO(r.stdout)) as zip_:
            zip_.extractall(destino)
        ficheiros = sum(1 for f in destino.rglob("*") if f.is_file())
        print(f"   -> {ficheiros} ficheiros")


def a_base_de_dados(pasta: Path, a_serio: bool) -> None:
    print(f"\n3. {BASE_DE_DADOS}")
    r = correr(["ssh", SERVIDOR, "ls -1t /root/backups/*.archive.gz | head -1"])
    recente = r.stdout.strip()
    if r.returncode != 0 or not recente:
        print("   FALHOU: não consegui falar com o servidor.")
        print("  ", (r.stderr or "").strip()[:160])
        return

    print(f"   a mais recente do servidor: {Path(recente).name}")
    if not a_serio:
        return

    destino = pasta / BASE_DE_DADOS
    destino.mkdir(parents=True, exist_ok=True)
    ficheiro = destino / Path(recente).name
    r = correr(["scp", "-q", f"{SERVIDOR}:{recente}", str(ficheiro)])
    if r.returncode != 0 or not ficheiro.exists():
        print("   FALHOU a transferência:", (r.stderr or "").strip()[:160])
        return
    print(f"   -> {ficheiro.name} ({tamanho(ficheiro)})")


def as_fotografias(pasta: Path, a_serio: bool) -> None:
    print(f"\n4. {FOTOGRAFIAS}")
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

    destino = pasta / FOTOGRAFIAS
    destino.mkdir(parents=True, exist_ok=True)
    ficheiro = destino / "ko-gym-fotografias.tar.gz"
    with open(ficheiro, "wb") as saida:
        r = subprocess.run(["ssh", SERVIDOR, comando], stdout=saida,
                           stderr=subprocess.PIPE)
    if r.returncode != 0 or ficheiro.stat().st_size < 100:
        print("   FALHOU:", r.stderr.decode("utf-8", "replace").strip()[:160])
        ficheiro.unlink(missing_ok=True)
        return
    print(f"   -> {ficheiro.name} ({tamanho(ficheiro)})")


def o_que_so_existe_aqui(pasta: Path, a_serio: bool) -> None:
    print(f"\n5. {FORA_DO_GIT}")
    for relativo in SO_EXISTEM_AQUI:
        origem = RAIZ / relativo
        if not origem.exists():
            print(f"   (não existe: {relativo})")
            continue
        print(f"   -> {relativo}")
        if a_serio:
            destino = pasta / FORA_DO_GIT / relativo
            destino.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(origem, destino)

    o_env_do_servidor(pasta, a_serio)


def o_env_do_servidor(pasta: Path, a_serio: bool) -> None:
    """O `.env` de produção, que só existe na máquina do servidor."""
    destino = pasta / FORA_DO_GIT / PASTA_DO_SERVIDOR / "backend.env"

    if not a_serio:
        # Na simulação mostram-se **os nomes das chaves e não os valores**:
        # diz o que lá está sem o escrever no ecrã de quem possa estar a ver.
        r = correr(["ssh", SERVIDOR,
                    f"grep -oE '^[A-Z_]+' {ENV_DO_SERVIDOR} | tr '\n' ' '"])
        chaves = " ".join(r.stdout.split()) or "não consegui ler"
        print(f"   -> {PASTA_DO_SERVIDOR}/backend.env  ({chaves})")
        return

    destino.parent.mkdir(parents=True, exist_ok=True)
    r = correr(["scp", "-q", f"{SERVIDOR}:{ENV_DO_SERVIDOR}", str(destino)])
    if r.returncode != 0 or not destino.exists():
        # Não deita a cópia abaixo: o resto dela vale na mesma, e o servidor
        # pode estar simplesmente desligado.
        print("   FALHOU o .env do servidor:", (r.stderr or "").strip()[:160])
        return
    linhas = sum(1 for _ in io.open(destino, encoding="utf-8", errors="replace"))
    print(f"   -> {PASTA_DO_SERVIDOR}/backend.env ({linhas} linhas)")


def o_repositorio(pasta: Path, a_serio: bool) -> None:
    print(f"\n6. {REPOSITORIO}")
    avisar_do_que_falta()
    if not a_serio:
        print("   -> ko-gym-codigo.bundle")
        return

    destino = pasta / REPOSITORIO
    destino.mkdir(parents=True, exist_ok=True)
    ficheiro = destino / "ko-gym-codigo.bundle"
    r = correr(["git", "bundle", "create", str(ficheiro), "--all"], cwd=RAIZ)
    if r.returncode != 0:
        print("   FALHOU:", r.stderr.strip()[:200])
        return
    print(f"   -> {ficheiro.name} ({tamanho(ficheiro)})")

    # Uma cópia que não se sabe repor não é uma cópia.
    r = correr(["git", "bundle", "verify", str(ficheiro)])
    print("   conferido:", "ok" if r.returncode == 0 else "FALHOU")
    (destino / "COMO REPOR.txt").write_text(
        COMO_REPOR.format(fora=FORA_DO_GIT), encoding="utf-8")


def arrumar(a_serio: bool) -> None:
    copias = sorted([p for p in DESTINO.iterdir() if p.is_dir()], reverse=True)
    if len(copias) <= A_GUARDAR:
        return
    print(f"\nA arrumar (guardam-se as últimas {A_GUARDAR})")
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

    agora = datetime.datetime.now()
    pasta = DESTINO / agora.strftime("%Y-%m-%d_%H%M")
    if a_serio:
        pasta.mkdir(parents=True, exist_ok=True)

    o_codigo(pasta, a_serio)
    a_base_de_dados(pasta, a_serio)
    as_fotografias(pasta, a_serio)
    o_que_so_existe_aqui(pasta, a_serio)
    o_repositorio(pasta, a_serio)

    if a_serio:
        (pasta / "LEIA-ME.txt").write_text(
            LEIA_ME.format(
                data=agora.strftime("%d/%m/%Y às %H:%M"),
                app=APP, software=SOFTWARE, base=BASE_DE_DADOS,
                fotos=FOTOGRAFIAS, fora=FORA_DO_GIT, repo=REPOSITORIO,
            ),
            encoding="utf-8",
        )
        arrumar(a_serio)
        total = sum(f.stat().st_size for f in pasta.rglob("*") if f.is_file())
        print(f"\nFeito: {pasta}  ({total / 1024 / 1024:.1f} MB)")
        print("Há um LEIA-ME.txt lá dentro a explicar cada pasta.")
    else:
        print("\nNada foi escrito. Para guardar mesmo, corra com --a-serio.")


if __name__ == "__main__":
    main()
