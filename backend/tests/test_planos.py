"""Planos de treino e alimentares, como documento.

O professor ou o nutricionista carrega um PDF ou escreve o texto; o sócio
lê-o no telemóvel. Um plano novo **não apaga o anterior**: é o histórico que
permite dizer ao sócio o que mudou desde a última vez.
"""
import io
from datetime import date, timedelta


def _plano(cliente, admin, socio_id, **campos):
    corpo = {"kind": "training", "title": "Plano de treino", "content": "3x por semana"}
    corpo.update(campos)
    return cliente.post(f"/api/members/{socio_id}/plans", headers=admin, json=corpo)


def test_guardar_um_plano_escrito(cliente, admin, criar_socio):
    socio = criar_socio(telefone="915000001")
    r = _plano(cliente, admin, socio["id"], content="Segunda: peito. Quarta: costas.")
    assert r.status_code == 200, r.text
    assert r.json()["kind"] == "training"
    assert r.json()["plan_date"] == date.today().isoformat()


def test_guardar_um_plano_em_pdf(cliente, admin, criar_socio):
    socio = criar_socio(telefone="915000002")
    envio = cliente.post(
        "/api/uploads", headers=admin,
        files={"ficheiro": ("plano.pdf", io.BytesIO(b"%PDF-1.4"), "application/pdf")},
    ).json()
    assert envio["kind"] == "document"

    r = _plano(cliente, admin, socio["id"], content=None, file_url=envio["url"])
    assert r.status_code == 200
    assert r.json()["file_url"] == envio["url"]


def test_um_plano_sem_ficheiro_nem_texto_nao_serve(cliente, admin, criar_socio):
    """Um plano vazio não é um plano: o sócio abria e não encontrava nada."""
    socio = criar_socio(telefone="915000003")
    r = _plano(cliente, admin, socio["id"], content=None, file_url=None)
    assert r.status_code == 400

    r = _plano(cliente, admin, socio["id"], content="   ", file_url=None)
    assert r.status_code == 400


def test_um_plano_novo_nao_apaga_o_anterior(cliente, admin, criar_socio):
    socio = criar_socio(telefone="915000004")
    hoje = date.today()
    _plano(cliente, admin, socio["id"], title="Plano de janeiro",
           plan_date=(hoje - timedelta(days=90)).isoformat())
    _plano(cliente, admin, socio["id"], title="Plano de abril",
           plan_date=hoje.isoformat())

    planos = cliente.get(f"/api/members/{socio['id']}/plans", headers=admin).json()
    assert [p["title"] for p in planos] == ["Plano de abril", "Plano de janeiro"]


def test_os_dois_tipos_convivem(cliente, admin, criar_socio):
    socio = criar_socio(telefone="915000005")
    _plano(cliente, admin, socio["id"], kind="training", title="Treino")
    _plano(cliente, admin, socio["id"], kind="nutrition", title="Alimentação")

    planos = cliente.get(f"/api/mobile/plans/{socio['id']}").json()
    assert sorted(p["kind"] for p in planos) == ["nutrition", "training"]


def test_os_planos_sao_de_cada_socio(cliente, admin, criar_socio):
    um = criar_socio(nome="Um", telefone="915000006")
    outro = criar_socio(nome="Outro", telefone="915000007")
    _plano(cliente, admin, um["id"])

    assert len(cliente.get(f"/api/mobile/plans/{um['id']}").json()) == 1
    assert cliente.get(f"/api/mobile/plans/{outro['id']}").json() == []


def test_apagar_um_plano(cliente, admin, criar_socio):
    socio = criar_socio(telefone="915000008")
    p = _plano(cliente, admin, socio["id"]).json()
    assert cliente.delete(f"/api/plans/{p['id']}", headers=admin).status_code == 200
    assert cliente.get(f"/api/mobile/plans/{socio['id']}").json() == []


def test_apagar_um_plano_apaga_o_pdf_que_mais_ninguem_usa(cliente, admin, criar_socio):
    import os
    from pathlib import Path

    socio = criar_socio(telefone="915000009")
    envio = cliente.post(
        "/api/uploads", headers=admin,
        files={"ficheiro": ("plano.pdf", io.BytesIO(b"%PDF-1.4"), "application/pdf")},
    ).json()
    p = _plano(cliente, admin, socio["id"], content=None, file_url=envio["url"]).json()

    pasta = Path(os.environ["UPLOADS_DIR"])
    ficheiro = pasta / envio["url"].rsplit("/", 1)[-1]
    assert ficheiro.exists()

    cliente.delete(f"/api/plans/{p['id']}", headers=admin)
    assert not ficheiro.exists()


