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

#### Suspender um sócio

**Só o administrador**, na ficha do sócio, por baixo do NFC. É a única coisa
que passa à frente da quota paga, e por isso não é decisão de quem está ao
balcão — esse cobra. Ao colaborador o cartão nem aparece.
(`POST /api/members/{id}/suspender` e `.../levantar-suspensao`, com testes.)

- **Não toca na quota nem no seguro.** As validades ficam onde estão e voltam
  a valer quando a suspensão for levantada — suspender não é castigar o
  dinheiro que já foi pago.
- **Levantar não torna o sócio activo**: devolve-o ao que a quota disser.
  Grava-se `inactive`, e o estado que se mostra volta a ser calculado como em
  qualquer outra ficha. Se a quota estiver em dia, fica activo na mesma —
  mas por a ter paga, não por decreto.
- O **porquê** fica escrito na ficha (`suspension_reason`) e no registo de
  alterações, e apaga-se quando a suspensão é levantada: um motivo velho numa
  ficha activa só confunde.
- Até novembro de 2026 **não havia por onde o fazer**: a regra era respeitada
  em todo o lado e o campo só estava preenchido nas fichas vindas do sistema
  anterior.

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

### Faturação

**Este software não emite faturas, e não vai emitir.** Decisão tomada em
novembro de 2026, com o dono.

Em Portugal (DL 28/2019) é obrigado a usar **programa certificado pela AT**
quem tiver volume de negócios acima de 50 000 €, contabilidade organizada,
**ou quem emita faturas por computador** — seja qual for o programa. Não há
meio-termo: ou o programa está certificado, ou as faturas são à mão em papel.

Certificar o KO Gym seria possível — o pedido faz-se à AT, pelo produtor do
software — mas obrigaria a séries sem furos, ATCUD, código QR, assinatura
encadeada com chave registada, exportação SAF-T PT, impossibilidade de apagar
documentos, auditoria, e a manter tudo isso a cada mudança de regras. E, o
que mais pesa: **um erro nosso passaria a ser uma coima do dono**. Hoje, um
número trocado corrige-se; ali, não.

**O desenho escolhido**: o KO Gym continua a ser onde o pagamento se regista,
e a fatura sai de um programa certificado por trás (InvoiceXpress, Vendus,
Moloni — todos com API). O nosso software avisa-o, recebe de volta o PDF com
ATCUD e QR, guarda o endereço e mostra-o ao sócio na aplicação, ao lado do
pagamento.

O ginásio começa a emitir faturas em **janeiro de 2027**. Até lá a aplicação
mostra o historial de pagamentos e diz, por palavras, que não é uma fatura.

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

**Uma venda apaga-se, e o stock volta.** O caixote fica na linha da venda,
nas Finanças, ao lado do valor (`DELETE /api/sales/{id}`). Até novembro de
2026 **não havia por onde**: as despesas e os pagamentos corrigiam-se e
apagavam-se, as vendas não — um artigo cobrado a mais, ou a cor errada
marcada ao balcão, só se emendava por fora da aplicação, e até lá ficava a
contar na facturação do mês.

- **O stock volta** porque o artigo não saiu do ginásio. Sem isso, corrigir
  um erro deixava um segundo erro atrás — desta vez na prateleira, que é
  onde ninguém repara até faltar um artigo na contagem. A pergunta diz
  quantas unidades voltam, para quem carrega saber o que vai acontecer e não
  só o que vai desaparecer.
- Se o **artigo já tiver sido apagado** do Stock, a venda apaga-se na mesma e
  não há onde devolver nada. Rebentar aqui deixava a venda presa nas contas
  do ginásio para sempre.
- **Não reabre a reserva** que lhe deu origem, quando a houve: o sócio já
  levou ou já lá esteve. Se for preciso, faz-se uma reserva nova.
- **O colaborador também apaga** — quem vende ao balcão tem de poder emendar,
  como já acontecia nas despesas.

### Aplicação do sócio: parceiros e montra

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

### Fotografias partilhadas com um sócio

**Cada fotografia é de um sócio, e só ele a vê.** Carregam-se em
**Membros → ver a ficha → Fotografias**, ao lado das avaliações e dos planos,
e o sócio vê-as na aplicação, numa faixa no Início ("As tuas fotos").

Começou por ser uma **galeria igual para toda a gente**, em App do Sócio →
Multimédia. Decisão do dono, em novembro de 2026: o que ele quer partilhar
são as fotos *daquele* sócio — o filho na aula de Kids, o combate de sábado —
e isso não é para os outros trezentos verem. A galeria mudou-se para onde o
sócio vive.

- O **sócio não carrega nada**: só vê e guarda o que o ginásio lhe mandou.
- **Fotografias alojadas aqui**, **vídeos por link** para as redes do
  ginásio. Um minuto de vídeo de telemóvel são 50 a 100 MB e as redes já têm
  o conteúdo e já têm público.
- O **colaborador também publica**: é quem está no ginásio a tirar as fotos.
- **Uma fotografia sem dono é recusada** (`member_id` é obrigatório no
  `MediaItemCreate`): ficava a ocupar disco sem chegar a sócio nenhum.
- **Esconder não é apagar** (`is_active`): o sócio deixa de a ver, o ficheiro
  fica. Apagar leva o ficheiro, como em todo o lado.
- `GET /api/mobile/media/{member_id}` traz as dele e nunca as de outro. O
  `GET /api/mobile/media` antigo — a galeria de todos — **devolve agora uma
  lista vazia**: é o endereço que uma aplicação por actualizar chama, e era
  por aí que um telemóvel velho veria as fotografias de toda a gente. Sai
  quando não houver nenhuma por actualizar.
- Como o resto da API da aplicação (os pagamentos, as avaliações, os planos),
  **quem souber o `id` do sócio vê o que é dele**. O `id` é um UUID, que não
  se adivinha. Subir mais do que isto obriga a pôr senha em todas as rotas da
  aplicação, e isso é obra à parte.
