"""Filtros de toda a aplicação.

O erro que estes testes protegem: as datas são guardadas com hora, e o
limite superior do intervalo excluía sempre o último dia. Filtrar por um
único dia devolvia zero, e "este mês" perdia o dia de hoje.
"""
from datetime import date

import pytest


@pytest.fixture
def socio(criar_socio):
    return criar_socio(nome="Sócio dos Filtros", telefone="912700001")


def test_pagamentos_filtrados_por_um_unico_dia(cliente, admin, socio, pagar):
    pagar(socio["id"], quando=date(2026, 9, 25))
    pagar(socio["id"], quando=date(2026, 9, 30))

    for dia, esperado in [("2026-09-25", 1), ("2026-09-30", 1), ("2026-09-26", 0)]:
        r = cliente.get(
            "/api/payments", headers=admin, params={"start_date": dia, "end_date": dia}
        )
        assert len(r.json()) == esperado, f"dia {dia}"


def test_intervalo_de_pagamentos_inclui_o_ultimo_dia(cliente, admin, socio, pagar):
    pagar(socio["id"], quando=date(2026, 9, 1))
    pagar(socio["id"], quando=date(2026, 9, 30))

    r = cliente.get(
        "/api/payments",
        headers=admin,
        params={"start_date": "2026-09-01", "end_date": "2026-09-30"},
    )
    assert len(r.json()) == 2


def test_pagamentos_filtrados_por_socio(cliente, admin, criar_socio, pagar):
    um = criar_socio(nome="Sócio Um", telefone="912700002")
    outro = criar_socio(nome="Sócio Dois", telefone="912700003")
    pagar(um["id"])
    pagar(outro["id"])
    pagar(outro["id"])

    r = cliente.get("/api/payments", headers=admin, params={"member_id": outro["id"]})
    assert len(r.json()) == 2


def test_presencas_filtradas_por_dia_e_modalidade(
    cliente, admin, socio, modalidades
):
    boxe, kick = modalidades[0], modalidades[1]
    for activity in (boxe, kick):
        cliente.post(
            "/api/attendance",
            headers=admin,
            json={
                "member_id": socio["id"],
                "activity_id": activity["id"],
                "method": "manual",
            },
        )

    hoje = date.today().isoformat()
    todas = cliente.get(
        "/api/attendance", headers=admin, params={"start_date": hoje, "end_date": hoje}
    )
    assert len(todas.json()) == 2

    so_boxe = cliente.get(
        "/api/attendance", headers=admin, params={"activity_id": boxe["id"]}
    )
    assert len(so_boxe.json()) == 1


def test_despesas_filtradas_por_periodo(cliente, admin):
    for quando in ["2026-08-31", "2026-09-01", "2026-09-30"]:
        cliente.post(
            "/api/expenses",
            headers=admin,
            json={"description": "teste", "amount": 10, "expense_date": quando},
        )

    setembro = cliente.get(
        "/api/expenses",
        headers=admin,
        params={"start_date": "2026-09-01", "end_date": "2026-09-30"},
    )
    assert len(setembro.json()) == 2


def test_membros_filtrados_por_estado_gravado(cliente, admin, criar_socio, bd):
    criar_socio(nome="Ativo na Ficha", telefone="912700004")
    inativo = criar_socio(nome="Inativo na Ficha", telefone="912700005")
    bd.members.update_one({"id": inativo["id"]}, {"$set": {"status": "inactive"}})

    ativos = cliente.get("/api/members", headers=admin, params={"status": "active"})
    assert [m["name"] for m in ativos.json()] == ["Ativo na Ficha"]

    inativos = cliente.get("/api/members", headers=admin, params={"status": "inactive"})
    assert [m["name"] for m in inativos.json()] == ["Inativo na Ficha"]


def test_vendas_e_experimentais_filtradas_por_periodo(cliente, admin, modalidades):
    artigo = cliente.post(
        "/api/inventory",
        headers=admin,
        json={"name": "Artigo", "category": "clothing", "quantity": 5, "price": 10},
    ).json()

    cliente.post(
        "/api/sales",
        headers=admin,
        json={"item_id": artigo["id"], "quantity": 1, "sale_date": "2026-09-30"},
    )
    cliente.post(
        "/api/trials",
        headers=admin,
        json={"activity_id": modalidades[0]["id"], "trial_date": "2026-09-30"},
    )

    vendas = cliente.get(
        "/api/sales", headers=admin, params={"start_date": "2026-09-30", "end_date": "2026-09-30"}
    )
    assert len(vendas.json()) == 1

    trials = cliente.get(
        "/api/trials", headers=admin, params={"start_date": "2026-09-30", "end_date": "2026-09-30"}
    )
    assert len(trials.json()) == 1
