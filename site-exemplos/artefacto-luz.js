/* A luz do artefacto.
   ────────────────────────────────────────────────────────────────────────
   O disco não é uma fotografia. São três mapas — a cor da peça, o relevo e a
   aspereza — e a luz é calculada aqui, a cada fotograma. É por isso que ela
   segue o rato: numa imagem já iluminada, o brilho está onde ficou e não há
   nada a fazer-lhe.

   É o mesmo método do site que ele apontou (um modelo com mapas de normais
   iluminado em WebGL), com duas diferenças: lá são 17 MB de texturas e um
   modelo 3D; aqui são 1,6 MB e nenhuma biblioteca.

   O que se vê não é uma imagem a rodar — é um plano inclinado no espaço, e
   cada pixel do ecrã é um raio que vai lá bater. Daí a perspectiva ser a
   verdadeira: o lado de lá afasta-se e perde-se no escuro.

   O que faz a peça parecer metal, e não um desenho de metal, são cinco
   coisas que nenhuma imagem cozida tem:

     1. o relevo tem espessura — o raio entra nele e procura onde bate
        (paralaxe), por isso as figuras tapam-se a si próprias de lado;
     2. o relevo faz sombra sobre si próprio;
     3. a aspereza muda de sítio para sítio: o metal gasto é polido, a
        patina do fundo é baça. Brilho igual em todo o lado lê-se como
        plástico;
     4. há um ambiente à volta que o metal reflecte, e não só uma lâmpada;
     5. as marcas do torno correm à volta do disco, e não ao acaso.

   Sem WebGL, com "reduzir movimento" ligado ou com poupança de dados, nada
   disto acontece e fica a fotografia — que continua a ser a mesma peça,
   iluminada uma vez em vez de a toda a hora. */

