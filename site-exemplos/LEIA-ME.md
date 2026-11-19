# Cinco caminhos para o site público

Desenhos alternativos ao que está em `site-publico/`, feitos para
**comparar e escolher**. Nenhum está publicado, e **nenhum deles é o site**:
são propostas, para o dono ver, apontar o que gostou em cada um, e daí sair
o desenho final.

**A página que os põe lado a lado é o `comparar.html`.**

| | | Onde |
|---|---|---|
| **E** | **Conjunção** — a junção das ideias que o dono apontou | `e-conjuncao.*` |
| **A** | **Cinema** — escuro, fotografia a toda a largura | `site-publico/` |
| **B** | **Papel** — editorial, claro, letra grande | `b-papel.*` |
| **C** | **Painel** — técnico, com selector e grelha de horário | `c-painel.*` |
| **D** | **Cartaz** — cartaz de combate, letra enorme | `d-cartaz.*` |

---

## O E é outra coisa

O A, o B, o C e o D foram feitos para o dono **escolher**. Depois de os ver,
ele apontou sete pormenores — em sete sites, pela ordem em que os queria —
e pediu a junção. O **E** é essa junção, na paleta escura, que foi a que ele
escolheu.

| A ideia dele | Onde ficou |
|---|---|
| Mara: "começar como se fosse uma revista" | A capa: cabeçalho, n.º 1, chamadas de capa. Fica presa ao fundo e o resto do site sobe por cima |
| Primal Instinct: a imagem de fundo a rodar | O disco grego, que **abre o site** |
| Jakobsen: foto à direita, texto à esquerda, e a linha que troca para pormenores | A secção **O ginásio** |
| Heatherwick: foto média de um lado, descrição do outro, para as três modalidades | **Boxe**, **Kickboxing** e **Jiu-Jitsu Kids** |
| Maison Integre: uma ou duas linhas de fotografias pequenas | As duas tiras entre as modalidades, a correr em sentidos contrários |
| Studio Plato: fotografias pequenas a mexerem-se junto às frases | A secção das frases |
| Heatherwick: preto-e-branco que ganha cor | **Antes, e agora** — o retrato antigo e o grupo de hoje |
| Mara: três fotos que se sobrepõem no scroll | **A loja**, no fim, com os artigos da gestão |

### O disco grego

A imagem do Primal Instinct é uma peça de pedra fotografada, e copiá-la não
era possível nem decente. O nosso é um disco de bronze com dois pugilistas em
relevo, um meandro à volta, um astrágalo de contas e uma legenda incisa no
aro. **Foi desenhado de raiz, e não é a fotografia de peça nenhuma.**

Na borda está escrito, em grego:
**ΓΥΜΝΑΣΙΟΝ · ΚΟ · ΟΛΙΣΙΠΩΝ · ΠΥΓΜΑΧΙΑ** — ginásio, KO, Olisipo, pugilismo.
*Olisipo* era o nome antigo de Lisboa e *pygmachia* é o pugilismo; está tudo
certo. Uma inscrição inventada só com letras bonitas não é nada.

#### A luz não está pintada na imagem

É aqui que isto mudou. Até agora o disco era **uma fotografia iluminada uma
vez**: o brilho estava onde tinha ficado, e nenhuma imagem dessas reage a
coisa nenhuma.

Foi-se ver o que o site dele faz por dentro: um modelo 3D em WebGL com
**17 MB de texturas** — `Normals_*`, `ColorAO_*`, `RoughHeight_*` — e a luz
calculada a cada fotograma. Fez-se o mesmo, com **580 KB e sem biblioteca
nenhuma**:

| Ficheiro | O que é |
|---|---|
| `fotos/artefacto-cor.webp` | a cor própria do metal, com a oclusão lá dentro (45 KB) |
| `fotos/artefacto-rel.webp` | as normais, a altura e o recorte (1,34 MB) |
| `fotos/artefacto-rug.webp` | a aspereza, o metal e a cavidade (139 KB) |
| `fotos/artefacto-1500.webp` | a peça já iluminada, para quem não tem WebGL |
| `artefacto-luz.js` | o sombreador que faz a luz |

