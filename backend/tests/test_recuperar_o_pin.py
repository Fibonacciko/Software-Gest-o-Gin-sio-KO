"""Recuperar o PIN esquecido.

Há **dois caminhos**, por decisão do dono, e os dois são precisos:

1. **Por email**, para quem tem email na ficha — a maior parte dos 340.
2. **Ao balcão**, para quem não tem (ver `test_pin_do_socio.py`).

O que **não pode haver** é um "esqueci-me" que volte ao telemóvel: era isso
que reabria o buraco todo. O código prova **posse** — a caixa de correio é
dele — e não **conhecimento**, que é a diferença toda.
"""
import re

import pytest

import server

PIN = "428913"
PIN_NOVO = "750264"
EMAIL = "socio.teste@exemplo.pt"


class Caixa(list):
    """As mensagens que teriam saído, e o código que ia dentro."""

    @property
    def codigo(self):
        achado = re.search(r"^\s+(\d{6})\s*$", self[-1]["texto"], re.M)
        return achado.group(1) if achado else None


@pytest.fixture
def correio(monkeypatch):
    """Finge o envio, e guarda a mensagem.

    Não se manda email a ninguém a correr os testes — e é por aqui que se
    chega ao código, que o servidor só grava resumido com bcrypt.
    """
    caixa = Caixa()

    async def _enviar(para, assunto, texto):
        caixa.append({"para": para, "assunto": assunto, "texto": texto})
        return True

    monkeypatch.setattr(server, "enviar_email", _enviar)
    monkeypatch.setattr(server, "correio_configurado", lambda: True)
    return caixa


@pytest.fixture
def socio(criar_socio):
    return criar_socio(nome="Sócio Esquecido", telefone="912500077", email=EMAIL)


@pytest.fixture
def socio_com_pin(cliente, socio):
    r = cliente.post(
        "/api/mobile/auth/pin",
        json={"member_number": socio["member_number"], "phone": "912500077", "pin": PIN},
    )
    assert r.status_code == 200, r.text
    return socio


def pedir(cliente, numero):
    return cliente.post("/api/mobile/auth/pin/esqueci", json={"member_number": numero})


def recuperar(cliente, numero, codigo, pin):
    return cliente.post(
        "/api/mobile/auth/pin/recuperar",
        json={"member_number": numero, "codigo": codigo, "pin": pin},
    )


def entrar(cliente, numero, pin):
    return cliente.post(
        "/api/mobile/auth/login", json={"member_number": numero, "pin": pin}
    )


# --------------------------------------------------------- o caminho feliz


def test_pede_o_codigo_e_entra_com_um_pin_novo(cliente, correio, socio_com_pin):
    """De ponta a ponta: pede, recebe, escolhe outro PIN, e fica dentro."""
    numero = socio_com_pin["member_number"]
    r = pedir(cliente, numero)
    assert r.status_code == 200, r.text
    assert r.json()["enviado"] is True
    assert len(correio) == 1

    r = recuperar(cliente, numero, correio.codigo, PIN_NOVO)
    assert r.status_code == 200, r.text
    assert r.json()["member"]["id"] == socio_com_pin["id"], "entra logo, sem voltar atrás"

    assert entrar(cliente, numero, PIN_NOVO).status_code == 200
    assert entrar(cliente, numero, PIN).status_code == 401, "o antigo deixou de valer"


def test_o_codigo_vai_para_o_email_da_ficha(cliente, correio, socio_com_pin):
    """E só para lá: senão bastava escrever o número de outra pessoa e um
    endereço nosso para receber o código dela."""
    pedir(cliente, socio_com_pin["member_number"])
    assert correio[-1]["para"] == EMAIL
    assert correio.codigo is not None and len(correio.codigo) == 6


def test_a_resposta_esconde_o_email(cliente, correio, socio_com_pin):
    """O sócio precisa de saber qual das caixas foi, não de a ver escrita
    num ecrã que outra pessoa pode estar a espreitar."""
    r = pedir(cliente, socio_com_pin["member_number"]).json()
    assert r["email"] == "s***@exemplo.pt"
    assert EMAIL not in r["mensagem"]


def test_as_palavras_vem_do_servidor(cliente, correio, socio_com_pin):
    """Para quem atende ao balcão ler o mesmo que o sócio tem no telemóvel."""
    r = pedir(cliente, socio_com_pin["member_number"]).json()
    assert "15 minutos" in r["mensagem"]
    assert r["minutos"] == 15


# ----------------------------------------------- quando não há por onde ir


