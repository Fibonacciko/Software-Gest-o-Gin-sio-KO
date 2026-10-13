"""A pesquisa ignora maiúsculas, acentos e as ligações dos nomes."""
import pytest
from server import corresponde_pesquisa, normalizar_texto, relevancia_pesquisa


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


def test_a_pesquisa_devolve_por_ordem_alfabetica(cliente, admin, criar_socio):
    """Dentro dos resultados de uma pesquisa, manda a ordem alfabetica."""
    criar_socio(nome="Dias Antunes", telefone="912100003")
    criar_socio(nome="Dias Costa", telefone="912100004")
    criar_socio(nome="Dias Barros", telefone="912100005")

    nomes = [m["name"] for m in
             cliente.get("/api/members", headers=admin, params={"search": "dias"}).json()]
    assert nomes == ["Dias Antunes", "Dias Barros", "Dias Costa"]

# --- Procura pelo inicio das palavras, nao a meio ---
# Este erro chegou a producao: escrever "i" mostrava "Maria", porque a
# letra aparecia a meio do nome.

@pytest.mark.parametrize(
    "escrito, nome",
    [
        ("i", "Inês Ferreira"),        # nome proprio
        ("i", "Isabel Dias"),
        ("i", "Ana Isabel Costa"),     # nome do meio
        ("f", "Inês Ferreira"),        # apelido, desde a primeira letra
        ("s", "João Silva"),
        ("fe", "Inês Ferreira"),
        ("sil", "João Pedro da Silva"),
    ],
)
def test_procura_desde_a_primeira_letra_em_todo_o_nome(escrito, nome):
    assert corresponde_pesquisa(escrito, nome)


@pytest.mark.parametrize(
    "escrito, nome",
    [
        ("i", "Maria Silva"),     # tem "i", mas a meio de Maria
        ("i", "Ana Costa"),
        ("z", "Maria Silva"),
        ("os", "João Santos"),    # "os" esta no fim de Santos
        ("ria", "Maria Silva"),   # "ria" esta a meio
    ],
)
def test_nunca_procura_a_meio_das_palavras(escrito, nome):
    assert not corresponde_pesquisa(escrito, nome)


@pytest.mark.parametrize(
    "escrito, nome, esperado",
    [
        ("i", "Inês Ferreira", 0),        # nome proprio: vem primeiro
        ("i", "Isabel Dias", 0),
        ("i", "Ana Isabel Costa", 1),     # so no nome do meio: vem depois
        ("f", "Inês Ferreira", 1),        # so no apelido: vem depois
        ("fe", "Fernanda Alves", 0),
    ],
)
def test_nome_proprio_tem_preferencia(escrito, nome, esperado):
    assert relevancia_pesquisa(escrito, nome) == esperado


def test_telefone_aceita_os_ultimos_digitos():
    """A excecao: no telefone procura-se em qualquer posicao."""
    assert corresponde_pesquisa("5678", "João Silva", telefone="912345678")
    assert corresponde_pesquisa("2345", "João Silva", telefone="912345678")


def test_numero_de_socio_pelo_inicio():
    assert corresponde_pesquisa("00", "João Silva", numero="007")
    assert corresponde_pesquisa("7", "João Silva", numero="007")     # sem zeros
    assert not corresponde_pesquisa("9", "João Silva", numero="007")


def test_lista_de_socios_so_mostra_quem_comeca_pela_letra(cliente, admin, criar_socio):
    criar_socio(nome="Inês Ferreira", telefone="912200001")
    criar_socio(nome="Maria Silva", telefone="912200002")
    criar_socio(nome="Ana Costa", telefone="912200003")

    r = cliente.get("/api/members", headers=admin, params={"search": "i"})
    assert [m["name"] for m in r.json()] == ["Inês Ferreira"]


def test_nomes_proprios_aparecem_antes_dos_apelidos(cliente, admin, criar_socio):
    criar_socio(nome="Ana Isabel Costa", telefone="912200011")
    criar_socio(nome="Isabel Dias", telefone="912200012")
    criar_socio(nome="Inês Ferreira", telefone="912200013")
    criar_socio(nome="Maria Silva", telefone="912200014")   # nao deve aparecer

    nomes = [m["name"] for m in
             cliente.get("/api/members", headers=admin, params={"search": "i"}).json()]

    # Primeiro os nomes proprios por "i", em ordem alfabetica; depois os outros
    assert nomes == ["Inês Ferreira", "Isabel Dias", "Ana Isabel Costa"]