Os mapas têm **2048 pixéis**. Estiveram a 1024, e o dono disse o que era
preciso dizer: 580 KB contra os 17 MB dele estava longe da realidade. Quatro
vezes o detalhe custou um megabyte, e o megabyte paga-se — é a imagem que a
página inteira tem para dar.

#### As sete coisas que nenhuma imagem cozida tem

Subir a resolução sozinho não chegava. O que faz a peça parecer metal, e não
um desenho de metal, é isto, e nada disto cabe numa fotografia:

1. **O relevo é geometria, e não pintura.** O raio percorre-o e bate onde
   ele está mesmo, por isso um braço levantado tapa o que está atrás dele e
   recorta-se contra o escuro quando a peça se deita.
2. **O relevo faz sombra sobre si próprio.** Sem isso, uma figura levantada
   meio milímetro acima do campo não escurece nada à sua frente, e a luz
   rasante deixa de querer dizer seja o que for.
3. **A peça está empenada.** Uma fundição não sai plana, e uma peça plana
   lê-se como desenho — por mais relevo que tenha.
4. **A aspereza muda de sítio para sítio.** O metal gasto nos pontos altos é
   polido e devolve um reflexo apertado; a patina do fundo é baça e não
   devolve nada. Uma peça com o mesmo brilho em todo o lado lê-se como
   plástico — e era esse o problema, não a forma.
5. **O desgaste é às manchas**, e não igual em toda a peça. Há zonas comidas
   e zonas que se salvaram; um bronze gasto por igual lê-se como material de
   computador.
6. **Há uma sala à volta que o metal reflecte**, e não só uma lâmpada. Metade
   do que o olho lê como metal vem daí, e não custa textura nenhuma: é uma
   conta sobre a direcção em que o reflexo sai.
7. **As marcas do torno correm à volta do disco.** Ao acaso leem-se como
   sujidade; em círculo leem-se como fabrico.

E duas que são de fotografia e não de metal: uma **curva de cinema** em vez de
um corte (o brilho passa muito acima do branco, e cortá-lo a direito dava
chapas brancas sem forma lá dentro) e **meio nível de ruído**, porque num
escuro destes oito bits partem-se em anéis.

O que se vê **não é uma imagem a rodar**: é uma peça no espaço, e cada pixel
do ecrã é um raio que vai lá bater. Por isso a perspectiva é a verdadeira —
o lado de lá afasta-se e perde-se no escuro.

#### O disco abre o site

Decisão dele, em novembro de 2026: o artefacto passou à frente da capa de
revista. A capa ficou logo a seguir, e por isso **deixou de poder ser
`fixed`** — uma camada fixa de ecrã inteiro ficaria por cima do disco a
página toda. Prende-se agora ao topo dentro de um recipiente com o dobro da
altura, e a secção seguinte sobe-lhe por cima: é exactamente o que ela fazia
quando era a primeira, só que a funcionar em qualquer sítio da página.

Duas coisas tiveram de mudar com ela:

- **A entrada da capa deixou de arrancar com a página.** A animação corria
  toda antes de alguém a ver, e quando lá chegasse já estava feita. Arranca
  quando ela aparece.
- **O parallax mede-se pela posição dela**, e não pela da página. Com o
  `scrollY` a fotografia chegava ao ecrã com o movimento todo já gasto.

#### A roda do rato

No site dele **a página não rola**: tem a altura do ecrã, e a roda passeia a
câmara por cima da peça — cada volta leva a outro sítio do artefacto.
Confirmado a correr: o `scrollY` nunca sai de zero.

Aqui a página tem de rolar, porque tem mais coisas por baixo. Por isso a
secção ganhou **curso próprio** (`.artefacto__viagem`, 260svh) com o palco
preso lá dentro: enquanto a roda anda nesse curso é a câmara que viaja — o
disco roda mais de uma volta, a câmara recua e a peça endireita-se até se ver
inteira. Só depois a página segue. É a mesma técnica da loja, no fim.