- **Fichas antigas sem dono** (de quando a galeria era de todos) não aparecem
  a ninguém — é o preço certo a pagar para não haver fotografias sem dono à
  vista. Em produção não havia nenhuma: a galeria nunca chegou a ser usada.

**Uma fotografia, um sócio. Não há mandar a vários ao mesmo tempo**, e é de
propósito. A pergunta pôs-se com a foto da aula de Kids, que tem oito miúdos
e oito pais a quem interessa; a resposta do dono foi que **as fotografias de
grupo vão pelo WhatsApp**, onde já vão hoje. O que ele quer aqui é o
contrário disso: o caminho que **só aquele sócio tem** — e que, por ser só
dele, dá à aplicação uma razão para existir que um grupo de WhatsApp não
tem. Construir o envio a vários era construir, dentro da aplicação, a coisa
que ela serve para não ser.

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
fotografias que encolhe — e continua aberta mesmo depois de as rotas da
aplicação passarem a exigir token: quem pede estas imagens é a `<Image>` do
telemóvel, que não leva cabeçalhos nenhuns. Pôr-lhes senha obrigava a
descarregar cada fotografia à mão e a guardá-la em memória, que é
exactamente o que as miniaturas existem para evitar.

**Não vão para a base de dados.** As cópias de segurança são despejos da base,
e meia dúzia de fotografias punham um ficheiro de 15 MB a pesar centenas.
Limites: **8 MB** por imagem (jpg, png, webp, gif), **30 MB** por vídeo
(mp4, mov, m4v, webm) e **10 MB** por documento (pdf, para os planos).
`POST /api/uploads` devolve também o `kind` — `photo`, `video` ou `document`.

**Apagar um registo apaga o ficheiro** (`apagar_do_disco`). A fotografia do
sócio, ao trocar e ao tirar, o plano e a Multimédia passam todos pela mesma
função — estava escrita à mão em três sítios, **a Multimédia não a tinha de
todo** (o ficheiro ficava no volume para sempre, sem nada a apontar-lhe), e
nenhum dos três limpava as miniaturas: uma fotografia apagada deixava atrás
uma cópia encolhida por cada largura que alguém tivesse pedido.

- Só apaga **ficheiros nossos** (`/api/uploads/...`): um vídeo da Multimédia
  é um link para as redes do ginásio, e não há nada nosso para apagar.
- **Não se queixa** quando o ficheiro já lá não está: rebentar aqui deixava o
  registo na base de dados sem o conseguir tirar.
- Como nos planos, **só apaga se mais nenhum registo o usar**. Cada
  carregamento sorteia um nome novo, por isso é raro — mas dar o mesmo plano
  a dois sócios não pode deixar um deles sem nada.

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
no separador **Corpo**. A balança não fala com nada: se um dia exportar um
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

### Como o sócio entra na aplicação

**Número de sócio e um PIN de seis dígitos.**

Até novembro de 2026 entrava-se com o **número de sócio e o telemóvel**. Os
números vão de 001 a 340 e o telemóvel sabe-o qualquer colega de treino,
qualquer familiar, qualquer ex-companheiro: **entrar na conta de outra pessoa
não exigia saber nada que não se soubesse já**. Foi o dono que deu por isso.

**Seis dígitos, como no Multibanco.** No telemóvel abre o teclado numérico,
que é grande e fácil, e ninguém estranha — ao contrário de uma senha com
letras, que num teclado pequeno se erra e se esquece, e cada esquecimento é
uma pergunta ao balcão. São um milhão de combinações.

**O PIN escolhe-o o próprio**, decisão do dono. Da primeira vez entra com o
número e o telemóvel, como sempre fez, e escolhe o PIN ali
(`POST /api/mobile/auth/pin`).

**A partir daí o telemóvel deixa de servir** (`409`), e é isto que tapa o
buraco: se continuasse a valer, saber o número e o telemóvel de alguém
continuava a dar entrada na conta dele, e o PIN não tapava nada. Há um teste
só para isto.

#### Esquecido, há dois caminhos — e nenhum volta ao telemóvel

Decisão do dono, em novembro de 2026: **os dois**, porque a maior parte dos
340 tem email na ficha mas nem todos têm.

Se a aplicação deixasse recuperar **voltando ao telemóvel**, bastava dizer
que se tinha esquecido para entrar na conta de qualquer pessoa sabendo-lhe o
número — e o PIN não tapava nada. Por isso a recuperação tem de passar por
uma coisa que **só o sócio tem**: a caixa de correio dele, ou a cara dele ao
balcão. O código prova **posse** e não **conhecimento**, que é a diferença
toda.

- **Por email**, para quem tem email na ficha. Carrega em "Esqueci-me do
  PIN", recebe seis dígitos (`POST /api/mobile/auth/pin/esqueci`),
  escreve-os com o PIN novo (`.../pin/recuperar`) e **entra logo** — sem
  voltar ao ecrã de entrada a escrever o PIN que acabou de escolher. O
  código **serve 15 minutos e uma vez só**, morre ao fim de **cinco
  tentativas**, e não se pede outro antes de **dois minutos**, senão
  qualquer pessoa enchia a caixa de correio de outra.
- **Ao balcão** (`POST /api/members/{id}/limpar-pin`), na ficha do sócio,
  para quem não tem email ou perdeu o acesso a ele. **O colaborador também
  pode** — é ele que está ao balcão quando a pessoa chega a dizer que não
  entra. Apagar o PIN **mata também o código**, se houver um a aguardar: um
  código de pé por mais quinze minutos era uma segunda porta aberta sem
  ninguém saber.

**Depois de se registar um PIN, o "É a minha primeira vez aqui"
desaparece.** Decisão do dono: quem já tem PIN não volta a ter uma primeira
vez, e a linha só ocupava o ecrã e convidava a enganos.

- A marca é **deste telemóvel** (`ko-gym-tem-pin`) e não da conta: a
  pergunta faz-se **antes** de alguém dizer quem é, e nessa altura o
  servidor não tem a quem perguntar.
