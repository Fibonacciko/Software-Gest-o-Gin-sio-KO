# KO Gym

O software do Ginásio KO. Há três programas aqui dentro, e todos usam a
mesma base de dados:

- o **site de gestão**, onde se trata dos sócios, dos pagamentos e do stock —
  está em https://ginasioko.site;
- o **servidor**, que guarda tudo e responde aos dois;
- a **aplicação do sócio**, no telemóvel, onde ele faz o check-in.

## O que é cada pasta

| Pasta | O que é |
|---|---|
| `frontend/` | O **site de gestão**. É o que abre no ginasioko.site |
| `backend/` | O **servidor**: a base de dados e as regras do negócio |
| `ko-gym-mobile/` | A **aplicação do sócio**, para Android |
| `servidor/` | Guiões da máquina onde isto corre (o VPS) |
| `CÓPIAS DE SEGURANÇA/` | As **cópias** guardadas neste computador. Não vai para o GitHub |
| `CLAUDE.md` | **As decisões todas**, por escrito: porque é que cada coisa é como é |

As outras pastas e ficheiros soltos na raiz (`mobile-app/`, `test_reports/`,
`backend_test.py` e companhia) são restos do princípio do projeto. Não fazem
falta a nada; ficam por não atrapalharem.

**Estes nomes não se mudam.** O `docker-compose.yml`, o servidor onde isto
corre e os atalhos desta máquina procuram as pastas por estes nomes — mudá-los
parava o site. Quem quiser saber o que cada uma é, lê esta tabela.

## Para trabalhar

| Ficheiro | O que faz |
|---|---|
| `INICIAR-APP.bat` | Liga tudo neste computador: base de dados, servidor e site |
| `TESTAR.bat` | Corre os testes do servidor |
| `GUARDAR-COPIA.bat` | Traz uma cópia de tudo do servidor para aqui |
| `CARREGAR-HORARIO.bat` | Carrega o horário das aulas |
| `REINICIAR-SERVIDOR.bat` | Reinicia o servidor desta máquina |

O resto — como se publica, como se corre, que decisões foram tomadas e
porquê — está todo no `CLAUDE.md`.

## Onde está guardado

- Neste computador, em `C:\GINASIO-KO`
- No GitHub: `Fibonacciko/Software-Gest-o-Gin-sio-KO`
- Em cópia completa, na pasta `CÓPIAS DE SEGURANÇA` (código, base de dados e
  fotografias)

A base de dados e as fotografias **não** estão no GitHub, de propósito: levam
os dados pessoais dos sócios. Vivem no servidor e nas cópias desta pasta.
