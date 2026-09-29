"""A pesquisa ignora maiúsculas, acentos e as ligações dos nomes."""
import pytest
from server import corresponde_pesquisa, normalizar_texto


@pytest.mark.parametrize(
    "procurado, nome",
    [
        ("joao", "João Pedro da Silva"),
        ("JOAO", "João Pedro da Silva"),
        ("joão", "Joao Pedro da Silva"),          # ao contrário também
        ("sofia", "Ana Sofía Gonçalves"),
        ("goncalves", "Ana Sofía Gonçalves"),
        ("marcio", "MÁRCIO dos Santos"),
        ("ze", "Zé Antunes"),
        ("joao silva", "João Pedro da Silva"),    # salta o "da"
        ("santos marcio", "MÁRCIO dos Santos"),   # ordem não importa
        ("ana goncalves", "Ana Sofía Gonçalves"),
    ],
)
def test_encontra_apesar_dos_acentos_e_ligacoes(procurado, nome):
    assert corresponde_pesquisa(procurado, nome)


@pytest.mark.parametrize(
    "procurado, nome",
    [
        ("pedro", "Ana Sofía Gonçalves"),
        ("joao costa", "João Pedro da Silva"),    # "costa" não existe no nome
        ("xpto", "MÁRCIO dos Santos"),
    ],
)
def test_nao_encontra_quem_nao_corresponde(procurado, nome):
    assert not corresponde_pesquisa(procurado, nome)


def test_procura_tambem_por_numero_e_telefone():
    assert corresponde_pesquisa("007", "João Silva", "912345678", None, "007")
    assert corresponde_pesquisa("912345", "João Silva", "912345678")


def test_pesquisa_vazia_devolve_tudo():
    assert corresponde_pesquisa("", "Qualquer Nome")
    assert corresponde_pesquisa("   ", "Qualquer Nome")


def test_normalizacao_tira_acentos_e_maiusculas():
    assert normalizar_texto("MÁRCIO dos Santos") == "marcio dos santos"
    assert normalizar_texto("Ana Sofía Gonçalves") == "ana sofia goncalves"


def test_lista_de_socios_responde_a_pesquisa_sem_acentos(cliente, admin, criar_socio):
    criar_socio(nome="João Pedro da Silva", telefone="912100001")
    criar_socio(nome="Ana Sofía Gonçalves", telefone="912100002")

    r = cliente.get("/api/members", headers=admin, params={"search": "joao silva"})
    assert r.status_code == 200
    nomes = [m["name"] for m in r.json()]
    assert nomes == ["João Pedro da Silva"]


def test_resultados_vem_por_ordem_alfabetica(cliente, admin, criar_socio):
    criar_socio(nome="Zé Antunes", telefone="912100003")
    criar_socio(nome="Ana Costa", telefone="912100004")
    criar_socio(nome="Bruno Dias", telefone="912100005")

    nomes = [m["name"] for m in cliente.get("/api/members", headers=admin).json()]
    assert nomes == ["Ana Costa", "Bruno Dias", "Zé Antunes"]
