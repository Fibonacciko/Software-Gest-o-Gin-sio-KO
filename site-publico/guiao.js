/* ══════════════════════════════════════════════════════════════════════════
   Ginásio KO — site público

   O conteúdo vem da gestão, não está escrito nesta página: a morada, o
   horário, os contactos e as modalidades são os mesmos que o dono preenche
   em App do Sócio → O Ginásio e em Aulas → Modalidades. Muda lá, muda aqui.

   Sem bibliotecas e sem compilação: é um ficheiro que o navegador lê.
   ══════════════════════════════════════════════════════════════════════════ */

const API = 'https://ginasioko.site/api';

/* ─────────────────────────── o que fica de reserva ───────────────────── */

/* Isto é o que estava na gestão no dia em que o site se fez. **Serve só
   quando o servidor não responde** — sem rede, numa manutenção, ou numa
   pré-visualização fora do domínio. Respondendo ele, manda ele.

   Existe porque um site de ginásio que não diz a morada quando o servidor
   está em baixo não serve para nada. E porque o Google lê a página antes de
   correr o JavaScript: assim encontra sempre o horário e a morada. */
const DE_RESERVA = {
  hours: 'Segunda, quarta e sexta: 10h00 - 14h00 / 16h00 - 22h00 '
       + 'Terça e quinta: 10h00 - 14h00 / 16h00 - 20h00',
  address: 'Rua Almada Negreiros - Campo Branca Lucas - Sport Lisboa e Olivais, 1800-070 Lisboa',
  phone: '926372441',
  whatsapp: '926372441',
  email: 'GinasioKO-SLO@protonmail.com',
  instagram: 'https://www.instagram.com/ginasioko/',
  // O pedido de avaliação no Google é o que mais ajuda o ginásio, e é o que
  // as pessoas se esquecem de fazer — como na aplicação do sócio. Por isso
  // também tem de funcionar quando o servidor não responde.
  maps_url: 'https://www.google.com/maps/place/Gin%C3%A1sio+KO+-+SLO+(Boxe,+Kickboxing+%26+Jiu-Jitsu)/@38.7473772,-9.1317297,14z/data=!3m1!5s0xd19322c090e993f:0xb23be501229741b7!4m6!3m5!1s0xd1933f42ebd8595:0x838b8ac0d83830c0!8m2!3d38.7617955!4d-9.1072035!16s%2Fg%2F11qbk723p0?entry=ttu&g_ep=EgoyMDI2MTExMC4wIKXMDSoASAFQAw%3D%3D',
  review_url: 'https://www.google.com/maps/place/Gin%C3%A1sio+KO+-+SLO+(Boxe,+Kickboxing+%26+Jiu-Jitsu)/@38.7617955,-9.1097838,17z/data=!3m1!5s0xd19322c090e993f:0xb23be501229741b7!4m8!3m7!1s0xd1933f42ebd8595:0x838b8ac0d83830c0!8m2!3d38.7617955!4d-9.1072035!9m1!1b1!16s%2Fg%2F11qbk723p0?entry=ttu&g_ep=EgoyMDI2MTAwNy4wIKXMDSoASAFQAw%3D%3D',
};

const MODALIDADES_DE_RESERVA = [
  { name: 'Boxe', color: '#ef4444' },
  { name: 'Kickboxing', color: '#f97316' },
  { name: 'Jiu-Jitsu', color: '#8b5cf6' },
  { name: 'Musculação', color: '#3b82f6' },
  { name: 'CrossFit', color: '#10b981' },
  { name: 'Yoga', color: '#06b6d4' },
  { name: 'Pilates', color: '#ec4899' },
  { name: 'Dança', color: '#f59e0b' },
  { name: 'PT (Treino Personalizado)', color: '#22c55e' },
];

/* Nenhuma modalidade tem descrição escrita na gestão, e um cartão só com o
   nome não diz nada a quem nunca entrou num ginásio destes. Estas frases
   são o que se mostra **enquanto** o campo estiver vazio: no dia em que o
   dono as escrever na gestão, são as dele que aparecem. */
