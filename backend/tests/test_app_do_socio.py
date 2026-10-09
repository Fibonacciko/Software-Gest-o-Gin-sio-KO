"""Parceiros, multimédia, montra e reservas — o conteúdo da aplicação do sócio.

O que o dono do ginásio carrega na gestão é o que o sócio vê no telemóvel.
Estes testes protegem as duas pontas.
"""
import io

import pytest


# ------------------------------------------------------------------ fotografias

def imagem_falsa(nome="foto.jpg"):
    # Um PNG mínimo serve: o servidor olha para a extensão e o tamanho
    return {"ficheiro": (nome, io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"0" * 200), "image/jpeg")}


def test_guardar_uma_imagem_devolve_o_endereco(cliente, admin):
    r = cliente.post("/api/uploads", headers=admin, files=imagem_falsa())
    assert r.status_code == 200, r.text
    assert r.json()["url"].startswith("/api/uploads/")
    assert r.json()["url"].endswith(".jpg")


def test_so_aceita_imagens(cliente, admin):
    r = cliente.post("/api/uploads", headers=admin,
                     files={"ficheiro": ("contas.pdf", io.BytesIO(b"nao e imagem"), "application/pdf")})
    assert r.status_code == 400


def test_um_ficheiro_vazio_e_recusado(cliente, admin):
    r = cliente.post("/api/uploads", headers=admin,
                     files={"ficheiro": ("foto.png", io.BytesIO(b""), "image/png")})
    assert r.status_code == 400


def test_so_quem_trabalha_no_ginasio_carrega_imagens(cliente):
    assert cliente.post("/api/uploads", files=imagem_falsa()).status_code in (401, 403)


def test_nao_se_sai_da_pasta_das_imagens(cliente, admin):
    """Um nome com caminho lá dentro não pode apagar ficheiros do servidor."""
    from pathlib import Path
    alvo = Path(__file__).resolve().parent.parent / "server.py"

    for nome in ["..%2F..%2Fserver.py", "..", "....//server.py"]:
        r = cliente.delete(f"/api/uploads/{nome}", headers=admin)
        assert r.status_code != 200, f"{nome} nao devia ser aceite"

    assert alvo.exists(), "o server.py tem de continuar lá"


def test_a_imagem_guardada_pode_ser_lida(cliente, admin):
    """O endereço devolvido tem de servir mesmo a imagem."""
    url = cliente.post("/api/uploads", headers=admin, files=imagem_falsa()).json()["url"]
    r = cliente.get(url)
    assert r.status_code == 200
    assert b"PNG" in r.content


# -------------------------------------------------------------------- parceiros

@pytest.fixture
def parceiro(cliente, admin):
    return cliente.post("/api/partners", headers=admin, json={
        "name": "Clínica do Bairro",
        "benefit": "10% em consultas de fisioterapia",
        "category": "Saúde",
        "phone": "212345678",
    }).json()


def test_criar_e_listar_parceiros(cliente, admin, parceiro):
    assert parceiro["name"] == "Clínica do Bairro"
    assert parceiro["is_active"] is True
    lista = cliente.get("/api/partners", headers=admin).json()
    assert [p["name"] for p in lista] == ["Clínica do Bairro"]


def test_corrigir_um_parceiro(cliente, admin, parceiro):
    r = cliente.put(f"/api/partners/{parceiro['id']}", headers=admin, json={
        "name": "Clínica do Bairro", "benefit": "15% em consultas", "category": "Saúde",
    })
    assert r.status_code == 200
    assert r.json()["benefit"] == "15% em consultas"
    assert r.json()["id"] == parceiro["id"]


def test_apagar_um_parceiro(cliente, admin, parceiro):
    assert cliente.delete(f"/api/partners/{parceiro['id']}", headers=admin).status_code == 200
    assert cliente.get("/api/partners", headers=admin).json() == []


def test_o_colaborador_nao_mexe_nos_parceiros(cliente, colaborador, parceiro):
    """São protocolos do ginásio: só o administrador os cria e apaga."""
    r = cliente.post("/api/partners", headers=colaborador,
                     json={"name": "Outro", "benefit": "Nada"})
    assert r.status_code == 403
    assert cliente.delete(f"/api/partners/{parceiro['id']}", headers=colaborador).status_code == 403


