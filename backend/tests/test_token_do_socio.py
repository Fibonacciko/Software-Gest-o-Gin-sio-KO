"""As rotas da aplicação do sócio exigem o token dele.

**Identificavam-no só pelo `id` no endereço.** O `id` é um UUID, que não se
adivinha — mas fica escrito no registo do nginx em texto simples, e **não se
pode cancelar**: se um escapar, escapou para sempre. Quem o tivesse via os
pagamentos, as avaliações e os planos daquela pessoa, trocava-lhe a
fotografia, desmarcava-lhe as aulas e mudava-lhe o email na ficha.

Agora cada pedido leva o token que o login devolve, e **o token é que diz
quem é**. O `id` no endereço continua lá, porque é por ele que as rotas
procuram, mas tem de bater com o do token.

O teste que mais vale neste ficheiro é o **estrutural**: percorre as rotas
`/mobile/` todas e exige que cada uma esteja protegida ou escrita na lista
das públicas. Sem ele, uma rota nova entrava sem token e ninguém dava por
isso até alguém de fora dar.
"""
import inspect
from datetime import timedelta

import pytest
from fastapi import Depends
from fastapi.routing import APIRoute

import server
from conftest import cabecalho_do_socio as como_socio


# As que **não** levam token, e porquê:
#
#   auth/*      é por aqui que se entra; pedir token para entrar era um nó
#   activities  a lista de modalidades do ginásio, igual para todos
#   gym-info    a morada, o horário e os contactos
#   partners    os protocolos de parceria
#   shop        a montra, que o site de gestão também lê
#   media       a galeria antiga, que devolve lista vazia a todos
PUBLICAS = {
    "/api/mobile/auth/login",
    "/api/mobile/auth/pin",
    "/api/mobile/auth/pin/trocar",
    "/api/mobile/auth/pin/esqueci",
    "/api/mobile/auth/pin/recuperar",
    "/api/mobile/activities",
    "/api/mobile/gym-info",
    "/api/mobile/partners",
    "/api/mobile/shop",
    "/api/mobile/media",
}

GUARDAS = (server.socio_do_token, server.socio_da_aplicacao)


def _rotas_da_aplicacao():
    for rota in server.app.routes:
        if isinstance(rota, APIRoute) and rota.path.startswith("/api/mobile/"):
            yield rota


def _esta_guardada(rota: APIRoute) -> bool:
    """A rota pede um dos dois guardas na assinatura?"""
    for parametro in inspect.signature(rota.endpoint).parameters.values():
        omissao = parametro.default
        if isinstance(omissao, type(Depends())) and omissao.dependency in GUARDAS:
            return True
    return False


def test_ha_rotas_da_aplicacao_para_conferir():
    """Se isto falhar, o teste a seguir passava sem olhar para nada."""
    assert len(list(_rotas_da_aplicacao())) > 20


def test_toda_a_rota_da_aplicacao_exige_o_token():
    """O teste que apanha a rota nova de que alguém se esqueceu.

    Uma rota `/mobile/` nova ou fica protegida, ou entra na lista das
    públicas **de propósito** — e aí fica escrito ali porquê.
    """
    desprotegidas = [
        f"{sorted(r.methods)} {r.path}"
        for r in _rotas_da_aplicacao()
        if r.path not in PUBLICAS and not _esta_guardada(r)
    ]
    assert desprotegidas == [], (
        "estas rotas da aplicação não exigem o token do sócio. Se for de "
        "propósito, escreva-as na lista PUBLICAS, com a razão."
    )


def test_as_publicas_nao_desapareceram():
    """A lista das públicas não pode ficar a falar de rotas que já não há."""
    caminhos = {r.path for r in _rotas_da_aplicacao()}
    esquecidas = PUBLICAS - caminhos
    assert esquecidas == set(), "a lista das públicas fala de rotas que já não existem"


# ------------------------------------------------------- sem token, nada

ROTAS_DE_LEITURA = [
    "/api/mobile/payments/{id}",
    "/api/mobile/assessments/{id}",
    "/api/mobile/plans/{id}",
    "/api/mobile/media/{id}",
    "/api/mobile/reservations/{id}",
    "/api/mobile/attendance/{id}",
]


@pytest.mark.parametrize("molde", ROTAS_DE_LEITURA)
def test_sem_token_nao_se_le_nada(cliente, criar_socio, molde):
    socio = criar_socio(telefone="916000001")
    r = cliente.get(molde.replace("{id}", socio["id"]))
    assert r.status_code == 401
    assert "sessão" in r.json()["detail"]


@pytest.mark.parametrize("molde", ROTAS_DE_LEITURA)
def test_o_token_de_um_nao_serve_para_outro(cliente, criar_socio, molde):
    """É isto que o `id` no endereço deixou de dar sozinho."""
    um = criar_socio(nome="Um", telefone="916000002")
    outro = criar_socio(nome="Outro", telefone="916000003")

    r = cliente.get(molde.replace("{id}", um["id"]), headers=como_socio(outro))
    assert r.status_code == 403
    assert "não são teus" in r.json()["detail"]


