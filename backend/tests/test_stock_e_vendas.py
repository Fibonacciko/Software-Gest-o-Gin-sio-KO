"""Vendas de merchandise: stock, preço cobrado e ligação ao sócio."""
import pytest


@pytest.fixture
def artigo(cliente, admin):
    r = cliente.post(
        "/api/inventory",
        headers=admin,
        json={"name": "T-shirt KO", "category": "clothing", "quantity": 10, "price": 20.0},
    )
    assert r.status_code == 200, r.text
    return r.json()


def stock_atual(cliente, admin, artigo_id):
    artigos = cliente.get("/api/inventory", headers=admin).json()
    return next(a["quantity"] for a in artigos if a["id"] == artigo_id)


def test_venda_baixa_o_stock(cliente, admin, artigo):
    r = cliente.post("/api/sales", headers=admin, json={"item_id": artigo["id"], "quantity": 3})
    assert r.status_code == 200
    assert stock_atual(cliente, admin, artigo["id"]) == 7


def test_sem_preco_indicado_usa_o_de_tabela(cliente, admin, artigo):
    venda = cliente.post(
        "/api/sales", headers=admin, json={"item_id": artigo["id"], "quantity": 2}
    ).json()
    assert venda["unit_price"] == 20.0
    assert venda["total"] == 40.0
    assert venda["list_price"] == 20.0


def test_preco_cobrado_pode_ser_diferente(cliente, admin, artigo):
    """Descontos e promoções: guarda o cobrado e o de tabela."""
    venda = cliente.post(
        "/api/sales",
        headers=admin,
        json={"item_id": artigo["id"], "quantity": 2, "unit_price": 15},
    ).json()
    assert venda["unit_price"] == 15.0
    assert venda["total"] == 30.0
    assert venda["list_price"] == 20.0


def test_oferta_e_aceite_mas_preco_negativo_nao(cliente, admin, artigo):
    oferta = cliente.post(
        "/api/sales", headers=admin, json={"item_id": artigo["id"], "quantity": 1, "unit_price": 0}
    )
    assert oferta.status_code == 200
    assert oferta.json()["total"] == 0

    negativo = cliente.post(
        "/api/sales", headers=admin, json={"item_id": artigo["id"], "quantity": 1, "unit_price": -5}
    )
    assert negativo.status_code == 400


def test_nao_se_vende_mais_do_que_existe(cliente, admin, artigo):
    r = cliente.post("/api/sales", headers=admin, json={"item_id": artigo["id"], "quantity": 99})
    assert r.status_code == 400
    assert "insuficiente" in r.json()["detail"].lower()
    # E o stock não foi tocado
    assert stock_atual(cliente, admin, artigo["id"]) == 10


def test_venda_pode_ficar_associada_a_um_socio(cliente, admin, artigo, criar_socio):
    socio = criar_socio(nome="Compradora Teste", telefone="912300001")

    venda = cliente.post(
        "/api/sales",
        headers=admin,
        json={"item_id": artigo["id"], "quantity": 1, "member_id": socio["id"]},
    ).json()
    assert venda["member_name"] == "Compradora Teste"

    sem_socio = cliente.post(
        "/api/sales", headers=admin, json={"item_id": artigo["id"], "quantity": 1}
    ).json()
    assert sem_socio["member_id"] is None


def test_socio_inexistente_e_recusado(cliente, admin, artigo):
    r = cliente.post(
        "/api/sales",
        headers=admin,
        json={"item_id": artigo["id"], "quantity": 1, "member_id": "nao-existe"},
    )
    assert r.status_code == 404
