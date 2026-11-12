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


def test_o_pdf_de_um_plano_e_aceite(cliente, admin):
    """O PDF entrou com os planos de treino e alimentares."""
    r = cliente.post("/api/uploads", headers=admin,
                     files={"ficheiro": ("plano.pdf", io.BytesIO(b"%PDF-1.4"), "application/pdf")})
    assert r.status_code == 200
    assert r.json()["kind"] == "document"


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


# ------------------------------------------------- a ordem em que aparecem
# O rolo da página inicial da aplicação mostra **um** parceiro. Qual deles é
# escolhe-se aqui; antes era o primeiro por ordem alfabética e a única maneira
# de mudar era mudar-lhe o nome.

@pytest.fixture
def tres_parceiros(cliente, admin):
    nomes = ["Clínica Alfa", "Ginásio Beta", "Restaurante Gama"]
    return [
        cliente.post("/api/partners", headers=admin,
                     json={"name": n, "benefit": "vantagem"}).json()
        for n in nomes
    ]


def test_sem_ninguem_mexer_a_ordem_e_a_de_criacao(cliente, admin, tres_parceiros):
    nomes = [p["name"] for p in cliente.get("/api/partners", headers=admin).json()]
    assert nomes == ["Clínica Alfa", "Ginásio Beta", "Restaurante Gama"]


def test_arrastar_um_parceiro_para_o_inicio(cliente, admin, tres_parceiros):
    ids = [tres_parceiros[2]["id"], tres_parceiros[0]["id"], tres_parceiros[1]["id"]]
    r = cliente.post("/api/partners/ordem", headers=admin, json={"ids": ids})
    assert r.status_code == 200
    assert r.json()["ordenados"] == 3

    nomes = [p["name"] for p in cliente.get("/api/partners", headers=admin).json()]
    assert nomes == ["Restaurante Gama", "Clínica Alfa", "Ginásio Beta"]


def test_a_app_ve_a_mesma_ordem_que_a_gestao(cliente, admin, tres_parceiros):
    """Escolher o primeiro aqui tem de mudar o que o sócio vê no telemóvel."""
    ids = [tres_parceiros[1]["id"], tres_parceiros[2]["id"], tres_parceiros[0]["id"]]
    cliente.post("/api/partners/ordem", headers=admin, json={"ids": ids})
    nomes = [p["name"] for p in cliente.get("/api/mobile/partners").json()]
    assert nomes == ["Ginásio Beta", "Restaurante Gama", "Clínica Alfa"]


def test_corrigir_um_parceiro_nao_lhe_mexe_no_lugar(cliente, admin, tres_parceiros):
    """O PUT substitui a ficha toda. Sem cuidado, mudar o telefone do terceiro
    punha-o em primeiro, e o sócio passava a ver outro parceiro na abertura."""
    ids = [p["id"] for p in reversed(tres_parceiros)]
    cliente.post("/api/partners/ordem", headers=admin, json={"ids": ids})

    alvo = tres_parceiros[0]          # ficou em último
    cliente.put(f"/api/partners/{alvo['id']}", headers=admin, json={
        "name": alvo["name"], "benefit": "vantagem", "phone": "212345678",
    })
    nomes = [p["name"] for p in cliente.get("/api/partners", headers=admin).json()]
    assert nomes == ["Restaurante Gama", "Ginásio Beta", "Clínica Alfa"]


def test_um_parceiro_novo_vai_para_o_fim(cliente, admin, tres_parceiros):
    """Entrar no meio mudava de lugar aos que já estavam."""
    cliente.post("/api/partners", headers=admin,
                 json={"name": "Agora Mesmo", "benefit": "vantagem"})
    nomes = [p["name"] for p in cliente.get("/api/partners", headers=admin).json()]
    assert nomes[-1] == "Agora Mesmo"
    assert nomes[0] == "Clínica Alfa"


def test_o_colaborador_nao_muda_a_ordem(cliente, colaborador, tres_parceiros):
    ids = [p["id"] for p in tres_parceiros]
    r = cliente.post("/api/partners/ordem", headers=colaborador, json={"ids": ids})
    assert r.status_code == 403


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


# ------------------------------------ a montra junta os tamanhos, nao as cores

def _capacete(cliente, admin, tamanho, cor, quantidade, foto=None):
    return cliente.post("/api/inventory", headers=admin, json={
        "name": "Capacete de Boxe", "category": "equipment",
        "size": tamanho, "color": cor, "quantity": quantidade, "price": 40.0,
        "photo_url": foto,
    }).json()


