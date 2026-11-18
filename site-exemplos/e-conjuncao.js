/* ══════════════════════════════════════════════════════════════════════════
   Ginásio KO — Exemplo E · Conjunção

   Sete ideias, pela ordem em que foram apontadas:
     0  o artefacto grego, que abre o site          (Primal Instinct)
     1  a capa de revista, logo a seguir              (Mara)
     1  a peça antiga que roda                       (Primal Instinct)
     2  foto grande de um lado, texto do outro,
        e uma linha que troca para o pormenor        (Jakobsen)
     3  modalidade a modalidade, foto / texto,
        com tiras de fotografias pequenas no meio    (Heatherwick, Maison Integre)
     4  frases, e fotografias pequenas a flutuar     (Studio Plato)
     7  preto-e-branco que ganha cor                 (Heatherwick, no fim)
     8  fotografias que se sobrepõem ao rolar        (Mara, no fim)

   Os dados vêm da gestão pelo `comum.js`, como nos outros exemplos.
   ══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.prototype.slice.call(document.querySelectorAll(s));
  const prender = (v, a, b) => Math.max(a, Math.min(b, v));
  const semRato = window.matchMedia('(hover: none)').matches;
  const menosMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const ano = new Date().getFullYear();
  $('#ano').textContent = ano;
  $('#capaAno').textContent = ano;
  /* O boxe entrou nos Jogos em 688 a.C. A conta faz-se aqui para o número
     não envelhecer escrito na página. */
  $('#anosDeBoxe').textContent = ano + 688;

  /* ──────────────────── os dados que vêm da gestão ──────────────────── */

  function horasDeFecho(horario) {
    const hoje = horario.porDia[horario.hoje];
    if (!hoje) return '';
    const agora = horario.agora;
    const aberto = hoje.periodos.find((p) => agora >= p.abre && agora < p.fecha);
    if (aberto) return ' · fecha às ' + emHoras(aberto.fecha);
    const aSeguir = hoje.periodos.find((p) => agora < p.abre);
    if (aSeguir) return ' · abre às ' + emHoras(aSeguir.abre);
    return '';
  }
  function emHoras(m) {
    return String(Math.floor(m / 60)).padStart(2, '0') + 'h' + String(m % 60).padStart(2, '0');
  }

  function escreverHorario(horario) {
    const caixa = $('#listaHorario');
    caixa.innerHTML = '';
    horario.linhas.forEach((linha) => {
      const fila = document.createElement('div');
      if (!linha.dias.length) {
        /* Nunca se perde texto: o que não se conseguir ler aparece como
           está. Mais vale um horário feio do que um horário desaparecido. */
        fila.className = 'hora hora--crua';
        fila.textContent = linha.crua;
      } else {
        fila.className = 'hora' + (linha.eHoje ? ' hora--hoje' : '');
        const dias = document.createElement('span');
        dias.className = 'hora__dias';
        dias.textContent = linha.nomes;
        if (linha.eHoje) {
          const selo = document.createElement('span');
          selo.className = 'hora__hoje';
          selo.textContent = 'HOJE';
          dias.appendChild(selo);
        }
        const horas = document.createElement('span');
        horas.className = 'hora__horas';
        horas.textContent = linha.horas;
        fila.append(dias, horas);
      }
      caixa.appendChild(fila);
    });

    const selo = $('#seloAberto');
    selo.textContent = (horario.abertoAgora ? 'Aberto agora' : 'Fechado agora') + horasDeFecho(horario);
    selo.classList.toggle('selo--aberto', horario.abertoAgora);
  }

  function escreverModalidades(modalidades) {
    const porNome = {};
    modalidades.forEach((m) => { porNome[m.nome.toLowerCase()] = m; });

    /* Quando o dono escrever a descrição na gestão, é a dele que aparece. */
    $$('[data-descricao]').forEach((no) => {
      const m = porNome[no.dataset.descricao];
      if (m && m.descricao) no.textContent = m.descricao;
    });

    const destaques = ['boxe', 'kickboxing', 'jiu-jitsu'];
    const resto = modalidades.filter((m) => destaques.indexOf(m.nome.toLowerCase()) === -1);
    const caixa = $('#restoDasModalidades');
    if (!resto.length) { caixa.remove(); return; }
    caixa.innerHTML = 'Também se treina aqui: ' +
      resto.map((m) => '<b>' + m.nome + '</b>').join(', ') + '.';
  }

  function escreverContactos(ficha) {
    const morada = KO.moradaEmLinhas(ficha.address);
    if (morada.length) $('#morada').innerHTML = morada.join('<br>');

    const zap = KO.paraWhatsapp(ficha.whatsapp || ficha.phone, KO.RECADO);
    [['#botaoWhatsapp', zap], ['#botaoArtefacto', zap]].forEach(([sel, href]) => {
      const no = $(sel);
      if (!no || !href) return;
      no.href = href;
      no.target = '_blank';
      no.rel = 'noopener';
    });

    const mapa = $('#ligacaoMapa');
    mapa.href = KO.paraMapa(ficha.maps_url, ficha.address);

    const tel = $('#ligacaoTelefone');
    tel.href = 'tel:+351' + KO.soDigitos(ficha.phone);
    tel.textContent = KO.comEspacos(ficha.phone);

    const email = $('#ligacaoEmail');
    email.href = 'mailto:' + ficha.email;
    email.textContent = ficha.email;

    const insta = $('#ligacaoInstagram');
    insta.href = ficha.instagram;
    const conta = String(ficha.instagram || '').replace(/\/+$/, '').split('/').pop();
    if (conta) insta.textContent = '@' + conta;

    $('#ligacaoAvaliar').href = ficha.review_url || KO.paraMapa(ficha.maps_url, ficha.address);
  }

  /* ───────────────────────── a barra e a capa ───────────────────────── */

  const barra = $('#barra');
  const capa = $('#capa');
  const capaCaixa = capa.parentElement;
  const capaFoto = capa.querySelector('.capa__foto');
  const capaGrelha = capa.querySelector('.capa__grelha');

  /* A capa deixou de abrir o site, e por isso a entrada dela deixou de poder
     arrancar com a página: a animação corria toda antes de alguém a ver, e
     quando lá chegasse já estava feita. Arranca quando ela aparece. */
  if ('IntersectionObserver' in window) {
    const olho = new IntersectionObserver((es) => {
      if (!es[0].isIntersecting) return;
      document.body.classList.add('pronto');
      olho.disconnect();
    }, { threshold: 0.15 });
    olho.observe(capa);
  } else {
    document.body.classList.add('pronto');
  }

  function aoRolarCapa(altura) {
    const y = window.scrollY || window.pageYOffset || 0;
    barra.classList.toggle('barra--pousada', y > 40);

    /* Mede-se pela posição dela e não pela da página: a capa já não começa
       no topo, e com `scrollY` a fotografia aparecia com o parallax todo
       feito antes de ela chegar ao ecrã. */
    const r = capaCaixa.getBoundingClientRect();
    const p = prender(-r.top / Math.max(1, altura), 0, 1);
    capaGrelha.style.opacity = String(prender(1 - p * 1.45, 0, 1));
    capaGrelha.style.transform = 'translateY(' + (-p * 52) + 'px)';
    capaFoto.style.transform = 'translateY(' + (p * 11) + '%)';
    /* Deixa de ser desenhada mal saia do ecrã. */
    capa.style.visibility = (r.bottom <= 0 || r.top >= altura) ? 'hidden' : '';
  }

  /* ─────────── as fotografias que trocam para o pormenor ────────────── */

  const dicaPormenores = $('#dicaPormenores');
  if (semRato) {
    dicaPormenores.textContent = 'Trocam para o pormenor à medida que passam.';
    const olho = new IntersectionObserver((es) => {
      es.forEach((e) => e.target.classList.toggle('perto', e.intersectionRatio > 0.65));
    }, { threshold: [0, 0.65, 1] });
    $$('.pormenor').forEach((p) => olho.observe(p));
  }

  const dicaCor = $('#dicaCor');
  if (semRato) {
    dicaCor.textContent = 'Ganham cor quando chegam ao meio do ecrã.';
    const olho = new IntersectionObserver((es) => {
      es.forEach((e) => e.target.classList.toggle('com-cor', e.intersectionRatio > 0.6));
    }, { threshold: [0, 0.6, 1] });
    $$('.cor-ao-passar').forEach((f) => olho.observe(f));
  }

  /* ─────────────── as tiras de fotografias pequenas ─────────────────── */

  const PEQUENAS = [
    ['a-rir-no-ringue-900.jpg', 'Dois atletas a rir, caídos no ringue.'],
    ['alongamentos-900.jpg', 'A sala, com a turma a alongar no tapete.'],
    ['grupo-900.jpg', 'Fotografia de grupo no fim de um treino.'],
    ['jiujitsu-900.jpg', 'Trabalho de chão no jiu-jitsu.'],
    ['nariz-900.jpg', 'Duas atletas com luvas vermelhas, a rir.'],
    ['porta-900.jpg', 'O balão de velocidade, junto à parede.'],
    ['sala-larga-900.jpg', 'A sala dos sacos, vista ao comprido.'],
    ['treinador-ensina-900.jpg', 'O treinador a explicar um movimento.'],
    ['turma-flexoes-900.jpg', 'A turma a fazer flexões no tapete.'],
    ['veterano-900.jpg', 'Um atleta mais velho, de guarda.'],
  ];

  function encherTira(no, comeco) {
    const fio = no.querySelector('.tira__fio');
    const ordem = PEQUENAS.slice(comeco).concat(PEQUENAS.slice(0, comeco));
    /* Duas voltas da mesma lista: a animação anda -50% e volta ao princípio
       sem se ver a emenda. */
    for (let volta = 0; volta < 2; volta++) {
      ordem.forEach(([ficheiro, texto]) => {
        const img = document.createElement('img');
        img.src = 'fotos/' + ficheiro;
        img.loading = 'lazy';
        img.alt = volta === 0 ? texto : '';
        if (volta === 1) img.setAttribute('aria-hidden', 'true');
        fio.appendChild(img);
      });
    }
  }
  encherTira($('#tiraUm'), 0);
  encherTira($('#tiraDois'), 5);

  /* ───────────── as frases, e as fotografias a vaguear ──────────────── */

  /* Medido no Studio Plato, a 1440: treze fotografias de 3% a 7% da
     largura do ecrã — 43 a 101 px —, todas fora da coluna do texto, e
     cada uma a vaguear por sua conta. O tamanho vem em `vw` porque é
     assim que lá está: a fotografia é um pormenor da página, e um
     pormenor cresce com a página.

     `p` é onde ela fica num ecrã estreito — na faixa vazia por cima da
     primeira frase, ou na de baixo da última, que é o único sítio onde
     cabe sem tapar as palavras. Só duas lá ficam, em diagonal: quatro
     encostadas ao topo deixavam de ser um pormenor e passavam a ser uma
     tira de fotografias. As outras desaparecem. */
  const POUSADAS = [
    /* à esquerda da coluna */
    { f: 'nariz', x: 6.0, y: 13, w: 4.6, p: [17, '62px'] },
    { f: 'porta', x: 13.5, y: 25, w: 3.2 },
    { f: 'jiujitsu', x: 7.5, y: 39, w: 6.4 },
    { f: 'turma-flexoes', x: 16.0, y: 54, w: 3.4 },
    { f: 'veterano', x: 6.5, y: 69, w: 5.2 },
    { f: 'sparring', x: 14.0, y: 85, w: 4.0 },
    /* à direita */
    { f: 'kickboxing', x: 93.5, y: 16, w: 5.0 },
    { f: 'a-rir-no-ringue', x: 85.0, y: 29, w: 3.4 },
    { f: 'grupo', x: 92.5, y: 45, w: 6.4 },
    { f: 'alongamentos', x: 84.5, y: 61, w: 3.2 },
    { f: 'ringue', x: 93.0, y: 75, w: 4.4, p: [83, 'calc(100% - 62px)'] },
    { f: 'treinador-ensina', x: 85.5, y: 89, w: 4.0 },
  ];

  /* Quanto cada uma vagueia: medido no original, fotografia a fotografia,
     e dá sempre o mesmo — um terço da sua própria largura de lado, quase
     metade para cima e para baixo. Uma fotografia de 43 px andava 14 px
     em x e 19 px em y; uma de 101 px, 34 e 44. Por isso o caminho se
     escreve em múltiplos de `--w` e não em pixeis: assim vale em qualquer
     ecrã, e a fotografia grande vagueia mais do que a pequena, como lá. */
  const VAI_DE_LADO = 0.33;
  const VAI_A_CIMA = 0.44;
  const PASSOS = 8;        // oito destinos por volta
  const PARADA = 0.42;     // e fica quieta 42% do tempo entre cada um

  /* O caminho é sorteado, mas com semente fixa: diferente de fotografia
     para fotografia, igual em todas as aberturas da página. Sem isto não
     havia como confirmar o movimento por fotografia do ecrã. */
  function semente(n) {
    let s = ((n + 1) * 1831565813) >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  const caixaDasFotos = $('#palavrasFotos');
  const caminhos = [];
  POUSADAS.forEach((p, i) => {
    const img = document.createElement('img');
    img.src = 'fotos/' + p.f + '-900.jpg';
    img.loading = 'lazy';
    img.alt = '';
    if (!p.p) img.className = 'so-largo';
    img.style.setProperty('--x', p.x + '%');
    img.style.setProperty('--y', p.y + '%');
    /* Um chão de 26 px: abaixo disso deixa de se perceber o que é, e um
       pormenor que não se percebe é só sujidade. E um tecto, para não
       crescerem sem fim num monitor grande. */
    img.style.setProperty('--w', 'clamp(26px, ' + p.w + 'vw, ' + Math.round(p.w * 18) + 'px)');
    if (p.p) {
      img.style.setProperty('--xp', p.p[0] + '%');
      img.style.setProperty('--yp', p.p[1]);
    }
    /* Um passeio ao acaso, sempre dentro do seu quadrado, e que fecha onde
       começou — senão a volta dava um salto visível ao repetir. */
    const sorte = semente(i);
    const pontos = [[0, 0]];
    for (let k = 1; k < PASSOS; k++) {
      const atras = pontos[k - 1];
      pontos.push([
        prender(atras[0] + (sorte() - 0.5) * VAI_DE_LADO * 1.6, -VAI_DE_LADO, VAI_DE_LADO),
        prender(atras[1] + (sorte() - 0.5) * VAI_A_CIMA * 1.6, -VAI_A_CIMA, VAI_A_CIMA),
      ]);
    }
    pontos.push([0, 0]);
    let quadros = '';
    pontos.forEach((q, k) => {
      const onde = 'translate:calc(var(--w)*' + q[0].toFixed(3) + ') calc(var(--w)*' + q[1].toFixed(3) + ')';
      quadros += (k / PASSOS * 100).toFixed(2) + '%{' + onde + '}';
      /* o mesmo ponto outra vez, um instante depois: é o descanso */
      if (k < PASSOS) quadros += ((k + PARADA) / PASSOS * 100).toFixed(2) + '%{' + onde + '}';
    });
    caminhos.push('@keyframes vagueia' + i + '{' + quadros + '}');
    img.style.animationName = 'vagueia' + i;
    /* voltas de duração diferente, e cada uma começa a meio da sua: assim
       nunca se apanham duas a mexer ao mesmo tempo */
    img.style.animationDuration = (11 + (i % 5) * 1.7).toFixed(1) + 's';
    img.style.animationDelay = '-' + (i * 1.9).toFixed(1) + 's';
    caixaDasFotos.appendChild(img);
  });
  const folha = document.createElement('style');
  folha.textContent = caminhos.join('\n');
  document.head.appendChild(folha);

  const seccaoDasPalavras = $('#palavras');
  const frases = $$('#palavrasColuna .frase');

  if (!menosMovimento) {
    const olho = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        $$('#palavrasFotos img').forEach((img, i) => {
          setTimeout(() => img.classList.add('visivel'), i * 110);
        });
        olho.disconnect();
      });
    }, { threshold: 0.2 });
    olho.observe(seccaoDasPalavras);

    /* Fora do ecrã ficam quietas. São doze caminhos a andar ao mesmo
       tempo, e o caminho leva `var()` lá dentro — o que o tira das mãos
       da placa gráfica e o põe nas do JavaScript, a cada imagem. Deixá-lo
       a correr numa página onde já roda um disco em WebGL era pagar por
       um movimento que ninguém está a ver. */
    const vigia = new IntersectionObserver((es) => {
      caixaDasFotos.classList.toggle('quieta', !es[0].isIntersecting);
    }, { rootMargin: '120px' });
    vigia.observe(seccaoDasPalavras);
  } else {
    $$('#palavrasFotos img').forEach((img) => img.classList.add('visivel'));
  }

  function aoRolarPalavras(altura) {
    const r = seccaoDasPalavras.getBoundingClientRect();
    if (r.bottom < 0 || r.top > altura) return;
    const meio = altura / 2;
    frases.forEach((frase) => {
      const f = frase.getBoundingClientRect();
      const longe = prender(Math.abs(f.top + f.height / 2 - meio) / (altura * 0.34), 0, 1);
      frase.style.setProperty('--longe', longe.toFixed(3));
    });
  }

  /* ──────────── a loja: as fotografias sobrepõem-se ao rolar ────────── */

  const DE_RESERVA_DA_LOJA = [
    { nome: 'Luvas de Boxe', cor: 'Amarelo', foto: 'fotos/loja/luvas-de-boxe-amarelo.jpg' },
    { nome: 'Capacete de Boxe', cor: 'Amarelo', foto: 'fotos/loja/capacetes-boxe-amarelo.jpg' },
    { nome: 'Calções de Boxe', cor: 'Preto', foto: 'fotos/loja/calcoes-boxe-preto.jpg' },
    { nome: 'Hoodie', cor: 'Preto', foto: 'fotos/loja/hoodie-preto.jpg' },
    { nome: 'T-Shirt', cor: 'Preto', foto: 'fotos/loja/t-shirt-preto.jpg' },
  ];

  const pilha = $('#lojaPilha');
  const caixaDaLoja = $('#lojaCaixa');
  let cartas = [];

  function construirPilha(artigos) {
    pilha.innerHTML = '';
    artigos.forEach((a) => {
      const fig = document.createElement('figure');
      fig.className = 'carta';
      fig.style.margin = '0';
      const img = document.createElement('img');
      img.src = a.foto;
      img.loading = 'lazy';
      img.alt = a.nome + ', ' + String(a.cor).toLowerCase() + '.';
      const leg = document.createElement('figcaption');
      leg.innerHTML = '<b>' + a.nome + '</b> · <span>' + a.cor + '</span>';
      fig.append(img, leg);
      pilha.appendChild(fig);
    });
    cartas = $$('#lojaPilha .carta');
    aoRolarLoja(window.innerHeight);
  }

  function aoRolarLoja(altura) {
    if (!cartas.length) return;
    const r = caixaDaLoja.getBoundingClientRect();
    const curso = r.height - altura;
    if (curso <= 0) return;
    const p = prender(-r.top / curso, 0, 1);
    const n = cartas.length;
    const passo = 0.72 / n;

    cartas.forEach((carta, i) => {
      const t = prender((p - i * passo) / (passo * 1.9), 0, 1);
      const suave = t * t * (3 - 2 * t);              // acelera e trava
      const angulo = (i - (n - 1) / 2) * 4.6;
      carta.style.transform =
        'translate3d(' + ((1 - suave) * 7).toFixed(2) + '%,' +
        ((1 - suave) * 62).toFixed(2) + '%,0) rotate(' +
        (angulo * suave + (1 - suave) * -11).toFixed(2) + 'deg) scale(' +
        (0.88 + suave * 0.12).toFixed(3) + ')';
      carta.style.opacity = String(prender(suave * 2.6, 0, 1));
      carta.style.zIndex = String(i + 1);
    });
  }

  async function carregarLoja() {
    const artigos = await KO.pedir('/mobile/shop');
    if (!Array.isArray(artigos) || !artigos.length) {
      construirPilha(DE_RESERVA_DA_LOJA);
      return;
    }
    /* A montra da gestão já vem um artigo por cor, e já vem pela ordem que
       o dono escolheu. Aqui só se tiram os que não têm fotografia — sem
       ela o cartão ficava vazio, que é a mesma regra da aplicação. */
    const bons = artigos
      .filter((a) => a.photo_url)
      .slice(0, 6)
      .map((a) => ({
        nome: KO.semEmoji(a.name),
        cor: a.color || '',
        foto: a.photo_url.startsWith('/') ? KO.API.replace(/\/api$/, '') + a.photo_url : a.photo_url,
      }));
    construirPilha(bons.length ? bons : DE_RESERVA_DA_LOJA);
    $('#lojaConta').textContent = artigos.length + ' artigos, na receção do ginásio.';
  }

  /* ────────────────────────── o rolar, num sítio só ─────────────────── */

  let marcado = false;
  function aoRolar() {
    if (marcado) return;
    marcado = true;
    requestAnimationFrame(() => {
      marcado = false;
      const altura = window.innerHeight;
      aoRolarCapa(altura);
      aoRolarPalavras(altura);
      aoRolarLoja(altura);
    });
  }
  window.addEventListener('scroll', aoRolar, { passive: true });
  window.addEventListener('resize', aoRolar);

  /* ──────────────────────────── arrancar ────────────────────────────── */

  construirPilha(DE_RESERVA_DA_LOJA);
  KO.acordarAoAparecer('.revela');
  aoRolar();

  KO.carregar().then((dados) => {
    escreverContactos(dados.ficha);
    escreverModalidades(dados.modalidades);
    escreverHorario(dados.horario);
    aoRolar();
  });
  carregarLoja();
})();
