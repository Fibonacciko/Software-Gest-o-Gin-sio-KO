"""Consultar despesas: por dia, por mês e por tipo.

A descrição deixou de ser obrigatória — obrigar a escrevê-la só levava a
"vários" e a pontos finais. O que identifica uma despesa é a categoria e
a data.
"""
from datetime import date


def despesa(cliente, admin, **campos):
    corpo = {"amount": 100.0, "expense_date": "2026-09-15", "category": "rent"}
    corpo.update(campos)
    return cliente.post("/api/expenses", headers=admin, json=corpo)


def test_despesa_sem_descricao_e_aceite(cliente, admin):
    r = despesa(cliente, admin)
    assert r.status_code == 200, r.text
    assert r.json()["description"] is None


def test_descricao_vazia_tambem(cliente, admin):
    """O formulário envia sempre o campo, vazio quando não se escreve nada."""
    r = despesa(cliente, admin, description="")
    assert r.status_code == 200, r.text


def test_o_valor_continua_a_ser_obrigatorio(cliente, admin):
    r = cliente.post(
        "/api/expenses", headers=admin, json={"description": "sem valor", "category": "rent"}
    )
    assert r.status_code == 422


def test_despesas_antigas_com_descricao_continuam_a_ser_lidas(cliente, admin):
    despesa(cliente, admin, description="Renda de setembro")
    lista = cliente.get("/api/expenses", headers=admin).json()
    assert any(d["description"] == "Renda de setembro" for d in lista)


def test_filtrar_por_um_unico_dia(cliente, admin):
    despesa(cliente, admin, expense_date="2026-09-15")
    despesa(cliente, admin, expense_date="2026-09-16")

    for dia, esperado in [("2026-09-15", 1), ("2026-09-16", 1), ("2026-09-17", 0)]:
        r = cliente.get(
            "/api/expenses", headers=admin, params={"start_date": dia, "end_date": dia}
        )
        assert len(r.json()) == esperado, f"dia {dia}"


def test_filtrar_por_mes_inclui_o_ultimo_dia(cliente, admin):
    despesa(cliente, admin, expense_date="2026-09-01")
    despesa(cliente, admin, expense_date="2026-09-30")
    despesa(cliente, admin, expense_date="2026-10-01")

    setembro = cliente.get(
        "/api/expenses",
        headers=admin,
        params={"start_date": "2026-09-01", "end_date": "2026-09-30"},
    )
    assert len(setembro.json()) == 2


def test_filtrar_por_tipo(cliente, admin):
    despesa(cliente, admin, category="rent")
    despesa(cliente, admin, category="rent")
    despesa(cliente, admin, category="energy")

    rendas = cliente.get("/api/expenses", headers=admin, params={"category": "rent"})
    assert len(rendas.json()) == 2
    assert all(d["category"] == "rent" for d in rendas.json())

    energia = cliente.get("/api/expenses", headers=admin, params={"category": "energy"})
    assert len(energia.json()) == 1


def test_filtrar_por_tipo_e_periodo_ao_mesmo_tempo(cliente, admin):
    despesa(cliente, admin, category="rent", expense_date="2026-09-10")
    despesa(cliente, admin, category="rent", expense_date="2026-10-10")
    despesa(cliente, admin, category="energy", expense_date="2026-09-10")

    r = cliente.get(
        "/api/expenses",
        headers=admin,
        params={"category": "rent", "start_date": "2026-09-01", "end_date": "2026-09-30"},
    )
    assert len(r.json()) == 1


def test_um_tipo_sem_despesas_devolve_lista_vazia(cliente, admin):
    despesa(cliente, admin, category="rent")
    r = cliente.get("/api/expenses", headers=admin, params={"category": "marketing"})
    assert r.status_code == 200
    assert r.json() == []


def test_as_mais_recentes_aparecem_primeiro(cliente, admin):
    despesa(cliente, admin, expense_date="2026-09-01", description="primeira")
    despesa(cliente, admin, expense_date="2026-09-30", description="ultima")
    despesa(cliente, admin, expense_date="2026-09-15", description="meio")

    datas = [d["expense_date"] for d in cliente.get("/api/expenses", headers=admin).json()]
    assert datas == sorted(datas, reverse=True)


def test_o_colaborador_pode_consultar_despesas(cliente, admin, colaborador):
    """Regista-as, por isso tem de as poder conferir."""
    despesa(cliente, admin)
    r = cliente.get("/api/expenses", headers=colaborador)
    assert r.status_code == 200
    assert len(r.json()) == 1


def test_uma_despesa_sem_descricao_entra_nas_contas(cliente, admin):
    """O que conta para as contas é o valor, não o texto."""
    despesa(cliente, admin, amount=250.0, expense_date=date.today().isoformat())
    lista = cliente.get("/api/expenses", headers=admin).json()
    assert sum(d["amount"] for d in lista) == 250.0