def test_a_montra_mostra_um_artigo_por_cor_e_nao_por_tamanho(cliente, admin):
    """Nove linhas de capacete no Stock davam nove cartoes iguais na montra."""
    for cor in ("Preto", "Branco"):
        for tamanho, quantos in (("S", 2), ("M", 5), ("L", 1)):
            _capacete(cliente, admin, tamanho, cor, quantos, "/api/uploads/cap.jpg")

    montra = cliente.get("/api/mobile/shop").json()
    assert len(montra) == 2
    assert sorted(a["color"] for a in montra) == ["Branco", "Preto"]
    assert all(a["name"] == "Capacete de Boxe" for a in montra)


def test_os_tamanhos_vao_dentro_do_artigo_para_a_app_perguntar(cliente, admin):
    for tamanho, quantos in (("L", 1), ("S", 2), ("M", 5)):
        _capacete(cliente, admin, tamanho, "Preto", quantos, "/api/uploads/cap.jpg")

    artigo = cliente.get("/api/mobile/shop").json()[0]
    # Por ordem de vestuario, nao alfabetica
    assert [t["size"] for t in artigo["sizes"]] == ["S", "M", "L"]
    assert [t["quantity"] for t in artigo["sizes"]] == [2, 5, 1]
    # Cada tamanho leva o id do artigo mesmo, para a reserva dar baixa no certo
    assert all(t["item_id"] for t in artigo["sizes"])


def test_um_tamanho_esgotado_nao_aparece_para_reserva(cliente, admin):
    _capacete(cliente, admin, "S", "Preto", 0, "/api/uploads/cap.jpg")
    _capacete(cliente, admin, "M", "Preto", 4, "/api/uploads/cap.jpg")

    artigo = cliente.get("/api/mobile/shop").json()[0]
    assert [t["size"] for t in artigo["sizes"]] == ["M"]


def test_basta_um_tamanho_ter_fotografia_para_o_artigo_aparecer(cliente, admin):
    """A fotografia e do produto, nao do tamanho."""
    _capacete(cliente, admin, "S", "Preto", 2, None)
    _capacete(cliente, admin, "M", "Preto", 4, "/api/uploads/cap.jpg")

    montra = cliente.get("/api/mobile/shop").json()
    assert len(montra) == 1
    assert montra[0]["photo_url"] == "/api/uploads/cap.jpg"
    assert len(montra[0]["sizes"]) == 2


def test_o_nome_com_espaco_a_mais_e_o_mesmo_artigo(cliente, admin):
    """Ha "T-Shirt" e "T-Shirt " na base de dados; para o socio e um so."""
    for nome in ("T-Shirt", "T-Shirt "):
        cliente.post("/api/inventory", headers=admin, json={
            "name": nome, "category": "clothing", "size": "M", "color": "Preto",
            "quantity": 3, "price": 15.0, "photo_url": "/api/uploads/t.jpg",
        })

    montra = cliente.get("/api/mobile/shop").json()
    assert len(montra) == 1
    assert montra[0]["name"] == "T-Shirt"


# ------------------------------------------- a montra roda um lugar por dia

def _artigo_da_montra(cliente, admin, nome):
    return cliente.post("/api/inventory", headers=admin, json={
        "name": nome, "category": "clothing", "size": "M", "color": "Preto",
        "quantity": 3, "price": 15.0, "photo_url": "/api/uploads/x.jpg",
    }).json()


def test_a_montra_roda_um_lugar_por_dia(cliente, admin):
    """O ecra de entrada mostra os dois primeiros: nao podem ser sempre os mesmos."""
    from server import rotacao_do_dia

    nomes = ["Artigo A", "Artigo B", "Artigo C", "Artigo D", "Artigo E"]
    for nome in nomes:
        _artigo_da_montra(cliente, admin, nome)

    inicio = rotacao_do_dia(len(nomes))
    esperado = nomes[inicio:] + nomes[:inicio]
    assert [a["name"] for a in cliente.get("/api/mobile/shop").json()] == esperado


def test_rodar_nao_perde_nem_repete_artigos(cliente, admin):
    nomes = ["Artigo A", "Artigo B", "Artigo C", "Artigo D", "Artigo E"]
    for nome in nomes:
        _artigo_da_montra(cliente, admin, nome)

    montra = cliente.get("/api/mobile/shop").json()
    assert sorted(a["name"] for a in montra) == nomes


