"""Avaliações físicas: o que a balança mede e a evolução do sócio.

O que estes testes protegem: o **IMC é calculado**, nunca gravado. Um IMC
gravado sobrevive à correção do peso que lhe deu origem, e aí o gráfico passa
a mentir sem ninguém dar por isso.
"""
from datetime import date, timedelta


def _avaliacao(cliente, admin, socio_id, **campos):
    corpo = {"weight_kg": 80.0}
    corpo.update(campos)
    return cliente.post(f"/api/members/{socio_id}/assessments", headers=admin, json=corpo)


def test_registar_uma_avaliacao(cliente, admin, criar_socio):
    socio = criar_socio(telefone="914000001")
    r = _avaliacao(
        cliente, admin, socio["id"],
        weight_kg=82.4, height_cm=178, body_fat_pct=18.2,
        muscle_mass_kg=62.1, water_pct=55.4, visceral_fat=7, metabolic_age=29,
    )
    assert r.status_code == 200, r.text
    a = r.json()
    assert a["weight_kg"] == 82.4
    assert a["body_fat_pct"] == 18.2
    assert a["metabolic_age"] == 29
    assert a["assessment_date"] == date.today().isoformat()


def test_o_imc_e_calculado_do_peso_e_da_altura(cliente, admin, criar_socio):
    socio = criar_socio(telefone="914000002")
    r = _avaliacao(cliente, admin, socio["id"], weight_kg=80.0, height_cm=180)
    # 80 / 1.80² = 24.69 -> 24.7
    assert r.json()["bmi"] == 24.7


def test_sem_altura_nao_ha_imc(cliente, admin, criar_socio):
    """Diz-se que não se sabe, em vez de se inventar um número."""
    socio = criar_socio(telefone="914000003")
    r = _avaliacao(cliente, admin, socio["id"], weight_kg=80.0)
    assert r.json()["bmi"] is None


def test_corrigir_o_peso_corrige_o_imc(cliente, admin, criar_socio):
    """É por isto que o IMC não se grava."""
    socio = criar_socio(telefone="914000004")
    a = _avaliacao(cliente, admin, socio["id"], weight_kg=80.0, height_cm=180).json()
    assert a["bmi"] == 24.7

    r = cliente.put(
        f"/api/assessments/{a['id']}",
        headers=admin,
        json={"weight_kg": 90.0, "height_cm": 180},
    )
    assert r.status_code == 200
    assert r.json()["bmi"] == 27.8

    # E a lista também, que é de onde sai o gráfico
    lista = cliente.get(f"/api/members/{socio['id']}/assessments", headers=admin).json()
    assert lista[0]["bmi"] == 27.8


def test_o_peso_tem_de_ser_um_numero_a_serio(cliente, admin, criar_socio):
    socio = criar_socio(telefone="914000005")
    assert _avaliacao(cliente, admin, socio["id"], weight_kg=0).status_code == 400
    assert _avaliacao(cliente, admin, socio["id"], weight_kg=-5).status_code == 400


def test_nao_se_avalia_um_socio_que_nao_existe(cliente, admin):
    assert _avaliacao(cliente, admin, "nao-existe").status_code == 404


def test_a_gestao_ve_da_mais_recente_para_tras(cliente, admin, criar_socio):
    """Na ficha interessa o que foi medido da última vez."""
    socio = criar_socio(telefone="914000006")
    hoje = date.today()
    for dias, peso in ((60, 86.0), (30, 84.0), (0, 82.0)):
        _avaliacao(
            cliente, admin, socio["id"],
            weight_kg=peso,
            assessment_date=(hoje - timedelta(days=dias)).isoformat(),
        )

    pesos = [a["weight_kg"] for a in
             cliente.get(f"/api/members/{socio['id']}/assessments", headers=admin).json()]
    assert pesos == [82.0, 84.0, 86.0]


def test_a_app_ve_da_mais_antiga_para_a_frente(cliente, admin, criar_socio):
    """É assim que se desenha uma linha de evolução: da esquerda para a direita."""
    socio = criar_socio(telefone="914000007")
    hoje = date.today()
    for dias, peso in ((60, 86.0), (30, 84.0), (0, 82.0)):
        _avaliacao(
            cliente, admin, socio["id"],
            weight_kg=peso,
            assessment_date=(hoje - timedelta(days=dias)).isoformat(),
        )

    pesos = [a["weight_kg"] for a in
             cliente.get(f"/api/mobile/assessments/{socio['id']}").json()]
    assert pesos == [86.0, 84.0, 82.0]


def test_as_avaliacoes_sao_de_cada_socio(cliente, admin, criar_socio):
    um = criar_socio(nome="Um", telefone="914000008")
    outro = criar_socio(nome="Outro", telefone="914000009")
    _avaliacao(cliente, admin, um["id"], weight_kg=70.0)

    assert len(cliente.get(f"/api/mobile/assessments/{um['id']}").json()) == 1
    assert cliente.get(f"/api/mobile/assessments/{outro['id']}").json() == []


def test_apagar_uma_avaliacao(cliente, admin, criar_socio):
    socio = criar_socio(telefone="914000010")
    a = _avaliacao(cliente, admin, socio["id"]).json()

    assert cliente.delete(f"/api/assessments/{a['id']}", headers=admin).status_code == 200
    assert cliente.get(f"/api/members/{socio['id']}/assessments", headers=admin).json() == []
    assert cliente.delete(f"/api/assessments/{a['id']}", headers=admin).status_code == 404


def test_o_colaborador_tambem_regista_e_corrige(cliente, colaborador, admin, criar_socio):
    """É ele que está ao balcão com a balança."""
    socio = criar_socio(telefone="914000011")
    r = cliente.post(
        f"/api/members/{socio['id']}/assessments",
        headers=colaborador,
        json={"weight_kg": 77.0, "height_cm": 170},
    )
    assert r.status_code == 200
    assert cliente.put(
        f"/api/assessments/{r.json()['id']}",
        headers=colaborador,
        json={"weight_kg": 76.0, "height_cm": 170},
    ).status_code == 200


def test_a_app_nao_pede_senha_para_ver_a_evolucao(cliente, admin, criar_socio):
    """Como o resto da aplicação do sócio, que entra pelo número e telefone."""
    socio = criar_socio(telefone="914000012")
    _avaliacao(cliente, admin, socio["id"])
    assert cliente.get(f"/api/mobile/assessments/{socio['id']}").status_code == 200