def test_o_cartao_tambem_nao(cliente, criar_socio):
    """O cartão recebe o `member_id` na pergunta, e não no caminho."""
    um = criar_socio(nome="Um", telefone="916000004")
    outro = criar_socio(nome="Outro", telefone="916000005")

    assert cliente.get("/api/mobile/profile",
                       params={"member_id": um["id"]}).status_code == 401
    assert cliente.get("/api/mobile/profile", params={"member_id": um["id"]},
                       headers=como_socio(outro)).status_code == 403
    assert cliente.get("/api/mobile/profile", params={"member_id": um["id"]},
                       headers=como_socio(um)).status_code == 200


def test_nao_se_muda_a_ficha_de_outro(cliente, admin, criar_socio):
    """O `PUT /mobile/profile/{id}` mexe no email, no telefone e na morada."""
    um = criar_socio(nome="Um", telefone="916000006")
    outro = criar_socio(nome="Outro", telefone="916000007")

    r = cliente.put(f"/api/mobile/profile/{um['id']}",
                    headers=como_socio(outro),
                    json={"email": "nao-sou-eu@exemplo.pt"})
    assert r.status_code == 403

    ficha = cliente.get(f"/api/members/{um['id']}", headers=admin).json()
    assert ficha.get("email") != "nao-sou-eu@exemplo.pt"


def test_o_check_in_e_sempre_do_dono_do_token(cliente, criar_socio, modalidades):
    """Uma presença a mais estraga as estatísticas do mês."""
    um = criar_socio(nome="Um", telefone="916000008", activity_ids=[modalidades[0]["id"]])
    outro = criar_socio(nome="Outro", telefone="916000009",
                        activity_ids=[modalidades[0]["id"]])

    r = cliente.post("/api/mobile/checkin/app", headers=como_socio(outro),
                     json={"member_id": um["id"]})
    assert r.status_code == 403


def test_nao_se_desmarca_a_aula_de_outro(cliente, admin, criar_socio, modalidades):
    """O endereço leva o `id` da inscrição, que não é o do sócio."""
    from datetime import date

    slot = cliente.post("/api/class-slots", headers=admin, json={
        "activity_id": modalidades[0]["id"],
        "weekday": (date.today().weekday() + 3) % 7,
        "start_time": "19:00", "duration_min": 60, "capacity": 10,
    }).json()

    dono = criar_socio(nome="Dono", telefone="916000010")
    intruso = criar_socio(nome="Intruso", telefone="916000011")

    hoje = date.today()
    dia = hoje
    while dia.weekday() != slot["weekday"]:
        dia += timedelta(days=1)

    inscricao = cliente.post("/api/mobile/bookings", headers=como_socio(dono), json={
        "member_id": dono["id"], "slot_id": slot["id"], "class_date": dia.isoformat(),
    }).json()

    r = cliente.delete(f"/api/mobile/bookings/{inscricao['id']}",
                       headers=como_socio(intruso))
    assert r.status_code == 403


# ------------------------------------------- o token tem de ser mesmo dele

def test_um_token_da_gestao_nao_serve_na_aplicacao(cliente, criar_socio, admin):
    """O administrador faz tudo na gestão, e nada nas rotas do sócio.

    São dois mundos: o da gestão autentica utilizadores, o da aplicação
    autentica sócios. Um token sem `role: member` não entra aqui.
    """
    socio = criar_socio(telefone="916000012")
    r = cliente.get(f"/api/mobile/payments/{socio['id']}", headers=admin)
    assert r.status_code == 401


def test_um_token_mal_assinado_nao_serve(cliente, criar_socio):
    socio = criar_socio(telefone="916000013")
    bom = como_socio(socio)["Authorization"].split(" ")[1]
    # Mexer no fim do token estraga a assinatura
    estragado = bom[:-4] + ("aaaa" if not bom.endswith("aaaa") else "bbbb")

    r = cliente.get(f"/api/mobile/payments/{socio['id']}",
                    headers={"Authorization": f"Bearer {estragado}"})
    assert r.status_code == 401


def test_um_token_fora_de_prazo_nao_serve(cliente, criar_socio):
    socio = criar_socio(telefone="916000014")
    velho = server.create_access_token(
        data={"sub": socio["id"], "role": "member", "tv": 0},
        expires_delta=timedelta(minutes=-1),
    )
    r = cliente.get(f"/api/mobile/payments/{socio['id']}",
                    headers={"Authorization": f"Bearer {velho}"})
    assert r.status_code == 401