def test_sem_email_na_ficha_manda_ao_balcao(cliente, correio, criar_socio):
    socio = criar_socio(nome="Sem Email", telefone="912500078")
    cliente.post(
        "/api/mobile/auth/pin",
        json={"member_number": socio["member_number"], "phone": "912500078", "pin": PIN},
    )
    r = pedir(cliente, socio["member_number"]).json()
    assert r["enviado"] is False
    assert r["motivo"] == "sem_email"
    assert "receção" in r["mensagem"]
    assert not correio, "não se manda email a quem não o tem"


def test_sem_pin_nao_ha_nada_a_recuperar(cliente, correio, socio):
    """Quem ainda não escolheu nenhum entra com o telemóvel, como da primeira."""
    r = pedir(cliente, socio["member_number"]).json()
    assert r["enviado"] is False
    assert r["motivo"] == "sem_pin"
    assert "telemóvel" in r["mensagem"]


def test_um_numero_que_nao_existe(cliente, correio):
    r = pedir(cliente, "997").json()
    assert r["enviado"] is False
    assert r["motivo"] == "sem_socio"


def test_sem_smtp_configurado_manda_ao_balcao(cliente, monkeypatch, socio_com_pin):
    """É o estado do servidor até alguém pôr as credenciais no `.env`, e aí
    o caminho que já existia continua a ser o que vale."""
    monkeypatch.setattr(server, "correio_configurado", lambda: False)
    r = pedir(cliente, socio_com_pin["member_number"]).json()
    assert r["enviado"] is False
    assert r["motivo"] == "sem_correio"
    assert "receção" in r["mensagem"]


def test_se_o_email_nao_sair_o_codigo_nao_fica_preso(cliente, monkeypatch, socio_com_pin):
    """Deixar o envio gravado prendia o sócio dois minutos à espera de um
    email que nunca vem."""
    async def _falhar(para, assunto, texto):
        return False

    monkeypatch.setattr(server, "correio_configurado", lambda: True)
    monkeypatch.setattr(server, "enviar_email", _falhar)

    r = pedir(cliente, socio_com_pin["member_number"]).json()
    assert r["motivo"] == "falhou"
    # e pode pedir outra vez logo a seguir, sem esperar os dois minutos
    assert pedir(cliente, socio_com_pin["member_number"]).json()["motivo"] == "falhou"


def test_nao_se_pede_outro_codigo_logo_a_seguir(cliente, correio, socio_com_pin):
    """Senão qualquer pessoa enchia a caixa de correio de outra."""
    numero = socio_com_pin["member_number"]
    assert pedir(cliente, numero).json()["enviado"] is True
    segundo = pedir(cliente, numero).json()
    assert segundo["enviado"] is False
    assert segundo["motivo"] == "ha_pouco"
    assert 0 < segundo["segundos"] <= 120
    assert len(correio) == 1, "só saiu uma mensagem"


# --------------------------------------------------------- o código em si


def test_um_codigo_errado_nao_troca_o_pin(cliente, correio, socio_com_pin):
    numero = socio_com_pin["member_number"]
    pedir(cliente, numero)
    assert recuperar(cliente, numero, "000001", PIN_NOVO).status_code == 401
    assert entrar(cliente, numero, PIN).status_code == 200, "o PIN antigo continua a valer"


def test_cinco_codigos_errados_queimam_o_codigo(cliente, correio, socio_com_pin):
    numero = socio_com_pin["member_number"]
    pedir(cliente, numero)
    certo = correio.codigo
    for _ in range(5):
        recuperar(cliente, numero, "000001", PIN_NOVO)

    assert recuperar(cliente, numero, "000001", PIN_NOVO).status_code == 429
    r = recuperar(cliente, numero, certo, PIN_NOVO)
    assert r.status_code == 400, "o código morreu, nem o certo serve"
    assert entrar(cliente, numero, PIN).status_code == 200


def test_o_codigo_so_serve_uma_vez(cliente, correio, socio_com_pin):
    numero = socio_com_pin["member_number"]
    pedir(cliente, numero)
    codigo = correio.codigo
    assert recuperar(cliente, numero, codigo, PIN_NOVO).status_code == 200
    assert recuperar(cliente, numero, codigo, "315742").status_code == 400


def test_o_codigo_expirado_nao_serve(cliente, correio, bd, socio_com_pin):
    numero = socio_com_pin["member_number"]
    pedir(cliente, numero)
    bd.members.update_one(
        {"id": socio_com_pin["id"]},
        {"$set": {"pin_reset_expira": "2020-01-01T00:00:00+00:00"}},
    )
    r = recuperar(cliente, numero, correio.codigo, PIN_NOVO)
    assert r.status_code == 400
    assert "expirou" in r.json()["detail"]
    assert entrar(cliente, numero, PIN).status_code == 200