- Põe-se ao **escolher** o PIN, ao **entrar** com ele e ao **recuperar**
  pelo email — qualquer um dos três prova que há PIN.
- **Tira-se quando o servidor disser que a conta não tem PIN** (o `sem_pin`
  do "Esqueci-me do PIN"), que é o que acontece depois de o balcão lho
  apagar. Sem isto, quem perdesse o PIN ficava com a linha escondida no
  próprio ecrã onde precisava dela — e é por aí que ele volta a entrar.
- A linha começa **escondida** e aparece quando a resposta chega do disco,
  e não ao contrário: uma linha que pisca no arranque e desaparece a seguir
  é pior do que uma que nunca esteve lá.

**O "Esqueci-me do PIN" é mais calado do que as outras linhas.** Por decisão
do dono: é o caminho de quem se enganou, não o que se oferece a quem chega.
Em ouro e a negrito puxava o olho tanto como o ENTRAR que está logo por
cima, e num ecrã que é a porta do ginásio o que deve puxar o olho é a
entrada. **Não é o ouro com transparência** — por cima daquela fotografia o
dourado a meia opacidade vira azeitona, que é a mesma razão por que o botão
de check-in não se apagou assim. É a cor do texto secundário.

**O endereço vai-se buscar à ficha, nunca se recebe**: senão bastava
escrever o número de outra pessoa e um email nosso para receber o código
dela. E a resposta **esconde-o** (`s***@exemplo.pt`) — o sócio precisa de
saber qual das caixas foi, não de a ver escrita num ecrã que outra pessoa
pode estar a espreitar.

**O cartão da ficha diz qual dos dois caminhos é o desta pessoa**: havendo
email, manda-se o sócio pedir o código em vez de lhe apagar o PIN; não
havendo, diz-o por palavras. E mostra se **há um código a aguardar**, para
não se apagar o PIN a quem já tem a resposta na caixa de correio.

**Recuperar limpa o travão das tentativas**: quem se esqueceu costuma ter
tentado cinco vezes antes de pedir o código, e ficar quinze minutos de
castigo depois de provar quem é pela caixa de correio não serve de nada a
ninguém.

**As palavras vêm do servidor** (`mensagem`), enviado ou não, e não da
aplicação — quando o sócio pergunta ao balcão o que diz o telemóvel, quem
atende tem de ler o mesmo. Por isso a rota responde sempre **200 com o
motivo**: não haver email na ficha, não haver PIN para recuperar ou ter
pedido o código há pouco não são erros, e cada um precisa de uma frase
diferente no ecrã.

**O email sai por SMTP, sem dependência nenhuma nova** — `utils/correio.py`,
com o `smtplib` da biblioteca padrão. Um fornecedor transaccional (Resend,
Brevo, Mailgun) daria melhor entrega, mas obrigava a conta, chave e domínio
verificado para o que são meia dúzia de mensagens por mês. As credenciais
vivem no `backend/.env` (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
`SMTP_PASSWORD`, `SMTP_DE`, `SMTP_NOME`), que o `docker-compose` já entrega
ao contentor pelo `env_file`. **Sem elas não rebenta nada**: a aplicação diz
que não foi possível e manda ao balcão, que é o caminho que já existia. O
envio corre numa linha de execução à parte (`asyncio.to_thread`), senão
prendia o servidor inteiro enquanto o Gmail não respondesse.
- **O balcão nunca vê o PIN**, nem o resumo dele. Só vê **se ele existe**
  (`GET /api/members/{id}/pin`), que é o que precisa para perceber se a pessoa
  à frente se esqueceu ou se ainda nem instalou a aplicação. Guarda-se com
  bcrypt, como as senhas da gestão.
- **Trava ao fim de cinco tentativas, por 15 minutos** — e o travão é **por
  sócio**, não por IP. O limite por IP (10 por minuto) existe e continua, mas
  quem quisesse experimentar um milhão de PINs mudava de rede e ele não dava
  por nada. Acertar limpa as tentativas; limpar o PIN ao balcão tira também o
  travão, que quem se esqueceu costuma ter tentado várias vezes antes de pedir
  ajuda.
- **Os PIN óbvios são recusados**: todo o mesmo dígito (`000000`) e números
  seguidos (`123456`, `987654`). São as primeiras coisas que alguém
  experimenta.
- **Trocar o PIN sabendo o actual** faz-se sem ir ao balcão
  (`POST /api/mobile/auth/pin/trocar`).
- A **suspensão continua a mandar**: suspenso não entra, nem com o PIN certo.
  E a **quota em atraso não impede a entrada** — é precisamente quem mais
  precisa de ver o aviso no cartão.
- Os **340 sócios que já cá estavam não têm PIN nenhum**, e por isso nada
  muda para eles até instalarem a aplicação. Isto fez-se **antes de eles a
  instalarem**, de propósito: mudar a entrada hoje custa ao dono escrever o
  número uma vez; daqui a dois meses custava 140 pessoas a perguntar na
  receção porque é que a aplicação lhes pediu os dados outra vez.

#### Depois de entrar: cada pedido leva o token

Até novembro de 2026 a aplicação identificava-se **só pelo `id` do sócio**,
que ia no endereço. O `id` é um UUID, que não se adivinha — mas **fica
escrito no registo do nginx** em texto simples, e **não se pode cancelar**:
se um escapar, escapou para sempre. Quem o tivesse via os pagamentos, as
avaliações e os planos daquela pessoa, trocava-lhe a fotografia,
desmarcava-lhe as aulas e mudava-lhe o email na ficha.

Hoje **o token é que diz quem é**. O `id` continua no endereço, porque é por
ele que as rotas procuram, mas tem de **bater com o do token** — senão é
403. Fez-se antes de os sócios instalarem a aplicação, como o PIN.

- **Fica de fora o que é a entrada** (login, escolher, trocar e recuperar o
  PIN) **e o que é igual para toda a gente**: as modalidades, a ficha do
  ginásio, os parceiros, a montra e a galeria antiga. Pedir token para
  entrar era um nó, e o resto não é de ninguém.
