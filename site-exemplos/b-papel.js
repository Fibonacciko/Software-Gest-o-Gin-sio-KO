/* ══════════════════════════════════════════════════════════════════════════
   Exemplo B — "Papel" · o que a página faz

   Os dados são os mesmos dos outros exemplos (comum.js). Aqui só se decide
   como se mostram: uma lista de modalidades que acende a fotografia ao lado,
   uma tabela de horário, um carrossel que se arrasta e um índice que
   acompanha onde se vai na página.
   ══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  /* Uma fotografia para cada modalidade. Não vem da gestão — lá não há
     fotografias de modalidades — por isso é escolha de quem faz a página.
     O que não estiver aqui fica com a do ringue. */
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

  function fotoDe(nome) {
    return `fotos/${FOTOS[String(nome).toLowerCase()] || FOTO_DE_RESERVA}-900.jpg`;
  }

  /* ───────────────────────────── modalidades ─────────────────────────── */

  function mostrarModalidades(lista) {
    const caixa = $('listaModalidades');
    const painel = $('fotoDaModalidade');
    if (!caixa || !lista.length) return;

    caixa.innerHTML = lista.map((m, i) => `
      <li class="modalidade" data-foto="${fotoDe(m.nome)}">
        <span class="modalidade__numero">${String(i + 1).padStart(2, '0')}</span>
        <h3 class="modalidade__nome">
          <span class="modalidade__pinta" style="background:${m.cor}"></span>${m.nome}
        </h3>
        ${m.palavra ? `<span class="modalidade__palavra">${m.palavra}</span>` : '<span></span>'}
        ${m.descricao ? `<p class="modalidade__dizer">${m.descricao}</p>` : ''}
      </li>`).join('');

    if (!painel) return;

    // Carrega-as todas em silêncio: assim a troca ao passar por cima é
    // imediata e não se vê o quadrado vazio.
    lista.forEach((m) => { new Image().src = fotoDe(m.nome); });

    let aMostrar = '';
    const trocar = (endereco, dizer) => {
      if (endereco === aMostrar) return;
      aMostrar = endereco;
      painel.classList.remove('vista');
      painel.src = endereco;
      painel.alt = dizer || '';
      // o `decode` evita a imagem aparecer a meio de carregar
      (painel.decode ? painel.decode().catch(() => {}) : Promise.resolve())
        .then(() => painel.classList.add('vista'));
    };

    const linhas = caixa.querySelectorAll('.modalidade');
    linhas.forEach((linha) => {
      const ver = () => {
        linhas.forEach((l) => l.classList.remove('aberta'));
        linha.classList.add('aberta');
        trocar(linha.dataset.foto, linha.querySelector('.modalidade__nome').textContent.trim());
      };
      linha.addEventListener('mouseenter', ver);
      linha.addEventListener('focusin', ver);
    });

    trocar(linhas[0].dataset.foto, '');
  }

  /* ─────────────────────────────── horário ───────────────────────────── */

  function mostrarHorario(horario) {
    const caixa = $('listaHorario');
    if (!caixa) return;
    if (!horario.linhas.length) { caixa.remove(); return; }

    caixa.innerHTML = horario.linhas.map((linha) => {
      if (!linha.dias.length) {
        // Não se percebeu — mostra-se como está, que é melhor do que sumir.
        return `<div class="horario__linha"><span class="horario__dias">${linha.crua}</span><span></span></div>`;
      }
      return `
        <div class="horario__linha${linha.eHoje ? ' horario__linha--hoje' : ''}">
          <span class="horario__dias">${linha.nomes}</span>
          <span class="horario__horas">${linha.horas}</span>
        </div>`;
    }).join('');

    const selo = $('estadoAgora');
    if (selo) {
      selo.textContent = horario.abertoAgora ? 'Aberto agora' : 'Fechado agora';
      selo.classList.toggle('aberto', horario.abertoAgora);
    }
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
    [$('ligacaoWhatsapp'), $('botaoWhatsapp'), $('botaoWhatsappFim')].forEach((b) => {
      porLigacao(b, whatsapp, false);
      if (b && whatsapp) { b.target = '_blank'; b.rel = 'noopener'; }
    });

    if (ficha.phone) {
      const telefone = $('ligacaoTelefone');
      if (telefone) {
        telefone.href = `tel:+351${KO.soDigitos(ficha.phone)}`;
        telefone.textContent = KO.comEspacos(ficha.phone);
      }
    }

    porLigacao($('ligacaoEmail'), ficha.email ? `mailto:${ficha.email}` : null);
    porLigacao($('ligacaoInstagram'), ficha.instagram);
    porLigacao($('ligacaoAvaliar'), ficha.review_url || ficha.maps_url);
    porLigacao($('ligacaoMapa'), KO.paraMapa(ficha.maps_url, ficha.address), false);
  }

  /* ─────────────────────── o índice acompanha a página ───────────────── */

  function indiceQueAcompanha() {
    const ligacoes = Array.from(document.querySelectorAll('.indice__lista a'));
    const seccoes = ligacoes
      .map((a) => document.querySelector(a.getAttribute('href')))
      .filter(Boolean);
    if (!seccoes.length || !('IntersectionObserver' in window)) return;

    const olho = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        const indice = seccoes.indexOf(e.target);
        ligacoes.forEach((a, i) => a.classList.toggle('aqui', i === indice));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    seccoes.forEach((s) => olho.observe(s));
  }

  /* ────────────────────── o carrossel que se arrasta ─────────────────── */

  function arrastar(caixa) {
    if (!caixa) return;
    let aPegar = false, comecouEm = 0, rolavaEm = 0;

    caixa.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') return;   // no telemóvel o dedo já o faz
      aPegar = true;
      comecouEm = e.clientX;
      rolavaEm = caixa.scrollLeft;
      caixa.classList.add('a-arrastar');
      caixa.setPointerCapture(e.pointerId);
    });
    caixa.addEventListener('pointermove', (e) => {
      if (!aPegar) return;
      caixa.scrollLeft = rolavaEm - (e.clientX - comecouEm);
    });
    const largar = () => { aPegar = false; caixa.classList.remove('a-arrastar'); };
    caixa.addEventListener('pointerup', largar);
    caixa.addEventListener('pointercancel', largar);
  }

  /* ─────────────────────────────── arranque ──────────────────────────── */

  (async function arrancar() {
    if ($('ano')) $('ano').textContent = new Date().getFullYear();
    requestAnimationFrame(() => document.body.classList.add('pronto'));
    KO.acordarAoAparecer('.revela');
    indiceQueAcompanha();
    arrastar($('rail'));

    const { ficha, modalidades, horario } = await KO.carregar();
    mostrarContactos(ficha);
    mostrarHorario(horario);
    mostrarModalidades(modalidades);
    KO.acordarAoAparecer('.revela');
  })();
})();
