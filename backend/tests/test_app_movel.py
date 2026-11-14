"""Login e cartão do sócio na aplicação móvel."""
from datetime import date, timedelta


def entrar(cliente, numero, telefone):
    return cliente.post(
        "/api/mobile/auth/login",
        json={"member_number": numero, "phone": telefone},
    )


def test_socio_entra_com_numero_e_telefone(cliente, criar_socio):
    socio = criar_socio(telefone="912345678")
    r = entrar(cliente, socio["member_number"], "912345678")
    assert r.status_code == 200
    assert r.json()["member"]["name"] == socio["name"]


def test_numero_com_ou_sem_zeros_a_frente(cliente, criar_socio):
    socio = criar_socio(telefone="912345678")           # fica com o n.º 001
    assert entrar(cliente, socio["member_number"], "912345678").status_code == 200
    assert entrar(cliente, socio["member_number"].lstrip("0"), "912345678").status_code == 200


def test_telefone_com_espacos_ou_indicativo(cliente, criar_socio):
    socio = criar_socio(telefone="912345678")
    for escrito in ["912 345 678", "+351912345678", "351 912345678", "912-345-678"]:
        assert entrar(cliente, socio["member_number"], escrito).status_code == 200, escrito


def test_socio_em_atraso_entra_e_ve_o_aviso(cliente, criar_socio):
    """Quem tem a quota por pagar é quem mais precisa de ver o cartão."""
    socio = criar_socio(telefone="912345678")
    r = entrar(cliente, socio["member_number"], "912345678")
    assert r.status_code == 200
    assert r.json()["member"]["membership_status"] == "inactive"


def test_socio_suspenso_e_bloqueado(cliente, criar_socio, bd):
    socio = criar_socio(telefone="912345678")
    bd.members.update_one({"id": socio["id"]}, {"$set": {"status": "suspended"}})

    r = entrar(cliente, socio["member_number"], "912345678")
    assert r.status_code == 403
    assert "suspensa" in r.json()["detail"].lower()


def test_telefone_errado_e_recusado(cliente, criar_socio):
    socio = criar_socio(telefone="912345678")
    r = entrar(cliente, socio["member_number"], "999999999")
    assert r.status_code == 401


def test_cartao_traz_tudo_o_que_o_ecra_mostra(cliente, criar_socio, pagar, modalidades):
    socio = criar_socio(telefone="912345678", activity_ids=[modalidades[0]["id"]])
    pagar(socio["id"])
    pagar(socio["id"], valor=20, tipo="seguro")

    cartao = entrar(cliente, socio["member_number"], "912345678").json()["member"]

    assert cartao["membership_status"] == "active"
    assert cartao["membership_valid_until"] is not None
    assert cartao["insurance_valid_until"] is not None
    assert cartao["qr_code"].startswith("data:image")
    assert cartao["activity_ids"] == [modalidades[0]["id"]]
    assert cartao["workout_count"] == 0
    assert cartao["checked_in_today"] is False
    assert cartao["current_motivational_note"]


def test_sequencia_de_semanas_conta_a_partir_dos_treinos(
    cliente, criar_socio, modalidades
):
    socio = criar_socio(telefone="912345678", activity_ids=[modalidades[0]["id"]])

    cartao = cliente.get(
        "/api/mobile/profile", params={"member_id": socio["id"]}
    ).json()
    assert cartao["streak_weeks"] == 0

    cliente.post("/api/mobile/checkin/app", json={"member_id": socio["id"]})

    cartao = cliente.get(
        "/api/mobile/profile", params={"member_id": socio["id"]}
    ).json()
    assert cartao["streak_weeks"] == 1
    assert cartao["checked_in_today"] is True


def test_o_cartao_conta_os_treinos_do_mes(cliente, admin, criar_socio, modalidades):
    """O total vai para a parede da capa; o cartao dos numeros mostra o mes.

    Um treino de ha dois meses conta para o total e nao conta para o mes.
    """
    socio = criar_socio(telefone="912345678", activity_ids=[modalidades[0]["id"]])
    hoje = date.today()

    for quando, modalidade in (
        (hoje, modalidades[0]),
        (hoje.replace(day=1), modalidades[1]),
        (hoje - timedelta(days=70), modalidades[2 % len(modalidades)]),
    ):
        r = cliente.post(
            "/api/attendance",
            headers=admin,
            json={
                "member_id": socio["id"],
                "activity_id": modalidade["id"],
                "check_in_date": quando.isoformat(),
                "method": "manual",
            },
        )
        assert r.status_code == 200, r.text

    cartao = cliente.get("/api/mobile/profile", params={"member_id": socio["id"]}).json()
    assert cartao["workout_count"] == 3
    assert cartao["workout_count_month"] == 2


def test_sem_treinos_o_mes_fica_a_zero(cliente, criar_socio):
    socio = criar_socio(telefone="912345678")
    cartao = cliente.get("/api/mobile/profile", params={"member_id": socio["id"]}).json()
    assert cartao["workout_count"] == 0
    assert cartao["workout_count_month"] == 0


def test_dois_treinos_no_mesmo_dia_sao_um_dia_so(cliente, admin, criar_socio, modalidades):
    """A parede da capa conta dias, nao treinos.

    Ha quem treine duas modalidades no mesmo dia: sao dois treinos e um dia
    so. O cartao dos numeros conta os treinos; a parede conta os dias.
    """
    socio = criar_socio(telefone="912345678", activity_ids=[modalidades[0]["id"]])
    hoje = date.today()

    for quando, modalidade in (
        (hoje, modalidades[0]),
        (hoje, modalidades[1]),
        (hoje - timedelta(days=70), modalidades[0]),
    ):
        r = cliente.post(
            "/api/attendance",
            headers=admin,
            json={
                "member_id": socio["id"],
                "activity_id": modalidade["id"],
                "check_in_date": quando.isoformat(),
                "method": "manual",
            },
        )
        assert r.status_code == 200, r.text

    cartao = cliente.get("/api/mobile/profile", params={"member_id": socio["id"]}).json()
    assert cartao["workout_count"] == 3       # tres treinos
    assert cartao["training_days"] == 2       # em dois dias
    assert cartao["workout_count_month"] == 2


def test_sem_treinos_nao_ha_dias(cliente, criar_socio):
    socio = criar_socio(telefone="912345678")
    cartao = cliente.get("/api/mobile/profile", params={"member_id": socio["id"]}).json()
    assert cartao["training_days"] == 0
