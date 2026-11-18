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

  /* ───────────── as frases, e as fotografias a flutuar ──────────────── */

  /* `xp` é onde ela fica num ecrã estreito: encostada à ponta. As marcadas
     `largo` só aparecem no ecrã grande — num telemóvel tapavam as frases. */
  const POUSADAS = [
    { f: 'nariz-900.jpg', x: 7, xp: 1, y: 17, w: 120, dx: '14px', dy: '-20px', t: '11s' },
    { f: 'jiujitsu-900.jpg', x: 18, y: 54, w: 164, dx: '-18px', dy: '16px', t: '14s', largo: true },
    { f: 'porta-900.jpg', x: 9, xp: 3, y: 83, w: 106, dx: '12px', dy: '14px', t: '12s' },
    { f: 'veterano-900.jpg', x: 28, y: 29, w: 94, dx: '-10px', dy: '18px', t: '13s', largo: true },
    { f: 'kickboxing-900.jpg', x: 92, xp: 99, y: 21, w: 134, dx: '-16px', dy: '18px', t: '13s' },
    { f: 'grupo-900.jpg', x: 84, xp: 97, y: 60, w: 116, dx: '14px', dy: '-16px', t: '15s' },
    { f: 'alongamentos-900.jpg', x: 95, xp: 99, y: 86, w: 98, dx: '-12px', dy: '-14px', t: '11s' },
    { f: 'a-rir-no-ringue-900.jpg', x: 73, y: 13, w: 90, dx: '10px', dy: '16px', t: '12s', largo: true },
    { f: 'turma-flexoes-900.jpg', x: 31, y: 93, w: 88, dx: '-12px', dy: '-12px', t: '14s', largo: true },
  ];

  const caixaDasFotos = $('#palavrasFotos');
  POUSADAS.forEach((p, i) => {
    const img = document.createElement('img');
    img.src = 'fotos/' + p.f;
    img.loading = 'lazy';
    img.alt = '';
    if (p.largo) img.className = 'so-largo';
    img.style.setProperty('--x', p.x + '%');
    if (p.xp != null) img.style.setProperty('--xp', p.xp + '%');
    img.style.setProperty('--y', p.y + '%');
    img.style.setProperty('--w', p.w + 'px');
    img.style.setProperty('--dx', p.dx);
    img.style.setProperty('--dy', p.dy);
    img.style.setProperty('--t', p.t);
    img.style.setProperty('--atraso', (i * 0.37).toFixed(2) + 's');
    caixaDasFotos.appendChild(img);
  });

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

    /* O rato empurra a camada das fotografias, e não as frases: é a
       diferença de velocidade entre as duas que o olho lê como fundo. */
    seccaoDasPalavras.addEventListener('mousemove', (e) => {
      const r = seccaoDasPalavras.getBoundingClientRect();
      caixaDasFotos.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 2 - 1).toFixed(3));
      caixaDasFotos.style.setProperty('--my', ((e.clientY - r.top) / r.height * 2 - 1).toFixed(3));
    });
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
