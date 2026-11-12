"""O arranque do servidor, e o que o Painel mostra logo a seguir a mexer.

Estes testes nasceram de um erro que esteve semanas em producao sem dar sinal:
o `@app.on_event("startup")` do `startup_db` foi roubado por uma funcao nova
que entrou **entre** o decorador e ela. Nao houve erro nenhum - simplesmente
deixou de acontecer. Numa base de dados ja cheia nao se nota; numa vazia
ninguem conseguiria entrar, porque o administrador nao chegava a ser criado.
"""
import asyncio

import pytest

import server


# --------------------------------------------------------- o arranque corre

def test_o_arranque_esta_ligado():
    """O `startup_db` tem de estar na lista de arranques do FastAPI.

    Este e o teste da causa. Se alguem voltar a meter uma funcao entre o
    decorador e esta, e aqui que se sabe - e nao daqui a tres semanas.
    """
    ligados = [f.__name__ for f in server.app.router.on_startup]
    assert "startup_db" in ligados, (
        "o startup_db perdeu o @app.on_event('startup'). Sem ele nao se cria "
        f"o administrador numa base vazia. Arranques ligados: {ligados}"
    )


def test_os_indices_tambem_arrancam():
    ligados = [f.__name__ for f in server.app.router.on_startup]
    assert "criar_indices" in ligados


def test_o_arranque_correu_mesmo(cliente):
    """Estar na lista nao chega: tem de ter corrido mesmo.

    Pede o `cliente` de proposito: e ele que levanta a aplicacao. Sem o pedir,
    este teste corria antes do arranque e falhava por outra razao.
    """
    assert server.analytics_engine is not None, (
        "o startup_db esta registado mas nao correu, ou rebentou a meio"
    )


def test_o_administrador_e_criado_no_arranque(cliente):
    """Numa base de dados vazia, tem de haver por onde entrar."""
    r = cliente.post(
        "/api/auth/login",
        json={"username": "fabio.guerreiro", "password": "admin123"},
    )
    assert r.status_code == 200


def test_as_notas_escritas_a_mao_nao_se_apagam(bd):
    """Semear e semear: se ja la esta alguma coisa, o arranque nao mexe.

    Isto apagava **todas** as notas a cada arranque e repunha as de origem.
    A primeira nota escrita a mao desaparecia no arranque seguinte.
    """
    bd.motivational_notes.delete_many({})
    bd.motivational_notes.insert_one({
        "workout_count_min": 1, "workout_count_max": 5,
        "level_name": "minha", "note_pt": "Escrita por mim", "note_en": "Mine",
    })

    asyncio.run(_semear_as_notas())

    notas = list(bd.motivational_notes.find({}, {"_id": 0, "note_pt": 1}))
    assert len(notas) == 1, f"o arranque mexeu nas notas: {notas}"
    assert notas[0]["note_pt"] == "Escrita por mim"


async def _semear_as_notas():
    """Chama a sementeira com uma ligacao propria.

    A ligacao da aplicacao esta presa ao ciclo de eventos dela, e usa-la aqui
    dava "attached to a different loop" - a mesma razao por que o `bd` do
    conftest e sincrono.
    """
    import os

    from motor.motor_asyncio import AsyncIOMotorClient

    ligacao = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db_anterior = server.db
    server.db = ligacao[os.environ["DB_NAME"]]
    try:
        await server.create_default_motivational_notes()
    finally:
        server.db = db_anterior
        ligacao.close()


# ------------------------------------------- o Painel mexe na hora, nao em 5

@pytest.fixture
def socio(criar_socio):
    return criar_socio("Sócio do Arranque", "912000111")


def _presencas_de_hoje(cliente, admin):
    return cliente.get("/api/dashboard", headers=admin).json()["today_attendance"]


def _total_de_membros(cliente, admin):
    return cliente.get("/api/dashboard", headers=admin).json()["total_members"]


def test_o_painel_conta_o_check_in_na_hora(cliente, admin, socio):
    """Os numeros do Painel ficam em cache 5 minutos.

    Corrigir e apagar uma presenca ja limpavam a cache; **registar** uma nao.
    Quem estava ao balcao fazia o check-in e via o contador na mesma.
    """
    modalidade = cliente.get("/api/activities", headers=admin).json()[0]
    antes = _presencas_de_hoje(cliente, admin)

    r = cliente.post("/api/attendance", headers=admin, json={
        "member_id": socio["id"], "activity_id": modalidade["id"],
    })
    assert r.status_code == 200

    assert _presencas_de_hoje(cliente, admin) == antes + 1, (
        "o Painel nao viu o check-in: falta limpar a cache em create_attendance"
    )

    cliente.delete(f"/api/attendance/{r.json()['id']}", headers=admin)
    assert _presencas_de_hoje(cliente, admin) == antes


def test_o_painel_conta_o_membro_novo_na_hora(cliente, admin, criar_socio):
    antes = _total_de_membros(cliente, admin)

    novo = criar_socio("Membro Acabado de Criar", "912000222")
    assert _total_de_membros(cliente, admin) == antes + 1

    cliente.delete(f"/api/members/{novo['id']}", headers=admin)
    assert _total_de_membros(cliente, admin) == antes, (
        "o Painel continua a contar um membro apagado: falta limpar a cache "
        "em delete_member"
    )


# Nao ha teste da suspensao porque **nao ha por onde suspender um socio**:
# o MemberCreate (que e o corpo do PUT /api/members/{id}) nao tem campo
# `status`, e nao existe rota nenhuma que o mude. A regra "uma suspensao manual
# manda sempre" le-se em todo o lado mas nao se escreve em lado nenhum. Fichas
# antigas trazem o campo gravado e essas sao respeitadas.