(function () {
  'use strict';

  var MAPA_COR = 'fotos/artefacto-cor.webp';
  var MAPA_REL = 'fotos/artefacto-rel.webp';
  var MAPA_RUG = 'fotos/artefacto-rug.webp';

  var VERTICE = [
    'attribute vec2 posicao;',
    'void main() { gl_Position = vec4(posicao, 0.0, 1.0); }'
  ].join('\n');

  var FRAGMENTO = [
    '%PRECISAO%',

    'uniform vec2  resolucao;',
    'uniform sampler2D mapaCor;',
    'uniform sampler2D mapaRel;',
    'uniform sampler2D mapaRug;',
    'uniform float inclinacao, guinada, giro, distancia, abertura;',
    'uniform vec2  desvio, luzXY;',
    'uniform float luzZ, graoForca, passosFundo, passosSombra;',

    /* A espessura do relevo, em unidades do mapa. Nao e um gosto: a 0,030 o
       raio varria 300 pixeis do mapa de lado, e em dezoito passos isso sao
       dezassete pixeis por passo -- as figuras saiam serradas aos degraus. */
    'const float ESPESSURA = 0.0125;',

    'mat3 rodaX(float a) {',
    '  float c = cos(a), s = sin(a);',
    '  return mat3(1.0, 0.0, 0.0,  0.0, c, s,  0.0, -s, c);',
    '}',
    'mat3 rodaY(float a) {',
    '  float c = cos(a), s = sin(a);',
    '  return mat3(c, 0.0, -s,  0.0, 1.0, 0.0,  s, 0.0, c);',
    '}',

    'float baralha(vec2 p) {',
    '  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);',
    '}',
    'float ruido(vec2 p) {',
    '  vec2 i = floor(p), f = fract(p);',
    '  f = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(baralha(i), baralha(i + vec2(1.0, 0.0)), f.x),',
    '             mix(baralha(i + vec2(0.0, 1.0)), baralha(i + vec2(1.0, 1.0)), f.x), f.y);',
    '}',
    'vec2 declive(vec2 p, float e) {',
    '  float a = ruido(p);',
    '  return vec2(ruido(p + vec2(e, 0.0)) - a, ruido(p + vec2(0.0, e)) - a) / e;',
    '}',

    'vec3 ambienteEm(vec3 r) {',
    '  float h = clamp(r.y, -1.0, 1.0);',
    '  vec3 alto  = vec3(0.040, 0.056, 0.082);',
    '  vec3 linha = vec3(0.125, 0.120, 0.112);',
    '  vec3 chao  = vec3(0.016, 0.014, 0.013);',
    '  vec3 c = h > 0.0 ? mix(linha, alto, pow(h, 0.5)) : mix(linha, chao, pow(-h, 0.6));',
    '  float j = max(dot(r, normalize(vec3(-0.52, 0.58, -0.30))), 0.0);',
    '  c += vec3(1.0, 0.93, 0.82) * pow(j, 14.0) * 0.62;',
    '  return c;',
    '}',

    'float profundidade(float b) { return clamp((0.602 - b) / 0.300, 0.0, 1.0); }',

    'void main() {',
    '  vec2 ndc = (gl_FragCoord.xy / resolucao) * 2.0 - 1.0;',
    '  ndc.x *= resolucao.x / resolucao.y;',
    '  vec3 raio = normalize(vec3(ndc * abertura, 1.0));',

    '  mat3 M = rodaY(guinada) * rodaX(inclinacao);',
    '  vec3 eixoU = M * vec3(1.0, 0.0, 0.0);',
    '  vec3 eixoV = M * vec3(0.0, 1.0, 0.0);',
    '  vec3 normalPlano = M * vec3(0.0, 0.0, -1.0);',
    '  vec3 centro = vec3(desvio, distancia);',

    '  float den = dot(raio, normalPlano);',
    '  if (abs(den) < 1e-5) discard;',
    '  float t = dot(centro, normalPlano) / den;',
    '  if (t <= 0.02) discard;',
    '  vec3 batida = raio * t;',
    '  vec3 p = batida - centro;',
    '  vec2 disco = vec2(dot(p, eixoU), dot(p, eixoV));',
    '  if (dot(disco, disco) > 1.30) discard;',

    '  float cg = cos(giro), sg = sin(giro);',
    '  vec2 d2 = vec2(disco.x * cg - disco.y * sg, disco.x * sg + disco.y * cg);',

    '  vec3 eixoT = eixoU * cg - eixoV * sg;',
    '  vec3 eixoB = eixoU * sg + eixoV * cg;',
    '  vec3 olho = -raio;',
    '  vec3 vistaT = vec3(dot(olho, eixoT), -dot(olho, eixoB), dot(olho, normalPlano));',

    '  vec2 uv = d2 * 0.5 + 0.5;',
    '  uv.y = 1.0 - uv.y;',
    '  float longe = clamp(1.7 / t, 0.0, 1.0);',
    /* ao longe o passo da paralaxe cobre mais mapa do que o pixel que ele
       serve, e ai ela so acrescenta serrilha: desaparece com a distancia */
    '  float vz = max(abs(vistaT.z), 0.30);',
    '  vec2 varre = (vistaT.xy / vz) * ESPESSURA * (0.25 + 0.75 * longe);',
    '  float camadas = max(passosFundo, 4.0);',
    '  float dp = 1.0 / camadas;',
    '  vec2 duv = varre * dp;',
    '  float prof = 0.0;',
    '  float amostra = profundidade(texture2D(mapaRel, uv).b);',
    '  for (int i = 0; i < 20; i++) {',
    '    if (float(i) >= camadas || prof >= amostra) break;',
    '    uv += duv; prof += dp;',
    '    amostra = profundidade(texture2D(mapaRel, uv).b);',
    '  }',
    /* Cinco bisseccoes entre o passo que passou e o anterior. Sem elas o
       passo fica onde calhou, e as bordas do relevo leem-se como degraus de
       escada -- que foi exactamente o que aconteceu a primeira vez. */
    '  for (int i = 0; i < 5; i++) {',
    '    duv *= 0.5; dp *= 0.5;',
    '    if (prof > amostra) { uv -= duv; prof -= dp; }',
    '    else { uv += duv; prof += dp; }',
    '    amostra = profundidade(texture2D(mapaRel, uv).b);',
    '  }',
    '  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) discard;',

    '  vec4 rel = texture2D(mapaRel, uv);',
    '  float recorte = rel.a;',
    '  if (recorte < 0.004) discard;',
    '  float altura = rel.b;',
    '  vec3 rug = texture2D(mapaRug, uv).rgb;',
    '  float aspereza = clamp(rug.r, 0.06, 1.0);',
    '  float metal = rug.g;',
    '  float cavidade = rug.b;',

    '  vec2 nxy = rel.rg * 2.0 - 1.0;',
    '  nxy.y = -nxy.y;',

    '  float pp = longe * longe;',
    '  float r2 = length(d2) + 1e-4;',
    '  vec2 radial = d2 / r2;',
    '  float volta = atan(d2.y, d2.x);',
    '  float e1 = 0.0012;',
    '  float m0 = ruido(vec2(r2 * 1850.0, volta * 9.0));',
    '  float m1 = ruido(vec2((r2 + e1) * 1850.0, volta * 9.0));',
    '  nxy += radial * ((m1 - m0) / e1) * 0.000085 * pp;',

    '  float g = graoForca * pp;',
    '  if (g > 0.003) {',
    '    vec2 q = d2 * 620.0;',
    '    vec2 dg = declive(q, 0.35) * 0.55 + declive(q * 2.7 + 11.3, 0.35) * 0.25;',
    '    nxy += dg * g;',
    '    aspereza = clamp(aspereza + (ruido(q * 0.17) - 0.5) * 0.14 * pp, 0.06, 1.0);',
    '  }',

    '  float nz = sqrt(max(1.0 - dot(nxy, nxy), 0.004));',
    '  vec3 N = normalize(eixoT * nxy.x + eixoB * (-nxy.y) + normalPlano * nz);',
    '  vec3 ponto = batida + normalPlano * (profundidade(altura) * ESPESSURA * (-0.5));',

    '  vec3 albedo = pow(texture2D(mapaCor, uv).rgb, vec3(2.2));',

    '  vec3 pontoLuz = vec3(luzXY, luzZ);',
    '  vec3 paraLuz = pontoLuz - ponto;',
    '  float dLuz = length(paraLuz);',
    '  paraLuz /= dLuz;',
    '  float queda = 1.0 / (1.0 + pow(dLuz / 0.98, 2.3));',

    '  vec3 luzT = vec3(dot(paraLuz, eixoT), -dot(paraLuz, eixoB), dot(paraLuz, normalPlano));',
    '  float sombra = 1.0;',
    '  if (luzT.z > 0.04 && passosSombra >= 2.0) {',
    '    float passos = passosSombra;',
    '    vec2 pduv = (luzT.xy / luzT.z) * ESPESSURA / passos;',
    '    float ph = profundidade(altura);',
    '    float pdh = ph / passos;',
    '    float tapado = 0.0;',
    '    vec2 pu = uv;',
    '    for (int i = 0; i < 14; i++) {',
    '      if (float(i) >= passos) break;',
    '      pu -= pduv; ph -= pdh;',
    '      float h2 = profundidade(texture2D(mapaRel, pu).b);',
    '      tapado = max(tapado, (ph - h2) * (1.0 - float(i) / passos));',
    '    }',
    '    sombra = 1.0 - clamp(tapado * 5.5, 0.0, 0.92);',
    '  }',

    '  float ndl = max(dot(N, paraLuz), 0.0);',
    '  float ndv = max(dot(N, olho), 0.0);',
    '  vec3 meio = normalize(paraLuz + olho);',
    '  float ndh = max(dot(N, meio), 0.0);',
    '  float vdh = max(dot(olho, meio), 0.0);',

    '  float a = aspereza * aspereza;',
    '  float a2 = a * a;',
    '  float dd = ndh * ndh * (a2 - 1.0) + 1.0;',
    '  float D = a2 / (3.14159265 * dd * dd + 1e-6);',
    '  float k = a * 0.5;',
    '  float G = (ndl / (ndl * (1.0 - k) + k)) * (ndv / (ndv * (1.0 - k) + k));',

    '  vec3 BRONZE = vec3(0.735, 0.545, 0.330);',
    '  vec3 F0 = mix(vec3(0.045), BRONZE, metal);',
    '  vec3 F = F0 + (1.0 - F0) * pow(1.0 - vdh, 5.0);',

    '  vec3 CHAVE = vec3(1.0, 0.845, 0.600);',
    '  float luzQ = queda * sombra;',

    '  vec3 difusa = albedo * (1.0 - metal * 0.72) * ndl * luzQ * 3.35;',
    '  vec3 especular = (D * G * 0.25 / max(ndl * ndv, 1e-4)) * F * ndl * luzQ * 1.5;',

    '  vec3 reflexo = reflect(-olho, N);',
    '  vec3 amb = ambienteEm(reflexo);',
    '  vec3 Fv = F0 + (1.0 - F0) * pow(1.0 - ndv, 5.0) * (1.0 - aspereza);',
    '  float oclusao = clamp(altura * 1.9, 0.0, 1.0) * mix(0.55, 1.0, cavidade);',
    '  vec3 cor = difusa * CHAVE + especular * CHAVE;',
    '  cor += amb * Fv * mix(1.0, 0.18, aspereza) * oclusao;',
    '  cor += ambienteEm(N) * albedo * (1.0 - metal * 0.6) * 0.55 * oclusao;',

    '  vec3 paraFria = normalize(vec3(-luzXY * 0.75, luzZ * 0.9) - ponto);',
    '  cor += albedo * vec3(0.42, 0.56, 0.78) * max(dot(N, paraFria), 0.0) * 0.075;',

    '  cor *= exp(-max(t - distancia, 0.0) * 0.88);',

    '  cor = clamp((cor * (2.51 * cor + 0.03)) / (cor * (2.43 * cor + 0.59) + 0.14), 0.0, 1.0);',
    '  cor = pow(cor, vec3(1.0 / 2.2));',
    '  cor += (baralha(gl_FragCoord.xy) - 0.5) * (1.4 / 255.0);',
    '  gl_FragColor = vec4(cor, recorte);',
    '}'
  ].join('\n');

  /* ─────────────────────────── montagem ────────────────────────────── */

  function compilar(gl, tipo, fonte) {
    var s = gl.createShader(tipo);
    gl.shaderSource(s, fonte);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(s));
    }
    return s;
  }

  function textura(gl, img, temAlfa) {
    var tx = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tx);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, temAlfa ? gl.RGBA : gl.RGB,
                  temAlfa ? gl.RGBA : gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);
    /* O plano está deitado: ao longe, um pixel do ecrã cobre dezenas de
       pixeis do mapa numa direcção e dois noutra. Sem filtragem anisotrópica
       a greca e a legenda desfazem-se em papa a meio do disco. */
    var ext = gl.getExtension('EXT_texture_filter_anisotropic') ||
              gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
    if (ext) {
      gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT,
        Math.min(16, gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    }
    return tx;
  }

  /* O `crossOrigin` é preciso para a imagem poder entrar numa textura: sem
     ele, uma imagem de outra origem suja a tela e o WebGL recusa-a. Mas se o
     servidor não mandar o cabeçalho a autorizar, pedi-la assim *impede-a de
     carregar* — o remédio passa a ser a doença. Por isso tenta-se com, e se
     falhar tenta-se sem. */
  function carregar(url, semCors) {
    return new Promise(function (ok, falha) {
      var im = new Image();
      if (!semCors) im.crossOrigin = 'anonymous';
      im.onload = function () { ok(im); };
      im.onerror = function () {
        if (semCors) { falha(new Error(url)); return; }
        carregar(url, true).then(ok, falha);
      };
      im.src = url;
    });
  }

  function suave(a, b, k) { return a + (b - a) * k; }
  function prender(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function ligar(palco, viagem, img) {
    var tela = document.createElement('canvas');
    tela.className = 'artefacto__tela';
    tela.setAttribute('aria-hidden', 'true');
    palco.appendChild(tela);

    var gl = tela.getContext('webgl', {
      alpha: true, antialias: false, depth: false, stencil: false,
      premultipliedAlpha: false, powerPreference: 'high-performance'
    }) || tela.getContext('experimental-webgl');
    if (!gl) throw new Error('sem webgl');

    /* Nem toda a placa gráfica de telemóvel promete `highp` no fragmento, e
       sem precisão as contas do raio partem-se em degraus. Pergunta-se, e se
       não houver usa-se `mediump` — pior, mas desenha. */
    var fino = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    var precisao = (fino && fino.precision > 0) ? 'highp' : 'mediump';

    var prog = gl.createProgram();
    gl.attachShader(prog, compilar(gl, gl.VERTEX_SHADER, VERTICE));
    gl.attachShader(prog, compilar(gl, gl.FRAGMENT_SHADER,
      FRAGMENTO.replace('%PRECISAO%', 'precision ' + precisao + ' float;')));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(prog));
    }
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'posicao');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var U = {};
    ['resolucao', 'mapaCor', 'mapaRel', 'mapaRug', 'inclinacao', 'guinada',
     'giro', 'distancia', 'abertura', 'desvio', 'luzXY', 'luzZ', 'graoForca',
     'passosFundo', 'passosSombra']
      .forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    var largura = 0, altura = 0;
    /* Um tecto de pixeis: esta conta num ecrã 4K põe uma placa gráfica fraca
       a arrastar-se, e ninguém repara na diferença. */
    var tecto = 2100000;
    function medir(forcar) {
      var r = palco.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      var w = Math.max(2, Math.round(r.width * dpr));
      var h = Math.max(2, Math.round(r.height * dpr));
      if (w * h > tecto) {
        var k = Math.sqrt(tecto / (w * h));
        w = Math.round(w * k); h = Math.round(h * k);
      }
      if (w === largura && h === altura && !forcar) return;
      largura = w; altura = h;
      tela.width = w; tela.height = h;
      gl.viewport(0, 0, w, h);
    }

    /* E se mesmo assim não aguentar, baixa-se — primeiro os passos da
       paralaxe e da sombra, que é onde está o trabalho, e só depois os
       pixeis. Vale mais um disco com menos passos a correr direito do que um
       disco perfeito aos saltos, e quem tem a máquina fraca não tem como
       saber que foi isso que aconteceu. */
    var nivel = 0;
    var NIVEIS = [[18, 12], [12, 8], [8, 5], [5, 0]];
    var contados = 0, somados = 0;
    function pesar(ms) {
      if (ms > 140) return;
      somados += ms; contados++;
      if (contados < 45) return;
      if (somados / contados > 30) {
        if (nivel < NIVEIS.length - 1) nivel++;
        else if (tecto > 600000) { tecto = Math.round(tecto * 0.6); medir(true); }
      }
      contados = 0; somados = 0;
    }

    var alvoX = 0, alvoY = 0, ratoX = 0, ratoY = 0, temRato = false;
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      alvoX = (e.clientX / window.innerWidth) * 2 - 1;
      alvoY = (e.clientY / window.innerHeight) * 2 - 1;
      temRato = true;
    }, { passive: true });

    /* A roda do rato: no site dele a página não rola — a roda passeia a
       câmara por cima da peça. Aqui a página tem de rolar, porque tem mais
       coisas por baixo; por isso a secção ganhou curso próprio, e enquanto a
       roda anda nesse curso é a câmara que viaja. Só depois a página segue. */
    var p = 0, pAlvo = 0;
    function progresso() {
      var r = viagem.getBoundingClientRect();
      var curso = r.height - window.innerHeight;
      if (curso <= 1) return 0;
      return prender(-r.top / curso, 0, 1);
    }

    var visivel = false;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        visivel = es[0].isIntersecting;
        if (visivel) pedir();
      }, { rootMargin: '140px' }).observe(viagem);
    } else {
      visivel = true;
    }

    var estreito = window.matchMedia('(max-width: 760px)');
    var pedido = 0, inicio = 0, anterior = 0;

    function desenhar(agora) {
      pedido = 0;
      if (!inicio) inicio = agora;
      if (anterior) pesar(agora - anterior);
      anterior = agora;
      var t = (agora - inicio) / 1000;
      medir();

      ratoX = suave(ratoX, alvoX, 0.045);
      ratoY = suave(ratoY, alvoY, 0.045);
      pAlvo = progresso();
      p = suave(p, pAlvo, 0.12);

      /* Nunca está quieto, e é de propósito: medido no site dele, dois
         fotogramas seguidos com o rato parado mudam tanto como dois com o
         rato a mexer. O rato é um empurrão, não o motor. */
      var deitado = estreito.matches;
      var incl = (deitado ? 0.96 : 1.10) - p * (deitado ? 0.26 : 0.40)
               + Math.sin(t * 0.058) * 0.072
               + Math.sin(t * 0.0241 + 2.1) * 0.040
               - ratoY * 0.150;
      var guin = Math.sin(t * 0.039 + 1.3) * 0.150
               + Math.sin(t * 0.0146) * 0.070
               + (p - 0.5) * 0.26
               + ratoX * 0.190;
      var dist = (deitado ? 2.25 : 1.34) + p * (deitado ? 0.55 : 0.72)
               + Math.sin(t * 0.0289 + 2.4) * 0.080;

      var desvioX = -0.10 + Math.sin(t * 0.0214 + 0.7) * 0.090;
      var desvioY = (deitado ? -0.24 : -0.12) + Math.sin(t * 0.0174) * 0.065 + p * 0.10;

      gl.uniform2f(U.resolucao, largura, altura);
      gl.uniform1f(U.inclinacao, incl);
      gl.uniform1f(U.guinada, guin);
      /* a roda roda-o mesmo: mais de uma volta ao longo do curso, por cima
         da volta lenta que ele dá sozinho */
      gl.uniform1f(U.giro, -t * 0.0235 - p * 1.35);
      gl.uniform1f(U.distancia, dist);
      gl.uniform1f(U.abertura, deitado ? 0.62 : 0.52);
      gl.uniform2f(U.desvio, desvioX, desvioY);
      /* a luz anda à volta do centro do disco e não de um ponto fixo do
         espaço: o disco também se mexe, e com a luz presa ao mundo havia
         voltas inteiras em que a poça caía ao lado dos lutadores */
      gl.uniform2f(U.luzXY,
        desvioX + Math.sin(t * 0.0514 + 0.4) * 0.62 + (temRato ? ratoX * 1.25 : 0),
        desvioY - 0.16 + Math.sin(t * 0.0421 + 1.9) * 0.46 - (temRato ? ratoY * 1.00 : 0));
      gl.uniform1f(U.luzZ, 1.02 + Math.sin(t * 0.0259) * 0.14);
      gl.uniform1f(U.graoForca, deitado ? 0.08 : 0.12);
      gl.uniform1f(U.passosFundo, NIVEIS[nivel][0]);
      gl.uniform1f(U.passosSombra, NIVEIS[nivel][1]);

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      pedir();
    }

    function pedir() {
      if (pedido || !visivel || document.hidden) { anterior = 0; return; }
      pedido = requestAnimationFrame(desenhar);
    }
    document.addEventListener('visibilitychange', pedir);
    window.addEventListener('resize', pedir, { passive: true });

    return function pronto(cor, rel, rugo) {
      /* Uma imagem que tenha vindo sem autorização suja a tela, e é aqui que
         isso rebenta. Deixar rebentar deixava um quadrado vazio no meio da
         página; apanhado, volta-se à fotografia, que é o caminho de sempre. */
      gl.activeTexture(gl.TEXTURE0); textura(gl, cor, false);
      gl.uniform1i(U.mapaCor, 0);
      gl.activeTexture(gl.TEXTURE1); textura(gl, rel, true);
      gl.uniform1i(U.mapaRel, 1);
      gl.activeTexture(gl.TEXTURE2); textura(gl, rugo, false);
      gl.uniform1i(U.mapaRug, 2);
      if (gl.getError() !== gl.NO_ERROR) throw new Error('textura recusada');
      medir();
      visivel = true;
      p = pAlvo = progresso();
      pedir();
      requestAnimationFrame(function () {
        palco.classList.add('artefacto__palco--vivo');
      });
      if (img) img.setAttribute('aria-hidden', 'true');
    };
  }

  function arrancar() {
    var palco = document.querySelector('.artefacto__palco');
    var viagem = document.querySelector('.artefacto__viagem');
    if (!palco || !viagem) return;
    var img = document.getElementById('disco');

    var parado = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var ligacao = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    var poupa = !!(ligacao && (ligacao.saveData ||
                   /^(slow-)?2g$/.test(ligacao.effectiveType || '')));
    if (parado || poupa) return;

    var pronto;
    try {
      pronto = ligar(palco, viagem, img);
    } catch (e) {
      return;
    }
    function desistir() {
      var tela = palco.querySelector('.artefacto__tela');
      if (tela) tela.remove();
      palco.classList.remove('artefacto__palco--vivo');
    }
    Promise.all([carregar(MAPA_COR), carregar(MAPA_REL), carregar(MAPA_RUG)])
      .then(function (m) {
        try { pronto(m[0], m[1], m[2]); } catch (e) { desistir(); }
      })
      .catch(desistir);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrancar);
  } else {
    arrancar();
  }
})();
