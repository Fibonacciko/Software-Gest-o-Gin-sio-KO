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


def test_colaborador_corrige_e_apaga(cliente, admin, colaborador, criar_socio, pagar):
    """O colaborador lanca, corrige e apaga, como em Membros.

    Fica registado no historico quem apagou o que.
    """
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

    assert cliente.delete(f"/api/payments/{pagamento['id']}", headers=colaborador).status_code == 200
    # E as validades do socio sao refeitas na mesma
    assert ficha(cliente, admin, socio["id"])["membership_status"] == "inactive"


def test_quem_apaga_fica_registado(cliente, admin, colaborador, criar_socio, pagar):
    socio = criar_socio()
    pagamento = pagar(socio["id"])
    cliente.delete(f"/api/payments/{pagamento['id']}", headers=colaborador)

    registos = cliente.get("/api/audit-logs", headers=admin).json()
    apagados = [r for r in registos if r["action"] == "delete" and r["entity_type"] == "payment"]
    assert apagados, "a eliminacao devia ficar no historico"
    assert apagados[0]["username"] == "colaborador.teste"


def test_pagamento_inexistente_devolve_404(cliente, admin):
    assert cliente.delete("/api/payments/nao-existe", headers=admin).status_code == 404


# --- O seguro posto a mao na ficha nao pode desaparecer sozinho ---
# Ha 14 socios com o seguro na ficha mas sem pagamento de seguro associado:
# vieram assim da importacao do sistema antigo. Antes disto, corrigir ou
# apagar uma simples mensalidade desses socios apagava-lhes o seguro.

def test_corrigir_uma_quota_nao_apaga_o_seguro_posto_a_mao(cliente, admin, criar_socio, pagar, bd):
    socio = criar_socio(telefone="912950001")
    quota = pagar(socio["id"])
    # Seguro na ficha, sem pagamento associado
    bd.members.update_one({"id": socio["id"]}, {"$set": {
        "insurance_valid_until": "2027-06-30T00:00:00+00:00",
        "expiry_date": "2027-06-30T00:00:00+00:00",
    }})

    cliente.put(
        f"/api/payments/{quota['id']}",
        headers=admin,
        json={"member_id": socio["id"], "amount": 40, "payment_type": "quota",
              "payment_method": "cash", "payment_date": date.today().isoformat()},
    )

    ficha_depois = ficha(cliente, admin, socio["id"])
    assert ficha_depois["insurance_valid_until"] == "2027-06-30"
    assert ficha_depois["expiry_date"] == "2027-06-30"


def test_apagar_uma_quota_nao_apaga_o_seguro_posto_a_mao(cliente, admin, criar_socio, pagar, bd):
    socio = criar_socio(telefone="912950002")
    quota = pagar(socio["id"])
    bd.members.update_one({"id": socio["id"]}, {"$set": {
        "insurance_valid_until": "2027-06-30T00:00:00+00:00",
        "expiry_date": "2027-06-30T00:00:00+00:00",
    }})

    cliente.delete(f"/api/payments/{quota['id']}", headers=admin)

    ficha_depois = ficha(cliente, admin, socio["id"])
    assert ficha_depois["insurance_valid_until"] == "2027-06-30"
    # E a quota, essa, foi mesmo removida
    assert ficha_depois["membership_status"] == "inactive"


def test_apagar_o_pagamento_do_seguro_continua_a_limpar_o_seguro(cliente, admin, criar_socio, pagar):
    """A regra de sempre: se o seguro veio de um pagamento, apagar o pagamento tira-o."""
    socio = criar_socio(telefone="912950003")
    seguro = pagar(socio["id"], valor=20, tipo="seguro")
    assert ficha(cliente, admin, socio["id"])["insurance_valid_until"] is not None

    cliente.delete(f"/api/payments/{seguro['id']}", headers=admin)

    assert ficha(cliente, admin, socio["id"])["insurance_valid_until"] is None


def test_corrigir_um_pagamento_de_inscricao_refaz_o_seguro(cliente, admin, criar_socio, pagar):
    socio = criar_socio(telefone="912950004")
    inscricao = pagar(socio["id"], valor=55, tipo="quota_seguro", quando=date(2026, 6, 10))
    assert ficha(cliente, admin, socio["id"])["insurance_valid_until"] == "2027-06-10"

    cliente.put(
        f"/api/payments/{inscricao['id']}",
        headers=admin,
        json={"member_id": socio["id"], "amount": 55, "payment_type": "quota_seguro",
              "payment_method": "cash", "payment_date": "2026-06-20"},
    )

    assert ficha(cliente, admin, socio["id"])["insurance_valid_until"] == "2027-06-20"
