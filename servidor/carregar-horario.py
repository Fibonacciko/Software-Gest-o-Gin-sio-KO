"""Carrega o horário semanal do Ginásio KO em produção.

Corre-se uma vez, para não ter de escrever treze aulas à mão. Depois disto,
o horário mantém-se na própria aplicação, em **Aulas**.

Recusa-se a mexer se já houver aulas na grelha: isto é para encher uma grelha
vazia, não para a corrigir.

    cd servidor
    ../backend/venv/Scripts/python.exe carregar-horario.py          # simulação
    ../backend/venv/Scripts/python.exe carregar-horario.py --a-serio

Ou, no Windows, dois cliques em CARREGAR-HORARIO.bat, na raiz.
"""
import getpass
import sys

import requests

API = "https://ginasioko.site/api"

LUGARES = 28

# (dia, hora, duração em minutos, modalidade, turma, professor)
# O dia é 0 = segunda, como o weekday() do Python.
HORARIO = [
    (0, "11:00", 90, "Boxe", None, "Fábio Guerreiro"),
    (0, "18:00", 90, "Kickboxing", None, "Kayta"),
    (0, "19:30", 120, "Boxe", None, "Fábio Guerreiro"),

    (1, "18:00", 60, "Boxe", None, "Fábio Guerreiro"),
    (1, "19:00", 60, "Jiu-Jitsu", "Kids", "Leandro Nórdico"),

    (2, "11:00", 90, "Boxe", None, "Fábio Guerreiro"),
    (2, "18:00", 90, "Kickboxing", None, "Kayta"),
    (2, "19:30", 120, "Boxe", None, "Fábio Guerreiro"),

    (3, "18:00", 60, "Boxe", None, "Fábio Guerreiro"),
    (3, "19:00", 60, "Jiu-Jitsu", "Kids", "Leandro Nórdico"),

    (4, "11:00", 90, "Boxe", None, "Fábio Guerreiro"),
    (4, "18:00", 90, "Kickboxing", None, "Kayta"),
    (4, "19:30", 120, "Boxe", None, "Fábio Guerreiro"),
]

DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]


def hora_do_fim(hora: str, minutos: int) -> str:
    fim = int(hora[:2]) * 60 + int(hora[3:]) + minutos
    return f"{fim // 60:02d}:{fim % 60:02d}"


def main() -> None:
    a_serio = "--a-serio" in sys.argv

    print("Horário do Ginásio KO\n")
    if not a_serio:
        print("SIMULACAO - nada vai ser escrito.\n")

    utilizador = input("O seu utilizador em ginasioko.site: ").strip()
    senha = getpass.getpass("A sua senha (não aparece no ecrã): ")

    entrada = requests.post(
        f"{API}/auth/login", json={"username": utilizador, "password": senha}, timeout=30
    )
    if entrada.status_code != 200:
        raise SystemExit("\nUtilizador ou senha errados. Nada foi escrito.")
    cabecalho = {"Authorization": f"Bearer {entrada.json()['access_token']}"}

    modalidades = requests.get(f"{API}/activities", headers=cabecalho, timeout=30).json()

    def modalidade(nome: str):
        """As modalidades em produção têm emoji no nome ('🥊 Boxe')."""
        for m in modalidades:
            if nome.lower() in m["name"].lower():
                return m["id"], m["name"]
        raise SystemExit(f"Não encontrei a modalidade {nome} em ginasioko.site.")

    ja_la_estao = requests.get(f"{API}/class-slots", headers=cabecalho, timeout=30).json()
    if ja_la_estao:
        raise SystemExit(
            f"\nJá há {len(ja_la_estao)} aulas na grelha. Não mexo em nada.\n"
            "Se quiser recomeçar, apague-as primeiro na página Aulas."
        )

    print(f"\n{len(HORARIO)} aulas, {LUGARES} lugares cada:\n")
    for dia, hora, minutos, nome_modalidade, turma, professor in HORARIO:
        id_modalidade, nome_certo = modalidade(nome_modalidade)
        rotulo = nome_certo + (f" - {turma}" if turma else "")
        print(f"  {DIAS[dia]:8} {hora}-{hora_do_fim(hora, minutos)}  {rotulo:22} {professor}")

        if not a_serio:
            continue

        resposta = requests.post(
            f"{API}/class-slots",
            headers=cabecalho,
            json={
                "activity_id": id_modalidade,
                "label": turma,
                "weekday": dia,
                "start_time": hora,
                "duration_min": minutos,
                "capacity": LUGARES,
                "instructor": professor,
                "is_active": True,
            },
            timeout=30,
        )
        if resposta.status_code != 200:
            raise SystemExit(f"\nFalhou nesta aula: {resposta.text}")

    if a_serio:
        total = len(requests.get(f"{API}/class-slots", headers=cabecalho, timeout=30).json())
        print(f"\nFeito. {total} aulas na grelha.")
        print("Veja em ginasioko.site, na pagina Aulas.")
    else:
        print("\nNada foi escrito. Para carregar mesmo, corra outra vez com --a-serio.")


if __name__ == "__main__":
    main()
