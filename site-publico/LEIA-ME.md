# Site público do Ginásio KO

A montra do ginásio, para quem **ainda não é sócio**. Não tem senha, não tem
login e não é a gestão — a gestão é o programa que está em `frontend/`.

**Ainda não está publicado.** Vive aqui no repositório até se decidir onde fica
(ver **Onde é que isto vai morar**, mais abaixo).

---

## Para que serve

Um site de ginásio tem um trabalho só: **fazer aparecer gente nova à porta**.
Tudo o resto — as modalidades, o horário, as fotografias — existe para apoiar
esse botão.

O que impede alguém de entrar num ginásio de artes marciais não é a falta de
informação: é o receio de não ter nível, de não ter material, de ser o único
que não sabe. Por isso a página responde a isso por ordem — **a primeira aula,
em três passos** — e é o maior pedaço da página.

E é por isso que as fotografias são as deste ginásio e não fotografias
compradas: miúdos de oito anos, gente dos cinquenta, uma rapariga a rir com o
nariz a sangrar. Nenhum concorrente tem isto, e é o que diz "cabes aqui" sem
ter de o escrever.

---

## O conteúdo vem da gestão

A morada, o horário, os contactos, o Instagram, o Google Maps e as modalidades
**não estão escritos na página**: são lidos do servidor, dos mesmos campos que
se preenchem em **App do Sócio → O Ginásio** e em **Aulas → Modalidades**.

Muda-se lá, muda no site e na aplicação ao mesmo tempo. Não é preciso mexer em
código nem voltar a publicar.

**Há uma cópia de reserva** no `guiao.js` (`DE_RESERVA`), com o que lá estava no
dia em que o site se fez. Serve **só** quando o servidor não responde — numa
manutenção, sem rede, ou numa pré-visualização fora do domínio. Existe por duas
razões: um site de ginásio que não diz a morada quando o servidor está em baixo
não serve para nada, e o Google lê a página **antes** de correr o JavaScript.

---

## O que ainda falta, e é decisão do dono

Estas frases foram escritas por mim a partir das fotografias e do que o
software sabe. **São propostas, não factos confirmados** — convém lê-las antes
de o site ir para o ar:

| Onde | O que diz | Porquê confirmar |
|---|---|---|
| Capa | "Dos oito aos sessenta e muitos" | As idades vieram das fotografias. |
| Passo I | "Uma mensagem no WhatsApp chega" | É mesmo assim que se marca? |
| Passo II | "Não precisas de trazer material" | O ginásio empresta luvas e ligaduras? |
| Passo III | "Aquecimento, técnica, trabalho de saco" | É este o alinhamento de uma aula? |
| Chamada | "A primeira aula é experimental" | **Não diz o preço.** No software a aula experimental são 5 € (`TRIAL_DEFAULT_AMOUNT`), mas publicar um preço é decisão de negócio. |
| Modalidades | As descrições de cada uma | Nenhuma modalidade tem descrição na gestão. Enquanto o campo estiver vazio, mostram-se as minhas (`EXPLICACOES`, no `guiao.js`); **no dia em que ele as escrever na gestão, aparecem as dele e as minhas desaparecem sozinhas.** |

**Não há preços no site.** Nem quota, nem seguro, nem inscrição. É a decisão
que falta e é dele.

---

## Onde é que isto vai morar

Hoje o `ginasioko.site` abre na **gestão**. Com um site público, a raiz passa a
ser o site e a gestão muda-se de sítio. Três caminhos, por ordem de preferência:

1. **O site na raiz, a gestão em `ginasioko.site/gestao`.** É o normal: quem
   escreve o endereço é um futuro sócio, não o balcão. Obriga a mexer no
   `basename` do React e nos atalhos guardados no computador do balcão.
2. **O site na raiz, a gestão em `gestao.ginasioko.site`.** Mais limpo, mas
   precisa de um certificado novo para o subdomínio.