#### O que se mediu no site dele, antes de mexer em nada

| | Primal | O nosso, antes | O nosso, agora |
|---|---|---|---|
| Luminância mediana | 4/255 | 13 | 15 |
| Percentil 95 | 65 | 91 | 81 |
| Mudança entre dois fotogramas a 3,5 s | 7,5 a 12,7 | — (parado) | 6,3 a 8,0 |
| Percentil 90, só na zona do disco | 49 | 91 | 42 a 64 |

O terceiro número é o que mais conta: **com o rato parado, o disco dele muda
tanto como com o rato a mexer.** O rato é um empurrão, não o motor. Por isso
a inclinação, a guinada, a distância e a luz andam todas sozinhas, cada uma
no seu tempo, e nunca voltam ao mesmo sítio ao mesmo tempo.

#### O que se aprendeu, e vale a pena guardar

- **O passo tem de ser refinado por bissecções no fim.** Sem elas fica onde
  calhou, e onde calhou lê-se como uma escada. (Isto ficou, e vale na marcha
  de hoje: são seis.) A altura do relevo em si foi decidida outra vez, e por
  outra razão — ver **A peça passou a ter lado**, mais abaixo.
- **O relevo nasce da derivada do mapa, e a derivada amplifica o que é
  miúdo.** Um ruído de superfície com um milésimo de altura dava uma peça
  com aspecto de casca de árvore. A patina mancha a **cor**, não a altura.
- **Guardar as normais custa cinco vezes mais do que guardar a altura** —
  1,0 MB contra 157 KB — e mesmo assim é o que se faz: a normal é a derivada
  da altura, e derivar um número de 8 bits amplifica cada degrau até uma
  encosta de 79 graus. O que se pode fazer é **arredondar as normais a
  degraus de 3**: 1,35 graus de erro, que o olho não vê, e menos um quarto
  de ficheiro.
- **Os mapas têm 1024 pixéis porque o WebGL 1 só faz mipmaps em potências de
  dois.** Sem mipmaps, o lado longe do disco — que a perspectiva comprime
  três vezes — cintila a cada volta. E com filtragem anisotrópica, que é o
  que impede a greca e a legenda de se desfazerem em papa a meio do disco.
- **O grão fino não vai no mapa: nasce no sombreador.** Um mapa de 1024
  esticado por um disco maior do que o ecrã fica mole de perto. Uma conta de
  ruído é nítida a qualquer tamanho e não pesa byte nenhum.
- **Num ecrã estreito a câmara recua, não se aproxima.** A largura visível
  encolhe com o feitio do ecrã, e de perto o disco deixava de se ler como
  disco — era só bronze.
- **A luz anda à volta do centro do disco, e não de um ponto fixo do
  espaço.** Presa ao mundo, havia voltas inteiras em que a poça caía ao lado
  dos lutadores, que são o assunto da peça.
- **Uma bola com um triângulo à frente lê-se como um boné**, não como uma
  cabeça. O que faz a cabeça é o perfil — testa, nariz, queixo.
- **As incisões dos corpos estiveram meses a não existir, sem erro nenhum.**
  A tela desenha-se em dobro para suavizar, e as coordenadas das incisões
  iam sem essa escala: caíam no canto da tela, e lá eram apagadas pela
  multiplicação com a máscara das figuras. O produto dava zero. Descobriu-se
  por medida e não a olho — triplicou-se a profundidade do sulco e a soma do
  mapa de alturas não mexeu um milésimo. Era por isso que os lutadores eram
  bolhas lisas. Hoje todas as coordenadas passam por um `risco()`, que é o
  único sítio onde a escala se aplica.
- **O músculo é um inchaço do membro, não um ovo pousado em cima dele.** O
  que o distingue não é a amplitude — é o quanto esbate nas pontas: com um
  borrão de 10 as coxas ficavam ovos claros colados à perna; com 18 ficam
  uma curva.