- **Há um teste que percorre as rotas `/mobile/` todas** e exige que cada
  uma esteja protegida ou escrita na lista das públicas, com a razão. Sem
  ele, uma rota nova entrava sem token e ninguém dava por isso até alguém
  de fora dar.
- O token do sócio **dura 90 dias** (`MINUTOS_DO_TOKEN_DO_SOCIO`), e não as
  oito horas do da gestão: a aplicação abre-se para um check-in de dois
  segundos, e pedir o PIN todos os dias a quem treina cinco vezes por
  semana era pedi-lo cinco vezes por semana. A gestão é outra coisa — é um
  computador ao balcão, muitas vezes partilhado.
- **Um JWT não se desfaz**, e por isso a ficha tem um `token_version`: ele
  anda para a frente ao **apagar o PIN ao balcão**, ao **trocar** e ao
  **recuperar**, e os tokens de antes deixam de bater. Sem isto, apagar o
  PIN a quem perdeu o telemóvel era mudar a fechadura deixando a janela
  aberta.
- **A suspensão continua a mandar**: suspenso não entra, nem com o token
  válido. A quota em atraso não impede nada.
- Na aplicação, **um 401 devolve o sócio ao ecrã de entrada** sozinho
  (`aoPerderASessao`). E só conta como sessão perdida **se tinha token**: o
  ecrã de entrada também recebe 401 quando o PIN não confere, e aí não há
  sessão nenhuma para perder.

**A chave que assina os tokens estava escrita no código.** Enquanto esteve,
bastava ter o repositório para fabricar um token de **administrador** e
entrar na gestão toda — exigir token nas rotas da aplicação sem corrigir
isto era pôr uma fechadura com a chave colada à porta. Vem agora do
`backend/.env` (`JWT_SECRET`), e **em falta o servidor não arranca**,
excepto quando o `ENVIRONMENT` diz que é uma máquina de desenvolvimento ou
de testes. A excepção é assim, e não ao contrário, porque o `.env` de
produção **não tem linha `ENVIRONMENT` nenhuma**: uma regra do género "se
não for produção, vai pela chave de sempre" deixava a produção a assinar
com a chave de brincar, em silêncio.

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
(`ko_gym_dev`), `CORS_ORIGINS`, `ENVIRONMENT`, `JWT_SECRET`; `frontend/.env` com
`REACT_APP_BACKEND_URL=http://localhost:8001`.

### Testes automáticos

Cobrem as regras de negócio acima. **Corra-os antes e depois de mexer no
backend** — são 411 testes e demoram 58 segundos (o bcrypt dos PIN é lento
de propósito).

```bash
cd backend && ./venv/Scripts/python.exe -m pytest tests -q
```

Ou, no Windows, dois cliques em `TESTAR.bat`.

As contas dos Relatórios, a pesquisa e o dinheiro têm testes próprios, no site
(147 testes, 4 segundos):

```bash
cd frontend && yarn test --watchAll=false
```

Correm contra uma base de dados só deles (`ko_gym_test`), limpa antes de cada
teste, sem precisar do servidor a correr: a aplicação é carregada em memória.
Nunca tocam nos dados de desenvolvimento nem nos de produção.

A **aplicação do sócio** também tem os seus (135 testes, 10 segundos):

```bash
cd ko-gym-mobile && npx jest
```

Protegem a lógica que vive só na aplicação: o **horário** lido do texto da
ficha (`lerHorario`, `estadoDeHoje`), a **data à portuguesa**, o **nome no
cartão**, a **tinta na parede** da capa, os **endereços das imagens**
(miniaturas incluídas), o **dinheiro** e os **números com vírgula**, e o
**encaixe da porta** no ecrã de entrada. São testes de funções, não de ecrãs: o que se
vê continua a confirmar-se no navegador — tirando os feitios de ecrã que não
se têm à mão, e esses só o teste alcança.

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

**Quem vai primeiro, o servidor ou a aplicação?** Vai primeiro **aquele cuja
mudança o outro lado aguenta**. Entre publicar e a atualização chegar ao
telemóvel passam duas aberturas da aplicação, e nesse intervalo os dois lados
não são a mesma versão — a pergunta é qual das metades é que sobrevive a
estar sozinha.

- **O PIN** (novembro de 2026) foi **servidor primeiro**: a aplicação nova
  pedia um PIN a um servidor que ainda não sabia o que era isso.
- **Os tokens** foram **aplicação primeiro**, e é o contrário: a aplicação
  nova manda um cabeçalho que o servidor antigo ignora sem se queixar, mas o
  servidor novo recusa **tudo** à aplicação antiga — e quem a tivesse aberta
  ficava com ela a dizer que a sessão acabou, em ciclo, até a atualização
  chegar.

Se as duas metades forem incompatíveis nos dois sentidos, não há ordem que
salve: aí a mudança tem de aceitar as duas versões durante uma semana, e só
depois é que o lado antigo sai.

Cópias de segurança automáticas todas as noites às 3h30 (`/root/backup-ko-gym.sh`),
as últimas 30 em `/root/backups/`, registo em `/var/log/ko-gym-backup.log`.

### A cópia que fica no computador do dono

**As cópias do servidor vivem no próprio servidor.** Se a máquina morrer,
morrem com ela. O `GUARDAR-COPIA.bat`, na raiz, traz tudo para o computador
do dono — mostra primeiro o que vai fazer e só escreve depois de um "s".
(`servidor/guardar-copia.py`.)

Cada cópia fica numa pasta com a data, dentro de **`CÓPIAS DE SEGURANÇA`**, e
leva seis pastas com nomes que se percebem sem saber de informática — foram
pedidos assim pelo dono, e a ordem é a dele:

