"""As modalidades do ginásio: criar, corrigir, desligar e voltar a ligar.

São o que distingue os sócios uns dos outros — entram no check-in, nas
presenças, nas aulas e nas contas. Até agora o servidor tinha as rotas mas
não havia nenhum ecrã que lhes chamasse, e os nomes eram postos à mão por
fora do software.
"""


def test_o_administrador_cria_uma_modalidade(cliente, admin):
    r = cliente.post("/api/activities", headers=admin, json={
        "name": "Muay Thai", "color": "#dc2626", "description": "Boxe tailandês",
    })
    assert r.status_code == 200, r.text
    assert r.json()["name"] == "Muay Thai"
    assert r.json()["is_active"] is True

    nomes = [a["name"] for a in cliente.get("/api/activities", headers=admin).json()]
    assert "Muay Thai" in nomes


def test_o_colaborador_nao_cria_modalidades(cliente, colaborador):
    """É o horário do ginásio: só o dono mexe nele."""
    r = cliente.post("/api/activities", headers=colaborador, json={
        "name": "Muay Thai", "color": "#dc2626",
    })
    assert r.status_code == 403


def test_o_colaborador_ve_as_modalidades(cliente, colaborador):
    """Precisa delas para o check-in, que é o trabalho dele."""
    assert cliente.get("/api/activities", headers=colaborador).status_code == 200


def test_corrigir_uma_modalidade_nao_lhe_muda_o_estado(cliente, admin):
    """Corrigir o nome não pode ressuscitar uma modalidade desligada."""
    criada = cliente.post("/api/activities", headers=admin, json={
        "name": "Com erro", "color": "#111111",
    }).json()
    cliente.delete(f"/api/activities/{criada['id']}", headers=admin)

    r = cliente.put(f"/api/activities/{criada['id']}", headers=admin, json={
        "name": "Sem erro", "color": "#222222",
    })
    assert r.status_code == 200
    assert r.json()["name"] == "Sem erro"
    assert r.json()["is_active"] is False


# ------------------------------------------------- desligar e voltar a ligar

def test_desligar_tira_da_lista_mas_nao_apaga(cliente, admin):
    criada = cliente.post("/api/activities", headers=admin, json={
        "name": "Temporária", "color": "#333333",
    }).json()

    assert cliente.delete(f"/api/activities/{criada['id']}", headers=admin).status_code == 200

    normais = [a["id"] for a in cliente.get("/api/activities", headers=admin).json()]
    assert criada["id"] not in normais

    # Continua lá, para quem a pedir de propósito
    todas = cliente.get("/api/activities?incluir_desligadas=true", headers=admin).json()
    desligada = next(a for a in todas if a["id"] == criada["id"])
    assert desligada["is_active"] is False
    assert desligada["name"] == "Temporária"


def test_voltar_a_ligar_uma_modalidade(cliente, admin):
    """Desligar não apaga nada, por isso tem de haver caminho de volta."""
    criada = cliente.post("/api/activities", headers=admin, json={
        "name": "De volta", "color": "#444444",
    }).json()
    cliente.delete(f"/api/activities/{criada['id']}", headers=admin)

    r = cliente.post(f"/api/activities/{criada['id']}/ligar", headers=admin)
    assert r.status_code == 200
    assert r.json()["is_active"] is True

    nomes = [a["name"] for a in cliente.get("/api/activities", headers=admin).json()]
    assert "De volta" in nomes


def test_o_colaborador_nao_desliga_nem_liga(cliente, admin, colaborador):
    criada = cliente.post("/api/activities", headers=admin, json={
        "name": "Protegida", "color": "#555555",
    }).json()

    assert cliente.delete(f"/api/activities/{criada['id']}", headers=colaborador).status_code == 403
    assert cliente.post(f"/api/activities/{criada['id']}/ligar", headers=colaborador).status_code == 403


# ------------------------------------------------------------------- o uso

def test_o_uso_conta_quem_fica_preso_a_modalidade(cliente, admin, criar_socio):
    """Desligar às cegas deixava presenças com um nome que já não existe."""
    modalidade = cliente.post("/api/activities", headers=admin, json={
        "name": "Em uso", "color": "#666666",
    }).json()

    socio = criar_socio(telefone="913800001", activity_ids=[modalidade["id"]])
    cliente.post("/api/attendance", headers=admin, json={
        "member_id": socio["id"], "activity_id": modalidade["id"], "method": "manual",
    })

    uso = cliente.get(f"/api/activities/{modalidade['id']}/uso", headers=admin).json()
    assert uso["membros"] == 1
    assert uso["presencas"] == 1
    assert uso["aulas"] == 0


def test_uma_modalidade_que_ninguem_usa_conta_zero(cliente, admin):
    modalidade = cliente.post("/api/activities", headers=admin, json={
        "name": "Sem ninguém", "color": "#777777",
    }).json()

    uso = cliente.get(f"/api/activities/{modalidade['id']}/uso", headers=admin).json()
    assert uso == {"membros": 0, "presencas": 0, "aulas": 0}


def test_o_uso_de_uma_modalidade_que_nao_existe_da_404(cliente, admin):
    assert cliente.get("/api/activities/nao-existe/uso", headers=admin).status_code == 404


def test_o_colaborador_nao_ve_o_uso(cliente, admin, colaborador):
    """Quem não pode desligar não precisa de saber quem fica preso."""
    modalidade = cliente.post("/api/activities", headers=admin, json={
        "name": "Reservada", "color": "#888888",
    }).json()
    assert cliente.get(f"/api/activities/{modalidade['id']}/uso", headers=colaborador).status_code == 403