def test_apelido_aparece_logo_a_primeira_letra(cliente, admin, criar_socio):
    criar_socio(nome="Inês Ferreira", telefone="912200015")
    criar_socio(nome="Ana Costa", telefone="912200016")

    nomes = [m["name"] for m in
             cliente.get("/api/members", headers=admin, params={"search": "f"}).json()]
    assert nomes == ["Inês Ferreira"]


# ------------------------------------- procurar pelo numero de socio, sem zeros

def test_o_numero_encontra_se_sem_escrever_os_zeros():
    """Quem e o socio 002 escreve "2", nao "002"."""
    assert corresponde_pesquisa("2", "Fábio Guerreiro", "912345678", None, "002")
    assert corresponde_pesquisa("2", "Outro Qualquer", "913000000", None, "020")
    assert corresponde_pesquisa("2", "Outro Qualquer", "913000000", None, "200")
    assert not corresponde_pesquisa("2", "Outro Qualquer", "913000000", None, "003")


def test_ate_tres_digitos_procura_so_o_numero_de_socio():
    """Os numeros do ginasio tem tres casas: ate la, um numero e um socio.

    Senao "2" trazia toda a gente que tem um 2 no telefone, que e quase toda,
    e "913" trazia meio ginasio.
    """
    assert not corresponde_pesquisa("2", "João Silva", telefone="912345678", numero="007")
    assert not corresponde_pesquisa("45", "João Silva", telefone="912345678", numero="007")
    assert not corresponde_pesquisa("456", "João Silva", telefone="912345678", numero="007")
    # Do quarto digito em diante ja e uma procura pelo telemovel
    assert corresponde_pesquisa("4567", "João Silva", telefone="912345678", numero="007")
    assert corresponde_pesquisa("5678", "João Silva", telefone="912345678", numero="007")


def test_procurar_um_telemovel_ordena_pelos_nomes(cliente, admin, criar_socio, bd):
    """Do quarto digito em diante e uma procura de telemovel: mandam os nomes."""
    for numero, nome, telefone in [
        ("030", "Zulmira Nunes", "915500100"),
        ("031", "Aurora Pinto", "915500200"),
    ]:
        socio = criar_socio(nome=nome, telefone=telefone)
        bd.members.update_one({"id": socio["id"]}, {"$set": {"member_number": numero}})

    nomes = [m["name"] for m in
             cliente.get("/api/members", headers=admin, params={"search": "9155"}).json()]
    assert nomes == ["Aurora Pinto", "Zulmira Nunes"]


def test_procurar_por_numero_ordena_por_numero(cliente, admin, criar_socio, bd):
    """Escrever "2" da 2, 20, 21, 22 e so depois 200 — nao a ordem dos nomes."""
    for numero, nome in [
        ("002", "Fábio Guerreiro"),
        ("020", "Ana Antunes"),
        ("021", "Zacarias Nunes"),
        ("022", "Bruno Dias"),
        ("200", "Carlos Melo"),
        ("201", "Daniela Reis"),
        ("003", "Elsa Pinto"),      # nao deve aparecer
    ]:
        socio = criar_socio(nome=nome, telefone=f"9137{numero}0")
        # O numero de socio e atribuido pelo servidor; aqui fixa-se a mao
        bd.members.update_one({"id": socio["id"]}, {"$set": {"member_number": numero}})

    r = cliente.get("/api/members", headers=admin, params={"search": "2"})
    assert r.status_code == 200
    numeros = [m["member_number"] for m in r.json()]
    assert numeros == ["002", "020", "021", "022", "200", "201"]


def test_procurar_por_nome_continua_a_mandar_nos_nomes(cliente, admin, criar_socio):
    """A ordem por numero e so para quem escreve digitos."""
    criar_socio(nome="Dias Costa", telefone="912400001")
    criar_socio(nome="Dias Antunes", telefone="912400002")

    nomes = [m["name"] for m in
             cliente.get("/api/members", headers=admin, params={"search": "dias"}).json()]
    assert nomes == ["Dias Antunes", "Dias Costa"]
