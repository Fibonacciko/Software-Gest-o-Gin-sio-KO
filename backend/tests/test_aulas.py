"""Marcação de aulas: a grelha, a lotação, a lista de espera e as faltas.

As regras que estes testes protegem, decididas pelo dono:

- a grelha é **semanal e fixa**, com excepções pontuais;
- as aulas têm **lotação**, e cheias há **lista de espera**;
- **qualquer sócio** marca (não é preciso ter a quota em dia);
- o **check-in risca a inscrição**, e quem marcou e não veio fica como falta.
"""
from datetime import date, datetime, time, timedelta, timezone


def dia_guardado(d: date) -> str:
    """A forma como o servidor grava uma data: meia-noite em UTC."""
    return datetime.combine(d, datetime.min.time()).replace(tzinfo=timezone.utc).isoformat()


def proxima(dia_da_semana: int, daqui_a_dias: int = 1) -> date:
    """O próximo dia da semana pedido, a partir de amanhã.

    Nunca hoje: metade destes testes marcam aulas, e uma aula de hoje pode já
    ter começado — o que faria o teste passar de manhã e falhar à noite.
    """
    d = date.today() + timedelta(days=daqui_a_dias)
    while d.weekday() != dia_da_semana:
        d += timedelta(days=1)
    return d


def criar_grelha(cliente, admin, modalidades, **campos):
    corpo = {
        "activity_id": modalidades[0]["id"],
        "weekday": 0,
        "start_time": "19:00",
        "duration_min": 60,
        "instructor": "Prof. Ricardo",
        "capacity": 2,
    }
    corpo.update(campos)
    return cliente.post("/api/class-slots", headers=admin, json=corpo)


def marcar(cliente, socio_id, slot_id, dia):
    return cliente.post("/api/mobile/bookings", json={
        "member_id": socio_id, "slot_id": slot_id, "class_date": dia.isoformat(),
    })


# ------------------------------------------------------------- a grelha

def test_criar_uma_aula_na_grelha(cliente, admin, modalidades):
    r = criar_grelha(cliente, admin, modalidades, weekday=2, start_time="20:15", capacity=16)
    assert r.status_code == 200, r.text
    assert r.json()["weekday"] == 2
    assert r.json()["capacity"] == 16


def test_uma_aula_sem_lugares_nao_serve(cliente, admin, modalidades):
    assert criar_grelha(cliente, admin, modalidades, capacity=0).status_code == 400


def test_o_dia_da_semana_vai_de_zero_a_seis(cliente, admin, modalidades):
    assert criar_grelha(cliente, admin, modalidades, weekday=7).status_code == 400


def test_a_grelha_repete_se_todas_as_semanas(cliente, admin, modalidades):
    """Escreve-se uma vez e aparece em todas as segundas."""
    criar_grelha(cliente, admin, modalidades, weekday=0)
    segunda = proxima(0)

    r = cliente.get("/api/classes", headers=admin, params={
        "start_date": segunda.isoformat(),
        "end_date": (segunda + timedelta(days=21)).isoformat(),
    })
    assert r.status_code == 200
    datas = [a["class_date"] for a in r.json()]
    assert len(datas) == 4, "quatro segundas em quatro semanas"
    assert datas[0] == segunda.isoformat()


def test_so_a_grelha_activa_aparece(cliente, admin, modalidades):
    criar_grelha(cliente, admin, modalidades, weekday=0, is_active=False)
    segunda = proxima(0)
    r = cliente.get("/api/classes", headers=admin, params={
        "start_date": segunda.isoformat(), "end_date": segunda.isoformat(),
    })
    assert r.json() == []


def test_o_intervalo_tem_limite(cliente, admin, modalidades):
    """Senão um engano pedia dez anos de aulas de uma vez."""
    hoje = date.today()
    r = cliente.get("/api/classes", headers=admin, params={
        "start_date": hoje.isoformat(), "end_date": (hoje + timedelta(days=400)).isoformat(),
    })
    assert r.status_code == 400