def test_a_app_so_ve_os_parceiros_activos(cliente, admin, parceiro):
    cliente.post("/api/partners", headers=admin, json={
        "name": "Parceiro Terminado", "benefit": "Já não vale", "is_active": False,
    })
    nomes = [p["name"] for p in cliente.get("/api/mobile/partners").json()]
    assert nomes == ["Clínica do Bairro"]


# ------------------------------------------------------------------ multimédia

def test_publicar_uma_fotografia(cliente, admin):
    r = cliente.post("/api/media", headers=admin, json={
        "kind": "photo", "url": "/api/uploads/abc.jpg", "caption": "Aula de Boxe",
    })
    assert r.status_code == 200, r.text
    assert r.json()["kind"] == "photo"


def test_publicar_um_video_por_link(cliente, admin):
    """Os vídeos não são alojados aqui: ficam nas redes do ginásio."""
    r = cliente.post("/api/media", headers=admin, json={
        "kind": "video_link", "url": "https://instagram.com/p/xyz", "caption": "Sparring",
    })
    assert r.status_code == 200
    assert r.json()["kind"] == "video_link"


def test_a_app_so_ve_a_multimedia_activa(cliente, admin):
    cliente.post("/api/media", headers=admin, json={"url": "/api/uploads/a.jpg", "caption": "A"})
    cliente.post("/api/media", headers=admin,
                 json={"url": "/api/uploads/b.jpg", "caption": "B", "is_active": False})
    legendas = [m["caption"] for m in cliente.get("/api/mobile/media").json()]
    assert legendas == ["A"]


def test_o_colaborador_pode_publicar_fotografias(cliente, colaborador):
    """Quem está no ginásio é quem tira as fotos."""
    r = cliente.post("/api/media", headers=colaborador,
                     json={"url": "/api/uploads/treino.jpg"})
    assert r.status_code == 200


# ----------------------------------------------------------------------- montra

@pytest.fixture
def artigo_com_foto(cliente, admin):
    return cliente.post("/api/inventory", headers=admin, json={
        "name": "Luvas de Boxe", "category": "equipment", "size": "12oz",
        "color": "Preto", "quantity": 5, "price": 65.0,
        "photo_url": "/api/uploads/luvas.jpg",
    }).json()


def test_a_montra_so_mostra_o_que_tem_foto(cliente, admin, artigo_com_foto):
    cliente.post("/api/inventory", headers=admin, json={
        "name": "Sem Fotografia", "category": "clothing", "quantity": 3, "price": 10.0,
    })
    nomes = [a["name"] for a in cliente.get("/api/mobile/shop").json()]
    assert nomes == ["Luvas de Boxe"]


def test_a_montra_so_mostra_o_que_tem_stock(cliente, admin):
    cliente.post("/api/inventory", headers=admin, json={
        "name": "Esgotado", "category": "clothing", "quantity": 0, "price": 10.0,
        "photo_url": "/api/uploads/x.jpg",
    })
    assert cliente.get("/api/mobile/shop").json() == []


def test_a_fotografia_fica_guardada_no_artigo(cliente, admin, artigo_com_foto):
    assert artigo_com_foto["photo_url"] == "/api/uploads/luvas.jpg"


# ---------------------------------------------------------------------- reservas

def test_reservar_pela_app(cliente, admin, criar_socio, artigo_com_foto):
    socio = criar_socio(telefone="913000001")
    r = cliente.post("/api/mobile/reservations", json={
        "item_id": artigo_com_foto["id"], "member_id": socio["id"], "quantity": 2,
    })
    assert r.status_code == 200, r.text
    reserva = r.json()
    assert reserva["status"] == "pending"
    assert reserva["item_name"] == "Luvas de Boxe"
    assert reserva["item_details"] == "12oz - Preto"   # o balcao sabe qual preparar
    assert reserva["member_number"] == socio["member_number"]


def test_a_reserva_nao_mexe_no_stock(cliente, admin, criar_socio, artigo_com_foto):
    """Reservar não é vender: o stock só desce quando o sócio levanta."""
    socio = criar_socio(telefone="913000002")
    cliente.post("/api/mobile/reservations", json={
        "item_id": artigo_com_foto["id"], "member_id": socio["id"], "quantity": 2,
    })
    artigos = cliente.get("/api/inventory", headers=admin).json()
    assert artigos[0]["quantity"] == 5


def test_nao_se_reserva_mais_do_que_existe(cliente, criar_socio, artigo_com_foto):
    socio = criar_socio(telefone="913000003")
    r = cliente.post("/api/mobile/reservations", json={
        "item_id": artigo_com_foto["id"], "member_id": socio["id"], "quantity": 99,
    })
    assert r.status_code == 400


