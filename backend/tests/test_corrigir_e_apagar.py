"""Corrigir e apagar despesas, presenças e aulas experimentais.

Quem regista é quem se engana, e até aqui um engano ficava lá para sempre:
uma despesa lançada a dobrar estragava as contas do mês, e um check-in
feito na modalidade errada estragava as estatísticas do ano.
"""
from datetime import date

import pytest


# ------------------------------------------------------------------ despesas

@pytest.fixture
def despesa(cliente, admin):
    return cliente.post(
        "/api/expenses",
        headers=admin,
        json={"description": "Renda", "amount": 800.0, "expense_date": "2026-09-05", "category": "rent"},
    ).json()


def test_corrigir_o_valor_de_uma_despesa(cliente, admin, despesa):
    r = cliente.put(
        f"/api/expenses/{despesa['id']}",
        headers=admin,
        json={"description": "Renda", "amount": 750.0, "expense_date": "2026-09-05", "category": "rent"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["amount"] == 750.0
    assert r.json()["id"] == despesa["id"]

    lista = cliente.get("/api/expenses", headers=admin).json()
    assert [d["amount"] for d in lista] == [750.0]


def test_corrigir_a_categoria_e_a_data(cliente, admin, despesa):
    r = cliente.put(
        f"/api/expenses/{despesa['id']}",
        headers=admin,
        json={"description": None, "amount": 800.0, "expense_date": "2026-10-05", "category": "energy"},
    )
    assert r.json()["category"] == "energy"
    assert r.json()["expense_date"] == "2026-10-05"
    assert r.json()["description"] is None


def test_apagar_uma_despesa_tira_a_das_contas(cliente, admin, despesa):
    assert cliente.delete(f"/api/expenses/{despesa['id']}", headers=admin).status_code == 200
    assert cliente.get("/api/expenses", headers=admin).json() == []


def test_o_colaborador_corrige_e_apaga_despesas(cliente, admin, colaborador, despesa):
    """Regista-as, por isso tem de as poder emendar."""
    r = cliente.put(
        f"/api/expenses/{despesa['id']}",
        headers=colaborador,
        json={"description": "Renda", "amount": 1.0, "expense_date": "2026-09-05", "category": "rent"},
    )
    assert r.status_code == 200
    assert cliente.delete(f"/api/expenses/{despesa['id']}", headers=colaborador).status_code == 200


def test_quem_apagou_a_despesa_fica_registado(cliente, admin, colaborador, despesa):
    cliente.delete(f"/api/expenses/{despesa['id']}", headers=colaborador)
    registos = cliente.get("/api/audit-logs", headers=admin).json()
    apagadas = [r for r in registos if r["action"] == "delete" and r["entity_type"] == "expense"]
    assert apagadas and apagadas[0]["username"] == "colaborador.teste"


def test_despesa_inexistente_devolve_404(cliente, admin):
    assert cliente.delete("/api/expenses/nao-existe", headers=admin).status_code == 404
    r = cliente.put("/api/expenses/nao-existe", headers=admin, json={"amount": 10})
    assert r.status_code == 404


# ----------------------------------------------------------------- presenças

@pytest.fixture
def presenca(cliente, admin, criar_socio, modalidades):
    socio = criar_socio(telefone="912600001")
    return cliente.post(
        "/api/attendance",
        headers=admin,
        json={"member_id": socio["id"], "activity_id": modalidades[0]["id"], "method": "manual"},
    ).json()


def test_corrigir_a_modalidade_de_um_check_in(cliente, admin, presenca, modalidades):
    outra = modalidades[1]
    r = cliente.put(
        f"/api/attendance/{presenca['id']}", headers=admin, json={"activity_id": outra["id"]}
    )
    assert r.status_code == 200, r.text
    assert r.json()["activity_id"] == outra["id"]

    lista = cliente.get("/api/attendance", headers=admin).json()
    assert [a["activity_id"] for a in lista] == [outra["id"]]


def test_nao_se_corrige_para_uma_modalidade_que_nao_existe(cliente, admin, presenca):
    r = cliente.put(
        f"/api/attendance/{presenca['id']}", headers=admin, json={"activity_id": "nao-existe"}
    )
    assert r.status_code == 404


def test_apagar_um_check_in_errado(cliente, admin, presenca):
    assert cliente.delete(f"/api/attendance/{presenca['id']}", headers=admin).status_code == 200
    assert cliente.get("/api/attendance", headers=admin).json() == []


def test_apagar_um_check_in_nao_mexe_no_socio(cliente, admin, criar_socio, pagar, modalidades):
    """O estado do socio depende da quota, nunca das presencas."""
    socio = criar_socio(telefone="912600002")
    pagar(socio["id"], quando=date.today())
    p = cliente.post(
        "/api/attendance",
        headers=admin,
        json={"member_id": socio["id"], "activity_id": modalidades[0]["id"], "method": "manual"},
    ).json()

    cliente.delete(f"/api/attendance/{p['id']}", headers=admin)

    ficha = cliente.get(f"/api/members/{socio['id']}", headers=admin).json()
    assert ficha["membership_status"] == "active"


def test_o_colaborador_corrige_e_apaga_presencas(cliente, colaborador, presenca, modalidades):
    r = cliente.put(
        f"/api/attendance/{presenca['id']}", headers=colaborador,
        json={"activity_id": modalidades[1]["id"]},
    )
    assert r.status_code == 200
    assert cliente.delete(f"/api/attendance/{presenca['id']}", headers=colaborador).status_code == 200


def test_presenca_inexistente_devolve_404(cliente, admin, modalidades):
    assert cliente.delete("/api/attendance/nao-existe", headers=admin).status_code == 404
    r = cliente.put("/api/attendance/nao-existe", headers=admin,
                    json={"activity_id": modalidades[0]["id"]})
    assert r.status_code == 404


# ------------------------------------------------------- aulas experimentais

def test_uma_experimental_vale_5_euros_por_omissao(cliente, admin, modalidades):
    r = cliente.post("/api/trials", headers=admin, json={"activity_id": modalidades[0]["id"]})
    assert r.status_code == 200, r.text
    assert r.json()["amount"] == 5.0


def test_o_valor_da_experimental_pode_ser_outro(cliente, admin, modalidades):
    r = cliente.post(
        "/api/trials", headers=admin,
        json={"activity_id": modalidades[0]["id"], "amount": 7.5},
    )
    assert r.json()["amount"] == 7.5


def test_uma_experimental_pode_ser_oferecida(cliente, admin, modalidades):
    r = cliente.post(
        "/api/trials", headers=admin, json={"activity_id": modalidades[0]["id"], "amount": 0},
    )
    assert r.status_code == 200
    assert r.json()["amount"] == 0


def test_a_experimental_nao_aceita_valor_negativo(cliente, admin, modalidades):
    r = cliente.post(
        "/api/trials", headers=admin, json={"activity_id": modalidades[0]["id"], "amount": -1},
    )
    assert r.status_code == 400


def test_corrigir_a_modalidade_e_o_valor_de_uma_experimental(cliente, admin, modalidades):
    trial = cliente.post(
        "/api/trials", headers=admin, json={"activity_id": modalidades[0]["id"]}
    ).json()

    r = cliente.put(
        f"/api/trials/{trial['id']}", headers=admin,
        json={"activity_id": modalidades[1]["id"], "amount": 10.0, "trial_date": "2026-09-09"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["activity_name"] == modalidades[1]["name"]
    assert r.json()["amount"] == 10.0
    assert r.json()["trial_date"] == "2026-09-09"
    assert r.json()["id"] == trial["id"]


def test_corrigir_sem_indicar_valor_mantem_o_que_la_estava(cliente, admin, modalidades):
    trial = cliente.post(
        "/api/trials", headers=admin, json={"activity_id": modalidades[0]["id"], "amount": 12.0}
    ).json()

    r = cliente.put(
        f"/api/trials/{trial['id']}", headers=admin, json={"activity_id": modalidades[1]["id"]}
    )
    assert r.json()["amount"] == 12.0


def test_uma_experimental_continua_a_nao_ser_uma_presenca(cliente, admin, modalidades):
    """A regra de sempre: as experimentais nao entram nas contagens."""
    cliente.post("/api/trials", headers=admin, json={"activity_id": modalidades[0]["id"]})
    assert cliente.get("/api/attendance", headers=admin).json() == []


def test_experimental_inexistente_devolve_404(cliente, admin, modalidades):
    r = cliente.put("/api/trials/nao-existe", headers=admin,
                    json={"activity_id": modalidades[0]["id"]})
    assert r.status_code == 404


# ----------------------------------------------- ordem da lista de sócios

def test_a_lista_vem_por_numero_de_socio(cliente, admin, criar_socio):
    """Sem pesquisa, procura-se a correr os olhos pela lista: 001, 002, 003."""
    criar_socio(nome="Zé Antunes", telefone="912610001")
    criar_socio(nome="Ana Costa", telefone="912610002")
    criar_socio(nome="Bruno Dias", telefone="912610003")

    lista = cliente.get("/api/members", headers=admin).json()
    numeros = [m["member_number"] for m in lista]
    assert numeros == sorted(numeros, key=int)
    # E nao por ordem alfabetica, que era como vinha antes
    assert [m["name"] for m in lista] == ["Zé Antunes", "Ana Costa", "Bruno Dias"]


def test_dez_vem_depois_de_nove_e_nao_a_seguir_a_um(cliente, admin, criar_socio):
    for i in range(11):
        criar_socio(nome=f"Sócio {i:02d}", telefone=f"9126200{i:02d}")

    numeros = [int(m["member_number"]) for m in cliente.get("/api/members", headers=admin).json()]
    assert numeros == sorted(numeros)