| | O que é |
|---|---|
| `1 - CODIGO APP MOBILE` | os ficheiros da aplicação, como estão, para abrir e ler |
| `2 - CODIGO SOFTWARE` | o site de gestão, o servidor e os guiões da máquina |
| `3 - BASE DE DADOS DE PRODUCAO` | o despejo mais recente do servidor |
| `4 - FOTOGRAFIAS` | o volume do Docker, que não está no Git nem no GitHub |
| `5 - FORA DO GIT` | os `.env` e o `INICIAR-APP.bat` — os únicos que não existem noutro lado |
| `6 - REPOSITORIO INTEIRO` | o `git bundle`, com a história toda, e um `COMO REPOR.txt` |

As pastas 1 e 2 saem de `git archive HEAD`, e por isso **levam só o que está
gravado** — nunca o `node_modules` nem o `venv`. Há um `LEIA-ME.txt` em cada
cópia a explicar o que é cada pasta.

**Esta pasta nunca pode ir para o Git**: a base de dados leva o nome, o
telefone e a data de nascimento dos 340 sócios, e o `5 - FORA DO GIT` leva as
senhas. Já aconteceu a regra deixar de a apanhar — chamava-se `CODIGO`,
passou a `CÓDIGO APP.MOBILE` e o `.gitignore` ficou a apontar para um nome
que já não existia, sem erro nenhum. Por isso hoje o `.gitignore` tem os dois
nomes da pasta **e** os ficheiros em si (`*.bundle`, `*.archive.gz`): se ela
mudar de nome outra vez, o conteúdo continua de fora.

**Nunca correr `git clean -xfd` na raiz** — apaga tudo o que está ignorado, e
estas cópias com ele.

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
| **Corpo** | O que a balança mediu, e como isso tem mudado |
| **Loja** | A montra e as reservas do sócio |
| **Parceiros** | Protocolos de parceria, com a vantagem em destaque |
| **Ginásio** | Morada, horário, contactos, mapa e avaliações |

**O separador das Fotos deu o lugar ao Corpo.** As fotografias eram um dos
seis ecrãs e **estavam vazias**: o `GET /api/mobile/media` devolvia zero itens
em produção — nunca nenhuma foi publicada. Um sexto da barra para um ecrã sem
nada dentro, enquanto o peso e a massa gorda, que mudam todos os meses e são
do próprio sócio, viviam espremidos num cartão a meio do Início. Decisão do
dono, em novembro de 2026.

- O **Corpo** (`EcraCorpo.tsx`) fica a seguir às Aulas: os três primeiros
  separadores são do sócio, os três últimos são do ginásio.
- As **fotografias passaram a uma faixa no Início** (`MinhasFotos.tsx`),
  entre os planos e os pagamentos, e são **as dele** (ver **Fotografias
  partilhadas com um sócio**). **Não aparece quando não há nenhuma**, e por
  isso deixou de haver um ecrã vazio à vista. Dois quadrados e um bocadinho
  do terceiro, que é o que diz sem legenda que a faixa anda para o lado.
- O cartão **"A tua evolução"** e o `EcraMultimedia` foram apagados: o que
  faziam passou para os dois novos.
- **A balança ainda não chegou**, por isso o Corpo começa vazio para toda a
  gente. O estado vazio diz o que a balança mede e que se fala com o
  professor para marcar — e não "sem dados".

**O Início é todo do sócio**: o cartão, o check-in, o QR, a quota e o seguro,
os treinos, a evolução, os planos e, no fim, os pagamentos dele. Mais nada.

**Os pagamentos fecham a página**, depois dos planos, e só aparecem a quem
tem algum registado — a quem acabou de se inscrever, uma caixa vazia não diz
nada. Mostram-se os três últimos e o resto abre numa janela, com o total.
É a pergunta que mais se ouve ao balcão — *"já paguei este mês?"* — e a
resposta estava só na gestão. (`MeusPagamentos.tsx`,
`GET /api/mobile/payments/{member_id}`, com testes.)

**Não é uma fatura, e diz isso.** Em Portugal uma fatura tem de sair de
programa certificado pela AT, e este não é — ver **Faturação**, mais abaixo.
Por isso a lista não traz número de documento nem se parece com um documento
fiscal, e a janela acaba com uma linha a dizê-lo. Quando o ginásio passar a
emitir faturas por um programa certificado, é nesta mesma lista que o PDF de
cada uma aparece, ao lado da linha.

**O INICIO_DAS_CONTAS não se aplica aqui.** Essa data manda no que entra nas
somas das Finanças e dos Relatórios; o historial do sócio é outra coisa. Quem
pagou em 2025 pagou, e tem o direito de o ver.

A **montra** e os **protocolos dos parceiros** estiveram no fim desta página,
num rolo (`RoloDoInicio`, apagado) — e as fotografias com eles, até voltarem
na faixa acima, por já não terem separador. Saíram por
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

**O botão de check-in é um degradê de cima para baixo, do dourado ao
laranja.** Era um laranja chapado (`#B8651B`), grande e com um halo
alaranjado à volta, e o dono achava-o "muito básico" e com presença a mais.
Hoje vai de `#D6A306` em cima a `#A85A12` em baixo — as duas cores do
logotipo, descidas de brilho. (`degradeCheckin`, no `theme.ts`.)

O sentido é **de cima para baixo**, e não na diagonal como nas superfícies de
vidro: num botão largo e baixo, a diagonal quase só se vê nos cantos.

**O alto do degradê é a cor das letras no resto da aplicação** (`cores.ouro`,
`#D6A306`), por decisão do dono: o **Mostrar o meu QR**, os dois **Pedir** dos
planos, o **Reservar** da loja, os **preços dos artigos**, o **Ginásio KO** e
o **ENTRAR** do ecrã de entrada, e nos Parceiros o **Ligar**, o **Visitar o
site**, a **vantagem** e a **inicial** de quem não mandou logotipo. Antes
andavam por dois tons de laranja e um dourado, sem razão nenhuma.