const EXPLICACOES = {
  'boxe': 'Guarda, deslocação e golpes. A base de tudo o que se treina aqui.',
  'kickboxing': 'As mãos do boxe mais as pernas, e muito trabalho de pés.',
  'jiu-jitsu': 'Luta no chão: controlo, posição e finalização.',
  'musculação': 'Sala de pesos e de máquinas, ao lado do tapete.',
  'crossfit': 'Treino funcional em circuito, para a condição física.',
  'yoga': 'Mobilidade e respiração — o contrapeso de quem treina a bater.',
  'pilates': 'Trabalho de centro e de postura, de baixo impacto.',
  'pt (treino personalizado)': 'Treino a dois, com o professor só para ti.',
};

/* ─────────────────────────────── ferramentas ─────────────────────────── */

const $ = (id) => document.getElementById(id);

async function pedir(caminho) {
  try {
    const resposta = await fetch(API + caminho, { headers: { Accept: 'application/json' } });
    if (!resposta.ok) return null;
    return await resposta.json();
  } catch {
    // Sem rede, a página fica com o que já está escrito no HTML. Nunca
    // rebenta: um site de ginásio tem de dizer a morada mesmo offline.
    return null;
  }
}

/** Os emoji dos nomes das modalidades não aparecem ao público, como na
 *  aplicação do sócio: na base de dados elas chamam-se "🥊 Boxe". Só se tira
 *  o que está à frente do nome. */
function semEmoji(nome) {
  return String(nome || '').replace(/^[^\p{L}\p{N}]+/u, '').trim();
}

/* ─────────────────────────────── o horário ───────────────────────────── */

/* O horário é um campo de texto livre na ficha do ginásio. Quem o mostra é
   que o lê — a mesma regra da aplicação (src/lib/horario.ts). Aqui está a
   versão para o navegador, com os mesmos cuidados:

   - uma linha por conjunto de dias;
   - dois períodos por dia, que o ginásio fecha para almoço;
   - nunca se perde texto: o que não se conseguir ler aparece como está. */

const DIAS = [
  { nome: 'Segunda', procura: /segunda|2ª|2\.ª/i },
  { nome: 'Terça',   procura: /terça|terca|3ª|3\.ª/i },
  { nome: 'Quarta',  procura: /quarta|4ª|4\.ª/i },
  { nome: 'Quinta',  procura: /quinta|5ª|5\.ª/i },
  { nome: 'Sexta',   procura: /sexta|6ª|6\.ª/i },
  { nome: 'Sábado',  procura: /sábado|sabado/i },
  { nome: 'Domingo', procura: /domingo/i },
];

