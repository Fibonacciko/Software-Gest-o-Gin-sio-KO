"""Cálculo das validades: a quota ao mês, o seguro ao ano."""
from datetime import date

import pytest
from conftest import ficha
from server import add_one_month


@pytest.mark.parametrize(
    "pago_em, valido_ate",
    [
        # O caso normal: mesmo dia do mês seguinte
        (date(2026, 10, 5), date(2026, 11, 5)),
        (date(2026, 10, 18), date(2026, 11, 18)),
        (date(2026, 1, 15), date(2026, 2, 15)),
        (date(2026, 12, 18), date(2027, 1, 18)),
        # Dias que não existem no mês seguinte: passa para o mês a seguir,
        # em vez de encurtar o período pago
        (date(2026, 1, 31), date(2026, 3, 1)),
        (date(2026, 1, 30), date(2026, 3, 1)),
        (date(2026, 3, 31), date(2026, 5, 1)),
        (date(2026, 12, 31), date(2027, 1, 31)),
        # Ano bissexto: 29 de fevereiro existe
        (date(2028, 1, 29), date(2028, 2, 29)),
    ],
)
def test_quota_cobre_ate_ao_mesmo_dia_do_mes_seguinte(pago_em, valido_ate):
    assert add_one_month(pago_em) == valido_ate


def test_pagamento_de_quota_grava_a_validade(cliente, admin, criar_socio, pagar):
    socio = criar_socio()
    pagar(socio["id"], quando=date(2026, 10, 18))

    depois = ficha(cliente, admin, socio["id"])
    assert depois["membership_valid_until"] == "2026-11-18"
    assert depois["membership_paid_date"] == "2026-10-18"


def test_seguro_vale_um_ano_e_arrasta_a_validade_da_inscricao(
    cliente, admin, criar_socio, pagar
):
    socio = criar_socio()
    pagar(socio["id"], valor=20, tipo="seguro", quando=date(2026, 9, 27))

    depois = ficha(cliente, admin, socio["id"])
    assert depois["insurance_valid_until"] == "2027-09-27"
    # A validade da inscrição acompanha sempre o seguro
    assert depois["expiry_date"] == depois["insurance_valid_until"]


def test_pagamento_combinado_renova_quota_e_seguro(cliente, admin, criar_socio, pagar):
    socio = criar_socio()
    pagar(socio["id"], valor=55, tipo="quota_seguro", quando=date(2026, 1, 31))

    depois = ficha(cliente, admin, socio["id"])
    assert depois["membership_valid_until"] == "2026-03-01"   # quota: mês seguinte
    assert depois["insurance_valid_until"] == "2027-01-31"    # seguro: um ano
    assert depois["membership_status"] == "inactive"          # 2026-03-01 já passou


# ------------------------------------------------------------------------
# Lançar um pagamento com data antiga
# ------------------------------------------------------------------------
#
# O `create_payment` escrevia a validade **deste** pagamento por cima do que
# lá estivesse. Bastava lançar a seguir uma mensalidade atrasada para a
# validade andar para trás, e o sócio com a quota em dia ficar inativo —
# sem nada no ecrã a dizer porquê.
#
# O corrigir e o apagar já refaziam as contas a partir dos pagamentos todos
# (`recalcular_validades`); era só o registar que fazia contas por sua conta.

def test_lancar_um_pagamento_antigo_nao_puxa_a_validade_para_tras(
    cliente, admin, criar_socio, pagar
):
    """A quota vale pelo pagamento **mais recente**, seja qual for a ordem
    por que foram lançados."""
    socio = criar_socio(telefone="917100001")

    pagar(socio["id"], quando=date(2026, 11, 16))
    assert ficha(cliente, admin, socio["id"])["membership_valid_until"] == "2026-12-16"

    # A mensalidade de setembro, lançada agora porque alguém se esqueceu
    pagar(socio["id"], quando=date(2026, 9, 17))

    depois = ficha(cliente, admin, socio["id"])
    assert depois["membership_valid_until"] == "2026-12-16", (
        "a validade tem de vir do pagamento mais recente, não do último lançado"
    )
    assert depois["membership_paid_date"] == "2026-11-16"


def test_o_mesmo_para_o_seguro(cliente, admin, criar_socio, pagar):
    socio = criar_socio(telefone="917100002")

    pagar(socio["id"], valor=20, tipo="seguro", quando=date(2026, 11, 16))
    assert ficha(cliente, admin, socio["id"])["insurance_valid_until"] == "2027-11-16"

    pagar(socio["id"], valor=20, tipo="seguro", quando=date(2026, 3, 1))

    depois = ficha(cliente, admin, socio["id"])
    assert depois["insurance_valid_until"] == "2027-11-16"
    # A validade da inscrição acompanha sempre o seguro
    assert depois["expiry_date"] == depois["insurance_valid_until"]


def test_uma_mensalidade_nao_mexe_num_seguro_posto_a_mao(
    cliente, admin, criar_socio, pagar, bd
):
    """Há sócios com o seguro escrito na ficha e sem pagamento associado —
    vieram assim do sistema anterior. Recalcular apagava-lho só por se ter
    lançado uma mensalidade."""
    socio = criar_socio(telefone="917100003")
    bd.members.update_one(
        {"id": socio["id"]},
        {"$set": {"insurance_valid_until": "2027-06-30", "expiry_date": "2027-06-30"}},
    )

    pagar(socio["id"], quando=date(2026, 11, 16))

    depois = ficha(cliente, admin, socio["id"])
    assert depois["membership_valid_until"] == "2026-12-16"
    assert depois["insurance_valid_until"] == "2027-06-30", "o seguro da ficha fica"