def test_sem_codigo_pedido_nao_se_recupera(cliente, socio_com_pin):
    r = recuperar(cliente, socio_com_pin["member_number"], "123457", PIN_NOVO)
    assert r.status_code == 400


def test_o_codigo_de_um_socio_nao_serve_a_outro(cliente, correio, criar_socio, socio_com_pin):
    """O código vive na ficha de quem o pediu, e é por lá que é procurado."""
    outro = criar_socio(nome="Outro Sócio", telefone="912500079", email="outro@exemplo.pt")
    cliente.post(
        "/api/mobile/auth/pin",
        json={"member_number": outro["member_number"], "phone": "912500079", "pin": PIN},
    )
    pedir(cliente, socio_com_pin["member_number"])
    codigo_do_primeiro = correio.codigo

    pedir(cliente, outro["member_number"])
    r = recuperar(cliente, outro["member_number"], codigo_do_primeiro, PIN_NOVO)
    assert r.status_code == 401


# ------------------------------------------------------- o PIN que ele escolhe


@pytest.mark.parametrize("obvio", ["000000", "123456", "111111"])
def test_o_pin_novo_tem_de_servir(cliente, correio, socio_com_pin, obvio):
    """E um PIN recusado **não queima o código**: foi um engano a escrever,
    não uma tentativa de entrar."""
    numero = socio_com_pin["member_number"]
    pedir(cliente, numero)
    codigo = correio.codigo
    assert recuperar(cliente, numero, codigo, obvio).status_code == 400
    assert recuperar(cliente, numero, codigo, PIN_NOVO).status_code == 200


# ------------------------------------------------- o travão e a suspensão


def test_recuperar_tira_o_travao_das_tentativas(cliente, correio, socio_com_pin):
    """Ficar quinze minutos de castigo depois de provar quem é pela caixa de
    correio não serve de nada a ninguém."""
    numero = socio_com_pin["member_number"]
    for _ in range(5):
        entrar(cliente, numero, "111213")
    assert entrar(cliente, numero, PIN).status_code == 429, "travado"

    pedir(cliente, numero)
    assert recuperar(cliente, numero, correio.codigo, PIN_NOVO).status_code == 200
    assert entrar(cliente, numero, PIN_NOVO).status_code == 200


def test_um_socio_suspenso_nao_entra_por_aqui(cliente, correio, admin, socio_com_pin):
    numero = socio_com_pin["member_number"]
    pedir(cliente, numero)
    cliente.post(
        f"/api/members/{socio_com_pin['id']}/suspender", headers=admin, json={"motivo": None}
    )
    assert recuperar(cliente, numero, correio.codigo, PIN_NOVO).status_code == 403


# ---------------------------------------------------------------- o balcão


def test_o_balcao_ve_que_ha_codigo_a_aguardar(cliente, correio, admin, socio_com_pin):
    """Quem chega a dizer que não entra pode já ter pedido o código e não ter
    ido ao email."""
    antes = cliente.get(f"/api/members/{socio_com_pin['id']}/pin", headers=admin).json()
    assert antes["codigo_a_aguardar"] is False

    pedir(cliente, socio_com_pin["member_number"])
    depois = cliente.get(f"/api/members/{socio_com_pin['id']}/pin", headers=admin).json()
    assert depois["codigo_a_aguardar"] is True


def test_limpar_o_pin_ao_balcao_mata_o_codigo(cliente, correio, admin, socio_com_pin):
    """O balcão apaga o PIN; um código que ficasse de pé por mais quinze
    minutos deixava uma segunda porta aberta sem ninguém saber."""
    numero = socio_com_pin["member_number"]
    pedir(cliente, numero)
    codigo = correio.codigo
    assert cliente.post(
        f"/api/members/{socio_com_pin['id']}/limpar-pin", headers=admin
    ).status_code == 200
    assert recuperar(cliente, numero, codigo, PIN_NOVO).status_code == 400


def test_fica_no_registo_de_alteracoes(cliente, correio, bd, socio_com_pin):
    """É um acontecimento de segurança: tem de deixar rasto."""
    numero = socio_com_pin["member_number"]
    pedir(cliente, numero)
    recuperar(cliente, numero, correio.codigo, PIN_NOVO)

    registos = list(bd.audit_logs.find({"entity_id": socio_com_pin["id"]}))
    assert any("Recuperou o PIN" in (r.get("details") or "") for r in registos)


# ------------------------------------------------------- esconder o email


@pytest.mark.parametrize("endereco,esperado", [
    ("fabio@gmail.com", "f***@gmail.com"),
    ("a@b.pt", "a***@b.pt"),
    ("", ""),
    ("sem-arroba", ""),
    (None, ""),
])
def test_esconder_email(endereco, esperado):
    from utils.correio import esconder_email
    assert esconder_email(endereco) == esperado
