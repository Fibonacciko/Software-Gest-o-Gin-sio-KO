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