**São só as letras.** Houve uma versão em que estes passaram todos a botões
cheios com o degradê, e o dono travou-a: o "Mostrar o meu QR" ficava igual ao
check-in, logo por baixo dele, e deixava de se perceber qual era o principal.
As caixas ficam como estavam — vidro é vidro.

Dois da lista não tinham letras cor de laranja — são caixas cheias, com a
cor no fundo —, e por isso foram decididos à parte, vistos os dois caminhos
em fotografia:

- O **Marcar** das aulas leva o **degradê do check-in** na caixa, com as
  letras brancas como estavam.
- O **Deixar uma avaliação** do Ginásio é hoje **exactamente o botão de
  check-in** — as mesmas cores, o mesmo degradê, o mesmo canto, a mesma
  altura e a mesma letra. Decisão do dono, em novembro de 2026, e é uma
  mudança de ideias sobre a anterior: esteve no dourado chapado com letras
  escuras, para ser o botão mais visível daquele ecrã. São os dois o botão
  principal do seu ecrã — um porque é para isso que a aplicação existe, o
  outro porque é o que mais ajuda o ginásio e é o que as pessoas se esquecem
  de fazer —, e por isso são o mesmo botão.

  Vive **num sítio só** (`botaoPrincipal` e `botaoPrincipalTexto`, no
  `theme.ts`), e não copiado nos dois ecrãs: "igual" escrito duas vezes dura
  até alguém mexer num dos dois, e o que se perde não dá erro nenhum — só
  deixa de ser igual.
- O **Ligar** e o **Visitar o site** dos Parceiros levam esse dourado
  **só no aro**, com as letras em ouro e nada por dentro. Chegaram a estar
  cheios, como o do Ginásio, e o dono preferiu-os de contorno: ali são duas
  acções pequenas dentro de um cartão, e cheias pesavam mais do que a
  vantagem, que é o que conta no cartão do parceiro.

O que lhe tirou presença não foi a cor — foi o resto:

- **O tamanho**: passou a ter a altura do botão do QR que está logo por baixo
  (`espaco.m` em vez de `espaco.g`), e a letra passou de 18 para 16.
- **A sombra**: saiu. O halo alaranjado era metade da presença de que o dono
  se queixava.

**O caminho até aqui está nos ficheiros, e vale a pena saber porquê.** Foram
vinte e um feitios, vistos todos no próprio ecrã — não em maquetas: o ecrã
corria no navegador e o botão foi trocado por dentro, um de cada vez. Pelo
caminho ficou aprendido que

- **um dourado escuro lê-se como mostarda.** Não há amarelo que seja vivo e
  discreto ao mesmo tempo, e as duas cores do logotipo são ambas amarelas.
- **a transparência não serve para apagar esta cor**: por cima do fundo
  verde-azulado, o dourado a 55% vira azeitona.
- **o laranja tem de vir à frente.** Num degradê de laranja para dourado, com
  o laranja a liderar, a média dá `#AD6412` — que é praticamente o laranja da
  marca. Ao contrário, dá mostarda.
- **abaixo dos 70 de luminância o botão compete com o do QR**, que é de vidro
  e está logo por baixo. O que é a acção principal da aplicação passava a
  parecer uma opção secundária.

**A porta aparece em dois sítios, e é a mesma imagem cortada de duas
maneiras.** A entrada vista de fora: a porta aberta, o candeeiro aceso lá
dentro, o ringue ao fundo e um miúdo parado à soleira. De pé no ecrã de
entrada, deitada na capa do cartão.

A imagem que lá esteve antes tinha o **"DIA UM" pintado na parede**. Era
pintura: ficava "DIA UM" ao sócio que treina há três anos. Esta não tem letras
nenhumas — e é por isso que a parede passou a poder dizer a verdade (ver **A
tinta na parede**, mais abaixo).

- `assets/porta.jpg` — por trás do ecrã de entrada, **cortada no feitio do
  telemóvel** (9:19,5) a partir de uma imagem bem mais larga: o recorte é
  centrado na luz do vão, e não a meio do ficheiro, para a porta não ficar
  torta. É o único ecrã de pé como a fotografia, e entrar na aplicação é
  mesmo entrar pela porta.

  Leva um escurecimento por cima, mais forte em baixo, onde estão os campos,
  e **leve**: esta imagem já é escura de si, e carregá-la mais apagava o
  verde da sala e as cordas do ringue, que é o que ela tem para dar. O que
  faz o texto ler-se são as caixas de vidro, não o escurecimento.

  **O ecrã diz o nome do ginásio e mais nada.** O "O teu cartão de sócio"
  que estava por baixo saiu por decisão do dono: quem abre a aplicação já
  sabe o que ela é, e a linha só tapava a fotografia. Pela mesma razão as
  caixas dos campos e o botão são de **vidro escuro leve** — deixam passar
  as cordas do ringue e o miúdo à entrada, e o que faz o texto ler-se é o
  contraste da caixa, não ela ser opaca.

  **Esta fotografia está agarrada ao candeeiro, e não ao ecrã.** Desenha-se
  maior do que o ecrã e **sobe** o que for preciso para a luz do candeeiro
  acabar exactamente onde o nome do ginásio começa: o nome fica debaixo do
  foco, como quem está à entrada, e o candeeiro cai no mesmo sítio em
  qualquer telemóvel, em vez de subir e descer com a altura do ecrã. Sobe e
  nunca desce, que descer descobria o topo: quando a luz ficaria alta de
  mais, o que cresce é a fotografia — numa fotografia maior o candeeiro cai
  mais abaixo. As contas estão em `src/lib/porta.ts`, com testes em sete
  feitios de ecrã — é a única maneira de confirmar um telemóvel que não se
  tem à mão.

  **Por baixo do candeeiro, e não dentro dele**: pôr o nome em cima da luz é
  outra coisa, e não é o que o dono pediu. O candeeiro é o foco (0,259 a
  0,2826 do ficheiro), não o cone de luz que ele deita por baixo nem o
  clarão da parede. Num ecrã pequeno de mais, onde a fotografia já não pode
  crescer, é o nome que sobe ao encontro da luz (`desvioDoNome`), com um
  tecto (`NOME_NAO_SOBE_ACIMA_DE`) que o impede de ir bater no logotipo.
  Sobe com `top`, que **desvia o que se desenha sem mexer no que se mede**:
  o subtítulo e os campos ficam onde estavam.

  **O nome mede-se a partir do topo do ecrã**, e não a partir da caixa do
  número de sócio. Por cima dele só está o logotipo, que tem medidas fixas e
  não é texto; a caixa, essa, vem depois de três linhas com acentos —
  "Ginásio", "sócio", "Número" —, que no Android ficam mais altas do que no
  navegador e a empurram uns pixeis para baixo. Era isso o
  `DESCIDA_NO_ANDROID`, que a fotografia nova dispensou: media-se o "DIA UM"
  pela caixa, e por isso ele herdava a descida.

  **O botão ENTRAR não tem laranja**, por decisão do dono: é vidro, como os
  dois campos por cima dele, e só a palavra fica colorida — hoje em
  `cores.ouro`, como o nome do ginásio por cima e como as letras de tudo o
  que é para carregar no resto da aplicação. O ecrã fica
  mais calmo e a fotografia ganha — o laranja era o que mais puxava o olho
  num ecrã que é para ser a porta do ginásio. A cor da palavra é o que sobra
  a dizer onde se carrega, e por isso fica.