def test_a_ordem_da_montra_nao_muda_entre_pedidos_do_mesmo_dia(cliente, admin):
    """Baralhar a cada pedido dava uma montra a mexer-se debaixo do dedo."""
    for nome in ("Artigo A", "Artigo B", "Artigo C", "Artigo D"):
        _artigo_da_montra(cliente, admin, nome)

    primeira = [a["name"] for a in cliente.get("/api/mobile/shop").json()]
    segunda = [a["name"] for a in cliente.get("/api/mobile/shop").json()]
    assert primeira == segunda


def test_a_rotacao_de_cada_dia_e_diferente():
    """Dias seguidos comecam em artigos seguidos, e ao fim da volta recomeca."""
    from server import rotacao_do_dia

    assert rotacao_do_dia(0) == 0      # montra vazia: nao ha nada que rode
    assert rotacao_do_dia(1) == 0      # um so artigo: rodar nao muda nada
    assert 0 <= rotacao_do_dia(5) < 5


def test_reservar_continua_a_ser_de_um_tamanho_certo(cliente, admin, criar_socio):
    """A montra junta, a reserva nao: o balcao tem de saber qual preparar."""
    _capacete(cliente, admin, "S", "Preto", 2, "/api/uploads/cap.jpg")
    _capacete(cliente, admin, "M", "Preto", 4, "/api/uploads/cap.jpg")
    socio = criar_socio(telefone="913700001")

    artigo = cliente.get("/api/mobile/shop").json()[0]
    medio = next(t for t in artigo["sizes"] if t["size"] == "M")

    r = cliente.post("/api/mobile/reservations", json={
        "item_id": medio["item_id"], "member_id": socio["id"], "quantity": 1,
    })
    assert r.status_code == 200, r.text
    assert r.json()["item_details"] == "M - Preto"


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


# ------------------------------------------- a fotografia do sócio, pela app

def test_o_socio_carrega_a_sua_fotografia(cliente, admin, criar_socio):
    socio = criar_socio(telefone="913500001")
    r = cliente.post(f"/api/mobile/members/{socio['id']}/photo", files=imagem_falsa("eu.jpg"))
    assert r.status_code == 200, r.text
    assert r.json()["photo_url"].startswith("/api/uploads/")

    # Fica na ficha do sócio, que é a mesma que a gestão mostra
    ficha = cliente.get(f"/api/members/{socio['id']}", headers=admin).json()
    assert ficha["photo_url"] == r.json()["photo_url"]


def test_a_fotografia_aparece_no_cartao_da_app(cliente, criar_socio):
    socio = criar_socio(telefone="913500002")
    url = cliente.post(
        f"/api/mobile/members/{socio['id']}/photo", files=imagem_falsa()
    ).json()["photo_url"]

    cartao = cliente.get("/api/mobile/profile", params={"member_id": socio["id"]}).json()
    assert cartao["photo_url"] == url


def test_trocar_a_fotografia_apaga_a_anterior(cliente, criar_socio):
    """Senão o disco enchia-se de fotografias que ninguém vê."""
    from pathlib import Path
    import os

    socio = criar_socio(telefone="913500003")
    primeira = cliente.post(
        f"/api/mobile/members/{socio['id']}/photo", files=imagem_falsa("a.jpg")
    ).json()["photo_url"]

    pasta = Path(os.environ["UPLOADS_DIR"])
    assert (pasta / primeira.rsplit("/", 1)[-1]).exists()

    segunda = cliente.post(
        f"/api/mobile/members/{socio['id']}/photo", files=imagem_falsa("b.jpg")
    ).json()["photo_url"]

    assert not (pasta / primeira.rsplit("/", 1)[-1]).exists()
    assert (pasta / segunda.rsplit("/", 1)[-1]).exists()


def test_tirar_a_fotografia_volta_ao_logotipo(cliente, admin, criar_socio):
    socio = criar_socio(telefone="913500004")
    cliente.post(f"/api/mobile/members/{socio['id']}/photo", files=imagem_falsa())

    r = cliente.delete(f"/api/mobile/members/{socio['id']}/photo")
    assert r.status_code == 200

    ficha = cliente.get(f"/api/members/{socio['id']}", headers=admin).json()
    assert ficha["photo_url"] is None