# ---------------------------------------------------------- as excepcoes

def test_cancelar_uma_aula_num_dia_so(cliente, admin, modalidades):
    """Um feriado não apaga a aula da grelha."""
    slot = criar_grelha(cliente, admin, modalidades, weekday=0).json()
    segunda = proxima(0)
    seguinte = segunda + timedelta(days=7)

    cliente.post(f"/api/class-slots/{slot['id']}/exceptions", headers=admin,
                 json={"class_date": segunda.isoformat(), "cancelled": True,
                       "note": "Feriado"})

    aulas = cliente.get("/api/classes", headers=admin, params={
        "start_date": segunda.isoformat(), "end_date": seguinte.isoformat(),
    }).json()
    por_data = {a["class_date"]: a for a in aulas}
    assert por_data[segunda.isoformat()]["cancelled"] is True
    assert por_data[segunda.isoformat()]["note"] == "Feriado"
    assert por_data[seguinte.isoformat()]["cancelled"] is False


def test_mudar_a_hora_de_uma_aula_num_dia_so(cliente, admin, modalidades):
    slot = criar_grelha(cliente, admin, modalidades, weekday=0, start_time="19:00").json()
    segunda = proxima(0)

    cliente.post(f"/api/class-slots/{slot['id']}/exceptions", headers=admin,
                 json={"class_date": segunda.isoformat(), "start_time": "20:00"})

    aula = cliente.get("/api/classes", headers=admin, params={
        "start_date": segunda.isoformat(), "end_date": segunda.isoformat(),
    }).json()[0]
    assert aula["start_time"] == "20:00"


def test_tirar_a_excepcao_repoe_a_aula(cliente, admin, modalidades):
    slot = criar_grelha(cliente, admin, modalidades, weekday=0).json()
    segunda = proxima(0)
    cliente.post(f"/api/class-slots/{slot['id']}/exceptions", headers=admin,
                 json={"class_date": segunda.isoformat(), "cancelled": True})
    cliente.delete(f"/api/class-slots/{slot['id']}/exceptions/{segunda.isoformat()}",
                   headers=admin)

    aula = cliente.get("/api/classes", headers=admin, params={
        "start_date": segunda.isoformat(), "end_date": segunda.isoformat(),
    }).json()[0]
    assert aula["cancelled"] is False


def test_nao_se_marca_uma_aula_cancelada(cliente, admin, modalidades, criar_socio):
    slot = criar_grelha(cliente, admin, modalidades, weekday=0).json()
    segunda = proxima(0)
    socio = criar_socio(telefone="917000001")
    cliente.post(f"/api/class-slots/{slot['id']}/exceptions", headers=admin,
                 json={"class_date": segunda.isoformat(), "cancelled": True})

    r = marcar(cliente, socio["id"], slot["id"], segunda)
    assert r.status_code == 400


# ------------------------------------------------- marcar e lista de espera

def test_marcar_uma_aula(cliente, admin, modalidades, criar_socio):
    slot = criar_grelha(cliente, admin, modalidades, weekday=0).json()
    socio = criar_socio(telefone="917000002")
    r = marcar(cliente, socio["id"], slot["id"], proxima(0))
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "booked"


def test_qualquer_socio_marca_mesmo_com_a_quota_por_regularizar(
    cliente, admin, modalidades, criar_socio
):
    """Decisão do dono: o ginásio resolve a quota ao balcão."""
    slot = criar_grelha(cliente, admin, modalidades, weekday=0).json()
    socio = criar_socio(telefone="917000003")   # sem pagamento nenhum
    assert marcar(cliente, socio["id"], slot["id"], proxima(0)).json()["status"] == "booked"


