"""Os pacotes Básico / Premium / VIP já não existem.

O ginásio nunca os usou: 322 dos 331 sócios estavam todos em "basic", e o
campo só servia para aparecer um "basic" escrito na ficha e um gráfico de
relatório sem significado nenhum. Estes testes impedem que volte.
"""
from datetime import date


def ficha_nova():
    return {
        "name": "Sócio Sem Pacote",
        "phone": "912800001",
        "date_of_birth": "1990-01-01",
        "nationality": "Portuguesa",
        "profession": "Instrutor",
        "address": "Rua Direita, 1",
    }


def test_cria_socio_sem_indicar_pacote(cliente, admin):
    r = cliente.post("/api/members", headers=admin, json=ficha_nova())
    assert r.status_code == 200, r.text
    assert "membership_type" not in r.json()


def test_um_pacote_enviado_e_ignorado(cliente, admin):
    """Se um cliente antigo ainda o enviar, não estoira nem o guarda."""
    ficha = {**ficha_nova(), "phone": "912800002", "membership_type": "vip"}
    r = cliente.post("/api/members", headers=admin, json=ficha)
    assert r.status_code == 200, r.text
    assert "membership_type" not in r.json()


def test_fichas_antigas_com_pacote_continuam_a_ser_lidas(cliente, admin, bd):
    """Os registos gravados antes disto têm o campo. Não podem deixar de abrir."""
    criado = cliente.post(
        "/api/members", headers=admin, json={**ficha_nova(), "phone": "912800003"}
    ).json()
    bd.members.update_one({"id": criado["id"]}, {"$set": {"membership_type": "premium"}})

    lista = cliente.get("/api/members", headers=admin)
    assert lista.status_code == 200
    assert any(m["id"] == criado["id"] for m in lista.json())

    individual = cliente.get(f"/api/members/{criado['id']}", headers=admin)
    assert individual.status_code == 200
    assert "membership_type" not in individual.json()


def test_a_lista_ja_nao_filtra_por_pacote(cliente, admin):
    """O filtro desapareceu: pedi-lo não pode esconder sócios."""
    cliente.post("/api/members", headers=admin, json={**ficha_nova(), "phone": "912800004"})

    todos = cliente.get("/api/members", headers=admin).json()
    com_filtro = cliente.get(
        "/api/members", headers=admin, params={"membership_type": "vip"}
    )
    assert com_filtro.status_code == 200
    assert len(com_filtro.json()) == len(todos)


def test_socio_sem_email_e_aceite(cliente, admin):
    """O formulario envia sempre o campo do email, vazio quando nao ha.

    Sem isto a ficha era recusada com um erro de validacao, e nao se
    conseguia inscrever ninguem que nao tivesse email.
    """
    r = cliente.post(
        "/api/members", headers=admin, json={**ficha_nova(), "phone": "912800006", "email": ""}
    )
    assert r.status_code == 200, r.text
    assert r.json()["email"] is None


def test_email_errado_continua_a_ser_recusado(cliente, admin):
    r = cliente.post(
        "/api/members", headers=admin, json={**ficha_nova(), "phone": "912800007", "email": "isto-nao-e-email"}
    )
    assert r.status_code == 422


def test_o_estado_do_socio_nao_depende_do_pacote(cliente, admin, criar_socio, pagar):
    """A regra de Ativo/Inativo é só a quota, como sempre foi."""
    socio = criar_socio(telefone="912800005")
    assert cliente.get(f"/api/members/{socio['id']}", headers=admin).json()["membership_status"] == "inactive"

    pagar(socio["id"], quando=date.today())

    assert cliente.get(f"/api/members/{socio['id']}", headers=admin).json()["membership_status"] == "active"
