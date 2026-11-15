"""O PIN do sócio: como se entra na aplicação.

Até novembro de 2026 entrava-se com o **número de sócio e o telemóvel**. Os
números vão de 001 a 340 e o telemóvel sabe-o qualquer colega de treino,
qualquer familiar, qualquer ex-companheiro: entrar na conta de outra pessoa
não exigia saber nada que não se soubesse já.

Hoje é **número + PIN**. O telemóvel só serve enquanto não houver PIN, e
**deixa de servir assim que ele existe** — senão bastava dizer "esqueci-me"
para o buraco reabrir. Esquecido, limpa-se ao balcão.
"""
import pytest

PIN = "428913"
OUTRO_PIN = "750264"


@pytest.fixture
def socio(criar_socio):
    return criar_socio(nome="Sócio Com PIN", telefone="912500001")


def entrar(cliente, **corpo):
    return cliente.post("/api/mobile/auth/login", json=corpo)


def definir(cliente, numero, telefone, pin):
    return cliente.post(
        "/api/mobile/auth/pin",
        json={"member_number": numero, "phone": telefone, "pin": pin},
    )


# ------------------------------------------------------ a primeira vez


def test_sem_pin_entra_se_com_o_telemovel(cliente, socio):
    r = entrar(cliente, member_number=socio["member_number"], phone="912500001")
    assert r.status_code == 200, r.text
    assert r.json()["precisa_de_pin"] is True, "a aplicação tem de saber que falta escolher"


def test_escolher_o_pin_e_entrar_com_ele(cliente, socio):
    assert definir(cliente, socio["member_number"], "912500001", PIN).status_code == 200
    r = entrar(cliente, member_number=socio["member_number"], pin=PIN)
    assert r.status_code == 200, r.text
    assert r.json().get("precisa_de_pin") is None
    assert r.json()["member"]["id"] == socio["id"]


def test_o_numero_vale_com_e_sem_zeros_a_frente(cliente, socio):
    definir(cliente, socio["member_number"], "912500001", PIN)
    sem_zeros = socio["member_number"].lstrip("0")
    assert entrar(cliente, member_number=sem_zeros, pin=PIN).status_code == 200
    assert entrar(cliente, member_number=socio["member_number"], pin=PIN).status_code == 200


# ------------------------------------- o telemóvel deixa de servir: o essencial


def test_com_pin_o_telemovel_ja_nao_entra(cliente, socio):
    """A razão de ser de tudo isto.

    Se o telemóvel continuasse a valer, saber o número e o telemóvel de
    alguém continuava a dar entrada na conta dele — e o PIN não tapava nada.
    """
    definir(cliente, socio["member_number"], "912500001", PIN)
    r = entrar(cliente, member_number=socio["member_number"], phone="912500001")
    assert r.status_code == 409
    assert "já tem PIN" in r.json()["detail"]


def test_com_pin_nao_se_pode_escolher_outro_pelo_telemovel(cliente, socio):
    """Senão bastava "esquecer-se" para ficar com a conta de qualquer um."""
    definir(cliente, socio["member_number"], "912500001", PIN)
    r = definir(cliente, socio["member_number"], "912500001", OUTRO_PIN)
    assert r.status_code == 409
    # e o PIN antigo continua a ser o que vale
    assert entrar(cliente, member_number=socio["member_number"], pin=PIN).status_code == 200


def test_um_pin_errado_nao_entra(cliente, socio):
    definir(cliente, socio["member_number"], "912500001", PIN)
    assert entrar(cliente, member_number=socio["member_number"], pin="111213").status_code == 401


def test_o_telemovel_errado_nao_deixa_escolher_pin(cliente, socio):
    assert definir(cliente, socio["member_number"], "919999999", PIN).status_code == 401


# ------------------------------------------------------- o que serve de PIN


@pytest.mark.parametrize("mau", ["12345", "1234567", "abcdef", "", "12 34 56"])
def test_o_pin_tem_de_ser_seis_digitos(cliente, socio, mau):
    r = definir(cliente, socio["member_number"], "912500001", mau)
    assert r.status_code in (400, 422), f"aceitou {mau!r}"


@pytest.mark.parametrize("obvio", ["000000", "111111", "123456", "987654"])
def test_os_pins_obvios_sao_recusados(cliente, socio, obvio):
    """São as primeiras coisas que alguém experimenta."""
    r = definir(cliente, socio["member_number"], "912500001", obvio)
    assert r.status_code == 400, f"aceitou {obvio!r}"


# ------------------------------------------------------------- trocar o PIN


def test_trocar_o_pin_sabendo_o_actual(cliente, socio):
    definir(cliente, socio["member_number"], "912500001", PIN)
    r = cliente.post(
        "/api/mobile/auth/pin/trocar",
        json={"member_number": socio["member_number"], "pin_actual": PIN, "pin_novo": OUTRO_PIN},
    )
    assert r.status_code == 200, r.text
    assert entrar(cliente, member_number=socio["member_number"], pin=OUTRO_PIN).status_code == 200
    assert entrar(cliente, member_number=socio["member_number"], pin=PIN).status_code == 401