def test_marcar_duas_vezes_nao_faz_duas_inscricoes(cliente, admin, modalidades, criar_socio):
    slot = criar_grelha(cliente, admin, modalidades, weekday=0).json()
    socio = criar_socio(telefone="917000004")
    segunda = proxima(0)
    um = marcar(cliente, socio["id"], slot["id"], segunda).json()
    outro = marcar(cliente, socio["id"], slot["id"], segunda).json()
    assert um["id"] == outro["id"]


def test_cheia_entra_se_em_lista_de_espera(cliente, admin, modalidades, criar_socio):
    slot = criar_grelha(cliente, admin, modalidades, weekday=0, capacity=2).json()
    segunda = proxima(0)
    for i in range(3):
        socio = criar_socio(nome=f"Socio {i}", telefone=f"91700010{i}")
        estado = marcar(cliente, socio["id"], slot["id"], segunda).json()["status"]
        assert estado == ("booked" if i < 2 else "waiting")

    aula = cliente.get("/api/classes", headers=admin, params={
        "start_date": segunda.isoformat(), "end_date": segunda.isoformat(),
    }).json()[0]
    assert (aula["booked"], aula["waiting"]) == (2, 1)


def test_quem_desiste_da_o_lugar_a_quem_espera_ha_mais_tempo(
    cliente, admin, modalidades, criar_socio
):
    slot = criar_grelha(cliente, admin, modalidades, weekday=0, capacity=1).json()
    segunda = proxima(0, daqui_a_dias=3)   # longe, para poder desmarcar

    primeiro = criar_socio(nome="Primeiro", telefone="917000201")
    segundo = criar_socio(nome="Segundo", telefone="917000202")
    terceiro = criar_socio(nome="Terceiro", telefone="917000203")

    com_lugar = marcar(cliente, primeiro["id"], slot["id"], segunda).json()
    marcar(cliente, segundo["id"], slot["id"], segunda)
    marcar(cliente, terceiro["id"], slot["id"], segunda)

    cliente.delete(f"/api/mobile/bookings/{com_lugar['id']}")

    inscritos = cliente.get(
        f"/api/classes/{slot['id']}/{segunda.isoformat()}/bookings", headers=admin
    ).json()
    por_nome = {i["member_name"]: i["status"] for i in inscritos}
    assert por_nome["Segundo"] == "booked", "o que esperava ha mais tempo subiu"
    assert por_nome["Terceiro"] == "waiting"


def test_nao_se_desmarca_em_cima_da_hora(cliente, admin, modalidades, criar_socio, bd):
    """Duas horas antes: depois disso o lugar é seu, apareça ou não."""
    slot = criar_grelha(cliente, admin, modalidades, weekday=0).json()
    socio = criar_socio(telefone="917000005")
    segunda = proxima(0)
    inscricao = marcar(cliente, socio["id"], slot["id"], segunda).json()

    # A aula passa a ser daqui a meia hora
    daqui_a_pouco = datetime.now() + timedelta(minutes=30)
    bd.class_slots.update_one(
        {"id": slot["id"]},
        {"$set": {"weekday": date.today().weekday(),
                  "start_time": daqui_a_pouco.strftime("%H:%M")}},
    )
    bd.class_bookings.update_one(
        {"id": inscricao["id"]}, {"$set": {"class_date": dia_guardado(date.today())}}
    )

    r = cliente.delete(f"/api/mobile/bookings/{inscricao['id']}")
    assert r.status_code == 400
    assert "2 horas" in r.json()["detail"]


def test_nao_se_marca_uma_aula_que_ja_comecou(cliente, admin, modalidades, criar_socio, bd):
    slot = criar_grelha(cliente, admin, modalidades,
                        weekday=date.today().weekday(), start_time="00:01").json()
    socio = criar_socio(telefone="917000006")
    r = marcar(cliente, socio["id"], slot["id"], date.today())
    # A aula era a 00:01 de hoje: ja passou (a nao ser que seja mesmo a meia-noite)
    if datetime.now().time() > time(0, 2):
        assert r.status_code == 400