- `assets/ginasio.jpg` — a **capa do cartão do sócio**: a mesma imagem,
  cortada ao baixo, a toda a largura e **até ao topo do ecrã**, por baixo da
  barra de estado. O corte é feito a apanhar **do tecto aos pés** — o
  candeeiro no alto, o miúdo inteiro, o chão por baixo dele —, que é o
  enquadramento que a capa já tinha. Em cima da soleira
  ficam as **modalidades** e, por baixo delas, o **número de sócio** — que é
  o que menos se lê dos três. O **retrato do sócio**, que também é o botão
  de o trocar, fica no canto de cima. O **nome** fica **a cavalo no bordo
  de baixo da fotografia** — metade das letras em cima dela, metade no espaço
  até ao check-in. Numa linha só sua empurrava os cartões todos para baixo;
  a cavalo no bordo não ocupa linha nenhuma.

  O quanto ele desce é o `NOME_A_ESPREITAR`, e mede-se **pelas letras e não
  pela caixa de texto**: a caixa tem espaço vazio por cima das maiúsculas, e
  a acertar por ela as letras mal tocavam a fotografia. Pela mesma razão, os
  três espaços entre a **modalidade, o número e o nome** medem-se também
  pelas letras — 9 pixeis cada um, que é o que os faz ler como um bloco só:
  quem ele é no ginásio. E o check-in encosta ao nome sem margem sua, que a
  folga deixada pela capa já chega. Estavam num bloco à parte, por cima de
  uma fotografia pequena com margens; assim a fotografia é a primeira coisa
  que se vê. Leva um escurecimento em cima, por causa da barra de estado, e
  em baixo, para o nome se ler em cima do chão iluminado.

Os cortes são feitos **no ficheiro**, não com `resizeMode`: assim sabe-se o
que fica dentro do quadro. E as duas `Image` levam **largura e altura
explícitas** — sem elas ficam do tamanho natural do ficheiro e vê-se só o
canto, que foi o que aconteceu à primeira.

**A tinta na parede diz em quantos dias ele treinou.** Na capa do cartão,
onde estava pintado o "DIA UM", estão agora os dias daquele sócio — `DIA UM`,
`DIA DOIS`, `DIA TRÊS`. Foi ideia do dono: cada dia de treino é um dia, e a
parede conta-os.

- **Por extenso até ao nove, algarismos daí em diante**, e o corte está aí
  por medida. A parede livre entre os caixilhos da porta dá **196 pixeis**
  no ecrã, e o "DIA " mais o espaço levam 54 desses. Com as palavras até ao
  vinte, três frases chegavam ao limite — DEZASSEIS 193, DEZANOVE 186 e
  DEZASSETE **196**, que encostava ao caixilho dos dois lados. Acabando no
  nove, a mais larga passa a ser o "DIA QUATRO", com 156, e em algarismos
  nunca mais cresce: o "DIA 9999" dá 126. Há um teste a guardar isto, pelo
  número de letras.
- **Quem ainda não treinou nenhuma vez fica no "DIA UM"**, que é o que a
  fotografia conta: alguém parado à porta, antes de começar. No dia do
  primeiro check-in a parede continua a dizer o mesmo — é quando passa a
  ser verdade.
- **São dias, e não treinos** (`training_days`, e não `workout_count`).
  Há quem treine duas modalidades no mesmo dia: são dois treinos e um dia
  só, e a palavra que está na parede é "DIA". Sem esta distinção a parede
  andava duas casas num dia a quem treina de manhã e à tarde.
- **O que conta é o check-in**, venha de onde vier — a etiqueta NFC, o QR
  lido na receção ou o lançamento à mão ao balcão. Entrar na aplicação não
  conta para nada.
- **E por isso o cartão dos números passou a dizer o mês**: o total deixou
  de aparecer, que o mesmo número duas vezes no mesmo ecrã não acrescenta
  nada. O mês é o que ainda se pode mudar, e esse conta **treinos** — quem
  treina duas vezes num dia vê o cartão subir e a parede ficar quieta. É o
  `workout_count_month`.
- Os dias, o mês e a sequência de semanas são contados **na mesma passagem**
  pelas presenças do sócio: não custa consulta nenhuma a mais.
- **A letra é a Anton, esticada 13%** (`ESTICA`): foi medida contra a
  pintura original, letra a letra, e assenta-lhe por cima. A pintura era
  mais larga do que a Anton de origem.
- **A cor é tinta gasta, não um letreiro**: a cor da luz do ginásio a 0,28
  de opacidade. Medido: a pintura ficava 34 pontos de verde acima da
  parede, e a 0,38 esta ficava 47 — lia-se como letreiro novo.
