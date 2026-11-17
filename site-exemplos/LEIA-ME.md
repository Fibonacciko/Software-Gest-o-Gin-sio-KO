# Quatro caminhos para o site público

Três desenhos alternativos ao que está em `site-publico/`, feitos para
**comparar e escolher**. Nenhum está publicado, e **nenhum deles é o site**:
são propostas, para o dono ver, apontar o que gostou em cada um, e daí sair
o desenho final.

**A página que os põe lado a lado é o `comparar.html`.**

| | | Onde |
|---|---|---|
| **A** | **Cinema** — escuro, fotografia a toda a largura | `site-publico/` |
| **B** | **Papel** — editorial, claro, letra grande | `b-papel.*` |
| **C** | **Painel** — técnico, com selector e grelha de horário | `c-painel.*` |
| **D** | **Cartaz** — cartaz de combate, letra enorme | `d-cartaz.*` |

---

## De onde vieram

Os nove sites que ele guardou separam-se em duas famílias: **escuro e
cinematográfico** (capricorn, Primal Instinct, Arc'teryx) e **claro e
editorial** (Heatherwick, Charles, Jakobsen, Mara). O A nasceu da primeira.
Os três novos foram buscar a outra, e o que a primeira ainda tinha por dar.

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

## O que é igual nos quatro, e é de propósito

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
  nos quatro.

O `comum.js` existe por isto: se o horário se lê de uma maneira, lê-se da
mesma em todos. O que muda de exemplo para exemplo é só o desenho e a
maneira de o mostrar.

---

## Como são feitos

Cada exemplo são três ficheiros — `.html`, `.css` e `.js` — mais o
`comum.js`, partilhado. **Sem compilação**, como o A.

**Há uma diferença em relação ao A:** o B e o C vão buscar letras ao Google
Fonts (`Instrument Serif`, `Inter`, `IBM Plex Mono`), e o A não vai buscar
nada a lado nenhum. Se o caminho escolhido for um desses, decide-se então se
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

**Qual dos caminhos, ou que pedaços de cada um.** Não é preciso escolher um
inteiro. A capa do D com a grelha do C é uma combinação que faz sentido; a
calma do B com as fotografias grandes do A, também.