def test_o_mesmo_pdf_em_dois_planos_so_se_apaga_no_fim(cliente, admin, criar_socio):
    """Dar o mesmo plano a dois sócios não pode deixar um deles sem nada."""
    import os
    from pathlib import Path

    um = criar_socio(nome="Um", telefone="915000010")
    outro = criar_socio(nome="Outro", telefone="915000011")
    envio = cliente.post(
        "/api/uploads", headers=admin,
        files={"ficheiro": ("plano.pdf", io.BytesIO(b"%PDF-1.4"), "application/pdf")},
    ).json()
    a = _plano(cliente, admin, um["id"], content=None, file_url=envio["url"]).json()
    _plano(cliente, admin, outro["id"], content=None, file_url=envio["url"])

    ficheiro = Path(os.environ["UPLOADS_DIR"]) / envio["url"].rsplit("/", 1)[-1]
    cliente.delete(f"/api/plans/{a['id']}", headers=admin)
    assert ficheiro.exists(), "o outro sócio ainda usa este ficheiro"


# ------------------------------------------------- pedidos de plano novo

def test_o_socio_pede_um_plano_novo(cliente, admin, criar_socio):
    socio = criar_socio(nome="Ana Pede", telefone="915000012")
    r = cliente.post("/api/mobile/plan-requests",
                     json={"member_id": socio["id"], "kind": "training"})
    assert r.status_code == 200, r.text
    assert r.json()["member_name"] == "Ana Pede"
    assert r.json()["done"] is False

    pedidos = cliente.get("/api/plan-requests", headers=admin).json()
    assert len(pedidos) == 1


def test_carregar_duas_vezes_no_botao_nao_faz_dois_pedidos(cliente, admin, criar_socio):
    """Senão o Painel enchia-se de pedidos iguais."""
    socio = criar_socio(telefone="915000013")
    corpo = {"member_id": socio["id"], "kind": "training"}
    um = cliente.post("/api/mobile/plan-requests", json=corpo).json()
    outro = cliente.post("/api/mobile/plan-requests", json=corpo).json()
    assert um["id"] == outro["id"]
    assert len(cliente.get("/api/plan-requests", headers=admin).json()) == 1


def test_pedir_treino_e_nutricao_sao_dois_pedidos(cliente, admin, criar_socio):
    socio = criar_socio(telefone="915000014")
    cliente.post("/api/mobile/plan-requests", json={"member_id": socio["id"], "kind": "training"})
    cliente.post("/api/mobile/plan-requests", json={"member_id": socio["id"], "kind": "nutrition"})
    assert len(cliente.get("/api/plan-requests", headers=admin).json()) == 2


def test_guardar_o_plano_fecha_o_pedido(cliente, admin, criar_socio):
    """Quem já recebeu o plano deixa de estar à espera, sem ninguém se lembrar."""
    socio = criar_socio(telefone="915000015")
    cliente.post("/api/mobile/plan-requests", json={"member_id": socio["id"], "kind": "training"})
    assert len(cliente.get("/api/plan-requests", headers=admin).json()) == 1

    _plano(cliente, admin, socio["id"], kind="training")
    assert cliente.get("/api/plan-requests", headers=admin).json() == []


def test_um_plano_de_treino_nao_fecha_o_pedido_de_nutricao(cliente, admin, criar_socio):
    socio = criar_socio(telefone="915000016")
    cliente.post("/api/mobile/plan-requests", json={"member_id": socio["id"], "kind": "nutrition"})
    _plano(cliente, admin, socio["id"], kind="training")

    pedidos = cliente.get("/api/plan-requests", headers=admin).json()
    assert [p["kind"] for p in pedidos] == ["nutrition"]


def test_marcar_o_pedido_como_tratado(cliente, admin, criar_socio):
    socio = criar_socio(telefone="915000017")
    pedido = cliente.post("/api/mobile/plan-requests",
                          json={"member_id": socio["id"], "kind": "training"}).json()

    r = cliente.put(f"/api/plan-requests/{pedido['id']}/done", headers=admin)
    assert r.status_code == 200
    assert r.json()["done"] is True
    assert cliente.get("/api/plan-requests", headers=admin).json() == []


def test_nao_se_pede_plano_para_um_socio_que_nao_existe(cliente):
    r = cliente.post("/api/mobile/plan-requests",
                     json={"member_id": "nao-existe", "kind": "training"})
    assert r.status_code == 404


def test_o_colaborador_tambem_carrega_planos(cliente, colaborador, criar_socio):
    socio = criar_socio(telefone="915000018")
    r = cliente.post(
        f"/api/members/{socio['id']}/plans",
        headers=colaborador,
        json={"kind": "nutrition", "title": "Plano alimentar", "content": "Sopa ao jantar"},
    )
    assert r.status_code == 200