- **As lascas do aro só mordem a borda.** Postas por dentro, abriam buracos
  no meio da peça — que é uma coisa muito diferente de um aro gasto.
- **Uma fenda não passa por cima do KO.** Uma risca a atravessar duas letras
  lê-se como um erro de quem desenhou, não como o tempo.

#### A peça passou a ter lado

Ele viu a diferença e disse-a: o nosso continuava longe do dele, e **não se
podia ver de lado**. Tinha razão nas duas, e a segunda explica a primeira.

Até aqui o disco era **um plano inclinado** com o relevo fingido por paralaxe
— o raio batia numa folha lisa e depois andava dentro da textura à procura da
altura. De frente engana bem. De perfil não há nada para ver: **um plano
visto de lado é uma linha**, e por isso a peça nunca podia deitar-se.

Agora o disco é **um corpo**, e é o corpo que se percorre:

| | O que é |
|---|---|
| a face | o campo, com o relevo por cima |
| o bordo | um quarto de círculo que rola do campo para o aro |
| o aro | a parede a toda a volta — 0,118 de espessura, com estrias de fundição e patina em baixo |
| o verso | bronze bruto do molde, baço e escuro |

O raio entra na caixa da peça — o cilindro do aro cortado pela fatia entre o
verso e o cimo do relevo — e aí decide: se entrou pela parede é aro, se
entrou por baixo é verso, e se entrou por cima **sobrevoa o relevo** até lhe
bater. É isso que faz a vista rasante: um braço levantado tapa mesmo o que
está atrás dele e recorta-se contra o escuro, em vez de se achatar.

#### O que se mediu no site dele, desta vez

A roda do rato dele foi percorrida de ponta a ponta, 50 passos, com
fotografia a cada dois. O que se viu:

- a peça dele é **muito maior do que o ecrã** — nunca se vê inteira. Ora se
  está por cima do campo, ora encostado às figuras, ora fora do aro a olhar
  para a parede de pedra.
- a **câmara desce até quase ao plano** e os relevos levantam-se contra o
  preto. Há fotogramas inteiros quase pretos, com um fio de luz.
- o `scrollY` dele **nunca sai de zero**: a página tem a altura do ecrã e a
  roda só mexe a câmara. (Já se sabia; confirmou-se outra vez.)
- as texturas dele estão separadas por **zona da peça** —
  `ColorAO_top`, `ColorAO_statues`, `ColorAO_flank`. O `flank` é o lado.
  Quem separa o lado numa textura própria é porque o mostra.

#### O caminho que a câmara faz agora

Três tempos, no mesmo curso de roda que já havia:

1. **Longe, a peça inteira.** É preciso vê-la uma vez para saber o que é —
   as figuras, a greca, a legenda em grego.
2. **Perto e em baixo.** O relevo, que de frente era um desenho, levanta-se:
   as figuras tapam o que está atrás delas e fazem sombra à sua frente.
3. **Quase de perfil.** Vê-se o que a peça nunca teve: a espessura, o aro a
   toda a volta e o relevo a recortar-se contra o escuro.

A viagem **não desanda** — acaba noutro sítio, que é o que faz valer a pena
percorrê-la. E não vai *até* ao perfil: a 1,52 de inclinação a câmara ficava
abaixo da face e só se via o aro, uma mancha castanha sem assunto. Fica em
1,40, que é onde ainda se vê a face em fuga **e** a parede.

Num ecrã ao alto a câmara **recua**, não se aproxima: a largura visível
encolhe com o feitio do ecrã, e de perto o disco deixava de se ler como
disco — era só bronze.

#### O que se aprendeu a fazer isto

- **O sinal do `y` da normal estava trocado**, desde sempre. O mapa de
  normais vive nos eixos da textura, onde o *v* desce; o *y* da peça sobe.
  A luz batia no lado errado de cada relevo. Confirmou-se contra a peça já
  iluminada que o gerador produz — a mesma pose, a mesma luz, e as duas
  fotografias lado a lado: com o sinal certo as figuras acendem-se por cima,
  como nela; com o sinal de antes, por baixo.