def test_o_socio_suspenso_nao_entra_nem_com_o_token(cliente, admin, criar_socio):
    """A suspensão manda sempre — é a mesma regra da entrada."""
    socio = criar_socio(telefone="916000015")
    cabecalho = como_socio(socio)

    assert cliente.get(f"/api/mobile/payments/{socio['id']}",
                       headers=cabecalho).status_code == 200

    cliente.post(f"/api/members/{socio['id']}/suspender", headers=admin,
                 json={"reason": "teste"})

    r = cliente.get(f"/api/mobile/payments/{socio['id']}", headers=cabecalho)
    assert r.status_code == 403
    assert "suspensa" in r.json()["detail"]


# ------------------------------- apagar o PIN ao balcão fecha a aplicação

def test_apagar_o_pin_ao_balcao_corta_a_sessao(cliente, admin, criar_socio):
    """Quem vem dizer que não entra pode ter perdido o telemóvel.

    Um JWT não se desfaz: o que se desfaz é a conta onde ele bate. O
    `token_version` anda para a frente e os tokens de antes deixam de servir.
    """
    socio = criar_socio(telefone="916000016")
    cabecalho = como_socio(socio)

    assert cliente.get(f"/api/mobile/payments/{socio['id']}",
                       headers=cabecalho).status_code == 200

    r = cliente.post(f"/api/members/{socio['id']}/limpar-pin", headers=admin)
    assert r.status_code == 200

    assert cliente.get(f"/api/mobile/payments/{socio['id']}",
                       headers=cabecalho).status_code == 401


def test_trocar_o_pin_fecha_as_outras_sessoes(cliente, criar_socio):
    """Quem troca o PIN costuma fazê-lo por desconfiar de quem o sabia."""
    socio = criar_socio(telefone="916000017")

    # Escolhe o PIN como da primeira vez, e fica com a sessão aberta
    entrada = cliente.post("/api/mobile/auth/pin", json={
        "member_number": socio["member_number"],
        "phone": "916000017",
        "pin": "462801",
    })
    assert entrada.status_code == 200, entrada.text
    antigo = {"Authorization": f"Bearer {entrada.json()['access_token']}"}

    # O token que o login verdadeiro devolve serve nas rotas da aplicação
    assert cliente.get(f"/api/mobile/payments/{socio['id']}",
                       headers=antigo).status_code == 200

    trocou = cliente.post("/api/mobile/auth/pin/trocar", json={
        "member_number": socio["member_number"],
        "pin_actual": "462801",
        "pin_novo": "719204",
    })
    assert trocou.status_code == 200, trocou.text

    assert cliente.get(f"/api/mobile/payments/{socio['id']}",
                       headers=antigo).status_code == 401


def test_a_sessao_nova_serve_depois_de_trocar(cliente, criar_socio):
    """E quem troca o PIN não fica de fora da sua própria conta."""
    socio = criar_socio(telefone="916000018")
    cliente.post("/api/mobile/auth/pin", json={
        "member_number": socio["member_number"],
        "phone": "916000018",
        "pin": "462802",
    })
    cliente.post("/api/mobile/auth/pin/trocar", json={
        "member_number": socio["member_number"],
        "pin_actual": "462802",
        "pin_novo": "719205",
    })
    entrada = cliente.post("/api/mobile/auth/login", json={
        "member_number": socio["member_number"],
        "pin": "719205",
    })
    assert entrada.status_code == 200, entrada.text
    novo = {"Authorization": f"Bearer {entrada.json()['access_token']}"}
    assert cliente.get(f"/api/mobile/payments/{socio['id']}",
                       headers=novo).status_code == 200


# ----------------------------------------------- a chave que assina tudo

def test_a_chave_dos_tokens_nao_esta_no_codigo():
    """Esteve, e enquanto esteve qualquer pessoa com o repositório fabricava
    um token de administrador. Um token não é mais seguro do que a chave que
    o assina.
    """
    import io
    from pathlib import Path

    codigo = io.open(Path(server.__file__), encoding="utf-8").read()
    assert "your-secret-key-change-in-production" not in codigo


def test_em_producao_nao_arranca_sem_a_chave(monkeypatch):
    """O `.env` de produção não tem linha `ENVIRONMENT` nenhuma.

    Por isso a regra não pode ser "se não for produção, vai pela chave de
    sempre": tem de ser o contrário, senão a produção assinava com a chave
    de brincar, em silêncio.
    """
    monkeypatch.delenv("JWT_SECRET", raising=False)
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        server._chave_dos_tokens()


def test_em_desenvolvimento_arranca(monkeypatch):
    monkeypatch.delenv("JWT_SECRET", raising=False)
    monkeypatch.setenv("ENVIRONMENT", "development")
    assert server._chave_dos_tokens() == server.CHAVE_DE_DESENVOLVIMENTO


def test_a_chave_do_env_manda(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "uma-chave-de-verdade")
    monkeypatch.setenv("ENVIRONMENT", "production")
    assert server._chave_dos_tokens() == "uma-chave-de-verdade"
