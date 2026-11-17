/* ══════════════════════════════════════════════════════════════════════════
   Exemplo D — "Cartaz" · o que a página faz

   Quase nada se mexe por si: num cartaz o que trabalha é o tamanho da letra
   e o contraste. As duas excepções são as tarjas que correm e as linhas das
   modalidades, que invertem a cor quando o rato lhes passa por cima.
   ══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  /* ───────────────────────────── as tarjas ───────────────────────────── */

  /* O texto vai duas vezes: a animação anda metade da largura e volta ao
     princípio, e por isso a segunda cópia tapa a emenda. */
  function encherTarja(elemento, pedacos) {
    if (!elemento || !pedacos.length) return;
    const uma = pedacos
      .map((t) => `<span>${t}</span><span class="estrela">✳</span>`)
      .join('');
    elemento.innerHTML = uma + uma;
  }

  /* ─────────────────────────── as modalidades ────────────────────────── */

  function mostrarModalidades(lista) {
    const caixa = $('listaModalidades');
    if (!caixa || !lista.length) return;

    caixa.innerHTML = lista.map((m, i) => `
      <li class="modalidade">
        <span class="modalidade__numero">${String(i + 1).padStart(2, '0')}</span>
        <span class="modalidade__nome">${m.nome}</span>
        ${m.palavra ? `<span class="modalidade__palavra">${m.palavra}</span>` : ''}
      </li>`).join('');
  }

  /* ─────────────────────────────── horário ───────────────────────────── */

  function mostrarHorario(horario) {
    const caixa = $('listaHorario');
    if (!caixa) return;
    if (!horario.linhas.length) { caixa.remove(); return; }

    caixa.innerHTML = horario.linhas.map((linha) => {
      if (!linha.dias.length) {
        // Não se percebeu — mostra-se como está, que é melhor do que sumir.
        return `<div class="horario__linha"><span class="horario__dias">${linha.crua}</span></div>`;
      }
      return `
        <div class="horario__linha${linha.eHoje ? ' horario__linha--hoje' : ''}">
          <span class="horario__dias">${linha.nomes}</span>
          ${linha.eHoje ? '<span class="horario__hoje">Hoje</span>' : ''}
          <span class="horario__horas">${linha.horas}</span>
        </div>`;
    }).join('');
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
    ['ligacaoWhatsapp', 'botaoWhatsapp', 'botaoWhatsappFim', 'botaoWhatsappFixo'].forEach((id) => {
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

  /* ─────────────────────────────── arranque ──────────────────────────── */

  (async function arrancar() {
    if ($('ano')) $('ano').textContent = new Date().getFullYear();

    const { ficha, modalidades, horario } = await KO.carregar();

    mostrarContactos(ficha);
    mostrarHorario(horario);
    mostrarModalidades(modalidades);

    const selo = $('estadoAgora');
    if (selo) selo.textContent = horario.abertoAgora ? 'Aberto agora' : 'Fechado agora';

    encherTarja($('tarja1'), [
      'A primeira aula é experimental',
      'Dos oito aos sessenta e muitos',
      'Não precisas de trazer material',
    ]);
    encherTarja($('tarja2'), modalidades.map((m) => m.nome));
  })();
})();
