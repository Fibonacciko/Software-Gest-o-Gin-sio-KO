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

try:
    import msvcrt  # so existe no Windows
except ImportError:
    msvcrt = None

# O nome das modalidades em producao tem emoji ("🥊 Boxe"), e nos imprimimo-lo.
# Num terminal cp1252 isso rebenta a meio da escrita, com metade das aulas ja
# criadas e a outra metade nao - o pior sitio possivel para parar. Com isto, o
# que o terminal nao souber mostrar sai como "?" e o trabalho segue.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except (AttributeError, OSError):
    pass

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


def pedir_senha(pergunta: str) -> str:
    """A senha, com um asterisco por cada letra.

    O getpass() normal nao mostra absolutamente nada - nem asteriscos, nem o
    cursor a andar. Quem esta a olhar para o ecra conclui que o teclado nao
    funciona e fecha a janela, e foi exactamente isso que aconteceu da
    primeira vez. Um asterisco por tecla resolve.
    """
    if msvcrt is None:
        return getpass.getpass(pergunta)

    print(pergunta, end="", flush=True)
    letras = []
    while True:
        t = msvcrt.getwch()
        if t in ("\r", "\n"):
            print()
            return "".join(letras)
        if t == "\x03":  # Ctrl+C
            print()
            raise KeyboardInterrupt
        if t == "\b":
            if letras:
                letras.pop()
                print("\b \b", end="", flush=True)
        elif t in ("\x00", "\xe0"):  # setas e teclas de funcao: dois codigos
            msvcrt.getwch()
        else:
            letras.append(t)
            print("*", end="", flush=True)


def hora_do_fim(hora: str, minutos: int) -> str:
    fim = int(hora[:2]) * 60 + int(hora[3:]) + minutos
    return f"{fim // 60:02d}:{fim % 60:02d}"


def main() -> None:
    # Com --a-serio nao pergunta nada: escreve. Sem ele, mostra primeiro o que
    # vai fazer e so depois pergunta - tudo numa so corrida, para nao ter de
    # pedir a senha duas vezes.
    a_serio = "--a-serio" in sys.argv

    print("Horário do Ginásio KO\n")

    utilizador = input("O seu utilizador em ginasioko.site: ").strip()
    senha = pedir_senha("A sua senha (aparece um * por cada letra): ")
    if not senha:
        raise SystemExit("\nNao escreveu senha nenhuma. Nada foi escrito.")

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
    aulas = []
    for dia, hora, minutos, nome_modalidade, turma, professor in HORARIO:
        id_modalidade, nome_certo = modalidade(nome_modalidade)
        rotulo = nome_certo + (f" - {turma}" if turma else "")
        print(f"  {DIAS[dia]:8} {hora}-{hora_do_fim(hora, minutos)}  {rotulo:22} {professor}")
        aulas.append((dia, hora, minutos, id_modalidade, turma, professor))

    if not a_serio:
        print()
        if input("Carregar estas aulas em ginasioko.site? (s/n) ").strip().lower() != "s":
            raise SystemExit("\nCancelado. Nada foi escrito.")
        print()

    for dia, hora, minutos, id_modalidade, turma, professor in aulas:
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

    total = len(requests.get(f"{API}/class-slots", headers=cabecalho, timeout=30).json())
    print(f"\nFeito. {total} aulas na grelha.")
    print("Veja em ginasioko.site, na pagina Aulas.")


if __name__ == "__main__":
    main()