- **O relevo tinha de subir, mas não muito.** Estava em 0,0125, uma altura
  pensada para a paralaxe e não para a verdade: de raspão, as figuras eram
  **placas de papel** postas ao alto. Passou a 0,022. A 0,038 ficava melhor
  ainda — e apareceu outro problema.
- **A altura vem num canal de oito bits**, e são setenta e sete degraus para
  todo o relevo. De frente não se nota; de raspão cada degrau espalha-se por
  dezenas de pixeis e a peça vira **um terreno de socalcos**. O que os
  desmancha é um grão fino somado à altura — e de caminho faz o que um
  bronze fundido tem mesmo: superfície.
- **O passo da marcha mede-se pelo que falta descer**, e não em fatias
  iguais. Com fatias iguais, numa vista rasante cada passo valia vinte
  texels e o relevo saía **aos quadrados**. Medido pela folga até ao chão
  que está por baixo, longe dá passadas largas e em cima anda ao pixel.
- **A lâmpada tem de andar com a câmara.** Presa ao mundo, a 1,0 do centro,
  ficava *para lá* da peça assim que a câmara se aproximava — e a peça
  aparecia toda em contraluz. A posição e o alcance dela vão agora em
  unidades da distância.
- **O desvio também.** O que ele vale no ecrã é `desvio/distância`: preso ao
  mundo, a peça fugia do enquadramento ao aproximar-se.
- **Uma peça fundida não sai plana.** O empeno são duas ondas cruzadas — não
  ruído, para a inclinação sair por conta e não por diferenças — e é o que
  tira à peça o ar de desenho: a luz escorrega por cima dele e, de lado, a
  própria silhueta ondula.
- **Um aro perfeitamente redondo é o primeiro sinal de computador.** O raio
  leva mordidas; fundas de mais ficam com ar de cera, e por isso são rasas.
- **O brilho passava tão acima do branco que o bronze perdia a cor.** Com a
  chave mais baixa, as partes iluminadas voltam a ser castanhas em vez de
  creme.

#### O que custa

Medido na máquina dele (AMD Radeon integrada, 1366×820 a 1,5 de densidade,
2,1 milhões de pixeis): **16,7 ms por fotograma** — os 60 por segundo
certos — no nível mais alto, do princípio ao fim da viagem. O nível
automático não chegou a baixar. A marcha nova é mais trabalho do que a
paralaxe antiga e mesmo assim não se paga aqui; nas máquinas fracas os
quatro níveis de sempre continuam lá.

#### Refazer a peça

`python desenhos/artefacto.py`, a partir de `site-exemplos/desenhos/`.
Precisa de `numpy` e de `Pillow` e demora cerca de um minuto. Os *seeds*
estão fixos: correr outra vez dá exactamente os mesmos ficheiros.

Sem WebGL, com **reduzir movimento** ligado ou com poupança de dados, nada
disto acontece e fica a fotografia — que é a mesma peça, iluminada uma vez
em vez de a toda a hora. A página diz, por palavras, que o disco não é uma
peça de museu. Se o site for publicado assim, essa frase tem de lá ficar.

### As fotografias pequenas das frases

A ideia é do Studio Plato. O que lá está foi **medido**, a 1440, antes de se
mexer no nosso — e o nosso estava errado nas duas coisas.

| | Studio Plato | O nosso, antes | O nosso, agora |
|---|---|---|---|
| Quantas | 13 | 9 | 12 |
| Largura | 3% a 7% do ecrã (43 a 101 px) | 6,1% a 11,4% (88 a 164 px) | 3,2% a 6,4% (46 a 92 px) |
| Por cima do texto | nenhuma | quatro das nove | nenhuma |
| O que se mexe | cada fotografia, por sua conta | a camada toda, com o rato | cada fotografia, por sua conta |

