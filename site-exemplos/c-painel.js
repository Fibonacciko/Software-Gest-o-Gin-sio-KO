/* ══════════════════════════════════════════════════════════════════════════
   Exemplo C — "Painel" · o que a página faz

   Três coisas mexem, e são elas que distinguem este exemplo dos outros:
   o selector de modalidades (escolhe-se uma e a figura muda), a grelha do
   horário (a semana desenhada, com a linha de agora) e a barra que vai
   enchendo à medida que se lêem os três passos.
   ══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const FOTOS = {
    'boxe': 'sparring',
    'kickboxing': 'kickboxing',
    'jiu-jitsu': 'jiujitsu',
    'musculação': 'sala-larga',
    'crossfit': 'turma-flexoes',
    'yoga': 'alongamentos',
    'pilates': 'alongamentos',
    'dança': 'grupo',
    'pt (treino personalizado)': 'treinador-ensina',
  };
  const FOTO_DE_RESERVA = 'ringue';
  const fotoDe = (nome) => `fotos/${FOTOS[String(nome).toLowerCase()] || FOTO_DE_RESERVA}-900.jpg`;

  /* ──────────────────────────── o selector ───────────────────────────── */

  function montarSelector(lista) {
    const caixa = $('listaModalidades');
    if (!caixa || !lista.length) return;

    caixa.innerHTML = lista.map((m, i) => `
      <li tabindex="0" data-i="${i}">
        <span>${String(i + 1).padStart(2, '0')}</span>
        <span class="nome">${m.nome}</span>
        <span class="pinta" style="background:${m.cor}"></span>
      </li>`).join('');

    lista.forEach((m) => { new Image().src = fotoDe(m.nome); });

    const linhas = Array.from(caixa.querySelectorAll('li'));
    const foto = $('fotoDaModalidade');
    let escolhida = -1;

    function escolher(i) {
      if (i === escolhida || !lista[i]) return;
      escolhida = i;
      const m = lista[i];

      linhas.forEach((l, j) => l.classList.toggle('escolhida', j === i));

      foto.classList.add('a-trocar');
      const nova = new Image();
      nova.src = fotoDe(m.nome);
      const assentar = () => {
        foto.src = nova.src;
        foto.alt = m.nome;
        foto.classList.remove('a-trocar');
      };
      if (nova.complete) assentar(); else nova.onload = assentar;

      $('fotoRotulo').textContent = m.nome;
      $('fotoIndice').textContent = `${String(i + 1).padStart(2, '0')} / ${String(lista.length).padStart(2, '0')}`;
      $('fichaNome').textContent = m.nome;
      $('fichaDizer').textContent = m.descricao || 'Sem descrição escrita na gestão.';
      $('fichaLinhas').innerHTML = [
        m.palavra ? ['Em resumo', m.palavra] : null,
        ['Primeira aula', 'Experimental'],
        ['Material', 'Não é preciso'],
      ].filter(Boolean).map(([a, b]) => `<dt class="mono">${a}</dt><dd>${b}</dd>`).join('');
    }

    linhas.forEach((linha, i) => {
      linha.addEventListener('mouseenter', () => escolher(i));
      linha.addEventListener('click', () => escolher(i));
      linha.addEventListener('focus', () => escolher(i));
      linha.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' && linhas[i + 1]) { e.preventDefault(); linhas[i + 1].focus(); }
        if (e.key === 'ArrowUp' && linhas[i - 1]) { e.preventDefault(); linhas[i - 1].focus(); }
      });
    });

    escolher(0);
  }

  /* ─────────────────────── a grelha da semana ────────────────────────── */

  const ALTURA = 320;                      // a altura da mesa, em pixeis

  function montarGrelha(horario) {
    const caixa = $('grelhaHorario');
    if (!caixa) return;

    const comHoras = horario.porDia.filter((d) => d.periodos.length);
    if (!comHoras.length) {
      // Não se percebeu o horário: mostra-se o texto como está, que é
      // melhor do que uma grelha vazia.
      caixa.innerHTML = horario.linhas
        .map((l) => `<p class="miudinho">${l.crua}</p>`).join('');
      return;
    }

    let cedo = Math.min(...comHoras.map((d) => Math.min(...d.periodos.map((p) => p.abre))));
    let tarde = Math.max(...comHoras.map((d) => Math.max(...d.periodos.map((p) => p.fecha))));
    cedo = Math.floor(cedo / 60) * 60;
    tarde = Math.ceil(tarde / 60) * 60;
    const vao = tarde - cedo;
    const alturaDaHora = (ALTURA / (vao / 60));

    const onde = (m) => ((m - cedo) / vao) * 100;
    const curto = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}h`;

    const horas = [];
    for (let m = cedo; m <= tarde; m += 120) {
      horas.push(`<span style="top:${onde(m)}%">${curto(m)}</span>`);
    }

    const colunas = horario.porDia.map((dia) => {
      if (!dia.periodos.length) {
        return `<div class="mesa__coluna${dia.eHoje ? ' mesa__coluna--hoje' : ''}">
                  <span class="mesa__fechado">—</span>
                </div>`;
      }
      const barras = dia.periodos.map((p) => `
        <div class="mesa__barra" style="top:${onde(p.abre)}%;height:${onde(p.fecha) - onde(p.abre)}%">
          ${curto(p.abre)}–${curto(p.fecha)}
        </div>`).join('');

      const agora = dia.eHoje && horario.agora >= cedo && horario.agora <= tarde
        ? `<div class="mesa__agora" style="top:${onde(horario.agora)}%"></div>` : '';

      return `<div class="mesa__coluna${dia.eHoje ? ' mesa__coluna--hoje' : ''}">${barras}${agora}</div>`;
    }).join('');

    caixa.innerHTML = `
      <div class="mesa" style="--altura-da-hora:${alturaDaHora}px">
        <div class="mesa__canto"></div>
        ${horario.porDia.map((d) => `<div class="mesa__dia${d.eHoje ? ' mesa__dia--hoje' : ''}">${d.curto}</div>`).join('')}
        <div class="mesa__horas">${horas.join('')}</div>
        ${colunas}
      </div>`;

    // A grelha diz quando; as palavras dizem o mesmo sem ser preciso medir
    // com os olhos. As duas leituras juntas, que é o que um painel faz.
    const legendas = horario.linhas
      .filter((l) => l.dias.length)
      .map((l) => `<p class="miudinho"><span class="mono" style="color:var(--letra)">${l.nomes}</span> &nbsp;${l.horas}</p>`)
      .join('');
    caixa.insertAdjacentHTML('afterend', `<div class="legendas">${legendas}</div>`);
  }

  /* ──────────────────────── a barra do protocolo ─────────────────────── */

  function barraDoProtocolo() {
    const cheio = $('protocoloCheio');
    const conta = $('protocoloConta');
    const passos = Array.from(document.querySelectorAll('.passo'));
    if (!cheio || !passos.length || !('IntersectionObserver' in window)) return;

    const olho = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        const n = Number(e.target.dataset.passo || 1);
        cheio.style.height = `${(n / passos.length) * 100}%`;
        if (conta) conta.textContent = `${String(n).padStart(2, '0')} / ${String(passos.length).padStart(2, '0')}`;
      });
    }, { rootMargin: '-40% 0px -40% 0px' });

    passos.forEach((p) => olho.observe(p));
  }

  /* ─────────────────────────── os pormenores ─────────────────────────── */

  function contarAte(elemento, fim) {
    if (!elemento) return;
    const texto = (n) => String(n).padStart(2, '0');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      elemento.textContent = texto(fim);
      return;
    }
    let n = 0;
    const passo = () => {
      n += 1;
      elemento.textContent = texto(n);
      if (n < fim) setTimeout(passo, 70);
    };
    passo();
  }

  /** O rótulo em cima do título vai dizendo as modalidades, uma de cada
   *  vez. É a única coisa viva numa página que, de resto, está parada. */
  function rodarTicker(lista) {
    const alvo = $('ticker');
    if (!alvo || lista.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let i = 0;
    setInterval(() => {
      i = (i + 1) % lista.length;
      alvo.style.opacity = '0';
      setTimeout(() => { alvo.textContent = lista[i].nome; alvo.style.opacity = '1'; }, 220);
    }, 2400);
    alvo.style.transition = 'opacity 0.22s';
  }

  /* ────────────────────────────── contactos ──────────────────────────── */

  function porLigacao(elemento, endereco, esconderSeVazio = true) {
    if (!elemento) return;
    if (!endereco) { if (esconderSeVazio) elemento.style.display = 'none'; return; }
    elemento.href = endereco;
  }

  function mostrarContactos(ficha) {
    if ($('morada')) $('morada').innerHTML = KO.moradaEmLinhas(ficha.address).join('<br>');

    const whatsapp = KO.paraWhatsapp(ficha.whatsapp || ficha.phone);
    ['ligacaoWhatsapp', 'botaoWhatsapp', 'botaoWhatsapp2', 'botaoWhatsappFim'].forEach((id) => {
      const b = $(id);
      porLigacao(b, whatsapp, false);
      if (b && whatsapp) { b.target = '_blank'; b.rel = 'noopener'; }
    });

    if (ficha.phone && $('ligacaoTelefone')) {
      $('ligacaoTelefone').href = `tel:+351${KO.soDigitos(ficha.phone)}`;
      $('ligacaoTelefone').textContent = KO.comEspacos(ficha.phone);
    }

    porLigacao($('ligacaoEmail'), ficha.email ? `mailto:${ficha.email}` : null);
    porLigacao($('ligacaoInstagram'), ficha.instagram);
    porLigacao($('ligacaoAvaliar'), ficha.review_url || ficha.maps_url);
    porLigacao($('ligacaoMapa'), KO.paraMapa(ficha.maps_url, ficha.address), false);
  }

  /** O estado em cima diz mais do que aberto ou fechado: diz a que horas
   *  fecha, que é a pergunta a seguir. */
  function mostrarEstado(horario) {
    const selo = $('estadoAgora');
    if (!selo) return;
    const hoje = horario.porDia[horario.hoje];
    const aberto = horario.abertoAgora;
    selo.classList.toggle('aberto', aberto);

    if (aberto) {
      const periodo = hoje.periodos.find((p) => horario.agora >= p.abre && horario.agora < p.fecha);
      const fecha = periodo ? `${String(Math.floor(periodo.fecha / 60)).padStart(2, '0')}h${String(periodo.fecha % 60).padStart(2, '0')}` : '';
      selo.textContent = fecha ? `Aberto · fecha às ${fecha}` : 'Aberto agora';
      return;
    }
    const aSeguir = hoje.periodos.find((p) => p.abre > horario.agora);
    if (aSeguir) {
      const abre = `${String(Math.floor(aSeguir.abre / 60)).padStart(2, '0')}h${String(aSeguir.abre % 60).padStart(2, '0')}`;
      selo.textContent = `Fechado · abre às ${abre}`;
      return;
    }
    selo.textContent = 'Fechado agora';
  }

  /* ─────────────────────────────── arranque ──────────────────────────── */

  (async function arrancar() {
    if ($('ano')) $('ano').textContent = new Date().getFullYear();
    barraDoProtocolo();

    const { ficha, modalidades, horario } = await KO.carregar();
    mostrarContactos(ficha);
    mostrarEstado(horario);
    montarGrelha(horario);
    montarSelector(modalidades);
    contarAte($('contaModalidades'), modalidades.length);
    rodarTicker(modalidades);
  })();
})();
