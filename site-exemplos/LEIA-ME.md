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
| Primal Instinct: a imagem de fundo a rodar | O disco grego, logo a seguir à capa |
| Jakobsen: foto à direita, texto à esquerda, e a linha que troca para pormenores | A secção **O ginásio** |
| Heatherwick: foto média de um lado, descrição do outro, para as três modalidades | **Boxe**, **Kickboxing** e **Jiu-Jitsu Kids** |
| Maison Integre: uma ou duas linhas de fotografias pequenas | As duas tiras entre as modalidades, a correr em sentidos contrários |
| Studio Plato: fotografias pequenas a mexerem-se junto às frases | A secção das frases |
| Heatherwick: preto-e-branco que ganha cor | **Antes, e agora** — o retrato antigo e o grupo de hoje |
| Mara: três fotos que se sobrepõem no scroll | **A loja**, no fim, com os artigos da gestão |

### O disco grego

A imagem do Primal Instinct é uma peça de pedra fotografada, e copiá-la não
era possível nem decente. O **`fotos/artefacto-*.webp`** é um disco de bronze
com dois pugilistas em relevo, um meandro à volta e a inscrição **ΚΟ** — que
são as iniciais do ginásio e são letras gregas a sério.

**Foi desenhado de raiz, e não é a fotografia de peça nenhuma.** O guião que
o faz está em **`desenhos/artefacto.py`**, ao lado — como o `desenhos.py` da
aplicação do sócio: constrói-se um *mapa de alturas* — que é alto, que é baixo, onde estão as figuras, onde estão as
mossas de dois mil e setecentos anos — e depois ilumina-se esse mapa com uma
luz rasante, que é o que levanta o relevo. Não há fotografia nenhuma por
baixo.

O que se aprendeu a fazê-lo, e que vale a pena guardar:

- **O relevo nasce da derivada do mapa, e a derivada amplifica o que é
  miúdo.** Um ruído de superfície com um milésimo de altura dava uma peça com
  aspecto de casca de árvore. A patina mancha a **cor**, não a altura.
- **Uma bola com um triângulo à frente lê-se como um boné**, não como uma
  cabeça. O que faz a cabeça é o perfil — testa, nariz, queixo.
- O disco pesa **157 KB** em WebP a 1500 pixéis. Em PNG eram 2,4 MB. O
  guião guarda os dois tamanhos que a página usa (1500 e 820).
- Correr `python desenhos/artefacto.py` a partir de `site-exemplos/fotos/`
  refaz a peça. Precisa de `numpy` e de `Pillow`, e demora 15 segundos.
- A página diz, por palavras, que o disco não é uma peça de museu. Se o site
  for publicado assim, essa frase tem de lá ficar.

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
