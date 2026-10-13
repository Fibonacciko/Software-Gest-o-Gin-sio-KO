"""Filtros de toda a aplicação.

O erro que estes testes protegem: as datas são guardadas com hora, e o
limite superior do intervalo excluía sempre o último dia. Filtrar por um
único dia devolvia zero, e "este mês" perdia o dia de hoje.
"""
from datetime import date, timedelta

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


def test_membros_filtrados_pelo_estado_que_a_lista_mostra(cliente, admin, criar_socio, pagar, bd):
    """O filtro segue o estado **calculado**, nao o campo gravado na ficha.

    O campo `status` guarda a suspensao e historico antigo. Filtrar por ele
    dava uma lista que se contradizia a si propria: fichas pedidas como
    "Ativas" apareciam com o selo INATIVO mesmo ao lado.
    """
    com_quota = criar_socio(nome="Quota Paga", telefone="912700004")
    pagar(com_quota["id"])

    criar_socio(nome="Sem Pagamento", telefone="912700005")

    # Ficha antiga com "active" gravado, mas sem quota nenhuma: esta inativa
    antiga = criar_socio(nome="Antiga Com Active", telefone="912700006")
    bd.members.update_one({"id": antiga["id"]}, {"$set": {"status": "active"}})

    suspenso = criar_socio(nome="Suspenso", telefone="912700007")
    pagar(suspenso["id"])
    bd.members.update_one({"id": suspenso["id"]}, {"$set": {"status": "suspended"}})

    def nomes(estado):
        return sorted(
            m["name"] for m in
            cliente.get("/api/members", headers=admin, params={"status": estado}).json()
        )

    assert nomes("active") == ["Quota Paga"]
    assert nomes("inactive") == ["Antiga Com Active", "Sem Pagamento"]
    assert nomes("suspended") == ["Suspenso"]


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


# ------------------------------------------- o filtro "Seguro por regularizar"

def _com_validades(bd, socio, quota=None, seguro=None):
    """Poe a quota e o seguro a mao, que e como as fichas antigas vieram."""
    campos = {}
    if quota is not None:
        campos["membership_valid_until"] = quota.isoformat() + "T00:00:00+00:00"
    if seguro is not None:
        campos["insurance_valid_until"] = seguro.isoformat() + "T00:00:00+00:00"
    bd.members.update_one({"id": socio["id"]}, {"$set": campos})


def test_seguro_inativo_so_traz_quem_treinou_nos_ultimos_tres_meses(
    cliente, admin, criar_socio, bd
):
    """O seguro e obrigatorio, mas a lista tem de ser util.

    Sem o limite dos tres meses eram quase 300 nomes, a maior parte de gente
    que ja nao treina ha anos. Com ele, ficam os que ainda ca aparecem.
    """
    hoje = date.today()

    # Entra: quota em dia, sem seguro nenhum
    sem_seguro = criar_socio(nome="Sem Seguro", telefone="912800001")
    _com_validades(bd, sem_seguro, quota=hoje + timedelta(days=10))

    # Entra: quota valida ha dois meses, seguro expirado
    recente = criar_socio(nome="Seguro Expirado", telefone="912800002")
    _com_validades(bd, recente, quota=hoje - timedelta(days=60), seguro=hoje - timedelta(days=5))

    # Fica de fora: seguro valido
    em_dia = criar_socio(nome="Seguro Em Dia", telefone="912800003")
    _com_validades(bd, em_dia, quota=hoje + timedelta(days=10), seguro=hoje + timedelta(days=200))

    # Fica de fora: sem seguro, mas nao treina ha mais de um ano
    antigo = criar_socio(nome="Deixou De Vir", telefone="912800004")
    _com_validades(bd, antigo, quota=hoje - timedelta(days=400))

    # Fica de fora: nunca teve quota nenhuma registada
    criar_socio(nome="Nunca Pagou", telefone="912800005")

    r = cliente.get("/api/members", headers=admin, params={"status": "seguro_inativo"})
    assert r.status_code == 200
    assert sorted(m["name"] for m in r.json()) == ["Seguro Expirado", "Sem Seguro"]


def test_o_seguro_vale_ate_ao_proprio_dia(cliente, admin, criar_socio, bd):
    hoje = date.today()
    socio = criar_socio(nome="Acaba Hoje", telefone="912800006")
    _com_validades(bd, socio, quota=hoje, seguro=hoje)

    r = cliente.get("/api/members", headers=admin, params={"status": "seguro_inativo"})
    assert [m["name"] for m in r.json()] == []

    _com_validades(bd, socio, seguro=hoje - timedelta(days=1))
    r = cliente.get("/api/members", headers=admin, params={"status": "seguro_inativo"})
    assert [m["name"] for m in r.json()] == ["Acaba Hoje"]


def test_tres_meses_atras_conta_o_calendario_e_nao_noventa_dias():
    from server import ha_meses

    assert ha_meses(date(2026, 10, 13), 3) == date(2026, 7, 13)
    assert ha_meses(date(2026, 2, 10), 3) == date(2025, 11, 10)
    # 31 de maio menos tres meses nao da 31 de fevereiro
    assert ha_meses(date(2026, 5, 31), 3) == date(2026, 2, 28)