**O tamanho vem em `vw`**, como lá: a fotografia é um pormenor da página, e
um pormenor cresce com a página. Com um chão de 26 px — abaixo disso não se
percebe o que é, e um pormenor que não se percebe é só sujidade — e um tecto,
para não crescerem sem fim num monitor grande.

**Nenhuma entra na coluna das frases.** A coluna ocupa dos 22% aos 78% da
largura em todos os ecrãs acima dos 820; as fotografias vivem nas duas
margens, e o teste confirma-o em nove feitios de ecrã **contando já o
passeio**, que é quanto cada uma se pode afastar.

#### O movimento: cada uma por sua conta

O que lá se mexe **não é o rato**. Media-se a página com o rato parado e
continuavam a andar; levava-se o rato aos quatro cantos e o deslocamento não
acompanhava — a fotografia ia tanto para a esquerda com o rato à esquerda
como com o rato à direita. O rato não manda ali nada.

O nosso tinha uma camada só, que o rato empurrava 26 px para o lado. Doze
fotografias a deslizarem juntas leem-se como **uma folha**, e era isso que se
estava a ver. Saiu.

Ficou o que lá está: **cada fotografia vagueia sozinha**, para um destino
novo, pára, e vai para outro. Medido fotografia a fotografia no original, e
dá sempre o mesmo número: **um terço da sua própria largura de lado, quase
metade para cima e para baixo** — a de 43 px andava 14 px em x e 19 em y; a
de 101 px, 34 e 44. Por isso o caminho se escreve em múltiplos da largura e
não em pixeis: vale em qualquer ecrã, e a fotografia grande vagueia mais do
que a pequena, como lá.

- **Oito destinos por volta**, e fica quieta 42% do tempo entre cada um.
  No original mediram-se 500 ms seguidos sem nada mexer, e logo a seguir um
  salto de 50 px. É esse o compasso: anda, assenta, anda.
- **O caminho é sorteado, mas com semente fixa** — diferente de fotografia
  para fotografia, igual em todas as aberturas da página. Sem isto não havia
  como confirmar o movimento por fotografia do ecrã.
- **Voltas de duração diferente** (11 a 18 segundos) e cada uma a começar a
  meio da sua, para nunca se apanharem duas em passo certo.
- **Fora do ecrã param.** O caminho leva `var()` lá dentro, o que o tira das
  mãos da placa gráfica e o põe nas do JavaScript; deixá-lo a correr numa
  página onde já roda um disco em WebGL era pagar por um movimento que
  ninguém está a ver.

#### No telemóvel ficam duas

Num ecrã estreito não há margens: o texto vai de ponta a ponta. O Plato
**esconde-as todas**. Aqui ficam **duas**, em diagonal — uma na faixa vazia
por cima da primeira frase, outra por baixo da última. Quatro encostadas ao
topo deixavam de ser um pormenor e passavam a ser uma tira de fotografias.

As faixas crescem para elas caberem: a secção ganhou mais ar em cima e em
baixo, que num telemóvel lhe fazia falta de qualquer maneira — eram cinco
frases coladas aos cantos do ecrã.

---

## De onde vieram

