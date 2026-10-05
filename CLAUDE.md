# KO Gym — Sistema de Gestão

Software de gestão do Ginásio KO (artes marciais e fitness, Portugal), com
aplicação web para a gestão e aplicação móvel para os sócios.

**Em produção:** https://ginasioko.site · **Idioma:** tudo em português de Portugal.

---

## Regras de negócio

Estas regras foram decididas pelo dono do ginásio. Não as altere sem lho perguntar.

### Estado do sócio: Ativo / Inativo

Regra única, sem exceções: **só está Ativo quem tem a mensalidade paga e dentro
da validade**. Sem pagamento registado, fica Inativo.

- A quota cobre até ao **mesmo dia do mês seguinte** (pago a 18 → válido até 18).
- Quando esse dia não existe no mês seguinte (31 de janeiro), passa para o
  **primeiro dia do mês a seguir** (1 de março). O sócio nunca perde dias.
- Uma **suspensão manual manda sempre**, mesmo com a quota paga.
- O estado é **calculado** (`membership_status`), nunca gravado na ficha. O campo
  `status` da ficha guarda apenas a suspensão e o histórico antigo.

### Seguro

- **Anual, 20 €.** Renova por 365 dias a partir da data de pagamento.
- A **validade da inscrição** (`expiry_date`) acompanha sempre o seguro.
- O aviso no painel usa a validade real: avisa a 30 dias, avisa quando expira, e
  cala-se assim que é pago.

### Pagamentos

Três tipos: **Quota**, **Seguro** (20 € automáticos) e **Mensalidade + Seguro**
(inscrição: renova a quota por um mês e o seguro por um ano num só lançamento).

Nas contas, um pagamento combinado é repartido: 20 € contam como seguro, o resto
como quota.

### Presenças e aulas experimentais

- Uma presença é sempre de um **sócio**, numa modalidade.
- As **aulas experimentais** ficam numa coleção à parte (`trial_classes`) e
  **nunca entram nas contagens de presenças** — inflacionariam as estatísticas
  com gente que não é sócia. Registam só a modalidade e a data.

### Modalidades

Um sócio pode ter **várias** (`activity_ids`). A primeira é a principal e é a
usada no check-in por NFC, que não permite escolher. `activity_id` existe para
compatibilidade e acompanha sempre a primeira da lista.

### Perfis de acesso

- **admin** — tudo.
- **staff (colaborador)** — Painel, Membros, Finanças e Stock. Nas Finanças vê
  o valor de **cada** pagamento e venda (precisa dele para conferir ao balcão),
  mas **não vê as contas do ginásio**: os cartões de faturação, despesa e
  resultado líquido aparecem-lhe sem números, e **não pode exportar**. Os
  **Relatórios são só do administrador** — mostram as contas todas.

### Sem pacotes

Não há Básico / Premium / VIP. O ginásio nunca os usou e o campo foi removido
em outubro de 2026; o que distingue os sócios são as **modalidades** e o estado
da quota. Fichas antigas podem ter o campo gravado — é ignorado.
- **member** — apenas a aplicação móvel.

---

## Estrutura

| Pasta | O que é |
|---|---|
| `backend/` | API em FastAPI (Python 3.11) + MongoDB. Tudo num ficheiro: `server.py` |
| `frontend/` | Aplicação web em React 19 (Create React App + craco, Tailwind, shadcn/ui) |
| `ko-gym-mobile/` | Aplicação do sócio, em Expo / React Native |
| `mobile-app/` | Apenas documentação antiga e um ficheiro de tema. **Não tem código** |
| `tests/` | Scripts de teste antigos, contra a API |

Coleções em MongoDB: `members`, `attendance`, `payments`, `expenses`, `sales`,
`trial_classes`, `inventory`, `activities`, `users`, `audit_logs`,
`automated_messages`, `motivational_notes`.

---

## Trabalhar no projeto

### Arrancar tudo (Windows)

`INICIAR-APP.bat` na raiz liga o MongoDB, o backend e o site. Está fora do Git,
por ser específico da máquina do dono.

À mão:

```bash
# MongoDB (versão portátil; a 8.x não corre neste Windows 10)
"$USERPROFILE/mongodb7/mongodb-win32-x86_64-windows-7.0.28/bin/mongod.exe" \
  --dbpath "$USERPROFILE/mongo-data" --bind_ip 127.0.0.1 --port 27017

cd backend && ./venv/Scripts/python.exe -m uvicorn server:app --host 127.0.0.1 --port 8001 --reload
cd frontend && yarn start     # http://localhost:3000
```

Configuração local (fora do Git): `backend/.env` com `MONGO_URL`, `DB_NAME`
(`ko_gym_dev`), `CORS_ORIGINS`, `ENVIRONMENT`; `frontend/.env` com
`REACT_APP_BACKEND_URL=http://localhost:8001`.

### Testes automáticos

Cobrem as regras de negócio acima. **Corra-os antes e depois de mexer no
backend** — são 108 testes e demoram 6 segundos.

```bash
cd backend && ./venv/Scripts/python.exe -m pytest tests -q
```

Ou, no Windows, dois cliques em `TESTAR.bat`.

As contas dos Relatórios têm testes próprios, no site (70 testes, 3 segundos):

```bash
cd frontend && yarn test --watchAll=false
```