def test_a_fotografia_so_aceita_imagens(cliente, criar_socio):
    socio = criar_socio(telefone="913500005")
    r = cliente.post(
        f"/api/mobile/members/{socio['id']}/photo",
        files={"ficheiro": ("video.mp4", io.BytesIO(b"nao e imagem"), "video/mp4")},
    )
    assert r.status_code == 400


def test_nao_se_poe_fotografia_num_socio_que_nao_existe(cliente):
    r = cliente.post("/api/mobile/members/nao-existe/photo", files=imagem_falsa())
    assert r.status_code == 404



# ----------------------------------- a galeria do artigo: varias fotos e videos

def test_um_artigo_pode_ter_varias_fotografias_e_um_video(cliente, admin):
    cliente.post("/api/inventory", headers=admin, json={
        "name": "Luvas", "category": "equipment", "color": "Preto",
        "quantity": 4, "price": 65.0,
        "photo_url": "/api/uploads/1.jpg",
        "media": [
            {"kind": "photo", "url": "/api/uploads/1.jpg"},
            {"kind": "photo", "url": "/api/uploads/2.jpg"},
            {"kind": "video", "url": "/api/uploads/luvas.mp4"},
        ],
    })

    artigo = cliente.get("/api/mobile/shop").json()[0]
    assert [m["url"] for m in artigo["media"]] == [
        "/api/uploads/1.jpg", "/api/uploads/2.jpg", "/api/uploads/luvas.mp4"
    ]
    assert [m["kind"] for m in artigo["media"]] == ["photo", "photo", "video"]
    # A principal continua a ser a da lista da montra
    assert artigo["photo_url"] == "/api/uploads/1.jpg"


def test_sem_galeria_vale_a_fotografia_principal(cliente, admin):
    """As fichas que ja la estavam nao tem `media` e tem de continuar a servir."""
    cliente.post("/api/inventory", headers=admin, json={
        "name": "Hoodie", "category": "clothing", "color": "Preto",
        "quantity": 2, "price": 40.0, "photo_url": "/api/uploads/antiga.jpg",
    })

    artigo = cliente.get("/api/mobile/shop").json()[0]
    assert artigo["media"] == [{"kind": "photo", "url": "/api/uploads/antiga.jpg"}]


def test_a_galeria_e_do_produto_e_junta_se_entre_tamanhos(cliente, admin):
    """A galeria e do produto, nao do tamanho; e o mesmo ficheiro nao se repete."""
    for tamanho, media in (
        ("S", [{"kind": "photo", "url": "/api/uploads/a.jpg"}]),
        ("M", [{"kind": "photo", "url": "/api/uploads/a.jpg"},
               {"kind": "video", "url": "/api/uploads/b.mp4"}]),
    ):
        cliente.post("/api/inventory", headers=admin, json={
            "name": "Capacete", "category": "equipment", "size": tamanho,
            "color": "Preto", "quantity": 3, "price": 65.0,
            "photo_url": "/api/uploads/a.jpg", "media": media,
        })

    artigo = cliente.get("/api/mobile/shop").json()[0]
    assert [m["url"] for m in artigo["media"]] == ["/api/uploads/a.jpg", "/api/uploads/b.mp4"]


def test_carregar_um_video_curto(cliente, admin):
    r = cliente.post("/api/uploads", headers=admin,
                     files={"ficheiro": ("treino.mp4", io.BytesIO(b"nao e video a serio"), "video/mp4")})
    assert r.status_code == 200, r.text
    assert r.json()["kind"] == "video"
    assert r.json()["url"].endswith(".mp4")


def test_carregar_uma_imagem_continua_a_dizer_que_e_imagem(cliente, admin):
    r = cliente.post("/api/uploads", headers=admin, files=imagem_falsa("foto.jpg"))
    assert r.status_code == 200
    assert r.json()["kind"] == "photo"


def test_o_que_nao_e_imagem_video_nem_pdf_e_recusado(cliente, admin):
    """Uma folha de calculo ou um executavel nao tem que fazer aqui."""
    for nome, tipo in (("contas.xlsx", "application/vnd.ms-excel"),
                       ("programa.exe", "application/octet-stream")):
        r = cliente.post("/api/uploads", headers=admin,
                         files={"ficheiro": (nome, io.BytesIO(b"x"), tipo)})
        assert r.status_code == 400, nome
