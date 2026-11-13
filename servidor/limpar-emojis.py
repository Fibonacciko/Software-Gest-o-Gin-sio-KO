"""Tira os emoji dos nomes das modalidades, no servidor.

Na base de dados as modalidades chamam-se "<luva> Boxe", "<perna> Kickboxing",
"<halterofilista> Musculacao". Na aplicacao do socio eles ja nao aparecem --
o `semEmoji()` tira-os -- mas na gestao continuam, e e por isso que este
script existe: para os tirar na origem.

**Nao ha pagina nenhuma na gestao que edite modalidades.** A API tem a rota
(`PUT /api/activities/<id>`), mas nenhum ecra lhe chama. Por isso isto e um
script e nao um botao.

Corre-se a mao, e pede a senha:

    cd servidor
    ../backend/venv/Scripts/python.exe limpar-emojis.py

Mostra o que vai fazer e pergunta antes de mexer. Sem confirmacao nao escreve
nada.
"""
import getpass
import re
import sys

import requests

API = "https://ginasioko.site/api"

# O que se tira: so o que esta **a frente** do nome. Um emoji no meio de um
# nome escrito a mao e escolha de quem o escreveu.
EMOJI_A_FRENTE = re.compile(
    "^(?:[\U0001F000-\U0001FAFF☀-➿️‍←-⇿⬀-⯿]|\\s)+"
)


def sem_emoji(nome: str) -> str:
    return EMOJI_A_FRENTE.sub("", nome or "").strip()


def main() -> int:
    # A consola do Windows e cp1252: escrever um emoji levanta erro. Nao se
    # escreve nenhum -- mostram-se os nomes ja limpos e o que foi tirado em
    # numero de caracteres.
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    utilizador = input("Utilizador do ginasioko.site: ").strip()
    senha = getpass.getpass("Senha: ")

    r = requests.post(f"{API}/auth/login", json={"username": utilizador, "password": senha})
    if r.status_code != 200:
        print("Nao consegui entrar:", r.status_code, r.text[:120])
        return 1
    cabecalho = {"Authorization": "Bearer " + r.json()["access_token"]}

    modalidades = requests.get(f"{API}/activities", headers=cabecalho).json()
    por_mudar = [
        (a, sem_emoji(a["name"])) for a in modalidades if sem_emoji(a["name"]) != a["name"]
    ]

    if not por_mudar:
        print("Nenhuma modalidade tem emoji a frente. Nao ha nada a fazer.")
        return 0

    print(f"\nModalidades a mudar ({len(por_mudar)} de {len(modalidades)}):")
    for antiga, novo in por_mudar:
        tirados = len(antiga["name"]) - len(novo)
        print(f"   -> {novo}   ({tirados} caracteres tirados da frente)")

    if input("\nEscrever estas mudancas? (escreva SIM) ").strip() != "SIM":
        print("Nada foi mudado.")
        return 0

    for antiga, novo in por_mudar:
        corpo = {
            "name": novo,
            "color": antiga.get("color"),
            "description": antiga.get("description"),
        }
        r = requests.put(f"{API}/activities/{antiga['id']}", headers=cabecalho, json=corpo)
        print(f"   {novo}: {r.status_code}")

    print("\nFeito. O painel e as fichas passam a mostrar os nomes sem emoji.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