Correm contra uma base de dados só deles (`ko_gym_test`), limpa antes de cada
teste, sem precisar do servidor a correr: a aplicação é carregada em memória.
Nunca tocam nos dados de desenvolvimento nem nos de produção.

Ao acrescentar uma regra de negócio, acrescente o teste que a protege. Se
alterar uma regra e um teste falhar, **confirme qual dos dois está certo** antes
de mexer no teste.

### Outras verificações

```bash
# Sintaxe, antes de qualquer outra coisa
cd frontend && node -e "require('@babel/parser').parse(require('fs').readFileSync('src/pages/X.js','utf8'),{sourceType:'module',plugins:['jsx']})"
cd backend && ./venv/Scripts/python.exe -c "import ast,io; ast.parse(io.open('server.py',encoding='utf-8').read())"
cd ko-gym-mobile && npx tsc --noEmit
```

E depois **ver mesmo no ecrã**: há puppeteer-core instalado na pasta de rascunho
da sessão, que abre o Chrome do sistema, faz login e tira fotografias. Foi assim
que se apanharam quase todos os erros reais desta base de código.

Dados de teste: crie-os pela API, verifique, e **apague-os no fim**. A base de
dados de desenvolvimento tem um "Membro Demo" (n.º 001).

---

## Publicar

O servidor é um VPS Ubuntu (`root@187.77.90.171`), com nginx a encaminhar o
domínio para quatro contentores Docker: site, backend, MongoDB e Redis. O
projeto está em `/root/ko-gym`, é um clone do mesmo repositório.

```bash
git push origin main
ssh root@187.77.90.171 "/root/backup-ko-gym.sh"            # cópia antes de mexer
ssh root@187.77.90.171 "cd /root/ko-gym && git fetch origin && git merge --ff-only origin/main"
ssh root@187.77.90.171 "cd /root/ko-gym && setsid nohup docker compose up -d --build > /root/deploy.log 2>&1 &"
```

A reconstrução tem de ser **lançada em segundo plano**: demora mais do que o
tempo limite da ligação SSH, e uma ligação que caia a meio deixa o trabalho por
acabar.

Cópias de segurança automáticas todas as noites às 3h30 (`/root/backup-ko-gym.sh`),
as últimas 30 em `/root/backups/`, registo em `/var/log/ko-gym-backup.log`.

### Aplicação móvel

```bash
cd ko-gym-mobile && npx eas-cli@latest build --platform android --profile teste --non-interactive
```

Conta Expo `ginasio-ko`. A arquitetura nova do React Native está **desligada de
propósito**: a biblioteca de NFC ainda não está testada nela, e o NFC é o
essencial da aplicação.

**Só é preciso gerar de novo quando muda algo no que se vê ou se faz no
telemóvel.** Regras de negócio e dados vêm do servidor e chegam sozinhos.

---

## Armadilhas que já custaram tempo

**Processos antigos presos à porta 8001.** Várias vezes um backend antigo
continuou a responder depois de alterações, dando a impressão de que o código
não funcionava. Se algo parecer não fazer efeito, mate todos os `python.exe` e
arranque de novo — não confie no `--reload`.

**Datas e fusos horários.** As datas são guardadas com hora
(`2026-09-25T00:00:00+00:00`). Em Portugal, `toISOString()` sobre uma data local
**recua um dia**. Use sempre os componentes locais:

```js
`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
```

Nas consultas ao servidor, o limite superior de um intervalo tem de ser o **dia
seguinte** (`$lt`), senão exclui o próprio dia.

**As contas dos Relatórios vivem em `frontend/src/lib/estatisticas.js`**, fora
dos ecrãs e com testes. As datas **nunca** passam por `new Date(texto)`: lê-se o
ano/mês/dia do próprio texto e comparam-se como números (`20261005`). Foi assim
que se resolveu o último dia do período ficar de fora no horário de verão.

**Cache do painel.** Os números do painel ficam em cache 5 minutos. Ao alterar
dados que os afetem, chame `BusinessCache.invalidate_member_cache()`.

**`PUT /api/members/{id}` substitui a ficha toda.** Quem chamar tem de reenviar
todos os campos, ou perde-os.

**Acentos no terminal.** Procurar texto com acentos em ficheiros compilados
falha por causa da codificação. Verifique pelo navegador, não por `grep`.

**PowerShell e UTF-8.** Enviar JSON com acentos pelo PowerShell corrompe-os. Para
testes com nomes portugueses, use Python.

---

## Convenções

- **Tudo em português de Portugal**, no ecrã e nas mensagens de erro. O código
  tem português e inglês misturados por razões históricas; siga o que estiver à
  volta.
- **Pesquisas** ignoram maiúsculas, acentos e as ligações dos nomes ("de", "da",
  "dos"): `corresponde_pesquisa()` no backend, `correspondePesquisa()` no
  frontend. Resultados por ordem alfabética.
- **Tema claro e escuro.** Toda a cor nova precisa da variante escura
  (`dark:`) ou de variáveis do tema. O tema escuro é o mais usado.
- **Cores da marca:** laranja `#B8651B`, âmbar `#F5A623`, fundo escuro `#1A1A1A`.
  Verde para receitas e estados em dia, vermelho para despesas e atrasos.
- **Comentários** só onde explicam uma decisão que não se percebe pelo código.