def test_nao_se_troca_o_pin_sem_saber_o_actual(cliente, socio):
    definir(cliente, socio["member_number"], "912500001", PIN)
    r = cliente.post(
        "/api/mobile/auth/pin/trocar",
        json={"member_number": socio["member_number"], "pin_actual": "999888", "pin_novo": OUTRO_PIN},
    )
    assert r.status_code == 401


# --------------------------------------------------------- o travão por sócio


def test_cinco_falhas_travam_o_socio(cliente, socio):
    """Dez por minuto por IP não chega: quem quisesse experimentar um milhão
    de PINs mudava de rede. O travão é por sócio."""
    definir(cliente, socio["member_number"], "912500001", PIN)
    for _ in range(5):
        entrar(cliente, member_number=socio["member_number"], pin="111213")

    r = entrar(cliente, member_number=socio["member_number"], pin="111213")
    assert r.status_code == 429
    assert "receção" in r.json()["detail"]

    # e nem o PIN certo entra enquanto estiver travado
    assert entrar(cliente, member_number=socio["member_number"], pin=PIN).status_code == 429


def test_acertar_limpa_as_tentativas(cliente, socio):
    definir(cliente, socio["member_number"], "912500001", PIN)
    for _ in range(4):
        entrar(cliente, member_number=socio["member_number"], pin="111213")
    assert entrar(cliente, member_number=socio["member_number"], pin=PIN).status_code == 200
    # recomeça do zero: mais quatro falhas não travam
    for _ in range(4):
        entrar(cliente, member_number=socio["member_number"], pin="111213")
    assert entrar(cliente, member_number=socio["member_number"], pin=PIN).status_code == 200


# ---------------------------------------------------------------- o balcão


def test_o_balcao_ve_se_o_socio_ja_tem_pin(cliente, admin, socio):
    antes = cliente.get(f"/api/members/{socio['id']}/pin", headers=admin).json()
    assert antes["definido"] is False

    definir(cliente, socio["member_number"], "912500001", PIN)
    depois = cliente.get(f"/api/members/{socio['id']}/pin", headers=admin).json()
    assert depois["definido"] is True
    assert "pin_hash" not in depois, "o resumo do PIN nunca sai do servidor"


def test_limpar_o_pin_deixa_o_socio_escolher_outro(cliente, admin, socio):
    """A única maneira de recuperar um PIN esquecido, e passa pelo balcão."""
    definir(cliente, socio["member_number"], "912500001", PIN)
    assert cliente.post(f"/api/members/{socio['id']}/limpar-pin", headers=admin).status_code == 200

    # o antigo deixou de valer
    assert entrar(cliente, member_number=socio["member_number"], pin=PIN).status_code == 401
    # e o telemóvel volta a servir, uma vez
    r = entrar(cliente, member_number=socio["member_number"], phone="912500001")
    assert r.status_code == 200
    assert r.json()["precisa_de_pin"] is True
    assert definir(cliente, socio["member_number"], "912500001", OUTRO_PIN).status_code == 200


def test_limpar_o_pin_tira_o_travao(cliente, admin, socio):
    """Quem se esqueceu costuma ter tentado várias vezes antes de pedir ajuda."""
    definir(cliente, socio["member_number"], "912500001", PIN)
    for _ in range(5):
        entrar(cliente, member_number=socio["member_number"], pin="111213")
    assert entrar(cliente, member_number=socio["member_number"], pin=PIN).status_code == 429

    cliente.post(f"/api/members/{socio['id']}/limpar-pin", headers=admin)
    assert entrar(cliente, member_number=socio["member_number"], phone="912500001").status_code == 200


def test_o_colaborador_tambem_limpa_o_pin(cliente, colaborador, socio):
    """É ele que está ao balcão quando a pessoa chega a dizer que não entra."""
    definir(cliente, socio["member_number"], "912500001", PIN)
    r = cliente.post(f"/api/members/{socio['id']}/limpar-pin", headers=colaborador)
    assert r.status_code == 200


def test_quem_nao_trabalha_no_ginasio_nao_limpa_pins(cliente, socio):
    assert cliente.post(f"/api/members/{socio['id']}/limpar-pin").status_code in (401, 403)


# ------------------------------------------------------------ e a suspensão


def test_um_socio_suspenso_nao_entra_nem_com_o_pin_certo(cliente, admin, socio):
    definir(cliente, socio["member_number"], "912500001", PIN)
    cliente.post(f"/api/members/{socio['id']}/suspender", headers=admin, json={"motivo": None})
    r = entrar(cliente, member_number=socio["member_number"], pin=PIN)
    assert r.status_code == 403


def test_a_quota_em_atraso_nao_impede_a_entrada(cliente, socio):
    """É precisamente quem mais precisa de ver o aviso no cartão."""
    definir(cliente, socio["member_number"], "912500001", PIN)
    assert entrar(cliente, member_number=socio["member_number"], pin=PIN).status_code == 200
