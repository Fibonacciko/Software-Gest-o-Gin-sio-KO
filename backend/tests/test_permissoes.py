"""O que cada perfil pode fazer. Um engano aqui expõe dados a quem não deve."""


def test_colaborador_entra_nas_financas(cliente, colaborador):
    assert cliente.get("/api/payments", headers=colaborador).status_code == 200
    assert cliente.get("/api/expenses", headers=colaborador).status_code == 200


def test_colaborador_regista_pagamentos_e_despesas(
    cliente, colaborador, criar_socio
):
    socio = criar_socio()

    r = cliente.post(
        "/api/payments",
        headers=colaborador,
        json={
            "member_id": socio["id"],
            "amount": 35,
            "payment_type": "quota",
            "payment_method": "cash",
        },
    )
    assert r.status_code == 200

    r = cliente.post(
        "/api/expenses",
        headers=colaborador,
        json={"description": "material", "amount": 10, "category": "products"},
    )
    assert r.status_code == 200


def test_colaborador_nao_gere_utilizadores(cliente, colaborador):
    assert cliente.get("/api/users", headers=colaborador).status_code == 403


def test_colaborador_nao_ve_relatorios_reservados(cliente, colaborador):
    """Análises e notas motivacionais são só do administrador."""
    assert cliente.get("/api/motivational-notes", headers=colaborador).status_code == 403


def test_sem_autenticacao_nao_se_entra(cliente):
    assert cliente.get("/api/members").status_code in (401, 403)
    assert cliente.get("/api/payments").status_code in (401, 403)
    assert cliente.get("/api/dashboard").status_code in (401, 403)


def test_credenciais_erradas_sao_recusadas(cliente):
    r = cliente.post(
        "/api/auth/login",
        json={"username": "fabio.guerreiro", "password": "errada"},
    )
    assert r.status_code == 401
