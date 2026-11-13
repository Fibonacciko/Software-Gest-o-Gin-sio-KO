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
- **O seguro saiu do Painel por inteiro.** Saíram os dois avisos: o do seguro
  já expirado e o dos que renovavam dentro de 30 dias ("Seguros a renovar em
  breve"). O estado do seguro vê-se agora em cada check-in, em cada presença
  de hoje, e os Membros têm o filtro "Seguro por regularizar" — três sítios
  onde ele aparece ao lado do nome de quem está ali à frente. Um aviso no topo
  do Painel dizia a mesma coisa uma quarta vez, e a toda a hora, a quem não
  podia fazer nada naquele momento. No Painel ficaram os avisos que não se
  veem em mais lado nenhum: os aniversários e os pedidos de plano.
- No **Painel**, a quota e o seguro aparecem sempre juntos: na ficha que abre
  depois do check-in (uma linha cada, com o selo no fim, alinhado com as
  modalidades) e em cada cartão das **Presenças de Hoje** ("Quota ativa",
  "Seguro inativo"). Num ginásio de artes marciais quem está ao balcão precisa
  de ver as duas ao mesmo tempo, e só a quota estava lá. Sem seguro na ficha o
  selo é **Inativo** e a linha diz "Sem seguro registado" — que não é o mesmo
  que ter expirado, e por isso se diz por palavras.
  (`seguroValido()`, em `frontend/src/lib/estatisticas.js`, com testes.)
- Na lista de **Membros**, o filtro de estado tem **"Seguro por regularizar"**:
  seguro em falta ou fora da validade, mas **só de quem esteve ativo nos
  últimos três meses** (`MESES_PARA_SEGURO`). Sem esse limite eram 289 fichas
  das 340, a maior parte de gente que já não treina há anos — uma lista que
  ninguém chega a usar. Com ele são 72, que é a lista a quem faz sentido pedir
  o seguro.
- **O filtro de estado segue o estado calculado**, não o campo `status` da
  ficha. Filtrar por esse campo dava uma lista que se contradizia: pedir
  "Ativos" trazia 131 fichas, 17 das quais apareciam com o selo INATIVO mesmo
  ao lado.

### Pagamentos

Três tipos: **Quota**, **Seguro** (20 € automáticos) e **Mensalidade + Seguro**
(inscrição: renova a quota por um mês e o seguro por um ano num só lançamento).

Nas contas, um pagamento combinado é repartido: 20 € contam como seguro, o resto
como quota.

### Início das contas

**As contas do ginásio começam a 1 de outubro de 2026** (`INICIO_DAS_CONTAS`,
em `frontend/src/lib/estatisticas.js`). Foi quando o sistema passou a ser usado
a sério: antes disso há pagamentos lançados mas muitas despesas que nunca foram
registadas, e o lucro que daí saía nunca existiu. 2027 será o primeiro ano
inteiro e certo.

- **Nada foi apagado.** Os 1007 pagamentos e as 37 despesas anteriores continuam
  na base de dados e na ficha de cada sócio. O que muda é só o que entra nas
  somas: Finanças e Relatórios.
- Aplica-se a **quotas, despesas, merchandise e aulas experimentais**.
- **Não se aplica às presenças nem às inscrições**, que estão certas desde o
  princípio e contam desde sempre.
- **Não toca nos seguros**: a validade vem da ficha do sócio, não destas somas.
  (Confirmado na altura: nenhum seguro válido vinha de um pagamento anterior.)
- Um período inteiramente anterior **não serve de comparação** — dizer que
  subiu tudo a partir de um zero que não é verdade engana mais do que informa.
  Nesses casos a comparação não aparece.

Para mudar a data, é só esse `INICIO_DAS_CONTAS`. Há testes a protegê-lo.

**A data do dinheiro e a data do pagamento são campos diferentes.** Seis
pagamentos lançados no fim de setembro de 2026 eram a mensalidade de outubro.
Esses têm `accounting_date` (1 de outubro): é por aí que o dinheiro entra nas
contas. A `payment_date` continua a ser o dia em que o sócio pagou, e é dela
que nasce a validade da quota — pago a 22, inativo a 23 do mês seguinte. Em
todos os outros pagamentos `accounting_date` é `None` e vale a `payment_date`.

Sem esta separação, mudar a data para as contas dava dias de ginásio a mais
ao sócio, e corrigir o pagamento mexia-lhe na validade sem ninguém perceber
porquê. Na lista de pagamentos aparece "Conta em <mês>" quando as duas datas
diferem.

### Despesas

A **descrição é opcional**. Uma despesa fica identificada pela **categoria** e
pela **data**; obrigar a escrever texto só levava a "vários" e a pontos finais.
Onde não há descrição, mostra-se o nome da categoria.

Consultam-se nas Finanças, no cartão **Despesas Registadas**, que abre uma
janela com filtro por **período** (hoje, este mês, mês passado, este ano, ano
passado, um dia certo ou um intervalo) e por **tipo**. Podem ser **corrigidas e
apagadas**, pelo administrador e pelo colaborador: quem as lança tem de as
poder emendar.

Ficam numa janela, e não numa secção da página, porque a lista de pagamentos
tem mais de mil linhas: tudo o que viesse a seguir ficava a dezenas de milhares
de pixeis de distância. Pela mesma razão, essa lista tem altura limitada.
Os filtros são aplicados pelo servidor (`GET /api/expenses` aceita
`start_date`, `end_date` e `category`), não no ecrã.

**Os cartões de Despesa não seguem este filtro**: a consulta das despesas e os
cartões das contas são duas leituras diferentes de propósito — filtrar a
consulta não pode mexer nas contas do ginásio.

### O dia dos cartões das Finanças

Os nove cartões do topo das Finanças são três linhas: faturação, despesa e
resultado líquido, cada uma pelo ano, pelo mês e pelo dia.

**Os cartões do ano e do mês nunca se mexem** — são as contas do ginásio e têm
de dizer sempre a mesma coisa a quem as abre. **Os três cartões do dia seguem
a data escolhida** no selector que está por cima deles ("quanto é que entrou
no sábado passado?", "quanto é que gastei em outubro?"). Por omissão é hoje, e
o botão **Hoje** traz de volta. A data que está a ser mostrada aparece por
baixo do número de cada um dos três, para não haver dúvida de que aquilo não é
hoje.

**Basta uma data.** O segundo campo — o "até" — nasce vazio e só se preenche
para ver um intervalo; vazio quer dizer *um só dia*. Antes eram duas datas
obrigatórias, e escolher o dia 5 deixava o "até" em hoje: pedia-se um sábado e
vinha o intervalo "5 até hoje", sem nada a dizer porquê. Escolher um dia
anterior ao fim do intervalo também deita fora o "até", que já não fazia
sentido.

A comparação é feita pelo **texto da data** (`'2026-10-18' >= '2026-10-01'`),
nunca por `new Date(texto)`: em Portugal isso recua um dia e o sábado passava
a sexta. A regra vive em `dentroDoPeriodo()`, em
`frontend/src/lib/datas.js`, com testes — inclusive o do "até" vazio.

O colaborador não vê nada disto — não vê as contas do ginásio, por isso também
não tem o selector.

### Presenças e aulas experimentais

- Uma presença é sempre de um **sócio**, numa modalidade.
- As **aulas experimentais** ficam numa coleção à parte (`trial_classes`) e
  **nunca entram nas contagens de presenças** — inflacionariam as estatísticas
  com gente que não é sócia.
- São **pagas: 5 €** (`TRIAL_DEFAULT_AMOUNT`), alterável em cada registo, e
  0 € quando são oferecidas. Esse dinheiro **entra na Faturação**, como o
  merchandise. Registam-se no Painel Principal, ao lado do Check-in.
- Um **check-in errado** corrige-se (a modalidade) ou apaga-se, no Painel. Uma
  presença a mais estraga as estatísticas do mês.

### Stock e vendas

Cada artigo tem **nome, tamanho e cor**, e são as três juntas que o
identificam: há Luvas de Boxe 12oz vermelhas e pretas, e vender umas em vez
das outras deixa o stock errado nas duas. Por isso o artigo mostra-se sempre
por extenso — `nome · tamanho · cor` — tanto na lista de escolha como na
janela de venda.

Vende-se **só pelo botão Vender do cartão do artigo**, ao lado do editar e do
eliminar. Não há nada para escolher: o artigo já vem fixo, e só se indica a
quantidade e o preço. O botão fica desativado quando o stock é zero.

Não há botão de venda no topo da página, nem lista de artigos para escolher —
foi de propósito, para não haver sítio nenhum onde se possa trocar um artigo
por outro igual de cor diferente.

**A venda não se associa a sócio.** O dono não precisa disso ao balcão, e o
campo só atrasava quem estava a cobrar. O servidor continua a aceitar
`member_id` e as vendas antigas que o tenham continuam a mostrar o nome nas
Finanças — só deixou de se perguntar.

### Aplicação do sócio: parceiros, multimédia e montra

O conteúdo que o sócio vê no telemóvel carrega-se na gestão, em **App do
Sócio** (só administrador) e no **Stock**:

- **Parceiros** — protocolos de parceria. O que mais conta é a **vantagem**
  ("10% em consultas"); o resto é contexto. Só o administrador os cria.
  **A ordem escolhe-se arrastando os cartões.** Conta porque a página inicial
  da aplicação mostra **um** parceiro — o primeiro da lista —, e o cartão
  desse traz o selo "Primeiro na aplicação". Antes a lista era alfabética e a
  única maneira de pôr outro à frente era mudar-lhe o nome. A posição é o
  campo `order`, que fica **fora do `PartnerCreate` de propósito**: o `PUT`
  substitui a ficha toda, e sem isso corrigir um telefone mandava o parceiro
  para o início. Um parceiro novo entra no **fim**, para não mudar de lugar
  aos que já lá estavam. `POST /api/partners/ordem` recebe os ids todos pela
  ordem que ficam — guardar a posição de um só obrigava a adivinhar o que
  fazer aos que ele passou à frente. Só administrador, e com testes.
- **Multimédia** — **fotografias alojadas aqui**, **vídeos por link** para as
  redes do ginásio. Um minuto de vídeo de telemóvel são 50 a 100 MB e as redes
  já têm o conteúdo e já têm público. O colaborador também pode publicar: é
  quem está no ginásio a tirar as fotos.
- **Loja** — a montra, vista do lado de cá. É a **mesma lista do Stock**:
  um artigo criado aqui aparece lá e vice-versa, porque é um só registo em
  `inventory`. O que esta página acrescenta é dizer, artigo a artigo, se ele
  chega mesmo ao telemóvel — **Na aplicação**, **Sem stock** ou
  **Falta a fotografia**. Sem isso, um artigo criado ficava invisível ao
  sócio e ninguém percebia porquê.
- O que tira um artigo da aplicação é **não ter fotografia**: o cartão ficava
  vazio (`GET /api/mobile/shop`).

**A montra é um artigo por cor. Os tamanhos são do Stock.**

O Stock desdobra cada modelo por tamanho *e* cor — os capacetes são nove
linhas, três cores a três tamanhos. Na montra isso davam nove cartões iguais,
só com a letra diferente, e por decisão do dono não é isso que o sócio deve
ver: **um artigo por cor**, sem o número do stock à vista.

- O agrupamento é por **nome e cor**, e o nome compara-se sem espaços nas
  pontas: há `T-Shirt` e `T-Shirt ` na base de dados e para o sócio são o
  mesmo artigo.
- Basta **um** dos tamanhos ter fotografia para o artigo aparecer: a
  fotografia é do produto, não do tamanho.
- Os tamanhos ainda com stock vão dentro do artigo (`sizes`), por ordem de
  vestuário e não alfabética (S antes de M), para a aplicação os oferecer.
- **A reserva continua a ser de um tamanho certo** (`item_id` daquela linha):
  a montra junta, a reserva não, senão o balcão não sabia qual preparar e o
  stock não dava baixa no sítio certo.
- Na gestão, o que se guarda na janela da Loja **vale para todos os tamanhos
  daquela cor** (nome, preço, descrição, galeria). O tamanho e a quantidade de
  cada um só se mexem no Stock, e a janela avisa disso.

**A ordem da montra é a que o dono escolheu** (`ORDEM_DA_MONTRA`, no
`server.py`, com testes). Não é alfabética: é uma ordem de loja — primeiro o
que mais sai e é mais barato, as t-shirts; no fim o equipamento de quem já
treina a sério. Dentro de cada família, as cores têm a ordem dele também, e
não é a mesma em todas.

- Os nomes comparam-se **sem acentos nem maiúsculas**: na base de dados há
  `Calcoes` e `Calções`, e para o sócio são o mesmo artigo.
- Os calções de kickboxing têm **dois nomes na base de dados** — `Calções
  Kick` e `Calções Kickboxing` — e são a mesma família. Estão os dois na
  lista, lado a lado, até o Stock ser arrumado; depois disso a linha antiga
  pode sair.
- Uma família ou uma cor que não esteja na lista vai para o **fim**, por
  ordem alfabética. Um artigo novo aparece sempre, e arruma-se depois — em
  vez de rebentar ou de se meter pelo meio.
- Para mudar a ordem, mexe-se nessa lista. Não há por onde a mudar na
  gestão: foi decisão de a deixar no código até o dono precisar de a mexer
  com frequência.

**Houve aqui uma rotação diária** que mudava a família a abrir a lista. Saiu:
nasceu para dar a volta aos **dois artigos** que o ecrã inicial mostrava, e
esse rolo saiu da página inicial por decisão do dono. Uma montra que muda de
ordem todos os dias é só uma montra onde não se encontra nada.

**O stock não esconde nada na montra.** Por decisão do dono: todos os
artigos e **todos os tamanhos** aparecem, haja ou não haja, e todos se podem
pedir. **Reservar é encomendar** — o sócio escolhe o tamanho dele e é ao
balcão que o ginásio lhe diz se tem ou se tem de esperar. O
`POST /api/mobile/reservations` também **deixou de olhar ao stock**: recusava
com "só restam N unidades", e um artigo esgotado não se podia pedir.

Houve uma versão pelo meio em que o artigo esgotado aparecia sem tamanhos e
com "Esgotado" em vez de "Reservar". Saiu: dava um artigo à vista que não se
podia pedir, e isso não é uma loja. A quantidade também deixou de ser
limitada pelo stock — o tecto são **10 unidades** (`MAXIMO_POR_RESERVA`), só
para ninguém pedir cinquenta por ter carregado no `+` distraído.

Na gestão, a Loja continua a marcar **Sem stock** nesses artigos. É **âmbar e
não vermelho**: é para quem está ao balcão saber, não é um artigo partido.

**As fotografias deslizam no próprio cartão**, na Loja e no ecrã inicial, sem
ser preciso abrir o artigo: um par de luvas vê-se pela frente e pelas costas
sem sair da lista (`CartaoDeDestaque`, com os pontinhos em baixo — sem eles
ninguém descobre que há mais do que uma fotografia). **Só as fotografias**: um
vídeo no cartão obrigava a um leitor por artigo, e dez leitores a rolar ao
mesmo tempo engasgam os telemóveis fracos — o vídeo fica para dentro do
artigo, que se abre um de cada vez.

**Cada artigo tem uma galeria: várias fotografias e vídeos curtos.**

Um artigo mostra-se por mais do que um lado — a frente, as costas, um detalhe —
e um vídeo de dez segundos diz de um par de luvas o que três fotografias não
dizem. A galeria é o campo `media` (`[{kind: "photo"|"video", url}]`).

- **A galeria manda na montra**, e a `photo_url` guardada é a **fotografia do
  Stock**: existe para a equipa reconhecer o artigo de relance ao balcão, e
  basta-lhe uma — por decisão do dono, não é ela que manda no que o sócio vê.
  Em produção havia **nove artigos em dezassete** em que as duas eram ficheiros
  diferentes, porque foram carregadas em alturas diferentes. A galeria é a que
  foi escolhida para a montra, e é essa que vale.
- **A primeira fotografia da galeria lidera o cartão**, e é também a que o
  `GET /api/mobile/shop` devolve como `photo_url`: assim a lista e o cartão a
  deslizar abrem na mesma imagem. Para trocar a que lidera, troca-se a ordem
  na janela da Loja.
- Na gestão, a Loja mostra essa mesma **capa** (a primeira da galeria), mas a
  janela de edição continua a guardar a fotografia do Stock no seu campo: se
  fossem o mesmo, abrir e guardar um artigo trocava-lhe a do Stock sem
  ninguém pedir.
- Uma ficha **sem galeria** (as que já lá estavam) fica com a do Stock como
  galeria de um só item. Uma galeria **só com vídeos** recebe-a à frente: a
  lista precisa de uma imagem parada. Não foi preciso migrar nada.
- A galeria é **do produto, não do tamanho**: junta-se a dos tamanhos todos
  daquela cor, sem repetir o mesmo ficheiro.
- Os **vídeos ficam alojados aqui**, ao contrário dos da Multimédia, que são
  links. A diferença é o tamanho e o propósito: um vídeo de montra são dez
  segundos de um artigo (limite de **30 MB**, contra 8 MB das imagens), e
  mandar o sócio ao Instagram a meio de uma compra fá-lo-ia não voltar.
- Na aplicação, a galeria desliza para o lado e o vídeo **arranca parado e
  sem som**: um vídeo a tocar sozinho no meio da loja rouba a atenção e gasta
  dados a quem só queria ver o preço.

### A ficha do ginásio

Morada, horário, contactos e links (Google Maps, avaliações, redes). Preenche-se
em **App do Sócio → O Ginásio** e é um registo único (`gym_info`). Só o
administrador a altera; o colaborador vê.

O botão de **deixar uma avaliação** no Google é o primeiro do ecrã na aplicação:
é o que mais ajuda o ginásio e é o que as pessoas se esquecem de fazer.

**O separador O Ginásio mostra se está aberto agora.** É a única coisa viva
numa página de informação parada, e é a pergunta que leva alguém a abri-la a
meio da tarde. O horário continua a ser **um campo de texto** na ficha; quem o
mostra é que o lê (`src/lib/horario.ts`, na aplicação).

- Uma **linha por conjunto de dias** ("Segunda, quarta e sexta: 10h00 - 14h00
  / 16h00 - 22h00"), e na gestão o campo é de **várias linhas** por isso
  mesmo.
- **Dois períodos por dia**, não um: o ginásio fecha para almoço. Ler só o
  primeiro dizia que às quatro da tarde estava fechado. A barra `/` separa os
  períodos; as mudanças de linha, as setas `»«`, o `|`, o `;` e o `*` separam
  as linhas.
- **Nunca se perde texto**: o que não se conseguir ler aparece como está,
  numa linha sua. Mais vale um horário feio do que um horário que desapareceu
  porque alguém o escreveu de outra maneira.
- A linha de **hoje** fica acesa, com o selo HOJE.

**O campo do Maps aceita uma morada, não só um link.** Está lá uma morada
escrita (`R. Almada Negreiros, 1800-070 Lisboa`), e o botão chamava o
`Linking.openURL` com aquilo, falhava em silêncio e não fazia nada. O que não
for link vai agora como procura no Maps.

**O "G" da Google** (`assets/google.png`) está ao lado do pedido de avaliação,
para se perceber de relance onde é que ela vai parar. É o ficheiro que a
própria Google publica para quem lhe aponta.

### Reservas

O sócio reserva na aplicação, o balcão prepara. **Reservar não é vender**: o
stock não se mexe. As reservas por tratar aparecem num cartão no topo do Stock.

**"Entregue" abre a venda**, com o artigo e a quantidade já preenchidos, e só
depois de a venda ser confirmada é que a reserva se fecha. São a mesma coisa —
o sócio leva e paga — e separá-las em dois botões deixava o stock por dar baixa
sempre que alguém se esquecesse do segundo.

### Fotografias

Ficam em **disco**, num volume do Docker (`uploads`), servidas pelo próprio
servidor em `/api/uploads/...`. Passam pelo encaminhamento que o site já tem,
por isso não é preciso mexer no nginx da máquina.

**As fotografias são servidas encolhidas à aplicação**
(`GET /api/miniaturas/<ficheiro>?w=720`). As da loja são de 1600x1600 — 2,6
milhões de pixeis — e o cartão onde aparecem tem 360: depois de abertas
ocupavam megabytes na memória, e com dezassete artigos o Android desistia de
desenhar algumas, deixando o cartão cinzento **sem erro nenhum**. De caminho,
poupa os dados de quem abre a loja na rua.

A miniatura fica guardada em disco (`uploads/.miniaturas/<largura>/`) depois
da primeira vez. Como os nomes dos ficheiros são sorteados, um nome nunca
muda de conteúdo e a cópia nunca fica velha — a pasta pode ser apagada sem
medo. Vive fora de `/api/uploads/...` de propósito: aquele caminho é servido
pelo `StaticFiles` e não passa por código nenhum. Fica **aberta**, como as
fotografias que encolhe: é a aplicação do sócio que as pede, e ela não leva
senha.

**Não vão para a base de dados.** As cópias de segurança são despejos da base,
e meia dúzia de fotografias punham um ficheiro de 15 MB a pesar centenas.
Limites: **8 MB** por imagem (jpg, png, webp, gif), **30 MB** por vídeo
(mp4, mov, m4v, webm) e **10 MB** por documento (pdf, para os planos).
`POST /api/uploads` devolve também o `kind` — `photo`, `video` ou `document`.

Em desenvolvimento a pasta é a de `UPLOADS_DIR` no `backend/.env`; nos testes é
`tests/_uploads`. Ambas fora do Git.

### Marcação de aulas

O horário é uma **grelha semanal fixa** — "segunda às 19:00, Boxe, Prof.
Ricardo, 20 lugares" — e as excepções são pontuais. Guardar cada aula de cada
semana daria milhares de registos iguais, e mudar uma hora obrigava a mexer em
todos.

Vê-se em **Aulas**, na barra lateral: em cima o horário, em baixo os próximos
catorze dias já com as inscrições.

**As aulas de hoje também estão no Painel** (`AulasDeHoje.jsx`), com quantos
se inscreveram em cada uma, e cada aula abre a lista de nomes — Veio, Inscrito,
Em espera. Está lá porque é a primeira coisa que quem abre o balcão de manhã
precisa de saber: o que o dia tem e quanta gente esperar. **O colaborador vê
este cartão** — é ele que está ao balcão. A página Aulas continua a ser onde
se mexe no horário. Sem aulas na grelha o cartão não aparece: um cartão vazio
só ocupa espaço.

- Só o **administrador** mexe na grelha (é o horário do ginásio). O
  **colaborador cancela uma aula pontual** — é ele que atende o telefone do
  professor doente.
- Uma **excepção** cancela ou muda a hora de um dia só, sem tocar na grelha.
  Desligar a aula (`is_active`) tira-a do horário sem a apagar, para uma pausa
  de verão.
- As aulas têm **lotação**. Cheia, o sócio entra em **lista de espera** e sobe
  sozinho quando alguém desiste — sobe quem espera há mais tempo.
- **Qualquer sócio marca**, mesmo com a quota por regularizar: decisão do
  dono, que resolve a quota ao balcão.
- **Desmarca-se até 2 horas antes** (`MINUTOS_PARA_DESMARCAR`). Depois disso o
  lugar é seu, apareça ou não — senão ninguém da lista de espera chegava a
  tempo de aproveitar.
- **O check-in risca a inscrição.** Procura-se a aula daquela modalidade mais
  próxima da hora do check-in, desde uma hora antes até ao fim: quem tem Boxe
  às 19:00 e Jiu-Jitsu às 20:15 e entra às 20:10 vem para a segunda.
- **"Faltou" não se grava, calcula-se** (`estado_da_inscricao`): uma inscrição
  que ficou em "tem lugar" depois de a aula acabar é uma falta. Gravá-la
  obrigava a um trabalho nocturno, e uma noite em que ele não corresse deixava
  faltas por marcar para sempre.
- O dia da semana é **0 = segunda**, como o `weekday()` do Python, dos dois
  lados.
- A aula tem um **nível ou turma** (`label`) à parte da modalidade: "Kids",
  "Iniciados", "Nível I/II". O Boxe de iniciados e o Boxe de nível III são a
  mesma modalidade para as presenças e para as contas, e turmas diferentes
  para quem se inscreve. Fica vazio quando não há níveis.

**As consultas por dia de aula passam todas por `dia_guardado()`.** As datas
são gravadas com hora (`2026-11-16T00:00:00+00:00`); procurar por
`"2026-11-16"` não encontra nada, e o erro é silencioso — a consulta devolve
zero e tudo parece só estar vazio. Foi assim que a lotação e a lista de espera
falharam na primeira versão.

### Avaliações físicas

O que a balança de bioimpedância mede, lançado à mão pelo colaborador na ficha
do sócio (**Membros → ver a ficha → Avaliação física**) e mostrado na aplicação
em **A tua evolução**. A balança não fala com nada: se um dia exportar um
ficheiro, importa-se; não valia a pena esperar por isso para começar.

- Guarda-se o que foi medido: **peso** (o único obrigatório), altura, massa
  gorda (%), massa muscular (kg), água (%), gordura visceral e idade
  metabólica. Tudo o resto é opcional — nem todas as balanças dão tudo, e é
  melhor uma avaliação com três números certos do que obrigar a inventar os
  outros.
- **O IMC é calculado, nunca gravado** (`calcular_imc`), do peso e da altura
  da própria avaliação. Pela mesma razão por que o estado do sócio não se
  grava: um número gravado sobrevive à correção do número que lhe deu origem,
  e aí o gráfico passa a mentir sem ninguém dar por isso. Há um teste só para
  isto.
- A **altura fica na avaliação** e não na ficha, para acompanhar a data: um
  sócio que cresceu entre duas medições tem o IMC certo nas duas. Ao criar
  uma avaliação nova, o ecrã traz a altura da anterior.
- A gestão vê **da mais recente para trás** (interessa o que foi medido da
  última vez); a aplicação vê **da mais antiga para a frente**, que é como se
  desenha uma linha de evolução.
- As setas de tendência sabem **para que lado é boa notícia**: descer no peso
  e na massa gorda, subir na massa muscular e na água.
- O **colaborador regista e corrige** — é ele que está ao balcão com a
  balança.
- O gráfico da aplicação é feito de **barras com `View`**, e não com uma
  biblioteca de gráficos: uma biblioteca eram mais uns megabytes e uma peça
  do motor, que obrigava a instalar a aplicação de novo a cada afinação.
  Assim chega pelo ar como tudo o resto. A escala **não começa no zero** —
  num sócio entre os 80 e os 84 quilos, começar no zero dava barras todas
  iguais.

### Planos de treino e alimentares

Um plano é **um documento**: um PDF do professor ou do nutricionista, ou texto
escrito à mão na gestão. Carrega-se em **Membros → ver a ficha → Planos**, e o
sócio lê-o na aplicação em **Os teus planos**.

- Tem de ter **uma coisa ou a outra** — ficheiro ou texto. Um plano vazio não
  é um plano: o sócio abria e não encontrava nada.
- **Guardar um plano novo não apaga o anterior.** É o histórico que permite
  dizer ao sócio o que mudou desde a última vez. A aplicação mostra o mais
  recente de cada tipo.
- O sócio **pede um plano novo** pelo botão, e o pedido aparece no **Painel**,
  com os aniversários. Carregar duas vezes no botão não faz dois pedidos,
  senão o Painel enchia-se de pedidos iguais.
- **Guardar o plano fecha o pedido sozinho**, e só o do mesmo tipo: carregar
  um plano de treino não risca um pedido de nutrição.
- Apagar um plano só apaga o PDF **se mais nenhum plano o usar** — dar o mesmo
  plano a dois sócios não pode deixar um deles sem nada.
- Isto é o plano *como documento*. Uma biblioteca de exercícios com séries,
  repetições e cargas é outro produto, e muito maior; foi decisão do dono
  começar por aqui.

### Modalidades

**Os emoji dos nomes não aparecem na aplicação.** Na base de dados as
modalidades chamam-se `🥊 Boxe`, `🦵 Kickboxing`, `🏋️ Musculação`. Juntos num
ecrã são uma luva, uma perna, um quimono, um bíceps e um halterofilista —
desenhos de autores diferentes, tamanhos diferentes, e em Android alguns nem
aparecem iguais. Por decisão do dono saem (`semEmoji()`, em
`src/lib/nomes.ts`, com testes), e o que fica a distinguir cada modalidade é
a **cor**, que cada uma já tem e que é a mesma em todo o lado.

Só se tira o que está **à frente** do nome: um emoji no meio de um nome
escrito à mão é escolha de quem o escreveu.

**Na base de dados eles ficam, e a gestão mostra-os** — decisão do dono,
tomada depois de ver a alternativa: ao balcão os emoji ajudam a correr os
olhos pela lista, e quem lá trabalha já os conhece. É **só ao sócio** que
não aparecem. Por isso a limpeza é de quem mostra e nunca do que está
guardado: o `semEmoji()` fica como a maneira de o fazer, e não há script
nenhum que lhes mexa na origem.

Chegou a haver uma lista de emoji alternativos, mais sérios, para escolher.
O dono viu-a e preferiu **não ter emoji nenhum na aplicação** — o que os
tornava infantis não era serem emoji, era serem pessoas e pedaços de pessoas:
uma perna, um bíceps, uma bailarina.

**As modalidades mexem-se nas Aulas**, no cartão do fim da página, e **só
pelo administrador** — é o horário do ginásio. Até novembro de 2026 não havia
ecrã nenhum: a API tinha as rotas e ninguém lhes chamava, e os nomes de hoje
foram postos à mão, por fora do software.

- **Não se apagam, desligam-se** (`is_active`), e **podem voltar**
  (`POST /api/activities/{id}/ligar`). Desligar não apaga nada, por isso tem
  de haver caminho de volta — sem ele, um engano só se corrigia por fora.
- **Antes de desligar, o ecrã pergunta ao servidor quem fica preso**
  (`GET /api/activities/{id}/uso`: sócios, presenças e aulas) e mostra o
  número. O id de uma modalidade desligada continua gravado nas fichas e nas
  presenças, e essas passam a mostrar uma modalidade sem nome.
- Uma modalidade desligada **não aparece em mais lado nenhum**: o
  `GET /api/activities` só as devolve a quem pedir
  `incluir_desligadas=true`, e só esta página pede.
- **Corrigir o nome não a ressuscita**: o `PUT` mexe no nome, na cor e na
  descrição, e não no estado.
- A **cor** é o que distingue a modalidade em todo o lado — nas presenças, no
  horário e na aplicação do sócio, onde é a única marca (ver os emoji, acima).
  Por isso escolhe-se de uma paleta, e não à sorte.


Um sócio pode ter **várias** (`activity_ids`). A primeira é a principal;
`activity_id` existe para compatibilidade e acompanha sempre a primeira da
lista.

**Com mais do que uma, pergunta-se sempre qual é — nos dois lados.** No
balcão, a janela "Modalidade do check-in"; na aplicação, "O que vais
treinar?", antes de o telemóvel ler a etiqueta. A etiqueta NFC em si não
diz modalidade nenhuma: só confirma que a pessoa está mesmo no ginásio.
Com uma só modalidade não se pergunta nada, que não havia escolha.

Na aplicação, as modalidades do sócio aparecem **debaixo do número de
sócio**, junto ao nome: é o que ele é no ginásio. Estavam no fim da
página, a seguir aos planos, onde não diziam nada a ninguém.

### Perfis de acesso

- **admin** — tudo.
- **staff (colaborador)** — Painel, Membros, Finanças e Stock. Nas Finanças vê
  o valor de **cada** pagamento e venda (precisa dele para conferir ao balcão),
  mas **não vê as contas do ginásio**: os cartões de faturação, despesa e
  resultado líquido aparecem-lhe sem números, e **não pode exportar**. Os
  **Relatórios são só do administrador** — mostram as contas todas. Consulta a
  lista de despesas (regista-as, por isso tem de as poder conferir), mas sem
  valores e sem o total.
  No **Painel** vê as **presenças por modalidade** e as **aulas de hoje**: é
  ele que está ao balcão a ver quem entra. Não vê os **Membros Ativos** —
  quantos sócios têm a quota em dia é um retrato do negócio, e esse é do dono.
  O estado de cada sócio, um a um, vê-o na ficha e no check-in, que é o que
  precisa para cobrar ao balcão.

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
`trial_classes`, `inventory`, `activities`, `assessments`, `plans`,
`plan_requests`, `class_slots`, `class_exceptions`, `class_bookings`,
`users`, `audit_logs`,
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
backend** — são 270 testes e demoram 13 segundos.

```bash
cd backend && ./venv/Scripts/python.exe -m pytest tests -q
```

Ou, no Windows, dois cliques em `TESTAR.bat`.

As contas dos Relatórios e a pesquisa têm testes próprios, no site (133 testes,
4 segundos):

```bash
cd frontend && yarn test --watchAll=false
```

Correm contra uma base de dados só deles (`ko_gym_test`), limpa antes de cada
teste, sem precisar do servidor a correr: a aplicação é carregada em memória.
Nunca tocam nos dados de desenvolvimento nem nos de produção.

A **aplicação do sócio** também tem os seus (34 testes, 4 segundos):

```bash
cd ko-gym-mobile && npx jest
```

Protegem a lógica que vive só na aplicação: o **horário** lido do texto da
ficha (`lerHorario`, `estadoDeHoje`), a **data à portuguesa**, o **nome no
cartão** e os **endereços das imagens**, miniaturas incluídas. São testes de
funções, não de ecrãs: o que se vê continua a confirmar-se no navegador.

**Não há atalho `yarn test` aqui, e é de propósito.** Qualquer mexida nos
`scripts` do `package.json` **muda a impressão digital** da aplicação — medido:
`613482ae…` passava a `e26407e0…` — e a partir daí as atualizações pelo ar
deixavam de chegar a quem a tem instalada. As bibliotecas de teste em
`devDependencies` e a configuração `jest` no mesmo ficheiro **não mexem** na
impressão digital; só os `scripts`. O atalho entra quando houver um APK novo.

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

**A aplicação distribui-se pelo próprio site: https://ginasioko.site/app**

O endereço que a Expo devolve é comprido e o Chrome desconfia de ficheiros
`.apk` vindos de fora. O ficheiro fica em `/var/www/ko-app/ko-gym.apk` no
servidor, com uma página de instruções em `/var/www/ko-app/index.html`, servidos
pelo nginx da máquina (ver `servidor/nginx-servir-app.sh`, que é idempotente).

Depois de gerar uma versão nova:

```bash
ssh root@187.77.90.171 "curl -sL -o /var/www/ko-app/ko-gym.apk '<url da Expo>'"
```

Conta Expo `ginasio-ko`. A arquitetura nova do React Native está **desligada de
propósito**: a biblioteca de NFC ainda não está testada nela, e o NFC é o
essencial da aplicação.

### Atualizações pelo ar (OTA)

**Da versão 1.1.8 em diante, a aplicação atualiza-se sozinha.** Ao abrir, vai
buscar a versão nova e aplica-a na abertura seguinte. O sócio não instala nada.

```bash
cd ko-gym-mobile && npx eas-cli@latest update --branch producao --message "o que mudou"
```

**O que vai pelo ar e o que não vai.** A aplicação tem duas partes: o *motor*
(o código nativo) e o *caderno de instruções* (o JavaScript e as imagens). O
OTA troca o caderno.

- **Vai:** ecrãs, textos, cores, disposição, regras de negócio, imagens
  dentro de `assets/`.
- **Não vai:** uma biblioteca nova com código nativo (`expo-image-picker`,
  `expo-video`, o NFC), uma permissão nova, uma subida de SDK, ou qualquer
  coisa em `app.json` que mexa no nativo. Aí é preciso **gerar e instalar um
  APK**, e só depois voltam a chegar atualizações pelo ar.

**`runtimeVersion` é `fingerprint`**, e é o que torna isto seguro: a Expo
calcula uma impressão digital do lado nativo, e uma atualização só chega a
quem tem a mesma. Sem isso, mandar código que precisa de uma peça que a
aplicação instalada não tem rebentava-a no arranque — e nessa altura já não há
como lhe mandar a correção. Em troca, mudar o nativo *obriga* a um APK novo; é
o preço certo a pagar.

O canal é **`producao`** nos dois perfis de compilação, e o ramo das
atualizações tem o mesmo nome.

**Como voltar atrás.** Uma atualização pelo ar desfaz-se com outra: volta-se
a publicar a que estava boa, e os telemóveis apanham-na na abertura seguinte.

```bash
cd ko-gym-mobile
npx eas-cli@latest update:list --branch producao --limit 10   # os grupos
npx eas-cli@latest update:republish --group <id do grupo bom>
```

Não se apaga a má — não há como —, **publica-se a boa outra vez** por cima.
Por isso é que vale a pena guardar o id do grupo de cada versão dada como
certa: ficam nas **etiquetas do Git** (`git tag -n99 producao-...`), ao lado do
que essa versão tinha.

Se a aplicação **nem chegar a abrir**, o `update:republish` não salva — ela
fecha antes de ir buscar o que quer que seja. Aí reinstala-se o APK de
https://ginasioko.site/app, que traz o código embutido e volta a apanhar
atualizações a partir daí. Foi o que se fez quando o Skia a partiu.

**Como confirmar que chegou:** no fundo do cartão do sócio há uma linha
miudinha — `Versão 1.1.8 · a1b2c3`. O primeiro número é a versão instalada; as
seis letras são a atualização que veio pelo ar, e mudam a cada publicação.
Numa aplicação acabada de instalar ainda não há letras nenhumas.

**Só é preciso gerar um APK quando se mexe no motor.** Tudo o resto — regras de
negócio, dados e ecrãs — chega sozinho: os parceiros, as fotografias, a montra
e a ficha do ginásio aparecem na aplicação que já está instalada.

### O que a aplicação tem

Seis separadores numa barra em baixo, feita à mão: não há biblioteca de
navegação, que traria meia dúzia de dependências a uma aplicação que ainda é
instalada à mão em cada telemóvel.

**Muda-se de ecrã deslizando o dedo para o lado**, e a barra é a segunda
maneira de lá chegar. Os seis ecrãs vivem lado a lado numa tira que desliza
(uma `ScrollView` com páginas, no `App.tsx`), pela mesma ordem da barra — que
vem de `ORDEM_DOS_SEPARADORES`, uma lista só, porque com duas um dia
deslizava-se para a direita e ia-se parar ao separador da esquerda.

- **Só se monta o que já foi visto.** Montar os seis ao arrancar punha seis
  ecrãs a pedir dados ao servidor ao mesmo tempo, para ver um. O lugar de cada
  um está sempre lá, vazio, para as contas do deslize baterem certo.
- A barra **acende o separador novo quando a página passa de meio**, e não só
  quando ela assenta — esperar pelo fim dava uma barra sempre meio passo
  atrás.
- Quando é o dedo a mandar, **a tira não volta a ser mandada para lá**
  (`veioDoDedo`): senão saltava debaixo do dedo de quem a arrasta.
- Na Loja, deslizar **em cima da fotografia** de um artigo muda a fotografia;
  fora dos cartões, muda de ecrã.
- **Isso não acontece sozinho.** Em Android, quem está por fora fica com o
  arrasto horizontal assim que o detecta: a galeria ficava com o dedo meio
  segundo e depois era a tira que lhe levava o gesto. A tira trava enquanto o
  dedo está numa galeria (`ContextoDaTira`), e solta-se em **todas** as saídas
  — uma esquecida deixava a aplicação sem deslize até se fechar.
- **O travar não passa por estado nenhum**: é `setNativeProps` na tira. A
  primeira tentativa guardava-o num `useState` do `App`, e cada toque obrigava
  a aplicação inteira a redesenhar-se **a meio do gesto**: as fotografias
  continuaram sem rodar e, ao abrir um artigo, a janela aparecia sem imagem
  nenhuma. `setNativeProps` não existe na versão web — a chamada vai protegida,
  e lá não faz falta.

| Separador | O que é |
|---|---|
| **Início** | Cartão, check-in, treinos, evolução e planos |
| **Aulas** | O horário dos próximos 14 dias, com marcação e lista de espera |
| **Loja** | A montra e as reservas do sócio |
| **Fotos** | Fotografias dos treinos e vídeos por link |
| **Parceiros** | Protocolos de parceria, com a vantagem em destaque |
| **Ginásio** | Morada, horário, contactos, mapa e avaliações |

**O Início acaba nos planos, e é todo do sócio**: o cartão, o check-in, o QR,
a quota e o seguro, os treinos, a evolução e os planos. Mais nada.

As **fotografias do ginásio**, a **montra** e os **protocolos dos parceiros**
estiveram no fim desta página, num rolo (`RoloDoInicio`, apagado). Saíram por
decisão do dono depois de se passar a mudar de ecrã deslizando o dedo: com os
seis ecrãs à distância de um gesto, repeti-los aqui era dizer a mesma coisa
duas vezes e dar à página inicial um fim que não acabava. Saíram com eles três
pedidos ao servidor que o ecrã inicial fazia sempre.

**O QR não está à vista.** Abre-se no botão "Mostrar o meu QR", em ecrã inteiro
e com fundo branco — que é como se lê bem na receção. Um QR pequeno no meio da
página era mau para ler e feio de ver.

**O botão do QR fica logo por baixo do check-in**, e não no fundo da página.
É a outra maneira de fazer a mesma coisa — e quem precisa dele (telemóvel sem
NFC, etiqueta que não lê) precisa dele naquele momento, não depois de rolar
por tudo o resto.

**A frase vem agarrada aos números dos treinos**, logo a seguir: é deles que
ela fala. Estava depois dos planos, longe do que lhe dava sentido.

**O check-in só se faz com a etiqueta NFC.** Carregar no botão começa a leitura;
a presença só é registada depois de o telemóvel tocar no autocolante. Num
telemóvel sem NFC o botão abre o QR, para a receção o ler. Antes disto, um
telemóvel sem NFC registava a presença só por se carregar no botão — de casa, do
carro, de qualquer lado — e isso estragava as contas de presenças.

**O fundo** (`src/componentes/Fundo.tsx`) são camadas de ecrã inteiro que
respiram devagar, deslizam e se inclinam.

**As manchas de luz, a vinheta e o grão são imagens** — `luz.png`,
`vinheta.png` e `grao.png`, em `ko-gym-mobile/assets/`, geradas com o
`ko-gym-mobile/assets/desenhos.py`. São 68 KB as três. Uma **mancha redonda de luz sem
bordo** não se faz com um gradiente linear: dentro de um círculo ele deixa
sempre um bordo a atravessar o ecrã, e por isso o fundo nunca teve nenhuma. A
**vinheta** escurece os cantos e o **grão** vai por cima de tudo — sem ele um
gradiente escuro parte-se em bandas visíveis, e o olho lê bandas como tinta
chapada.

As duas imagens de ecrã inteiro levam **largura e altura explícitas**, e não
`StyleSheet.absoluteFill`: uma `<Image>` sem medidas fica do tamanho natural do
ficheiro — 512 pixeis — e via-se a emenda a meio do ecrã.

**O fundo não se desenha com o Skia.** Tentou-se
(`@shopify/react-native-skia`) e a aplicação **instalava e fechava ao abrir**,
com quatro telas sobrepostas e também com uma só, parada. Em Android, com a
arquitetura antiga do React Native — que está desligada por causa do NFC —, a
parte nativa do Skia não arranca. O estouro é **nativo**: não deixa erro de
JavaScript nenhum para ver, e o mesmo código corre bem no navegador, o que
manda procurar no sítio errado. Duas versões se perderam assim. Não voltar a
tentar sem a arquitetura nova ligada.

O movimento é `Animated` com `useNativeDriver`: corre do lado nativo, não passa
por JavaScript a cada imagem e não gasta bateria. Anima-se **só opacidade e
deslocação** (`translate`).

**A profundidade vem das velocidades diferentes**: as camadas andam 20, 48 e 85
pixeis de um extremo da inclinação ao outro (começaram em 10/22/36 e não se
notava), e a luz de cima anda mais do que todas, que é a que parece estar à
frente.

**Os escuros da aplicação são verde-azulados, não cinzentos** — por decisão
do dono, e vieram da fotografia da porta do ginásio: `#0c1417` no escuro,
`#3a6c61` na parede iluminada, `#aee0bb` no halo da luz. São as três cores que
mandam no fundo todo (`cores.fundo`, o gradê do `Fundo.tsx`, e a `cores.luz`
com que as manchas são tingidas).

De caminho resolveu-se uma coisa: **o laranja da marca destaca-se muito mais
em cima de verde-azulado**, porque são cores opostas. O cinzento competia com
ele. O laranja continua a ser só para o que é para carregar — o check-in, os
números, o logótipo — e nunca para o fundo.

**A porta do ginásio aparece em dois sítios**, cortada de maneiras
diferentes da mesma fotografia:

- `assets/porta.jpg` — a porta inteira, **cortada no feitio do telemóvel**
  (9:19,5), por trás do ecrã de entrada. É o único ecrã de pé como a
  fotografia, e entrar na aplicação é mesmo entrar pela porta. Leva um
  escurecimento por cima, mais forte em baixo, onde estão os campos.
- `assets/ginasio.jpg` — a **capa do cartão do sócio**: a toda a largura e
  **até ao topo do ecrã**, por baixo da barra de estado. Em cima da soleira
  ficam as **modalidades** e, por baixo delas, o **número de sócio** — que é
  o que menos se lê dos três. O **retrato do sócio**, que também é o botão
  de o trocar, fica no canto de cima. O **nome** fica **a cavalo no bordo
  de baixo da fotografia** — metade das letras em cima dela, metade no espaço
  até ao check-in. Numa linha só sua empurrava os cartões todos para baixo;
  a cavalo no bordo não ocupa linha nenhuma.

  O quanto ele desce é o `NOME_A_ESPREITAR`, e mede-se **pelas letras e não
  pela caixa de texto**: a caixa tem espaço vazio por cima das maiúsculas, e
  a acertar por ela as letras mal tocavam a fotografia. O mesmo número manda
  na folga que a capa deixa por baixo, para o espaço que sobra até ao
  check-in ser o mesmo que separa o número da modalidade. O corte da imagem deixa **ar por cima do "DIA UM"**: a
  começar mais abaixo, ele roçava o bordo. Estavam num bloco à parte, por cima de
  uma fotografia pequena com margens; assim a fotografia é a primeira coisa
  que se vê. Leva um escurecimento em cima, por causa da barra de estado, e
  em baixo, para o nome se ler em cima do chão iluminado.

Os cortes são feitos **no ficheiro**, não com `resizeMode`: assim sabe-se o
que fica dentro do quadro. E as duas `Image` levam **largura e altura
explícitas** — sem elas ficam do tamanho natural do ficheiro e vê-se só o
canto, que foi o que aconteceu à primeira.

**O ecrã de arranque ainda é cinzento, e fica assim de propósito.** O
`splash.backgroundColor` e o fundo do ícone, no `app.json`, continuam em
`#1A1A1A`. Mudá-los **muda a impressão digital** — medido: de
`613482ae…` para `3fde3f56…` — e a partir daí as atualizações pelo ar
deixam de chegar a quem tem a aplicação instalada, até instalar um APK novo
de 99 MB.

Trocar isso por **um segundo de cinzento na abertura** não compensa. A
alteração fica para a próxima vez que houver uma razão verdadeira para gerar
um APK — uma biblioteca nova, uma permissão, uma subida de SDK — e nessa vai
de boleia, sem custar nada a ninguém.

**A profundidade vem da inclinação, não de um motor 3D.** As três camadas do
fundo são maiores do que o ecrã e deslizam a velocidades diferentes conforme
se inclina o telemóvel (`expo-sensors`, acelerómetro a 8 leituras por
segundo, suavizadas com `spring` porque o sensor treme sempre um pouco). É a
*diferença* entre as velocidades que o olho lê como 3D. Um motor 3D a sério
daria o mesmo efeito gastando bateria e engasgando nos telemóveis fracos,
numa aplicação cujo trabalho é um check-in de dois segundos.

Nem todos os aparelhos têm acelerómetro — no navegador não há —, por isso
pergunta-se primeiro (`isAvailableAsync`). Sem essa pergunta a aplicação
rebentava a arrancar; com ela, o fundo fica quieto e o resto funciona.

**As superfícies são de vidro.** Deixaram de ser cinzentos opacos
(`rgba(45,45,45,…)`) e passaram a branco com pouca opacidade mais um **bordo
claro em cima** — é o risco de luz que faz o efeito, não a transparência. Um
cinzento fixo só funcionava em cima daquele fundo; o branco translúcido
funciona em cima de qualquer um.

**Desfocar é só para o que não rola** (`<Vidro desfocado>`): a barra de baixo,
o cartão do estado, as janelas. Desfocar é trabalho para a placa gráfica a
cada imagem, e numa lista a rolar com dez cartões à vista isso nota-se nos
telemóveis fracos. Nos restantes chega `superficie`, do `theme.ts`, que a
olho dá quase o mesmo e não custa nada.

**Os cartões pairam, e isso são quatro coisas ao mesmo tempo** — nenhuma
delas chega sozinha num fundo preto:

1. **Andam ao contrário do fundo.** Ao inclinar o telemóvel, o cartão desliza
   14 pixeis para o lado oposto ao das camadas de trás. É assim que o olho
   distingue uma coisa pousada de uma coisa suspensa: a pousada acompanha o
   que está atrás, a suspensa move-se contra. A inclinação vem do `Fundo` por
   contexto (`ContextoDaInclinacao`); sem `Fundo` à volta, ou num aparelho sem
   acelerómetro, o cartão fica quieto e nada se parte.
2. **A luz que cai no painel**: um gradê de canto a canto dentro do `Vidro`,
   mais claro em cima à esquerda. É o que lhe dá corpo — o risco de luz no
   bordo, sozinho, dava-lhe o contorno mas não o volume.
3. **O bordo claro em cima** (`vidroBrilho`), que já lá estava.
4. **Uma sombra larga e fraca**, agora em todos os cartões e não só no botão
   de check-in. É chão, não é relevo: curta e escura fazia o cartão parecer
   recortado em papel. O botão de check-in continua a ser o único com **sombra
   alaranjada**, que é o que o mantém à frente de tudo.

**O pó de luz** (`particulas.png`) enche o fundo sem lhe dar assunto: pontos
de **branco sujo** de tamanhos muito diferentes — todos iguais leem-se como um
padrão, e um padrão chama a atenção a si próprio. Entra em **duas camadas da
mesma imagem**: a de trás inteira e devagar, a da frente ampliada a 156% e a
andar mais do que tudo o resto, que é o que faz parecer haver espaço entre
elas. A imagem tem feitio de telemóvel (900x1900) e não quadrado, para os
pontos não saírem ovais ao esticar.

Não se usam imagens apanhadas na internet para isto, por mais que o efeito
sirva: têm dono. As do fundo são todas geradas pelo `desenhos.py`.

**Logótipos nunca se cortam; fotografias sim.** Um logótipo entra com
`resizeMode="contain"` — cortar um logótipo estraga-o, e eles vêm de todos os
feitios. Uma fotografia entra com `cover`, que enche o espaço.

Na ficha do ginásio o mesmo campo pode ter as duas coisas, por isso o ecrã
mede a imagem (`Image.getSize`) e decide: **mais alta do que larga ou quase
quadrada é um logótipo** — 150x150 ao centro, inteiro; **bem mais larga é uma
fotografia** — a toda a largura, 180 de altura. Foi assim que se resolveu o
logótipo KO aparecer gigante e cortado neste separador.

**A fotografia do sócio é a mesma dos dois lados.** No canto superior direito
do cartão está o logótipo do ginásio, que também é botão: o sócio escolhe uma
fotografia no telemóvel e ela vai para o campo `photo_url` da ficha dele — o
que já lá estava para isso. A gestão passa a vê-la na ficha, sem ter de a
pedir. Quem não carrega nenhuma fica com o logótipo.
(`POST`/`DELETE /api/mobile/members/{id}/photo`; trocar apaga a anterior do
disco, senão a pasta enchia-se de fotografias que ninguém vê.)

**O nome no cartão é só o próprio e o apelido**, em Comic Neue (a fonte livre
parecida com a Comic Sans MS, carregada no `App.tsx`). Um nome completo
português não cabe na largura de um telemóvel.

---

## Armadilhas que já custaram tempo

**Processos antigos presos à porta 8001.** Várias vezes um backend antigo
continuou a responder depois de alterações, dando a impressão de que o código
não funcionava. Se algo parecer não fazer efeito, mate todos os `python.exe` e
arranque de novo — não confie no `--reload`.

**Datas e fusos horários.** As datas são guardadas com hora
(`2026-09-25T00:00:00+00:00`). Em Portugal, `toISOString()` sobre uma data local
**recua um dia**.

**Todas as datas do site passam por `frontend/src/lib/datas.js`** —
`diaLocal()`, `hoje()`, `diaSeguinte()`, `primeiroDiaDoMes()`,
`ultimoDiaDoMes()`, com testes. Nunca escreva a conversão à mão, e nunca use
`toISOString()` para tirar o dia de uma data.

A fórmula certa estava copiada à mão em oito sítios e a errada noutros oito.
O pior era o filtro de datas da lista de pagamentos: `new Date(ano, mês, 1)`
é 1 de julho à meia-noite em Lisboa, que em UTC é **30 de junho às 23:00**, e
por isso "este mês" começava no último dia do mês anterior — todos os dias,
durante o horário de verão inteiro, e sem dar erro nenhum.

Nas consultas ao servidor, o limite superior de um intervalo tem de ser o **dia
seguinte** (`$lt`), senão exclui o próprio dia.

**Os emoji rebentam a consola do Windows.** O `cmd` é cp1252: escrever `🚀`
ou `→` num `print()` ou no registo levanta `UnicodeEncodeError`. Isto já
matou o arranque do backend inteiro (a primeira linha do `startup_db` tinha
um foguete) e já parou o carregador do horário a meio, com metade das aulas
criadas. Em Linux passa, por isso só se vê na máquina do dono. Nas mensagens
não ponha nada acima do codepoint 255; quando o texto vem de fora (os nomes
das modalidades em produção têm emoji), reconfigure o `stdout` para utf-8 com
`errors="replace"`.

**As notas da semana só contam dias úteis.** O ginásio fecha ao fim de semana,
e dizer que o domingo é o "dia mais calmo" não informa ninguém. As notas do
ano olham só para segunda a sexta (`DIAS_UTEIS`), com os **zeros preenchidos**:
uma segunda-feira sem ninguém é o dia mais calmo, e sem isso nem aparecia,
porque o agrupamento só cria chaves para os dias que existem.

**O "Resultado líquido por modalidade" mostra só a receita.** A quota vai para
as modalidades do sócio (dividida por igual quando tem mais do que uma) e a
experimental vai para a modalidade experimentada. A **despesa não é repartida**:
a renda não se divide por Boxe e Jiu-Jitsu, e reparti-la pela receita seria
inventar um número. Por decisão do dono, a despesa conta no **Resultado Líquido
por Mês** e mais em lado nenhum. O cartão diz isso.

**Dois cartões têm duas colunas: a contagem e o dinheiro que ela gera.**
"Inscrições por Mês" mostra quantas inscrições e quanto renderam de seguro
(inscrições novas e renovações, só a parte do seguro). "Aulas Experimentais por
Mês" mostra quantas aulas e quanto renderam. Cada coluna leva o seu total. Esse
dinheiro **já contava** na faturação e no resultado líquido do mês — as colunas
só mostram de onde vem.

**Os nomes das categorias de despesa vivem em `frontend/src/lib/categorias.js`.**
Estavam escritos duas vezes, nas Finanças e nos Relatórios, e bastava acrescentar
uma categoria num lado para o outro mostrar o nome técnico em inglês.

**As contas dos Relatórios vivem em `frontend/src/lib/estatisticas.js`**, fora
dos ecrãs e com testes. As datas **nunca** passam por `new Date(texto)`: lê-se o
ano/mês/dia do próprio texto e comparam-se como números (`20261005`). Foi assim
que se resolveu o último dia do período ficar de fora no horário de verão.

**Cache do painel.** Os números do painel ficam em cache 5 minutos (Redis em
produção, memória em desenvolvimento). Ao alterar dados que os afetem, chame
`BusinessCache.invalidate_member_cache()`. Já lá está em: criar, corrigir e
apagar um sócio; registar, corrigir e apagar uma presença; os pagamentos (pelo
`recalcular_validades`); e a fotografia do sócio. **Há testes** —
`test_arranque.py` faz um check-in e confere o contador logo a seguir.

**O arranque: dois `@app.on_event("startup")`, não um.** O `criar_indices` e o
`startup_db` têm cada um o seu. Se precisar de outro arranque, **dê-lhe o seu
próprio decorador** — não meta a função nova por baixo de um que já existe.

Foi assim que o `startup_db` esteve semanas sem correr: uma função nova entrou
*entre* o decorador e ela e ficou com ele. Não houve erro nenhum, só uma coisa
que deixou de acontecer em silêncio — numa base de dados já cheia não se nota,
mas numa vazia ninguém conseguiria entrar, porque o administrador nunca chegava
a ser criado.

**`PUT /api/members/{id}` substitui a ficha toda.** Quem chamar tem de reenviar
todos os campos, ou perde-os.

**Não há por onde suspender um sócio.** O `MemberCreate` (que é o corpo do
`PUT /api/members/{id}`) não tem campo `status`, e não existe rota nenhuma que
o mude. A regra "uma suspensão manual manda sempre" é respeitada em todo o
lado — nos filtros, no painel, no check-in, na aplicação — mas o campo só lá
está nas fichas antigas, vindas do sistema anterior. Nos Membros, "Suspenso"
é uma opção do filtro, não uma ação. Falta decidir com o dono onde entraria o
botão e quem o pode carregar.

**Apagar um sócio deixa o rasto dele para trás.** As presenças, as inscrições
em aulas, as avaliações, os planos e os pagamentos continuam na base de dados
sem dono. As presenças órfãs continuam a contar nas estatísticas. Não se mexeu
nisto de propósito: apagar os pagamentos mudaria as contas do ginásio, e isso
é decisão do dono. O nome de quem se inscreveu numa aula fica **gravado na
própria inscrição**, por isso uma inscrição órfã mostra o nome e não rebenta.

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
  "dos"): `corresponde_pesquisa()` no backend, `corresponde()` em
  `frontend/src/lib/pesquisa.js`. Resultados por ordem alfabética, com os
  **nomes próprios primeiro**.
- **Até três dígitos, um número escrito é um número de sócio** e mais nada —
  os números do ginásio têm três casas. O sócio 002 encontra-se escrevendo `2`,
  sem os zeros, e a lista vem **por número**: 2, 20, 21, 22… e só mais à frente
  o 200.
- **Do quarto dígito em diante já é um telemóvel** (`DIGITOS_PARA_TELEFONE`),
  procurado em qualquer posição porque as pessoas lembram-se do fim, e aí a
  lista vem **por nome**. Sem este degrau, `2` trazia toda a gente que tem um 2
  no número — que é quase toda — e `913` trazia meio ginásio por ordem de
  número, que não ajuda a encontrar ninguém.
- As duas pesquisas têm de dar o mesmo — há testes dos dois lados.
- **A lista de sócios, sem pesquisa, vem por número de sócio** (001, 002, 010 —
  não por texto, senão o 10 vinha a seguir ao 1). É assim que se encontra alguém
  a correr os olhos pela lista. A pesquisa mantém a ordem dos nomes.
- **Tema claro e escuro.** Toda a cor nova precisa da variante escura
  (`dark:`) ou de variáveis do tema. O tema escuro é o mais usado.
- **Cores da marca:** laranja `#B8651B`, âmbar `#F5A623`, fundo escuro `#1A1A1A`.
  Verde para receitas e estados em dia, vermelho para despesas e atrasos.
- **Comentários** só onde explicam uma decisão que não se percebe pelo código.
