/* A luz do artefacto.
   ────────────────────────────────────────────────────────────────────────
   O disco não é uma fotografia. São dois mapas — a cor da peça e o relevo —
   e a luz é calculada aqui, a cada fotograma. É por isso que ela segue o
   rato: numa imagem já iluminada, o brilho está onde ficou e não há nada a
   fazer-lhe.

   É o mesmo método do site que ele apontou (um modelo com mapas de normais
   iluminado em WebGL), com duas diferenças: lá são 17 MB de texturas e um
   modelo 3D; aqui são 580 KB e nenhuma biblioteca.

   O que se vê não é uma imagem a rodar — é um plano inclinado no espaço, e
   cada pixel do ecrã é um raio que vai lá bater. Daí a perspectiva ser a
   verdadeira: o lado de lá afasta-se e perde-se no escuro, como se perde
   numa peça que está mesmo pousada à nossa frente.

   Sem WebGL, com "reduzir movimento" ligado ou com poupança de dados, nada
   disto acontece e fica a fotografia — que continua a ser a mesma peça,
   iluminada uma vez em vez de a toda a hora. */

(function () {
  'use strict';

  var MAPA_COR = 'fotos/artefacto-cor.webp';
  var MAPA_REL = 'fotos/artefacto-rel.webp';

  var VERTICE = [
    'attribute vec2 posicao;',
    'void main() { gl_Position = vec4(posicao, 0.0, 1.0); }'
  ].join('\n');

  var FRAGMENTO = [
    '%PRECISAO%',

    'uniform vec2  resolucao;',
    'uniform sampler2D mapaCor;',
    'uniform sampler2D mapaRel;',
    'uniform float inclinacao, guinada, giro, distancia, abertura;',
    'uniform vec2  desvio, luzXY;',
    'uniform float luzZ, graoForca;',

    /* ─── o plano do disco ─── */
    'mat3 rodaX(float a) {',
    '  float c = cos(a), s = sin(a);',
    '  return mat3(1.0, 0.0, 0.0,  0.0, c, s,  0.0, -s, c);',
    '}',
    'mat3 rodaY(float a) {',
    '  float c = cos(a), s = sin(a);',
    '  return mat3(c, 0.0, -s,  0.0, 1.0, 0.0,  s, 0.0, c);',
    '}',

    /* ─── o grão do metal ───────────────────────────────────────────────
       O mapa tem 1024 pixeis e o disco é maior do que o ecrã: esticado,
       ficaria mole de perto. O grão fino nasce aqui, de uma conta, e por
       isso é nítido a qualquer tamanho e não pesa byte nenhum. */
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
    '  if (t <= 0.02) discard;',           /* o plano passou por trás da câmara */
    '  vec3 batida = raio * t;',
    '  vec3 p = batida - centro;',
    '  vec2 disco = vec2(dot(p, eixoU), dot(p, eixoV));',
    '  if (dot(disco, disco) > 1.21) discard;',

    /* o disco roda: roda-se a consulta ao mapa, e não a peça. Assim a luz
       fica onde está e é o relevo que lhe passa por baixo — que é o que
       acontece quando se roda uma coisa debaixo de um candeeiro. */
    '  float cg = cos(giro), sg = sin(giro);',
    '  vec2 d2 = vec2(disco.x * cg - disco.y * sg, disco.x * sg + disco.y * cg);',
    '  vec2 uv = d2 * 0.5 + 0.5;',
    '  uv.y = 1.0 - uv.y;',
    '  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) discard;',

    '  vec4 rel = texture2D(mapaRel, uv);',
    '  float recorte = rel.a;',
    '  if (recorte < 0.004) discard;',
    '  float altura = rel.b;',

    /* a normal do mapa, de volta ao espaço do plano */
    '  vec2 nxy = rel.rg * 2.0 - 1.0;',
    '  nxy.y = -nxy.y;',                   /* o mapa cresce para baixo, o eixo V para cima */

    /* o grão, só onde ainda se vê: ao longe entrava como cintilação */
    '  float perto = clamp(1.6 / t, 0.0, 1.0);',
    '  float g = graoForca * perto * perto;',
    '  if (g > 0.003) {',
    '    vec2 q = d2 * 420.0;',
    '    vec2 dg = declive(q, 0.35) * 0.55 + declive(q * 2.7 + 11.3, 0.35) * 0.25;',
    '    nxy += dg * g;',
    '  }',

    '  float nz = sqrt(max(1.0 - dot(nxy, nxy), 0.004));',
    '  vec3 N = normalize(eixoU * nxy.x + eixoV * nxy.y + normalPlano * nz);',
    '  vec3 olho = -raio;',

    /* a cor própria do metal, com a oclusão já lá dentro (como o ColorAO) */
    '  vec3 albedo = pow(texture2D(mapaCor, uv).rgb, vec3(2.2));',

    /* ─── a luz ───────────────────────────────────────────────────────
       Uma lanterna, não um céu: cai com o quadrado da distância, e por
       isso só acende um pedaço de cada vez. É isso que faz a peça parecer
       estar numa sala e não num catálogo. */
    '  vec3 pontoLuz = vec3(luzXY, luzZ);',
    '  vec3 paraLuz = pontoLuz - batida;',
    '  float dLuz = length(paraLuz);',
    '  paraLuz /= dLuz;',
    '  float queda = 1.0 / (1.0 + pow(dLuz / 0.98, 2.3));',

    '  float difusa = max(dot(N, paraLuz), 0.0);',
    '  float aspereza = mix(0.88, 0.40, smoothstep(0.40, 0.64, altura));',
    '  float expo = 2.0 / (aspereza * aspereza * aspereza * aspereza + 1e-3);',
    '  vec3 meio = normalize(paraLuz + olho);',
    '  float brilho = pow(max(dot(N, meio), 0.0), min(expo, 220.0));',
    '  float oclusao = clamp(altura * 1.9, 0.0, 1.0);',

    '  vec3 CHAVE = vec3(1.0, 0.845, 0.600);',
    '  vec3 FRIA  = vec3(0.42, 0.56, 0.78);',

    /* um segundo foco, fraco e frio, do lado contrário: sem ele o lado da
       sombra fica chapado e a peça volta a parecer um desenho */
    '  vec3 paraFria = normalize(vec3(-luzXY * 0.75, luzZ * 0.9) - batida);',
    '  float difFria = max(dot(N, paraFria), 0.0);',

    '  vec3 ambiente = mix(vec3(0.020, 0.026, 0.034), vec3(0.034, 0.040, 0.050),',
    '                      N.y * 0.5 + 0.5);',

    '  vec3 cor = albedo * (ambiente',
    '                       + CHAVE * difusa * queda * 3.35',
    '                       + FRIA * difFria * 0.085);',
    '  cor += CHAVE * brilho * queda * oclusao * 0.34;',

    /* o aro apanha a luz de raspão e acende-se — é o que diz que aquilo
       tem espessura */
    '  float aro = pow(1.0 - max(dot(N, olho), 0.0), 4.0);',
    '  cor += CHAVE * aro * queda * 0.055;',

    /* o lado de lá afasta-se e escurece. É a distância que dá a escala:
       sem isto, um disco grande e um disco pequeno são a mesma coisa. */
    '  cor *= exp(-max(t - distancia, 0.0) * 0.88);',

    '  cor = pow(max(cor, 0.0), vec3(1.0 / 2.2));',
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

  /* O `crossOrigin` e preciso para a imagem poder entrar numa textura: sem
     ele, uma imagem de outra origem suja a tela e o WebGL recusa-a. Mas se o
     servidor nao mandar o cabecalho a autorizar, pedi-la assim *impede-a de
     carregar* -- o remedio passa a ser a doenca. Por isso tenta-se com, e se
     falhar tenta-se sem: uma das duas serve, e qual delas depende de onde a
     pagina esta pousada, que daqui nao se sabe. */
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

  function ligar(palco, img) {
    var tela = document.createElement('canvas');
    tela.className = 'artefacto__tela';
    tela.setAttribute('aria-hidden', 'true');
    palco.appendChild(tela);

    var gl = tela.getContext('webgl', {
      alpha: true, antialias: false, depth: false, stencil: false,
      premultipliedAlpha: false, powerPreference: 'high-performance'
    }) || tela.getContext('experimental-webgl');
    if (!gl) throw new Error('sem webgl');

    /* Nem toda a placa grafica de telemovel promete `highp` no fragmento, e
       sem precisao as contas do raio partem-se em degraus. Pergunta-se, e
       se nao houver usa-se `mediump` -- pior, mas desenha. */
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
    ['resolucao', 'mapaCor', 'mapaRel', 'inclinacao', 'guinada', 'giro',
     'distancia', 'abertura', 'desvio', 'luzXY', 'luzZ', 'graoForca']
      .forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    var largura = 0, altura = 0;
    /* Um tecto de pixeis: esta conta num ecrã 4K põe uma placa gráfica fraca
       a arrastar-se, e ninguém repara na diferença. */
    var tecto = 2300000;
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

    /* E se mesmo assim não aguentar, baixa-se. Vale mais um disco com menos
       pixeis a correr direito do que um disco perfeito aos saltos -- e quem
       tem a máquina fraca não tem como saber que foi isso que aconteceu. */
    var contados = 0, somados = 0, descidas = 0;
    function pesar(ms) {
      if (ms > 120) return;                 /* saltou um separador, não conta */
      somados += ms; contados++;
      if (contados < 45) return;
      if (somados / contados > 30 && descidas < 2) {
        tecto = Math.round(tecto * 0.55);
        descidas++;
        medir(true);
      }
      contados = 0; somados = 0;
    }

    /* onde está o rato, e para onde ele quer que a peça vá */
    var alvoX = 0, alvoY = 0, ratoX = 0, ratoY = 0, temRato = false;
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      alvoX = (e.clientX / window.innerWidth) * 2 - 1;
      alvoY = (e.clientY / window.innerHeight) * 2 - 1;
      temRato = true;
    }, { passive: true });

    var visivel = false;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        visivel = es[0].isIntersecting;
        if (visivel) pedir();
      }, { rootMargin: '120px' }).observe(palco);
    } else {
      visivel = true;
    }

    var estreito = window.matchMedia('(max-width: 760px)');
    var pedido = 0, inicio = 0;

    var anterior = 0;
    function desenhar(agora) {
      pedido = 0;
      if (!inicio) inicio = agora;
      if (anterior) pesar(agora - anterior);
      anterior = agora;
      var t = (agora - inicio) / 1000;
      medir();

      ratoX = suave(ratoX, alvoX, 0.045);
      ratoY = suave(ratoY, alvoY, 0.045);

      /* Nunca está quieto, e é de propósito: medido no site dele, dois
         fotogramas seguidos com o rato parado mudam tanto como dois com o
         rato a mexer. O rato é um empurrão, não o motor. */
      var deitado = estreito.matches;
      /* As amplitudes sao medidas, nao escolhidas a olho: no site dele, dois
         fotogramas com 3,5 segundos de intervalo diferem 8 a 13 niveis de
         luz. Com metade disto a peca parecia parada; com o dobro, enjoava. */
      var incl = (deitado ? 0.815 : 0.985)
               + Math.sin(t * 0.058) * 0.125
               + Math.sin(t * 0.0241 + 2.1) * 0.062
               - ratoY * 0.175;
      var guin = Math.sin(t * 0.039 + 1.3) * 0.205
               + Math.sin(t * 0.0146) * 0.098
               + ratoX * 0.215;
      /* Num ecra estreito a camara *recua*, nao se aproxima: a largura
         visivel encolhe com o feitio do ecra, e de perto o disco deixava de
         se ler como disco -- era so bronze. */
      var dist = (deitado ? 2.62 : 1.60)
               + Math.sin(t * 0.0289 + 2.4) * (deitado ? 0.18 : 0.135);

      gl.uniform2f(U.resolucao, largura, altura);
      gl.uniform1f(U.inclinacao, incl);
      gl.uniform1f(U.guinada, guin);
      gl.uniform1f(U.giro, -t * 0.0455);
      gl.uniform1f(U.distancia, dist);
      gl.uniform1f(U.abertura, deitado ? 0.62 : 0.52);
      var desvioX = -0.10 + Math.sin(t * 0.0214 + 0.7) * 0.105;
      var desvioY = (deitado ? -0.24 : -0.12) + Math.sin(t * 0.0174) * 0.075;
      gl.uniform2f(U.desvio, desvioX, desvioY);

      /* A luz anda sozinha devagar, e o rato leva-a ao colo. Anda a volta do
         *centro do disco* e nao de um ponto fixo do espaco: o disco tambem
         se mexe, e com a luz presa ao mundo havia voltas inteiras em que a
         poca caia ao lado dos lutadores -- que sao o assunto da peca. */
      gl.uniform2f(U.luzXY,
        desvioX + Math.sin(t * 0.0514 + 0.4) * 0.62 + (temRato ? ratoX * 1.25 : 0),
        desvioY - 0.16 + Math.sin(t * 0.0421 + 1.9) * 0.46 - (temRato ? ratoY * 1.00 : 0));
      gl.uniform1f(U.luzZ, 1.02 + Math.sin(t * 0.0259) * 0.14);
      gl.uniform1f(U.graoForca, deitado ? 0.10 : 0.16);

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

    return function pronto(cor, rel) {
      /* Uma imagem que tenha vindo sem autorizacao suja a tela, e e aqui que
         isso rebenta. Deixar rebentar deixava um quadrado vazio no meio da
         pagina; apanhado, volta-se a fotografia, que e o caminho de sempre. */
      gl.activeTexture(gl.TEXTURE0); textura(gl, cor, false);
      gl.uniform1i(U.mapaCor, 0);
      gl.activeTexture(gl.TEXTURE1); textura(gl, rel, true);
      gl.uniform1i(U.mapaRel, 1);
      if (gl.getError() !== gl.NO_ERROR) throw new Error('textura recusada');
      medir();
      visivel = true;
      pedir();
      requestAnimationFrame(function () {
        palco.classList.add('artefacto__palco--vivo');
      });
      if (img) img.setAttribute('aria-hidden', 'true');
    };
  }

  function arrancar() {
    var palco = document.querySelector('.artefacto__palco');
    if (!palco) return;
    var img = document.getElementById('disco');

    var parado = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var ligacao = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    var poupa = !!(ligacao && (ligacao.saveData ||
                   /^(slow-)?2g$/.test(ligacao.effectiveType || '')));
    if (parado || poupa) return;

    var pronto;
    try {
      pronto = ligar(palco, img);
    } catch (e) {
      return;                       /* sem WebGL fica a fotografia, e está bem */
    }
    function desistir() {
      var tela = palco.querySelector('.artefacto__tela');
      if (tela) tela.remove();
      palco.classList.remove('artefacto__palco--vivo');
    }
    Promise.all([carregar(MAPA_COR), carregar(MAPA_REL)])
      .then(function (m) {
        try { pronto(m[0], m[1]); } catch (e) { desistir(); }
      })
      .catch(desistir);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrancar);
  } else {
    arrancar();
  }
})();