Os nove sites que ele guardou separam-se em duas famílias: **escuro e
cinematográfico** (capricorn, Primal Instinct, Arc'teryx) e **claro e
editorial** (Heatherwick, Charles, Jakobsen, Mara). O A nasceu da primeira.
Os três novos foram buscar a outra, e o que a primeira ainda tinha por dar.

- **E — Conjunção.** Ver a tabela acima: veio dos sete sites de uma vez.
- **B — Papel.** O índice fixo à esquerda é do Heatherwick; a fotografia que
  acende quando o rato passa por cima de uma linha é do Charles; o ar e a
  serifa, do Jakobsen e do Mara.
- **C — Painel.** O selector de modalidades é o configurador da capricorn; as
  figuras numeradas e as fichas técnicas são das páginas de materiais da
  Arc'teryx. A **grelha da semana** — a semana desenhada, com a linha de
  agora — não veio de nenhum deles: é a resposta a uma pergunta que um
  ginásio recebe todos os dias.
- **D — Cartaz.** O cru do Primal Instinct, e os cartazes de combate que
  estão pendurados na parede do próprio ginásio. A letra é a **Anton**, a
  mesma que está pintada na parede do cartão de sócio, na aplicação.

---

## O que é igual nos cinco, e é de propósito

Para a comparação ser entre **desenhos** e não entre conteúdos:

- **Os dados vêm da gestão**, dos mesmos campos (`/api/mobile/gym-info` e
  `/api/mobile/activities`). A morada, o horário, os contactos e as
  modalidades são lidos, não escritos na página.
- **A leitura do horário é uma só**, no `comum.js`, com as mesmas regras da
  aplicação do sócio (`src/lib/horario.ts`): uma linha por conjunto de dias,
  dois períodos por dia, e nunca se perde texto.
- **Os emoji das modalidades não aparecem**, como na aplicação.
- **O botão é o WhatsApp**, com o recado já escrito.
- **Não há preços** em nenhum dos quatro.
- **As frases inventadas são as mesmas** — as que estão na tabela do
  `site-publico/LEIA-ME.md` e continuam por confirmar. Corrigir uma corrige-a
  nos cinco.
- **Não há preços** em nenhum deles, nem sequer os da loja no E. Os artigos
  têm preço na gestão e na aplicação do sócio; aqui mostram-se só o nome e a
  cor. Se o dono quiser os preços à vista, é uma linha.

O `comum.js` existe por isto: se o horário se lê de uma maneira, lê-se da
mesma em todos. O que muda de exemplo para exemplo é só o desenho e a
maneira de o mostrar.

**O E vai buscar mais uma coisa: a montra** (`GET /api/mobile/shop`), para a
secção da loja. É a mesma lista que o sócio vê na aplicação — um artigo
acrescentado no Stock aparece ali. Sem resposta do servidor ficam cinco
artigos de reserva, em `fotos/loja/`.

---

## Como são feitos

Cada exemplo são três ficheiros — `.html`, `.css` e `.js` — mais o
`comum.js`, partilhado. **Sem compilação**, como o A.

**Há uma diferença em relação ao A:** o B, o C e o E vão buscar letras ao
Google Fonts (`Instrument Serif`, `Inter`, `IBM Plex Mono`), e o A não vai
buscar nada a lado nenhum. Se o caminho escolhido for um desses, decide-se então se
as letras ficam alojadas aqui — como já está a Anton, em `tipos/` — em vez de
virem de fora. Alojá-las é melhor: menos um sítio de onde o site depende.

### As fotografias

As mesmas do `site-publico/fotos`, mais quatro que estavam escolhidas e não
tinham sido usadas (`veterano`, `retrato-antigo`, `sala-larga`,
`treinador-saco` — as duas últimas acabaram por sair outra vez). Estão
copiadas para aqui, e não partilhadas com o A, para cada pasta se poder abrir
e publicar sozinha. Quando um caminho for escolhido, o que sobra apaga-se.

A **fotografia antiga** (`retrato-antigo`, no B) é de um boxeador em guarda,
com uma camisola do KO. **Não sei quem é nem de quando é** — diz-me e
escreve-se a legenda. Até lá diz só "uma fotografia antiga, da parede do
ginásio".

---

## Ver no computador

```bash
cd site-exemplos && python -m http.server 8078
```

E abrir `http://127.0.0.1:8078/comparar.html`.

**Fora do domínio o servidor recusa os pedidos** (CORS), e por isso a
pré-visualização corre com a cópia de reserva que está no `comum.js`. Não é
um erro: é o que acontece a um visitante quando o servidor está em baixo.

---

## O que falta decidir

O mesmo que faltava antes — está tudo na tabela do
`site-publico/LEIA-ME.md` — mais uma coisa nova:

**O que fica e o que sai do E.** Ele já é uma mistura, e pode levar mais —
a grelha de horário do C, a letra enorme do D. Tirar é tão útil como juntar:
é o mais comprido dos cinco e o que tem mais a mexer.