def test_a_aula_tem_de_ser_no_dia_da_semana_certo(cliente, admin, modalidades, criar_socio):
    slot = criar_grelha(cliente, admin, modalidades, weekday=0).json()
    socio = criar_socio(telefone="917000007")
    terca = proxima(1)
    assert marcar(cliente, socio["id"], slot["id"], terca).status_code == 400


# ---------------------------------------------- o que o socio ve na app

def test_a_app_diz_ao_socio_o_que_ele_tem_marcado(cliente, admin, modalidades, criar_socio):
    slot = criar_grelha(cliente, admin, modalidades, weekday=proxima(0).weekday()).json()
    socio = criar_socio(telefone="917000008")
    segunda = proxima(0)
    marcar(cliente, socio["id"], slot["id"], segunda)

    aulas = cliente.get("/api/mobile/classes",
                        params={"member_id": socio["id"], "dias": 14}).json()
    minha = next(a for a in aulas if a["class_date"] == segunda.isoformat())
    assert minha["my_status"] == "booked"
    assert minha["my_booking_id"]
    assert minha["activity_name"] == modalidades[0]["name"]


def test_a_app_nao_mostra_as_inscricoes_dos_outros(cliente, admin, modalidades, criar_socio):
    slot = criar_grelha(cliente, admin, modalidades, weekday=0).json()
    um = criar_socio(nome="Um", telefone="917000009")
    outro = criar_socio(nome="Outro", telefone="917000010")
    marcar(cliente, um["id"], slot["id"], proxima(0))

    aulas = cliente.get("/api/mobile/classes", params={"member_id": outro["id"], "dias": 14}).json()
    assert all(a["my_status"] is None for a in aulas)
    # Mas ve que ha um lugar ocupado
    assert any(a["booked"] == 1 for a in aulas)


# ------------------------------------------------- o check-in e as faltas

def test_o_check_in_risca_a_inscricao(cliente, admin, modalidades, criar_socio, bd):
    """Quem marcou e veio deixa de constar como faltoso."""
    agora = datetime.now()
    slot = criar_grelha(cliente, admin, modalidades,
                        weekday=date.today().weekday(),
                        start_time=agora.strftime("%H:%M")).json()
    socio = criar_socio(telefone="917000011")

    bd.class_bookings.insert_one({
        "id": "inscricao-de-teste", "slot_id": slot["id"],
        "class_date": dia_guardado(date.today()), "member_id": socio["id"],
        "member_name": socio["name"], "member_number": socio["member_number"],
        "status": "booked", "created_at": agora.isoformat(),
    })

    r = cliente.post("/api/attendance", headers=admin, json={
        "member_id": socio["id"], "activity_id": modalidades[0]["id"],
    })
    assert r.status_code == 200

    inscricao = bd.class_bookings.find_one({"id": "inscricao-de-teste"})
    assert inscricao["status"] == "attended"


def test_o_check_in_noutra_modalidade_nao_risca_a_aula(
    cliente, admin, modalidades, criar_socio, bd
):
    agora = datetime.now()
    slot = criar_grelha(cliente, admin, modalidades,
                        weekday=date.today().weekday(),
                        start_time=agora.strftime("%H:%M")).json()
    socio = criar_socio(telefone="917000012")
    bd.class_bookings.insert_one({
        "id": "outra-modalidade", "slot_id": slot["id"],
        "class_date": dia_guardado(date.today()), "member_id": socio["id"],
        "status": "booked", "created_at": agora.isoformat(),
    })

    cliente.post("/api/attendance", headers=admin, json={
        "member_id": socio["id"], "activity_id": modalidades[1]["id"],
    })
    assert bd.class_bookings.find_one({"id": "outra-modalidade"})["status"] == "booked"


