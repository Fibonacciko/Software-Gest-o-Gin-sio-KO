"""Presenças de sócios e aulas experimentais, que são coisas distintas."""
from datetime import date


def test_experimental_fica_registada_com_a_modalidade(cliente, admin, modalidades):
    boxe = modalidades[0]
    r = cliente.post("/api/trials", headers=admin, json={"activity_id": boxe["id"]})
    assert r.status_code == 200
    assert r.json()["activity_name"] == boxe["name"]
    assert r.json()["trial_date"] == date.today().isoformat()


def test_experimental_nao_conta_como_presenca(cliente, admin, modalidades):
    """A distinção que protege as estatísticas de assiduidade."""
    cliente.post("/api/trials", headers=admin, json={"activity_id": modalidades[0]["id"]})

    presencas = cliente.get("/api/attendance", headers=admin).json()
    assert presencas == []

    painel = cliente.get("/api/dashboard", headers=admin).json()
    assert painel["today_attendance"] == 0


def test_experimentais_contam_se_por_modalidade_e_periodo(cliente, admin, modalidades):
    boxe, kick = modalidades[0], modalidades[1]
    for _ in range(3):
        cliente.post("/api/trials", headers=admin, json={"activity_id": boxe["id"]})
    cliente.post("/api/trials", headers=admin, json={"activity_id": kick["id"]})
    cliente.post(
        "/api/trials",
        headers=admin,
        json={"activity_id": boxe["id"], "trial_date": "2026-08-15"},
    )

    todas = cliente.get("/api/trials", headers=admin).json()
    assert len(todas) == 5

    por_modalidade = [t["activity_name"] for t in todas]
    assert por_modalidade.count(boxe["name"]) == 4
    assert por_modalidade.count(kick["name"]) == 1

    agosto = cliente.get(
        "/api/trials", headers=admin, params={"start_date": "2026-08-01", "end_date": "2026-08-31"}
    ).json()
    assert len(agosto) == 1


def test_experimental_de_modalidade_inexistente_e_recusada(cliente, admin):
    r = cliente.post("/api/trials", headers=admin, json={"activity_id": "nao-existe"})
    assert r.status_code == 404


def test_presenca_de_socio_conta_no_painel(cliente, admin, criar_socio, modalidades):
    socio = criar_socio()
    r = cliente.post(
        "/api/attendance",
        headers=admin,
        json={"member_id": socio["id"], "activity_id": modalidades[0]["id"], "method": "manual"},
    )
    assert r.status_code == 200

    painel = cliente.get("/api/dashboard", headers=admin).json()
    assert painel["today_attendance"] == 1


def test_check_in_da_app_nao_duplica_no_mesmo_dia(cliente, admin, criar_socio, modalidades):
    socio = criar_socio(activity_ids=[modalidades[0]["id"]])

    primeiro = cliente.post(
        "/api/mobile/checkin/app",
        json={"member_id": socio["id"], "activity_id": modalidades[0]["id"]},
    ).json()
    assert primeiro["already_checked_in"] is False
    assert primeiro["workout_count"] == 1

    segundo = cliente.post(
        "/api/mobile/checkin/app",
        json={"member_id": socio["id"], "activity_id": modalidades[0]["id"]},
    ).json()
    assert segundo["already_checked_in"] is True
    assert segundo["workout_count"] == 1  # continua um


def test_check_in_sem_modalidade_usa_a_principal(cliente, admin, criar_socio, modalidades):
    socio = criar_socio(activity_ids=[modalidades[1]["id"], modalidades[0]["id"]])

    r = cliente.post("/api/mobile/checkin/app", json={"member_id": socio["id"]}).json()
    assert r["activity_name"] == modalidades[1]["name"]