3. **O site em `ginasioko.site/ko`, a gestão onde está.** Não mexe em nada,
   mas o endereço que se dá às pessoas deixa de ser o endereço bonito — e esse
   é o único que elas vão escrever.

Enquanto não se decide, dá para pôr **uma pré-visualização** num caminho à
parte, servida pelo nginx da máquina, como já se faz com o APK em `/app`.

---

## Como é feito

Três ficheiros e uma pasta de fotografias. **Sem bibliotecas e sem
compilação** — é HTML, CSS e um ficheiro de JavaScript que o navegador lê.

| | |
|---|---|
| `index.html` | a página |
| `estilo.css` | o aspecto |
| `guiao.js` | o que vai buscar à gestão, o horário e os contactos |
| `fotos/` | as fotografias do ginásio, em duas larguras |
| `tipos/` | a Anton, a mesma letra da parede do cartão de sócio |

Isto é de propósito: um site que é três ficheiros copia-se para qualquer lado,
abre-se com dois cliques e ainda vai funcionar daqui a cinco anos. Um site
feito com uma arquitetura de aplicação precisa de ser reconstruído sempre que
uma dependência envelhece, e isto não muda de meio em meio ano.

### As fotografias

Vão em **duas larguras** — 1800 para o computador e 900 para o telemóvel —
escolhidas pelo `<picture>`. As originais têm 3 a 6 MB cada; assim a página
inteira pesa menos do que **uma** delas. Foram preparadas pelo
`servidor/preparar-fotos.py`.

Só a primeira é carregada já (`fetchpriority="high"`); as outras esperam que se
chegue lá (`loading="lazy"`).

### Porque é escuro

As fotografias do ginásio são claras, saturadas e cheias de coisas: paredes
vermelhas, tapetes cor-de-rosa, o punho amarelo. Em cima de branco competiam
umas com as outras. Em cima de preto, cada uma fica sozinha no ecrã — que é
como se vê uma fotografia.

As cores são as da marca, as mesmas da gestão e da aplicação: laranja
`#B8651B`, âmbar `#F5A623`, escuro. O **branco é quente** (`#f2efe9`) e nunca
`#fff`, que em cima de preto arde.

### O horário é lido, não escrito

O campo do horário é texto livre na ficha do ginásio — "Segunda, quarta e
sexta: 10h00 - 14h00 / 16h00 - 22h00". Quem o mostra é que o lê, como na
aplicação do sócio (`src/lib/horario.ts`). As regras são as mesmas:

- uma linha por conjunto de dias;
- **dois períodos por dia**, que o ginásio fecha para almoço;
- **nunca se perde texto**: o que não se conseguir ler aparece como está;
- a linha de **hoje** fica acesa, e no canto da capa diz se está **aberto
  agora**.

Em produção o horário vinha todo numa linha só, sem separador — "22h00 Terça e
quinta: ...". Um dia da semana logo a seguir a uma hora começa linha nova.

### Os emoji não aparecem

Na base de dados as modalidades chamam-se `🥊 Boxe`. Ao público saem, como na
aplicação do sócio e pela mesma razão: juntos num ecrã são desenhos de autores
diferentes, de tamanhos diferentes. O que distingue cada modalidade é a **cor**,
que vem da ficha.

### O botão é o WhatsApp

O `wa.me` abre a conversa já com um recado escrito. Não há formulário, não há
email a pedir resposta, não há base de dados nova: a pessoa carrega e está a
falar com o ginásio. É também o único sítio onde o telemóvel do ginásio aparece,
e esse já é público.

---

## Ver no computador

```bash
cd site-publico && python -m http.server 8077
```

E abrir `http://127.0.0.1:8077`.

**Fora do domínio o servidor recusa os pedidos** (CORS), e por isso a
pré-visualização corre com a cópia de reserva. Não é um erro: é exactamente o
que acontece a um visitante quando o servidor está em baixo, e vale a pena ver
como fica.
