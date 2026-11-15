"""O estado do sócio segue a mensalidade paga. É a regra central do sistema."""
from datetime import date

from conftest import ficha


def test_sem_pagamento_fica_inativo(cliente, admin, criar_socio):
    socio = criar_socio()
    assert ficha(cliente, admin, socio["id"])["membership_status"] == "inactive"


def test_quota_paga_torna_ativo(cliente, admin, criar_socio, pagar):
    socio = criar_socio()
    pagar(socio["id"])

    depois = ficha(cliente, admin, socio["id"])
    assert depois["membership_status"] == "active"
    assert depois["membership_valid_until"] is not None


def test_quota_expirada_volta_a_inativo(cliente, admin, criar_socio, pagar):
    socio = criar_socio()
    # Pago há dois meses: a validade de um mês já passou
    pagar(socio["id"], quando=date(date.today().year, 1, 1) if date.today().month > 2
          else date(date.today().year - 1, 1, 1))

    assert ficha(cliente, admin, socio["id"])["membership_status"] == "inactive"


def test_suspensao_manda_sobre_a_quota_paga(cliente, admin, criar_socio, pagar, bd):
    """Um sócio suspenso continua suspenso, mesmo com a mensalidade em dia."""
    socio = criar_socio()
    pagar(socio["id"])
    bd.members.update_one({"id": socio["id"]}, {"$set": {"status": "suspended"}})

    assert ficha(cliente, admin, socio["id"])["membership_status"] == "suspended"


def test_membros_ativos_no_painel_conta_so_quem_pagou(cliente, admin, criar_socio, pagar):
    criar_socio(nome="Sem Pagamento", telefone="912000001")
    pago = criar_socio(nome="Com Pagamento", telefone="912000002")

    antes = cliente.get("/api/dashboard", headers=admin).json()
    assert antes["active_members"] == 0
    assert antes["total_members"] == 2

    pagar(pago["id"])

    depois = cliente.get("/api/dashboard", headers=admin).json()
    assert depois["active_members"] == 1


# --------------------------------------------------- Suspender e levantar

def test_suspender_manda_mesmo_com_a_quota_paga(cliente, admin, criar_socio, pagar):
    """A suspensão passa à frente do pagamento. É a única coisa que o faz."""
    socio = criar_socio()
    pagar(socio["id"])
    assert ficha(cliente, admin, socio["id"])["membership_status"] == "active"

    r = cliente.post(
        f"/api/members/{socio['id']}/suspender",
        headers=admin,
        json={"motivo": "Falta de pagamento repetida"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "suspended"
    assert r.json()["suspension_reason"] == "Falta de pagamento repetida"

    depois = ficha(cliente, admin, socio["id"])
    assert depois["membership_status"] == "suspended"
    # A quota não é tocada: a validade fica onde estava
    assert depois["membership_valid_until"] is not None


def test_levantar_devolve_o_socio_ao_que_a_quota_disser(cliente, admin, criar_socio, pagar):
    """Não fica activo por decreto: fica o que a quota disser."""
    socio = criar_socio()
    pagar(socio["id"])
    cliente.post(f"/api/members/{socio['id']}/suspender", headers=admin, json={})

    r = cliente.post(f"/api/members/{socio['id']}/levantar-suspensao", headers=admin)
    assert r.status_code == 200, r.text
    assert r.json()["suspension_reason"] is None
    # Com a quota paga, volta a activo -- calculado, não gravado
    assert ficha(cliente, admin, socio["id"])["membership_status"] == "active"


def test_levantar_a_quem_tem_a_quota_em_atraso_nao_o_torna_activo(
    cliente, admin, criar_socio
):
    socio = criar_socio()
    cliente.post(f"/api/members/{socio['id']}/suspender", headers=admin, json={})
    cliente.post(f"/api/members/{socio['id']}/levantar-suspensao", headers=admin)
    assert ficha(cliente, admin, socio["id"])["membership_status"] == "inactive"


def test_so_o_administrador_suspende(cliente, admin, colaborador, criar_socio):
    """Quem está ao balcão cobra; suspender é decisão do dono."""
    socio = criar_socio()
    r = cliente.post(
        f"/api/members/{socio['id']}/suspender", headers=colaborador, json={}
    )
    assert r.status_code == 403
    assert ficha(cliente, admin, socio["id"])["status"] != "suspended"


def test_nao_se_suspende_duas_vezes_nem_se_levanta_quem_nao_esta(
    cliente, admin, criar_socio
):
    socio = criar_socio()
    cliente.post(f"/api/members/{socio['id']}/suspender", headers=admin, json={})
    repetido = cliente.post(
        f"/api/members/{socio['id']}/suspender", headers=admin, json={}
    )
    assert repetido.status_code == 400

    cliente.post(f"/api/members/{socio['id']}/levantar-suspensao", headers=admin)
    outra_vez = cliente.post(
        f"/api/members/{socio['id']}/levantar-suspensao", headers=admin
    )
    assert outra_vez.status_code == 400