function emLinhas(texto) {
  return String(texto || '')
    // os separadores que já apareceram escritos à mão na ficha
    .replace(/[»«|;*]+/g, '\n')
    // "22h00 Terça e quinta: ..." — um dia da semana logo a seguir a uma
    // hora começa uma linha nova. Sem isto o horário todo vinha numa só.
    .replace(/(\d)\s+(?=(segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo))/gi, '$1\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

function minutos(texto) {
  const m = String(texto).match(/(\d{1,2})\s*[h:.]\s*(\d{2})?/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2] || 0);
}

function lerLinha(linha) {
  const corte = linha.indexOf(':');
  if (corte === -1) return { crua: linha, dias: [], periodos: [] };

  const parteDosDias = linha.slice(0, corte);
  const parteDasHoras = linha.slice(corte + 1).trim();

  const dias = [];
  DIAS.forEach((dia, indice) => {
    if (dia.procura.test(parteDosDias)) dias.push(indice);
  });
  if (!dias.length) return { crua: linha, dias: [], periodos: [] };

  const periodos = parteDasHoras
    .split('/')
    .map((p) => {
      const partes = p.split(/[-–—]/);
      if (partes.length < 2) return null;
      const abre = minutos(partes[0]);
      const fecha = minutos(partes[1]);
      if (abre === null || fecha === null) return null;
      return { abre, fecha, texto: p.trim().replace(/\s*[-–—]\s*/, ' – ') };
    })
    .filter(Boolean);

  if (!periodos.length) return { crua: linha, dias: [], periodos: [] };
  return { dias, periodos, horas: periodos.map((p) => p.texto).join('  ·  ') };
}

function nomesDosDias(indices) {
  if (indices.length === 1) return DIAS[indices[0]].nome;
  const seguidos = indices.every((d, i) => i === 0 || d === indices[i - 1] + 1);
  if (seguidos && indices.length > 2) {
    return `${DIAS[indices[0]].nome} a ${DIAS[indices[indices.length - 1]].nome}`;
  }
  const nomes = indices.map((d) => DIAS[d].nome);
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
}

function mostrarHorario(texto) {
  const caixa = $('listaHorario');
  if (!caixa) return;

  const linhas = emLinhas(texto).map(lerLinha);
  if (!linhas.length) { caixa.remove(); return; }

  // Em JavaScript o domingo é 0; aqui a semana começa à segunda, como no
  // `weekday()` do Python e como em todo o resto do software.
  const hoje = (new Date().getDay() + 6) % 7;
  const agora = new Date().getHours() * 60 + new Date().getMinutes();
  let abertoAgora = false;

  caixa.innerHTML = '';
  linhas.forEach((linha) => {
    const el = document.createElement('div');
    el.className = 'horario__linha revela';

    if (!linha.dias.length) {
      // Não se percebeu — mostra-se como está, que é melhor do que sumir.
      el.innerHTML = `<span class="horario__dias">${linha.crua}</span>`;
      caixa.appendChild(el);
      return;
    }

    const eHoje = linha.dias.includes(hoje);
    if (eHoje) {
      el.classList.add('horario__linha--hoje');
      abertoAgora = linha.periodos.some((p) => agora >= p.abre && agora < p.fecha);
    }

    el.innerHTML =
      `<span class="horario__dias">${nomesDosDias(linha.dias)}</span>` +
      `<span class="horario__horas">${linha.horas}</span>` +
      (eHoje ? '<span class="horario__hoje">Hoje</span>' : '<span></span>');

    caixa.appendChild(el);
  });

  const selo = $('estadoAgora');
  if (selo) {
    selo.hidden = false;
    selo.textContent = abertoAgora ? 'Aberto agora' : 'Fechado agora';
    selo.classList.toggle('capa__estado--aberto', abertoAgora);
  }
}

/* ─────────────────────────────── modalidades ─────────────────────────── */

/* Só as que se treinam mesmo aqui ficam à vista do público. As outras
   existem na gestão por razões de contabilidade e de histórico. */
const NAO_MOSTRAR = /aula experimental/i;

function mostrarModalidades(lista) {
  const caixa = $('listaModalidades');
  if (!caixa || !Array.isArray(lista)) return;

  const boas = lista
    .map((a) => ({ ...a, nome: semEmoji(a.name) }))
    .filter((a) => a.nome && !NAO_MOSTRAR.test(a.nome));

  if (!boas.length) { caixa.closest('.seccao')?.remove(); return; }

  caixa.innerHTML = boas.map((a) => {
    const explicacao = a.description || EXPLICACOES[a.nome.toLowerCase()] || '';
    return `
    <article class="modalidade revela">
      <span class="modalidade__risco" style="background:${a.color || '#a8a29b'}"></span>
      <h3>${a.nome}</h3>
      ${explicacao ? `<p>${explicacao}</p>` : ''}
    </article>`;
  }).join('');
}

/* ─────────────────────────────── contactos ───────────────────────────── */

const RECADO =
  'Olá! Vi o site e queria experimentar uma aula no Ginásio KO.';

function soDigitos(t) { return String(t || '').replace(/\D/g, ''); }

/** O número vem da ficha sem indicativo. O WhatsApp precisa dele. */
function paraWhatsapp(telefone) {
  const n = soDigitos(telefone);
  if (!n) return null;
  const completo = n.length === 9 ? `351${n}` : n;
  return `https://wa.me/${completo}?text=${encodeURIComponent(RECADO)}`;
}

function comEspacos(telefone) {
  const n = soDigitos(telefone);
  return n.length === 9 ? `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}` : telefone;
}

/** O campo do Maps aceita uma morada, não só um link — há uma morada escrita
 *  em produção. O que não for link vai como procura. */
function paraMapa(valor, morada) {
  const v = String(valor || '').trim();
  if (/^https?:\/\//i.test(v)) return v;
  const procura = v || morada || 'Ginásio KO Olivais Lisboa';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(procura)}`;
}

function porLigacao(elemento, endereco, esconderSeVazio = true) {
  if (!elemento) return;
  if (!endereco) {
    if (esconderSeVazio) elemento.style.display = 'none';
    return;
  }
  elemento.href = endereco;
}

function mostrarContactos(ficha) {
  if (!ficha) return;

  if (ficha.address && $('morada')) {
    // O traço só separa quando tem espaços dos dois lados: sem isso o
    // "1800-070" partia-se em duas linhas, "1800" e "070 Lisboa".
    $('morada').innerHTML = String(ficha.address)
      .split(/\s+[-–—]\s+|\s*,\s*/)
      .map((p) => p.trim())
      .filter(Boolean)
      .join('<br>');
  }

  const whatsapp = paraWhatsapp(ficha.whatsapp || ficha.phone);
  porLigacao($('ligacaoWhatsapp'), whatsapp);
  porLigacao($('botaoWhatsapp'), whatsapp, false);
  porLigacao($('botaoWhatsappFim'), whatsapp, false);
  if (whatsapp) {
    [$('botaoWhatsapp'), $('botaoWhatsappFim')].forEach((b) => {
      if (b) { b.target = '_blank'; b.rel = 'noopener'; }
    });
  }

  if (ficha.phone) {
    const bonito = comEspacos(ficha.phone);
    const marcar = `tel:+351${soDigitos(ficha.phone)}`;
    [$('ligacaoTelefone'), $('telefoneChamada')].forEach((el) => {
      if (!el) return;
      el.href = marcar;
      el.textContent = bonito;
    });
  }

  porLigacao($('ligacaoEmail'), ficha.email ? `mailto:${ficha.email}` : null);
  porLigacao($('ligacaoInstagram'), ficha.instagram);
  porLigacao($('ligacaoAvaliar'), ficha.review_url || ficha.maps_url);
  porLigacao($('ligacaoMapa'), paraMapa(ficha.maps_url, ficha.address), false);
}

/* ─────────────────────────────── a revelação ─────────────────────────── */

function acordarAoAparecer() {
  const alvos = document.querySelectorAll('.revela');
  if (!('IntersectionObserver' in window)) {
    alvos.forEach((a) => a.classList.add('revela--visivel'));
    return;
  }
  const olho = new IntersectionObserver((entradas) => {
    entradas.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('revela--visivel');
      olho.unobserve(e.target);   // uma vez chega: não volta a desaparecer
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

  alvos.forEach((a) => olho.observe(a));
}

/* ─────────────────────────────── a barra ─────────────────────────────── */

function barraQuePousa() {
  const barra = $('barra');
  if (!barra) return;
  const ver = () => barra.classList.toggle('barra--pousada', window.scrollY > 40);
  ver();
  window.addEventListener('scroll', ver, { passive: true });
}

/* ─────────────────────────────── arranque ────────────────────────────── */

(async function arrancar() {
  if ($('ano')) $('ano').textContent = new Date().getFullYear();
  barraQuePousa();
  acordarAoAparecer();

  const [daGestao, modalidades] = await Promise.all([
    pedir('/mobile/gym-info'),
    pedir('/mobile/activities'),
  ]);

  // Campo a campo: o que a gestão tiver preenchido manda, e o que lá faltar
  // (ou tudo, se o servidor não responder) vem da cópia aqui de cima.
  const ficha = { ...DE_RESERVA, ...(daGestao || {}) };
  Object.keys(DE_RESERVA).forEach((campo) => {
    if (!ficha[campo]) ficha[campo] = DE_RESERVA[campo];
  });

  mostrarContactos(ficha);
  mostrarHorario(ficha.hours);
  mostrarModalidades(
    Array.isArray(modalidades) && modalidades.length ? modalidades : MODALIDADES_DE_RESERVA
  );

  // O que entrou agora na página também tem de ser revelado.
  acordarAoAparecer();
})();
