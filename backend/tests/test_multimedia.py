"""As fotografias partilhadas com um sócio.

Duas regras, e a segunda é a razão de ser desta página:

1. **Cada fotografia é de um sócio, e só ele a vê.** Começou por ser uma
   galeria igual para toda a gente, em App do Sócio → Multimédia. Decisão do
   dono: o que ele quer partilhar são as fotos daquele sócio — o filho na aula
   de Kids, o combate de sábado — e isso não é para os outros trezentos verem.
2. **Apagar apaga o ficheiro.** Só se apagava o registo, e o ficheiro ficava
   no volume do Docker para sempre, sem nada na base de dados a apontar-lhe.
"""
import io
import os
from pathlib import Path

import pytest

from conftest import cabecalho_do_socio as como_socio


def pasta():
    return Path(os.environ["UPLOADS_DIR"])


@pytest.fixture
def socio(criar_socio):
    return criar_socio(nome="Dono da Fotografia", telefone="912400001")


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


def publicar(cliente, admin, socio_id, url, legenda="Treino de quinta"):
    r = cliente.post(
        "/api/media",
        headers=admin,
        json={"member_id": socio_id, "kind": "photo", "url": url, "caption": legenda},
    )
    assert r.status_code == 200, r.text
    return r.json()


# ------------------------------------------------- de quem é cada fotografia


def test_a_fotografia_chega_ao_socio_dela(cliente, admin, socio, fotografia):
    item = publicar(cliente, admin, socio["id"], fotografia)
    vistas = cliente.get(f"/api/mobile/media/{socio['id']}",
                         headers=como_socio(socio)).json()
    assert [m["id"] for m in vistas] == [item["id"]]


def test_um_socio_nao_ve_as_fotografias_de_outro(cliente, admin, criar_socio, fotografia):
    """A razão de ser desta mudança."""
    filho = criar_socio(nome="Aluno de Kids", telefone="912400002")
    estranho = criar_socio(nome="Outro Sócio Qualquer", telefone="912400003")

    publicar(cliente, admin, filho["id"], fotografia, "Na aula de Kids")

    assert len(cliente.get(f"/api/mobile/media/{filho['id']}",
                           headers=como_socio(filho)).json()) == 1
    assert cliente.get(f"/api/mobile/media/{estranho['id']}",
                       headers=como_socio(estranho)).json() == []

    # E o estranho nao consegue pedir as do filho, nem sabendo-lhe o id
    assert cliente.get(f"/api/mobile/media/{filho['id']}",
                       headers=como_socio(estranho)).status_code == 403


def test_uma_fotografia_sem_dono_e_recusada(cliente, admin, fotografia):
    r = cliente.post("/api/media", headers=admin, json={"kind": "photo", "url": fotografia})
    assert r.status_code == 422


def test_um_socio_que_nao_existe_e_recusado(cliente, admin, fotografia):
    r = cliente.post(
        "/api/media",
        headers=admin,
        json={"member_id": "nao-existe", "kind": "photo", "url": fotografia},
    )
    assert r.status_code == 404


def test_a_ficha_do_socio_pede_so_as_dele(cliente, admin, criar_socio, fotografia):
    um = criar_socio(nome="Sócio Um", telefone="912400004")
    outro = criar_socio(nome="Sócio Dois", telefone="912400005")
    publicar(cliente, admin, um["id"], fotografia, "Do primeiro")
    publicar(cliente, admin, outro["id"], fotografia, "Do segundo")

    assert len(cliente.get("/api/media", headers=admin).json()) == 2
    dele = cliente.get(f"/api/media?member_id={um['id']}", headers=admin).json()
    assert [m["caption"] for m in dele] == ["Do primeiro"]


def test_a_rota_antiga_da_aplicacao_nao_devolve_fotografias_de_ninguem(
    cliente, admin, socio, fotografia
):
    """Um telemóvel por actualizar vê uma galeria vazia, e não a de todos."""
    publicar(cliente, admin, socio["id"], fotografia)
    assert cliente.get("/api/mobile/media").json() == []


def test_a_aplicacao_so_ve_as_activas(cliente, admin, socio, fotografia):
    activa = publicar(cliente, admin, socio["id"], fotografia, "À vista")
    escondida = cliente.post(
        "/api/media",
        headers=admin,
        json={
            "member_id": socio["id"],
            "kind": "photo",
            "url": fotografia,
            "caption": "Escondida",
            "is_active": False,
        },
    ).json()

    vistas = {m["id"] for m in cliente.get(f"/api/mobile/media/{socio['id']}",
                                           headers=como_socio(socio)).json()}
    assert activa["id"] in vistas
    assert escondida["id"] not in vistas


# -------------------------------------------------- o ficheiro, ao apagar


def test_apagar_uma_fotografia_apaga_o_ficheiro(cliente, admin, socio, fotografia):
    item = publicar(cliente, admin, socio["id"], fotografia)
    ficheiro = pasta() / fotografia.rsplit("/", 1)[-1]
    assert ficheiro.exists()

    r = cliente.delete(f"/api/media/{item['id']}", headers=admin)
    assert r.status_code == 200, r.text
    assert r.json()["ficheiro_apagado"] is True
    assert not ficheiro.exists()


def test_o_ficheiro_fica_se_outro_item_o_usar(cliente, admin, criar_socio, fotografia):
    """A mesma fotografia dada a dois sócios: apagar uma não deixa a outra sem nada."""
    um = criar_socio(nome="Sócio A", telefone="912400006")
    outro = criar_socio(nome="Sócio B", telefone="912400007")
    primeiro = publicar(cliente, admin, um["id"], fotografia, "Uma vez")
    segundo = publicar(cliente, admin, outro["id"], fotografia, "E outra")
    ficheiro = pasta() / fotografia.rsplit("/", 1)[-1]

    r = cliente.delete(f"/api/media/{primeiro['id']}", headers=admin)
    assert r.json()["ficheiro_apagado"] is False
    assert ficheiro.exists(), "o outro sócio ainda usa este ficheiro"

    cliente.delete(f"/api/media/{segundo['id']}", headers=admin)
    assert not ficheiro.exists()


def test_apagar_as_miniaturas_que_dele_se_fizeram(cliente, admin, socio, fotografia):
    """A fotografia é servida encolhida, e cada largura deixa a sua cópia."""
    item = publicar(cliente, admin, socio["id"], fotografia)
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


def test_um_video_por_link_nao_tem_ficheiro_para_apagar(cliente, admin, socio):
    """Os vídeos são links para as redes do ginásio: não há nada nosso."""
    item = cliente.post(
        "/api/media",
        headers=admin,
        json={
            "member_id": socio["id"],
            "kind": "video_link",
            "url": "https://www.instagram.com/p/abc",
            "caption": "O combate",
        },
    ).json()

    r = cliente.delete(f"/api/media/{item['id']}", headers=admin)
    assert r.status_code == 200
    assert r.json()["ficheiro_apagado"] is False


def test_apagar_um_item_que_nao_existe_da_404(cliente, admin):
    assert cliente.delete("/api/media/nao-existe", headers=admin).status_code == 404


def test_o_colaborador_publica_e_apaga(cliente, admin, colaborador, socio, fotografia):
    """É ele que está no ginásio a tirar as fotografias."""
    item = cliente.post(
        "/api/media",
        headers=colaborador,
        json={"member_id": socio["id"], "kind": "photo", "url": fotografia},
    )
    assert item.status_code == 200
    assert cliente.delete(f"/api/media/{item.json()['id']}", headers=colaborador).status_code == 200