- Vai **por baixo do escurecimento** da capa, como ia a pintura. É o que a
  faz pertencer à fotografia em vez de assentar por cima dela.
- Fica no sítio exacto onde a pintura estava (`TINTA`, em `src/lib/dia.ts`,
  com testes), e **cresce com a capa**: a capa é 312 mais a barra de
  estado, que muda de telemóvel para telemóvel.
- **A fonte entra como ficheiro em `assets/`, e não como biblioteca.** Há um
  pacote `@expo-google-fonts/anton` que daria o mesmo, mas uma dependência
  nova mexe na impressão digital e as atualizações pelo ar deixavam de
  chegar a quem tem a aplicação instalada. O `expo-font` já cá estava; o
  `.ttf` é um ficheiro como as fotografias, e vai pelo ar com elas.

**O ecrã de arranque ainda é cinzento, e fica assim de propósito.** O
`splash.backgroundColor` e o fundo do ícone, no `app.json`, continuam em
`#1A1A1A`. Mudá-los **muda a impressão digital** — medido: de
`613482ae…` para `3fde3f56…` — e a partir daí as atualizações pelo ar
deixam de chegar a quem tem a aplicação instalada, até instalar um APK novo
de 99 MB.

Trocar isso por **um segundo de cinzento na abertura** não compensa. E deixou
de ser alteração adiada: o dono viu-o a funcionar e **gosta dele assim**. Fica
como está, e não é para mexer na próxima compilação nem em nenhuma.

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
4. **Uma sombra larga e fraca**, agora em todos os cartões. É chão, não é
   relevo: curta e escura fazia o cartão parecer recortado em papel. O botão
   de check-in teve a sua, alaranjada, e **deixou de ter** — ver acima.

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

**As palavras são as mesmas dos dois lados.** Quando o sócio pergunta ao
balcão o que é uma linha do telemóvel dele, quem atende olha para o ecrã da
gestão e tem de ler o mesmo. Por isso os tipos de pagamento na aplicação
dizem **Quota**, **Seguro** e **Quota + Seguro** — os selos exactos da lista
de pagamentos do site — e os métodos dizem **Numerário**, **Cartão**,
**Transferência** e **MBWay**. O estado diz **ATIVO** e **INATIVO**, como na
gestão: escrevia-se "ACTIVO" na aplicação e "Ativo" no site.

**O dinheiro escreve-se `35,00 €`** — vírgula nos cêntimos e o símbolo depois,
como em Portugal, e o sinal antes de tudo (`-35,00 €`). Vive num sítio só de
cada lado, com testes: `frontend/src/lib/dinheiro.js` no site e
`ko-gym-mobile/src/lib/dinheiro.ts` na aplicação. O site escrevia `€35.00`, à
inglesa, com a fórmula copiada à mão em 21 sítios e um `euros()` próprio nos
Relatórios — e o sócio lia `35,00 €` no telemóvel para o mesmo pagamento.

**Só no site os milhares levam ponto** — `12.345,67 €`. Aparecem nas somas do
ano e do mês, que é onde fazem falta: `12345.67` conta-se com o dedo no ecrã.
Na aplicação não há separador porque lá nunca há milhares — um pagamento é uma
mensalidade.

**Três `toFixed(2)` ficaram como estavam, de propósito**: os do preço que
preenche o formulário de venda, no Stock. Vão para dentro de um
`<input type="number">`, e esse não aceita vírgula — trocar lá o ponto deixava
o campo vazio sem dizer porquê. Os números do **CSV dos Relatórios** também
ficam `35.00`, sem símbolo: são para uma folha de cálculo ler, não para uma
pessoa.

**Um valor nunca se parte ao meio** (`whitespace-nowrap`). Com o símbolo no
fim o número ficou mais comprido, e na lista de pagamentos o `€` do
`1.250,50 €` caiu sozinho para a linha de baixo.

**Os outros números também levam vírgula** — `79,8 kg`, `20,6%`. Vivem em
`ko-gym-mobile/src/lib/numeros.ts` (`comVirgula`, `diferenca`), à parte do
dinheiro, porque não são a mesma coisa: no dinheiro há sempre duas casas e
um símbolo no fim, aqui o número aparece **como foi medido**. `79,8` tem uma
casa, `7` não tem nenhuma, e acrescentar um `,0` ao sete era inventar
precisão que a balança não deu.

**Uma medida em falta não escreve nada, e nunca `0`.** `Number(null)` é zero
em JavaScript, e uma balança que não mediu a água não mediu 0% de água —
escrever o zero era pôr na ficha do sócio um número que ninguém mediu. Há
um teste só para isto.

**O sócio vê a vermelho o que caducou.** As duas datas do cartão — quota e
seguro — apareciam em branco estivessem válidas ou não, e quem tinha o seguro
acabado em março lia a data e ficava na mesma. A comparação é por texto
(`jaPassou()`, em `src/lib/datas.ts`, com testes), nunca por
`new Date(texto)`: em Portugal isso recua um dia no horário de verão e daria
um seguro válido marcado como caducado.

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

**Isto é do `print()` e do registo, não do que se responde.** O `detail` de um
`HTTPException` **nunca passa pela consola**: o `LoggingMiddleware` regista o
caminho, o IP e o estado, e nada do corpo. Por isso as mensagens que o sócio
lê no telemóvel — as do PIN e as da entrada — **levam acentos**, como manda a
regra de escrever tudo em português. Confirmado a correr no Windows: chegam
intactas e o servidor não se queixa. O resto do `server.py` escreve sem eles
por história, não por necessidade.

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

**O `PUT /api/members/{id}` não mexe no estado.** O `MemberCreate`, que é o
corpo dele, não tem campo `status` — e é de propósito: corrigir um telefone
não pode levantar uma suspensão sem ninguém reparar. Quem mexe no estado são
as duas rotas próprias (ver **Suspender um sócio**, nas regras de negócio).

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