def test_nao_se_reserva_para_um_socio_que_nao_existe(cliente, artigo_com_foto):
    r = cliente.post("/api/mobile/reservations", json={
        "item_id": artigo_com_foto["id"], "member_id": "nao-existe", "quantity": 1,
    })
    assert r.status_code == 404


def test_o_ginasio_ve_as_reservas_e_muda_o_estado(cliente, admin, criar_socio, artigo_com_foto):
    socio = criar_socio(telefone="913000004")
    reserva = cliente.post("/api/mobile/reservations", json={
        "item_id": artigo_com_foto["id"], "member_id": socio["id"],
    }).json()

    pendentes = cliente.get("/api/reservations", headers=admin, params={"status": "pending"})
    assert len(pendentes.json()) == 1

    r = cliente.put(f"/api/reservations/{reserva['id']}", headers=admin, params={"status": "ready"})
    assert r.status_code == 200
    assert r.json()["status"] == "ready"
    assert cliente.get("/api/reservations", headers=admin, params={"status": "pending"}).json() == []


def test_o_socio_ve_as_suas_reservas(cliente, criar_socio, artigo_com_foto):
    socio = criar_socio(telefone="913000005")
    outro = criar_socio(nome="Outro Sócio", telefone="913000006")
    cliente.post("/api/mobile/reservations",
                 json={"item_id": artigo_com_foto["id"], "member_id": socio["id"]})
    cliente.post("/api/mobile/reservations",
                 json={"item_id": artigo_com_foto["id"], "member_id": outro["id"]})

    minhas = cliente.get(f"/api/mobile/reservations/{socio['id']}").json()
    assert len(minhas) == 1
    assert minhas[0]["member_id"] == socio["id"]


def test_o_colaborador_trata_das_reservas(cliente, admin, colaborador, criar_socio, artigo_com_foto):
    """É quem está ao balcão a preparar o artigo."""
    socio = criar_socio(telefone="913000007")
    reserva = cliente.post("/api/mobile/reservations", json={
        "item_id": artigo_com_foto["id"], "member_id": socio["id"],
    }).json()
    r = cliente.put(f"/api/reservations/{reserva['id']}", headers=colaborador,
                    params={"status": "ready"})
    assert r.status_code == 200


# ------------------------------------------------------------ ficha do ginásio

def test_a_ficha_do_ginasio_comeca_com_valores_de_omissao(cliente, admin):
    r = cliente.get("/api/gym-info", headers=admin)
    assert r.status_code == 200
    assert r.json()["name"] == "Ginásio KO"
    assert r.json()["address"] is None


def test_guardar_a_ficha_do_ginasio(cliente, admin):
    r = cliente.put("/api/gym-info", headers=admin, json={
        "address": "Rua do Ginásio 1, Almada",
        "phone": "212345678",
        "hours": "Seg a Sex 7h-22h · Sáb 9h-13h",
        "maps_url": "https://maps.google.com/?q=ginasio",
        "review_url": "https://g.page/r/avaliar",
    })
    assert r.status_code == 200, r.text
    assert r.json()["address"] == "Rua do Ginásio 1, Almada"
    assert r.json()["name"] == "Ginásio KO"   # o que não se mexeu fica


def test_guardar_so_um_campo_nao_apaga_os_outros(cliente, admin):
    cliente.put("/api/gym-info", headers=admin, json={"phone": "212345678"})
    cliente.put("/api/gym-info", headers=admin, json={"email": "geral@ko.pt"})

    ficha = cliente.get("/api/gym-info", headers=admin).json()
    assert ficha["phone"] == "212345678"
    assert ficha["email"] == "geral@ko.pt"


def test_a_app_le_a_ficha_sem_sessao(cliente, admin):
    cliente.put("/api/gym-info", headers=admin, json={"address": "Rua do Ginásio 1"})
    r = cliente.get("/api/mobile/gym-info")
    assert r.status_code == 200
    assert r.json()["address"] == "Rua do Ginásio 1"


def test_o_colaborador_ve_mas_nao_altera_a_ficha(cliente, colaborador):
    assert cliente.get("/api/gym-info", headers=colaborador).status_code == 200
    r = cliente.put("/api/gym-info", headers=colaborador, json={"phone": "999"})
    assert r.status_code == 403
