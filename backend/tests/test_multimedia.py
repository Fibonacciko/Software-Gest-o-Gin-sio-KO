"""A Multimédia: as fotografias do ginásio, e o que fica em disco.

Apagar um item só apagava o registo — o ficheiro ficava no volume do Docker
para sempre, sem nada na base de dados a apontar-lhe. Uma pasta que só
crescia, e que entra nas cópias de segurança das fotografias.
"""
import io
import os
from pathlib import Path

import pytest


def pasta():
    return Path(os.environ["UPLOADS_DIR"])


@pytest.fixture
def fotografia(cliente, admin):
    """Carrega um ficheiro e devolve o endereço dele."""
    envio = cliente.post(
        "/api/uploads",
        headers=admin,
        files={"ficheiro": ("treino.jpg", io.BytesIO(b"\xff\xd8\xff" + b"0" * 64), "image/jpeg")},
    )
    assert envio.status_code == 200, envio.text
    return envio.json()["url"]


def publicar(cliente, admin, url, legenda="Treino de quinta"):
    r = cliente.post(
        "/api/media", headers=admin, json={"kind": "photo", "url": url, "caption": legenda}
    )
    assert r.status_code == 200, r.text
    return r.json()


def test_apagar_uma_fotografia_apaga_o_ficheiro(cliente, admin, fotografia):
    item = publicar(cliente, admin, fotografia)
    ficheiro = pasta() / fotografia.rsplit("/", 1)[-1]
    assert ficheiro.exists()

    r = cliente.delete(f"/api/media/{item['id']}", headers=admin)
    assert r.status_code == 200, r.text
    assert r.json()["ficheiro_apagado"] is True
    assert not ficheiro.exists()


def test_o_ficheiro_fica_se_outro_item_o_usar(cliente, admin, fotografia):
    """Como nos planos: apagar uma não pode deixar a outra sem imagem."""
    primeiro = publicar(cliente, admin, fotografia, "Uma vez")
    segundo = publicar(cliente, admin, fotografia, "E outra")
    ficheiro = pasta() / fotografia.rsplit("/", 1)[-1]

    r = cliente.delete(f"/api/media/{primeiro['id']}", headers=admin)
    assert r.json()["ficheiro_apagado"] is False
    assert ficheiro.exists(), "o outro item ainda usa este ficheiro"

    cliente.delete(f"/api/media/{segundo['id']}", headers=admin)
    assert not ficheiro.exists()


def test_apagar_as_miniaturas_que_dele_se_fizeram(cliente, admin, fotografia):
    """A fotografia é servida encolhida, e cada largura deixa a sua cópia."""
    item = publicar(cliente, admin, fotografia)
    nome = fotografia.rsplit("/", 1)[-1]

    copias = []
    for largura in (360, 720):
        destino = pasta() / ".miniaturas" / str(largura)
        destino.mkdir(parents=True, exist_ok=True)
        copia = destino / nome
        copia.write_bytes(b"encolhida")
        copias.append(copia)

    cliente.delete(f"/api/media/{item['id']}", headers=admin)
    for copia in copias:
        assert not copia.exists(), f"ficou a miniatura {copia}"


def test_um_video_por_link_nao_tem_ficheiro_para_apagar(cliente, admin):
    """Os vídeos são links para as redes do ginásio: não há nada nosso."""
    item = cliente.post(
        "/api/media",
        headers=admin,
        json={"kind": "video_link", "url": "https://www.instagram.com/p/abc", "caption": "O combate"},
    ).json()

    r = cliente.delete(f"/api/media/{item['id']}", headers=admin)
    assert r.status_code == 200
    assert r.json()["ficheiro_apagado"] is False


def test_apagar_um_item_que_nao_existe_da_404(cliente, admin):
    assert cliente.delete("/api/media/nao-existe", headers=admin).status_code == 404


def test_o_colaborador_publica_e_apaga(cliente, admin, colaborador, fotografia):
    """É ele que está no ginásio a tirar as fotografias."""
    item = cliente.post(
        "/api/media", headers=colaborador, json={"kind": "photo", "url": fotografia}
    )
    assert item.status_code == 200
    assert cliente.delete(f"/api/media/{item.json()['id']}", headers=colaborador).status_code == 200


def test_a_aplicacao_so_ve_as_activas(cliente, admin, fotografia):
    activa = publicar(cliente, admin, fotografia, "À vista")
    escondida = cliente.post(
        "/api/media",
        headers=admin,
        json={"kind": "photo", "url": fotografia, "caption": "Escondida", "is_active": False},
    ).json()

    vistas = {m["id"] for m in cliente.get("/api/mobile/media").json()}
    assert activa["id"] in vistas
    assert escondida["id"] not in vistas