def test_quem_marcou_e_nao_veio_fica_como_falta(cliente, admin, modalidades, criar_socio, bd):
    """A falta é calculada do relógio, não gravada por um trabalho nocturno."""
    slot = criar_grelha(cliente, admin, modalidades,
                        weekday=date.today().weekday(), start_time="00:01").json()
    socio = criar_socio(telefone="917000013")
    bd.class_bookings.insert_one({
        "id": "faltou", "slot_id": slot["id"],
        "class_date": dia_guardado(date.today()), "member_id": socio["id"],
        "status": "booked", "created_at": datetime.now().isoformat(),
    })

    aulas = cliente.get("/api/mobile/classes",
                        params={"member_id": socio["id"], "dias": 1}).json()
    minha = next(a for a in aulas if a["slot_id"] == slot["id"])
    if datetime.now().time() > time(1, 2):
        assert minha["my_status"] == "missed"


# ------------------------------------------------------------ permissoes

def test_so_o_administrador_mexe_na_grelha(cliente, colaborador, modalidades):
    """O horário é decisão do dono; o colaborador cancela uma aula pontual."""
    r = cliente.post("/api/class-slots", headers=colaborador, json={
        "activity_id": modalidades[0]["id"], "weekday": 0, "start_time": "19:00",
    })
    assert r.status_code == 403


def test_o_colaborador_cancela_uma_aula_pontual(cliente, admin, colaborador, modalidades):
    slot = criar_grelha(cliente, admin, modalidades, weekday=0).json()
    r = cliente.post(f"/api/class-slots/{slot['id']}/exceptions", headers=colaborador,
                     json={"class_date": proxima(0).isoformat(), "cancelled": True,
                           "note": "Professor doente"})
    assert r.status_code == 200


def test_apagar_a_aula_da_grelha_leva_as_inscricoes(cliente, admin, modalidades, criar_socio, bd):
    slot = criar_grelha(cliente, admin, modalidades, weekday=0).json()
    socio = criar_socio(telefone="917000014")
    marcar(cliente, socio["id"], slot["id"], proxima(0))

    cliente.delete(f"/api/class-slots/{slot['id']}", headers=admin)
    assert bd.class_bookings.count_documents({"slot_id": slot["id"]}) == 0


# ------------------------------------------------- o nivel ou a turma

def test_a_aula_pode_ter_nivel(cliente, admin, modalidades):
    """"Boxe Nivel I/II" e "Boxe Iniciados" sao a mesma modalidade."""
    r = criar_grelha(cliente, admin, modalidades, label="Nível I/II")
    assert r.status_code == 200
    assert r.json()["label"] == "Nível I/II"


def test_o_nivel_chega_ao_calendario(cliente, admin, modalidades):
    criar_grelha(cliente, admin, modalidades, weekday=0, label="Iniciados")
    segunda = proxima(0)
    aula = cliente.get("/api/classes", headers=admin, params={
        "start_date": segunda.isoformat(), "end_date": segunda.isoformat(),
    }).json()[0]
    assert aula["label"] == "Iniciados"
    assert aula["activity_name"] == modalidades[0]["name"]


def test_duas_turmas_da_mesma_modalidade_a_horas_diferentes(cliente, admin, modalidades):
    """O horario real tem Boxe tres vezes no mesmo dia, em niveis diferentes."""
    for hora, nivel in (("11:00", "Nível I/II/III"), ("19:30", "Nível I/II"),
                        ("20:45", "Nível II/III")):
        criar_grelha(cliente, admin, modalidades, weekday=0, start_time=hora, label=nivel)

    segunda = proxima(0)
    aulas = cliente.get("/api/classes", headers=admin, params={
        "start_date": segunda.isoformat(), "end_date": segunda.isoformat(),
    }).json()
    assert [a["label"] for a in aulas] == ["Nível I/II/III", "Nível I/II", "Nível II/III"]
    assert len({a["activity_id"] for a in aulas}) == 1, "e tudo a mesma modalidade"
