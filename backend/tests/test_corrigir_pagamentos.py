"""Corrigir e apagar pagamentos, e o efeito nas validades do sócio.

Um pagamento apagado tem de deixar o sócio como estava antes dele. Sem isto,
um engano no lançamento deixava o sócio ativo para sempre.
"""
from datetime import date

from conftest import ficha


def test_apagar_a_unica_quota_volta_a_inativo(cliente, admin, criar_socio, pagar):
    socio = criar_socio()
    pagamento = pagar(socio["id"])
    assert ficha(cliente, admin, socio["id"])["membership_status"] == "active"

    r = cliente.delete(f"/api/payments/{pagamento['id']}", headers=admin)
    assert r.status_code == 200

    depois = ficha(cliente, admin, socio["id"])
    assert depois["membership_status"] == "inactive"
    assert depois["membership_valid_until"] is None


def test_apagar_uma_quota_repoe_a_validade_da_anterior(
    cliente, admin, criar_socio, pagar
):
    """Com dois pagamentos, apagar o último faz valer o penúltimo."""
    socio = criar_socio()
    pagar(socio["id"], quando=date(2026, 5, 10))
    ultimo = pagar(socio["id"], quando=date(2026, 6, 10))
    assert ficha(cliente, admin, socio["id"])["membership_valid_until"] == "2026-07-10"

    cliente.delete(f"/api/payments/{ultimo['id']}", headers=admin)

    assert ficha(cliente, admin, socio["id"])["membership_valid_until"] == "2026-06-10"


def test_apagar_o_seguro_limpa_a_validade_da_inscricao(cliente, admin, criar_socio, pagar):
    socio = criar_socio()
    seguro = pagar(socio["id"], valor=20, tipo="seguro")
    assert ficha(cliente, admin, socio["id"])["insurance_valid_until"] is not None

    cliente.delete(f"/api/payments/{seguro['id']}", headers=admin)

    depois = ficha(cliente, admin, socio["id"])
    assert depois["insurance_valid_until"] is None
    assert depois["expiry_date"] is None


def test_corrigir_a_data_refaz_a_validade(cliente, admin, criar_socio, pagar):
    socio = criar_socio()
    pagamento = pagar(socio["id"], quando=date(2026, 6, 10))
    assert ficha(cliente, admin, socio["id"])["membership_valid_until"] == "2026-07-10"

    r = cliente.put(
        f"/api/payments/{pagamento['id']}",
        headers=admin,
        json={
            "member_id": socio["id"],
            "amount": 35,
            "payment_type": "quota",
            "payment_method": "cash",
            "payment_date": "2026-06-18",
        },
    )
    assert r.status_code == 200

    assert ficha(cliente, admin, socio["id"])["membership_valid_until"] == "2026-07-18"


def test_corrigir_o_socio_arruma_os_dois(cliente, admin, criar_socio, pagar):
    """Lançado no sócio errado: o certo fica ativo, o errado volta a inativo."""
    errado = criar_socio(nome="Sócio Errado", telefone="912900001")
    certo = criar_socio(nome="Sócio Certo", telefone="912900002")

    pagamento = pagar(errado["id"])
    assert ficha(cliente, admin, errado["id"])["membership_status"] == "active"

    cliente.put(
        f"/api/payments/{pagamento['id']}",
        headers=admin,
        json={
            "member_id": certo["id"],
            "amount": 35,
            "payment_type": "quota",
            "payment_method": "cash",
            "payment_date": date.today().isoformat(),
        },
    )

    assert ficha(cliente, admin, errado["id"])["membership_status"] == "inactive"
    assert ficha(cliente, admin, certo["id"])["membership_status"] == "active"


def test_corrigir_o_valor_nao_mexe_na_validade(cliente, admin, criar_socio, pagar):
    socio = criar_socio()
    pagamento = pagar(socio["id"], quando=date(2026, 6, 10))

    r = cliente.put(
        f"/api/payments/{pagamento['id']}",
        headers=admin,
        json={
            "member_id": socio["id"],
            "amount": 40,
            "payment_type": "quota",
            "payment_method": "mbway",
            "payment_date": "2026-06-10",
        },
    )
    assert r.json()["amount"] == 40
    assert r.json()["payment_method"] == "mbway"
    assert ficha(cliente, admin, socio["id"])["membership_valid_until"] == "2026-07-10"


def test_colaborador_corrige_mas_nao_apaga(cliente, admin, colaborador, criar_socio, pagar):
    """Apagar registos financeiros fica reservado ao administrador."""
    socio = criar_socio()
    pagamento = pagar(socio["id"])

    correcao = cliente.put(
        f"/api/payments/{pagamento['id']}",
        headers=colaborador,
        json={
            "member_id": socio["id"],
            "amount": 30,
            "payment_type": "quota",
            "payment_method": "cash",
            "payment_date": date.today().isoformat(),
        },
    )
    assert correcao.status_code == 200

    assert cliente.delete(f"/api/payments/{pagamento['id']}", headers=colaborador).status_code == 403


def test_pagamento_inexistente_devolve_404(cliente, admin):
    assert cliente.delete("/api/payments/nao-existe", headers=admin).status_code == 404
