/* ══════════════════════════════════════════════════════════════════════════
   Ginásio KO — exemplos de desenho do site público

   O que é igual nos três exemplos: os dados que vêm da gestão, a leitura do
   horário, os contactos. O que muda de exemplo para exemplo é só o desenho
   e a maneira de os mostrar.

   É o mesmo miolo do `site-publico/guiao.js`, posto num sítio só para os
   três não se contradizerem: se o horário se lê de uma maneira, lê-se da
   mesma em todos.
   ══════════════════════════════════════════════════════════════════════════ */

(function (raiz) {
  'use strict';

  const API = 'https://ginasioko.site/api';

  /* ───────────────────────── o que fica de reserva ──────────────────── */

  /* O que estava na gestão no dia em que isto se fez. Serve só quando o
     servidor não responde — sem rede, numa manutenção, ou numa
     pré-visualização fora do domínio. Respondendo ele, manda ele. */
  const DE_RESERVA = {
    hours: 'Segunda, quarta e sexta: 10h00 - 14h00 / 16h00 - 22h00 '
         + 'Terça e quinta: 10h00 - 14h00 / 16h00 - 20h00',
    address: 'Rua Almada Negreiros - Campo Branca Lucas - Sport Lisboa e Olivais, 1800-070 Lisboa',
    phone: '926372441',
    whatsapp: '926372441',
    email: 'GinasioKO-SLO@protonmail.com',
    instagram: 'https://www.instagram.com/ginasioko/',
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

  /* Nenhuma modalidade tem descrição escrita na gestão. Estas frases são o
     que se mostra enquanto o campo estiver vazio: no dia em que o dono as
     escrever, são as dele que aparecem. */
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

  /* Uma palavra para cada uma, para os desenhos que só têm uma linha de
     espaço. Mesma regra: cede à descrição da gestão quando ela existir. */
  const NUMA_PALAVRA = {
    'boxe': 'Mãos',
    'kickboxing': 'Mãos e pernas',
    'jiu-jitsu': 'Chão',
    'musculação': 'Pesos',
    'crossfit': 'Circuito',
    'yoga': 'Respiração',
    'pilates': 'Postura',
    'dança': 'Ritmo',
    'pt (treino personalizado)': 'A dois',
  };

  /* Na gestão há modalidades que existem por razões de contabilidade e de
     histórico. Ao público só vai o que se treina mesmo aqui. */
  const NAO_MOSTRAR = /aula experimental/i;

  /* ──────────────────────────── ferramentas ─────────────────────────── */

  async function pedir(caminho) {
    try {
      const resposta = await fetch(API + caminho, { headers: { Accept: 'application/json' } });
      if (!resposta.ok) return null;
      return await resposta.json();
    } catch {
      // Sem rede não rebenta: fica o que está escrito de reserva.
      return null;
    }
  }

  /** Os emoji dos nomes não aparecem ao público, como na aplicação do
   *  sócio. Só se tira o que está à frente do nome. */
  function semEmoji(nome) {
    return String(nome || '').replace(/^[^\p{L}\p{N}]+/u, '').trim();
  }

  function soDigitos(t) { return String(t || '').replace(/\D/g, ''); }

  function comEspacos(telefone) {
    const n = soDigitos(telefone);
    return n.length === 9 ? `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}` : telefone;
  }

  const RECADO = 'Olá! Vi o site e queria experimentar uma aula no Ginásio KO.';

  /** O número vem da ficha sem indicativo; o WhatsApp precisa dele. */
  function paraWhatsapp(telefone, recado) {
    const n = soDigitos(telefone);
    if (!n) return null;
    const completo = n.length === 9 ? `351${n}` : n;
    return `https://wa.me/${completo}?text=${encodeURIComponent(recado || RECADO)}`;
  }

  /** O campo do Maps aceita uma morada, não só um link — há uma morada
   *  escrita em produção. O que não for link vai como procura. */
  function paraMapa(valor, morada) {
    const v = String(valor || '').trim();
    if (/^https?:\/\//i.test(v)) return v;
    const procura = v || morada || 'Ginásio KO Olivais Lisboa';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(procura)}`;
  }

  /** O traço só separa quando tem espaços dos dois lados: sem isso o
   *  "1800-070" partia-se em duas linhas, "1800" e "070 Lisboa". */
  function moradaEmLinhas(morada) {
    return String(morada || '')
      .split(/\s+[-–—]\s+|\s*,\s*/)
      .map((p) => p.trim())
      .filter(Boolean);
  }

  /* ────────────────────────────── o horário ─────────────────────────── */

  /* O horário é um campo de texto livre na ficha do ginásio. Quem o mostra
     é que o lê — a mesma regra da aplicação (src/lib/horario.ts):
     uma linha por conjunto de dias, dois períodos por dia (fecha para
     almoço), e nunca se perde texto. */

  const DIAS = [
    { nome: 'Segunda', curto: 'Seg', procura: /segunda|2ª|2\.ª/i },
    { nome: 'Terça',   curto: 'Ter', procura: /terça|terca|3ª|3\.ª/i },
    { nome: 'Quarta',  curto: 'Qua', procura: /quarta|4ª|4\.ª/i },
    { nome: 'Quinta',  curto: 'Qui', procura: /quinta|5ª|5\.ª/i },
    { nome: 'Sexta',   curto: 'Sex', procura: /sexta|6ª|6\.ª/i },
    { nome: 'Sábado',  curto: 'Sáb', procura: /sábado|sabado/i },
    { nome: 'Domingo', curto: 'Dom', procura: /domingo/i },
  ];

  function emLinhas(texto) {
    return String(texto || '')
      .replace(/[»«|;*]+/g, '\n')
      // "22h00 Terça e quinta: ..." — um dia da semana logo a seguir a uma
      // hora começa uma linha nova. Sem isto vinha tudo numa só.
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
    DIAS.forEach((dia, indice) => { if (dia.procura.test(parteDosDias)) dias.push(indice); });
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
    return { crua: linha, dias, periodos, horas: periodos.map((p) => p.texto).join('  ·  ') };
  }

  function nomesDosDias(indices) {
    if (!indices.length) return '';
    if (indices.length === 1) return DIAS[indices[0]].nome;
    const seguidos = indices.every((d, i) => i === 0 || d === indices[i - 1] + 1);
    if (seguidos && indices.length > 2) {
      return `${DIAS[indices[0]].nome} a ${DIAS[indices[indices.length - 1]].nome}`;
    }
    const nomes = indices.map((d) => DIAS[d].nome);
    return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
  }

  /** Em JavaScript o domingo é 0; aqui a semana começa à segunda, como no
   *  `weekday()` do Python e como em todo o resto do software. */
  function diaDeHoje() { return (new Date().getDay() + 6) % 7; }

  function lerHorario(texto) {
    const hoje = diaDeHoje();
    const agora = new Date().getHours() * 60 + new Date().getMinutes();
    let abertoAgora = false;

    const linhas = emLinhas(texto).map(lerLinha).map((linha) => {
      const eHoje = linha.dias.includes(hoje);
      if (eHoje && linha.periodos.length) {
        abertoAgora = abertoAgora || linha.periodos.some((p) => agora >= p.abre && agora < p.fecha);
      }
      return { ...linha, eHoje, nomes: nomesDosDias(linha.dias) };
    });

    /* Um dia de cada vez, para os desenhos que querem uma grelha e não uma
       lista. Um dia sem horário escrito fica com `periodos` vazio — que é
       o que diz "fechado" sem ter de o inventar. */
    const porDia = DIAS.map((dia, indice) => {
      const linha = linhas.find((l) => l.dias.includes(indice));
      return {
        indice,
        nome: dia.nome,
        curto: dia.curto,
        eHoje: indice === hoje,
        periodos: linha ? linha.periodos : [],
        horas: linha ? linha.horas : '',
      };
    });

    return { linhas, porDia, abertoAgora, hoje, agora };
  }

  /* ──────────────────────────── as modalidades ──────────────────────── */

  function arrumarModalidades(lista) {
    const boas = (Array.isArray(lista) && lista.length ? lista : MODALIDADES_DE_RESERVA)
      .map((a) => {
        const nome = semEmoji(a.name);
        const chave = nome.toLowerCase();
        return {
          nome,
          cor: a.color || '#a8a29b',
          descricao: a.description || EXPLICACOES[chave] || '',
          palavra: NUMA_PALAVRA[chave] || '',
        };
      })
      .filter((a) => a.nome && !NAO_MOSTRAR.test(a.nome));
    return boas;
  }

  /* ───────────────────────────── o arranque ─────────────────────────── */

  /** Vai buscar a ficha do ginásio e as modalidades. Campo a campo: o que a
   *  gestão tiver preenchido manda, e o que lá faltar vem da cópia. */
  async function carregar() {
    const [daGestao, modalidades] = await Promise.all([
      pedir('/mobile/gym-info'),
      pedir('/mobile/activities'),
    ]);

    const ficha = { ...DE_RESERVA, ...(daGestao || {}) };
    Object.keys(DE_RESERVA).forEach((campo) => {
      if (!ficha[campo]) ficha[campo] = DE_RESERVA[campo];
    });

    return {
      ficha,
      modalidades: arrumarModalidades(modalidades),
      horario: lerHorario(ficha.hours),
      doServidor: Boolean(daGestao),
    };
  }

  /* ──────────────────────── o que aparece ao rolar ──────────────────── */

  /** Uma vez chega: o que já apareceu não volta a desaparecer. */
  function acordarAoAparecer(selector) {
    const alvos = document.querySelectorAll(selector || '.revela');
    if (!('IntersectionObserver' in window)) {
      alvos.forEach((a) => a.classList.add('visivel'));
      return;
    }
    const olho = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('visivel');
        olho.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });
    alvos.forEach((a) => olho.observe(a));
  }

  raiz.KO = {
    API, DE_RESERVA, MODALIDADES_DE_RESERVA, EXPLICACOES, NUMA_PALAVRA, DIAS,
    pedir, semEmoji, soDigitos, comEspacos, paraWhatsapp, paraMapa,
    moradaEmLinhas, lerHorario, arrumarModalidades, carregar, acordarAoAparecer,
    RECADO,
  };
})(window);
