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
