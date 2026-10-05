"""Base dos testes automáticos do KO Gym.

Os testes correm contra uma base de dados só deles (`ko_gym_test`), que é
limpa antes de cada teste. Nunca tocam nos dados de desenvolvimento nem,
muito menos, nos de produção.

Não é preciso ter o servidor a correr: a aplicação é carregada em memória.
"""
import os
import sys
from datetime import date, timedelta
from pathlib import Path

import pytest

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

# Tem de ser definido antes de importar o servidor: é aí que ele lê a
# configuração e se liga à base de dados.
os.environ["DB_NAME"] = "ko_gym_test"
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ["RATE_LIMITS_ENABLED"] = "false"  # os testes fazem muitos pedidos seguidos

from fastapi.testclient import TestClient  # noqa: E402
import server  # noqa: E402


@pytest.fixture(scope="session")
def cliente():
    """A aplicação pronta a receber pedidos, com o arranque já feito."""
    with TestClient(server.app) as c:
        yield c


@pytest.fixture(scope="session")
def bd():
    """Ligação direta à base de dados de testes, para preparar e limpar.

    É síncrona de propósito: a ligação da aplicação está presa ao ciclo de
    eventos dela, e usá-la aqui dá erro de "loop diferente".
    """
    from pymongo import MongoClient

    ligacao = MongoClient(os.environ["MONGO_URL"])
    yield ligacao[os.environ["DB_NAME"]]
    ligacao.close()


@pytest.fixture(autouse=True)
def base_limpa(bd):
    """Apaga os dados de cada teste, para nenhum depender do anterior."""
    for coleccao in [
        "members", "attendance", "payments", "expenses",
        "sales", "trial_classes", "inventory", "audit_logs",
    ]:
        bd[coleccao].delete_many({})

    # O cache guarda números já calculados e enganaria os testes
    server.gym_cache.clear_pattern("")
    yield


@pytest.fixture(scope="session")
def admin(cliente):
    """Cabeçalho de autenticação do administrador criado no arranque."""
    r = cliente.post(
        "/api/auth/login",
        json={"username": "fabio.guerreiro", "password": "admin123"},
    )
    assert r.status_code == 200, "o administrador devia ser criado no arranque"
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope="session")
def colaborador(cliente, admin):
    """Cabeçalho de um utilizador com perfil de colaborador (staff)."""
    cliente.post(
        "/api/users",
        headers=admin,
        json={
            "username": "colaborador.teste",
            "full_name": "Colaborador de Teste",
            "password": "teste1234",
            "role": "staff",
        },
    )
    r = cliente.post(
        "/api/auth/login",
        json={"username": "colaborador.teste", "password": "teste1234"},
    )
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def modalidades(cliente, admin):
    """As modalidades criadas pelo sistema no arranque."""
    r = cliente.get("/api/activities", headers=admin)
    assert r.status_code == 200
    lista = r.json()
    assert lista, "o sistema devia criar as modalidades no arranque"
    return lista


@pytest.fixture
def criar_socio(cliente, admin):
    """Cria um sócio; devolve a ficha tal como o servidor a gravou."""
    def _criar(nome="Sócio de Teste", telefone="912000000", **extra):
        dados = {
            "name": nome,
            "phone": telefone,
            "date_of_birth": "1990-01-01",
            "nationality": "Portuguesa",
            "profession": "",
            "address": "Rua de Teste, 1",
        }
        dados.update(extra)
        r = cliente.post("/api/members", headers=admin, json=dados)
        assert r.status_code == 200, r.text
        return r.json()

    return _criar


@pytest.fixture
def pagar(cliente, admin):
    """Regista um pagamento para um sócio."""
    def _pagar(socio_id, valor=35.0, tipo="quota", quando=None):
        r = cliente.post(
            "/api/payments",
            headers=admin,
            json={
                "member_id": socio_id,
                "amount": valor,
                "payment_type": tipo,
                "payment_method": "cash",
                "payment_date": (quando or date.today()).isoformat(),
                "description": "teste",
            },
        )
        assert r.status_code == 200, r.text
        return r.json()

    return _pagar


def ficha(cliente, admin, socio_id):
    """Relê a ficha do sócio depois de uma alteração."""
    r = cliente.get(f"/api/members/{socio_id}", headers=admin)
    assert r.status_code == 200, r.text
    return r.json()


def dias(n):
    return timedelta(days=n)
