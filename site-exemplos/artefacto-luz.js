/* O artefacto.
   ────────────────────────────────────────────────────────────────────────
   O disco não é uma fotografia nem um plano com um desenho por cima. É um
   corpo: tem uma face com relevo, um bordo rolado, um aro a toda a volta e
   um verso. Cada pixel do ecrã é um raio que entra nesse corpo e procura
   onde bate mesmo — e é por isso que a peça pode ser vista de lado, com a
   espessura à vista, que é o que lhe faltava.

   Antes, o disco era um plano inclinado com o relevo fingido por paralaxe.
   De frente enganava; de perfil não havia nada para ver, porque um plano
   visto de lado é uma linha. Agora a marcha é no espaço: salta enquanto o
   raio vai acima do relevo todo — nada lhe pode estar à frente — e anda ao
   pixel quando entra nele. Seis bissecções no fim acertam o ponto.

   São três mapas — a cor da peça, o relevo e a aspereza — e a luz é
   calculada aqui, a cada fotograma. É por isso que ela segue o rato: numa
   imagem já iluminada, o brilho está onde ficou e não há nada a fazer-lhe.

   É o mesmo método do site que ele apontou (uma peça iluminada em WebGL a
   cada fotograma), com duas diferenças: lá são 17 MB de texturas e um
   modelo 3D; aqui são 1,6 MB e nenhuma biblioteca.

   O que faz a peça parecer metal, e não um desenho de metal, são sete
   coisas que nenhuma imagem cozida tem:

     1. o relevo é geometria, e não pintura: tapa o que está atrás dele e
        recorta-se contra o escuro quando a peça se deita;
     2. o relevo faz sombra sobre si próprio;
     3. a peça está empenada — uma fundição não sai plana, e uma peça plana
        lê-se como desenho;
     4. a aspereza muda de sítio para sítio: o metal gasto é polido, a
        patina do fundo é baça. Brilho igual em todo o lado lê-se como
        plástico;
     5. o desgaste é às manchas, e não igual em toda a peça;
     6. há um ambiente à volta que o metal reflecte, e não só uma lâmpada;
     7. as marcas do torno correm à volta do disco, e não ao acaso.

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
    'uniform float luzZ, luzAlcance, graoForca, passosFundo, passosSombra;',

    /* A peca, em unidades do mapa. O raio sai do desenho: o disco ocupa
       761,6 pixeis dos 1024 de meio mapa, e o mapa vai de -1 a 1. */
    'const float RAIO   = 0.7437;',
    /* Quanto o relevo sobe acima do campo. Nao e um gosto: a 0,030 o raio
       varria 300 pixeis de mapa de lado, e as figuras saiam serradas. */
    'const float RELEVO = 0.0220;',
    'const float BISEL  = 0.040;',
    'const float ESP    = 0.118;',

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

    /* ─── o feitio da peca ───
       Uma peca fundida nao e um plano. Esta esta empenada de leve, e e isso
       que lhe tira o ar de desenho: a luz escorrega por cima do empeno, e de
       lado a propria silhueta ondula. Sao duas ondas cruzadas, e nao ruido,
       porque assim a inclinacao sai por conta e nao por diferencas. */
    'const float EMP_A = 0.0072, EMP_B = 0.0086;',
    'float empeno(vec2 q) {',
    '  return EMP_A * sin(q.x * 2.90 + 0.7) * sin(q.y * 2.30 - 1.4)',
    '       + EMP_B * sin(q.x * 1.27 - 2.0) * sin(q.y * 1.73 + 0.5);',
    '}',
    'vec2 empenoDeclive(vec2 q) {',
    '  float a1 = q.x * 2.90 + 0.7, b1 = q.y * 2.30 - 1.4;',
    '  float a2 = q.x * 1.27 - 2.0, b2 = q.y * 1.73 + 0.5;',
    '  return vec2(',
    '    EMP_A * 2.90 * cos(a1) * sin(b1) + EMP_B * 1.27 * cos(a2) * sin(b2),',
    '    EMP_A * 2.30 * sin(a1) * cos(b1) + EMP_B * 1.73 * sin(a2) * cos(b2));',
    '}',

    /* O campo e plano ate perto do fim e depois rola para o aro. */
    'float campo(float r) {',
    '  float r0 = RAIO - BISEL;',
    '  if (r <= r0) return 0.0;',
    '  float x = min(r - r0, BISEL);',
    '  return -(BISEL - sqrt(max(BISEL * BISEL - x * x, 1e-7)));',
    '}',

    /* O aro nao e um circulo perfeito: tem mordidas. Um circulo certinho e o
       primeiro sinal de que aquilo nasceu num computador. */
    'float raioEm(vec2 dir) {',
    '  float m = ruido(dir * 5.3 + 21.0) + ruido(dir * 13.1 + 3.0) * 0.5;',
    '  float lasca = pow(ruido(dir * 7.9 + 41.0), 7.0);',
    '  return RAIO * (1.0 - 0.0045 * m - 0.020 * lasca);',
    '}',

    'vec2 paraUV(vec2 q) { return vec2(q.x * 0.5 + 0.5, 0.5 - q.y * 0.5); }',
    /* A altura vem num canal de oito bits, e sao setenta e sete degraus para
       todo o relevo. De frente nao se nota; de raspao, cada degrau espalha-se
       por dezenas de pixeis e a peca vira um terreno de socalcos -- foi o que
       se viu ao subir o relevo. O GRAO desmancha-os, e de caminho faz o que
       um bronze fundido tem mesmo: superficie. */
    'const float GRAO = 0.00060;',
    'float alturaEm(vec2 q) {',
    '  float b = texture2D(mapaRel, paraUV(q)).b;',
    '  float h = (1.0 - clamp((0.602 - b) / 0.300, 0.0, 1.0)) * RELEVO;',
    '  return h + (ruido(q * 185.0) - 0.5) * GRAO;',
    '}',
    'float topoEm(vec2 q) {',
    '  return campo(length(q)) + empeno(q) + alturaEm(q);',
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

    'void main() {',
    '  vec2 ndc = (gl_FragCoord.xy / resolucao) * 2.0 - 1.0;',
    '  ndc.x *= resolucao.x / resolucao.y;',
    '  vec3 raio = normalize(vec3(ndc * abertura, 1.0));',

    '  mat3 M = rodaY(guinada) * rodaX(inclinacao);',
    '  vec3 eixoU = M * vec3(1.0, 0.0, 0.0);',
    '  vec3 eixoV = M * vec3(0.0, 1.0, 0.0);',
    '  vec3 cima  = M * vec3(0.0, 0.0, -1.0);',
    '  vec3 centro = vec3(desvio, distancia);',
    '  float cg = cos(giro), sg = sin(giro);',
    '  vec3 eixoT = eixoU * cg - eixoV * sg;',
    '  vec3 eixoB = eixoU * sg + eixoV * cg;',

    /* O raio, visto de dentro da peca. A base e ortonormal, por isso a volta
       e so a transposta -- e tHit continua a ser a distancia verdadeira. */
    '  vec3 o = vec3(-dot(centro, eixoT), -dot(centro, eixoB), -dot(centro, cima));',
    '  vec3 d = vec3( dot(raio, eixoT),   dot(raio, eixoB),   dot(raio, cima));',

    /* a caixa: o cilindro do aro, e a fatia entre o verso e o cimo do relevo */
    '  float a = max(dot(d.xy, d.xy), 1e-7);',
    '  float b = dot(o.xy, d.xy);',
    '  float oo = dot(o.xy, o.xy);',
    '  float tc0 = 0.0, tc1 = 0.0, Rin = RAIO, Rout = RAIO;',
    '  for (int i = 0; i < 2; i++) {',
    '    float D = b * b - a * (oo - Rin * Rin);',
    '    if (D <= 0.0) discard;',
    '    tc0 = (-b - sqrt(D)) / a;',
    '    Rin = raioEm(normalize((o + d * tc0).xy));',
    '  }',
    '  for (int i = 0; i < 2; i++) {',
    '    float D = b * b - a * (oo - Rout * Rout);',
    '    if (D <= 0.0) discard;',
    '    tc1 = (-b + sqrt(D)) / a;',
    '    Rout = raioEm(normalize((o + d * tc1).xy));',
    '  }',
    '  float TOPO = RELEVO + GRAO + EMP_A + EMP_B;',
    '  float ts0 = -1e5, ts1 = 1e5;',
    '  if (abs(d.z) > 1e-6) {',
    '    float ta = (-ESP - o.z) / d.z, tb = (TOPO - o.z) / d.z;',
    '    ts0 = min(ta, tb); ts1 = max(ta, tb);',
    '  } else if (o.z < -ESP || o.z > TOPO) { discard; }',
    '  float t0 = max(max(tc0, ts0), 0.02);',
    '  float t1 = min(tc1, ts1);',
    '  if (t0 >= t1) discard;',

    '  int tipo = 0;',
    '  float tHit = -1.0;',
    '  bool bateu = false;',
    '  vec3 pe = o + d * t0;',
    '  if (pe.z <= topoEm(pe.xy) + 1e-5) {',
    '    bateu = true; tHit = t0;',
    '    tipo = (t0 <= tc0 + 1e-5) ? 1 : 2;',
    '  }',

    /* O relevo e uma paisagem, e o raio sobrevoa-a. Enquanto vai acima do
       tecto da fatia salta -- nada lhe pode estar a frente -- e so dentro
       dela e que anda a passo miudo. E o que torna a vista rasante possivel:
       um braco levantado tapa mesmo o que esta por tras dele, e recorta-se
       contra o escuro em vez de se achatar. */
    '  float tAnt = t0;',
    '  if (!bateu) {',
    /* O passo mede-se pelo que falta descer ate ao chao que esta por baixo,
       e nao por uma fatia igual para todos: longe do relevo da passadas
       largas, em cima dele anda ao pixel. Um passo fixo chegava a vinte
       texels de cada vez numa vista rasante, e o relevo saia aos quadrados.
       O tecto da fatia, esse, salta-se a serio -- acima dele nao lhe pode
       estar nada a frente. */
    '    float passoMin = max(0.0011 / max(passosFundo / 22.0, 0.45), 0.0007);',
    '    float t = t0;',
    '    for (int i = 0; i < 56; i++) {',
    '      if (t >= t1) break;',
    '      vec3 p = o + d * t;',
    '      float cz = campo(length(p.xy)) + empeno(p.xy);',
    '      if (p.z > cz + RELEVO + GRAO) {',
    '        tAnt = t;',
    '        t += max((p.z - cz - RELEVO - GRAO) / max(-d.z, 0.02) * 0.94, passoMin);',
    '        continue;',
    '      }',
    '      float zs = cz + alturaEm(p.xy);',
    '      if (p.z <= zs) { bateu = true; tHit = t; break; }',
    '      float folga = (p.z - zs) / RELEVO;',
    '      tAnt = t;',
    '      t += clamp((p.z - zs) * 0.80 / max(-d.z, 0.025),',
    '                 passoMin, mix(passoMin * 1.8, 0.013, clamp(folga, 0.0, 1.0)));',
    '    }',
    /* Seis bisseccoes entre o passo que passou e o anterior. Sem elas o passo
       fica onde calhou, e as bordas do relevo leem-se como degraus. */
    '    if (bateu) {',
    '      float lo = tAnt, hi = tHit;',
    '      for (int i = 0; i < 6; i++) {',
    '        float m = (lo + hi) * 0.5;',
    '        vec3 pm = o + d * m;',
    '        if (pm.z <= topoEm(pm.xy)) hi = m; else lo = m;',
    '      }',
    '      tHit = hi;',
    '    }',
    '  }',
    '  if (!bateu) discard;',

    '  vec3 P = o + d * tHit;',
    '  vec2 q = P.xy;',
    '  float r = length(q);',
    '  vec2 dir = (r > 1e-5) ? q / r : vec2(1.0, 0.0);',
    '  vec2 uv = paraUV(q);',
    '  vec3 olho = -raio;',
    '  float longe = clamp(1.1 / tHit, 0.0, 1.0);',

    '  vec3 Nobj; vec3 albedo;',
    '  float aspereza = 0.6, metal = 0.4, cavidade = 0.5, oclusao = 1.0;',

    '  if (tipo == 0) {',
    '    vec4 rel = texture2D(mapaRel, uv);',
    '    if (rel.a < 0.30) discard;',
    '    vec3 rug = texture2D(mapaRug, uv).rgb;',
    '    aspereza = clamp(rug.r, 0.06, 1.0);',
    '    metal = rug.g;',
    '    cavidade = rug.b;',
    '    albedo = pow(texture2D(mapaCor, uv).rgb, vec3(2.2));',
    '    oclusao = clamp(rel.b * 1.9, 0.0, 1.0) * mix(0.55, 1.0, cavidade);',
    /* a normal do mapa vive nos eixos da textura: o v da textura desce e o y
       do objecto sobe, e por isso o y troca de sinal */
    '    vec2 nxy = vec2(rel.r * 2.0 - 1.0, -(rel.g * 2.0 - 1.0));',
    '    nxy -= empenoDeclive(q);',
    '    float pp = longe * longe;',
    /* as marcas do torno correm a volta do disco: ao acaso leem-se como
       sujidade, em circulo leem-se como fabrico */
    '    float e1 = 0.0012;',
    '    float volta = atan(q.y, q.x);',
    '    float m0 = ruido(vec2(r * 1850.0, volta * 9.0));',
    '    float m1 = ruido(vec2((r + e1) * 1850.0, volta * 9.0));',
    '    nxy += dir * ((m1 - m0) / e1) * 0.000085 * pp;',
    '    float g = graoForca * pp;',
    '    if (g > 0.003) {',
    '      vec2 w = q * 620.0;',
    '      nxy += (declive(w, 0.35) * 0.55 + declive(w * 2.7 + 11.3, 0.35) * 0.25) * g;',
    '      aspereza = clamp(aspereza + (ruido(w * 0.17) - 0.5) * 0.14 * pp, 0.06, 1.0);',
    '    }',
    /* O desgaste de uma peca velha nao e uniforme: ha zonas comidas e zonas
       que se salvaram. Sem ele o bronze e todo igual, e um bronze todo igual
       le-se como material de computador. */
    '    float comido = ruido(q * 2.7 + 4.0) * 0.6 + ruido(q * 6.1 + 17.0) * 0.4;',
    '    comido = smoothstep(0.38, 0.92, comido);',
    '    albedo = mix(albedo, albedo * vec3(0.80, 0.71, 0.58), comido * 0.50);',
    '    aspereza = clamp(aspereza + comido * 0.20, 0.06, 1.0);',
    '    metal = metal * (1.0 - comido * 0.35);',
    /* O aro rolado. O mapa, esticado ali por cima do bisel, sai em papa e
       entra-lhe o halo que ficou do desenho -- por isso a cor passa a ser a
       do aro e nao a da textura. E e escuro: um bordo rolado e por onde a
       peca mais pega, e onde mais se gastou. */
    '    float bw = smoothstep(RAIO - BISEL, RAIO - BISEL * 0.12, r);',
    '    if (bw > 0.001) {',
    '      float x = clamp(r - (RAIO - BISEL), 0.0, BISEL * 0.999);',
    '      float sa = x / BISEL;',
    '      vec3 nb = vec3(dir * sa, sqrt(max(1.0 - sa * sa, 0.004)));',
    '      float nz0 = sqrt(max(1.0 - dot(nxy, nxy), 0.004));',
    '      Nobj = normalize(mix(vec3(nxy, nz0), nb, bw));',
    '      albedo = mix(albedo, vec3(0.106, 0.085, 0.057) * (0.75 + 0.5 * ruido(dir * 6.0)), bw * 0.85);',
    '      oclusao = mix(oclusao, 0.62, bw);',
    '      metal = mix(metal, 0.54, bw);',
    '      aspereza = mix(aspereza, 0.70, bw);',
    '    } else {',
    '      Nobj = normalize(vec3(nxy, sqrt(max(1.0 - dot(nxy, nxy), 0.004))));',
    '    }',
    '  } else if (tipo == 1) {',
    /* O aro. E ele que faz a peca ter lado: sem isto, de perfil nao havia
       nada para ver. Nao leva mapa -- a parede de uma fundicao sao estrias a
       descer, desgaste a volta e patina no fundo, e isso faz-se por conta. */
    '    float h01 = clamp((P.z + ESP) / (ESP - BISEL), 0.0, 1.0);',
    '    vec2 gw = declive(vec2(atan(dir.y, dir.x) * 26.0, P.z * 54.0), 0.4);',
    '    vec3 tang = vec3(-dir.y, dir.x, 0.0);',
    '    vec3 vert = vec3(0.0, 0.0, 1.0);',
    '    float estria = ruido(dir * 90.0) - 0.5;',
    '    Nobj = normalize(vec3(dir, 0.0)',
    '                   + tang * (gw.x * 0.055 + estria * 0.10)',
    '                   + vert * (gw.y * 0.030));',
    '    float patina = smoothstep(0.55, 0.0, h01) * (0.5 + 0.5 * ruido(dir * 9.0));',
    '    albedo = mix(vec3(0.152, 0.120, 0.078), vec3(0.068, 0.088, 0.074), patina * 0.7);',
    '    albedo *= 0.70 + 0.55 * ruido(dir * 5.0 + 31.0);',
    '    aspereza = clamp(0.74 - 0.22 * h01 + estria * 0.3, 0.18, 0.98);',
    '    metal = 0.46 * (1.0 - patina * 0.6) + 0.22 * h01;',
    '    cavidade = 0.6;',
    '    oclusao = mix(0.46, 1.08, h01);',
    '  } else {',
    /* O verso. Quase nunca se ve, e por isso nao leva trabalho nenhum: e o
       bronze bruto do molde, baco e escuro. Deixa-lo a faltar e que nao
       dava -- ficava um buraco por onde se via o outro lado. */
    '    Nobj = normalize(vec3(declive(q * 26.0, 0.4) * 0.05, -1.0));',
    '    albedo = vec3(0.062, 0.050, 0.036) * (0.7 + 0.6 * ruido(q * 7.0));',
    '    aspereza = 0.88; metal = 0.30; cavidade = 0.5; oclusao = 0.42;',
    '  }',

    '  vec3 N = normalize(eixoT * Nobj.x + eixoB * Nobj.y + cima * Nobj.z);',
    '  vec3 ponto = raio * tHit;',

    '  vec3 paraLuz = vec3(luzXY, luzZ) - ponto;',
    '  float dLuz = length(paraLuz);',
    '  paraLuz /= dLuz;',
    '  float queda = 1.0 / (1.0 + pow(dLuz / luzAlcance, 2.3));',

    /* A sombra que o relevo faz sobre si proprio. Sem ela, uma figura
       levantada meio milimetro acima do campo nao escurece nada a sua
       frente, e a luz rasante deixa de querer dizer seja o que for. */
    '  float sombra = 1.0;',
    '  if (tipo == 0 && passosSombra >= 2.0) {',
    '    vec3 L = vec3(dot(paraLuz, eixoT), dot(paraLuz, eixoB), dot(paraLuz, cima));',
    '    if (L.z > 0.05) {',
    '      float sMax = RELEVO / max(L.z, 0.09);',
    '      float tapado = 0.0;',
    '      for (int i = 0; i < 14; i++) {',
    '        if (float(i) >= passosSombra) break;',
    '        float s = sMax * (float(i) + 0.7) / passosSombra;',
    '        vec3 ps = P + L * s;',
    '        tapado = max(tapado, (topoEm(ps.xy) - ps.z) / RELEVO * (1.0 - float(i) / passosSombra));',
    '      }',
    '      sombra = 1.0 - clamp(tapado * 4.2, 0.0, 0.92);',
    '    }',
    '  }',

    '  float ndl = max(dot(N, paraLuz), 0.0);',
    '  float ndv = max(dot(N, olho), 0.0);',
    '  vec3 meio = normalize(paraLuz + olho);',
    '  float ndh = max(dot(N, meio), 0.0);',
    '  float vdh = max(dot(olho, meio), 0.0);',

    '  float al = aspereza * aspereza;',
    '  float a2 = al * al;',
    '  float dd = ndh * ndh * (a2 - 1.0) + 1.0;',
    '  float D = a2 / (3.14159265 * dd * dd + 1e-6);',
    '  float k = al * 0.5;',
    '  float G = (ndl / (ndl * (1.0 - k) + k)) * (ndv / (ndv * (1.0 - k) + k));',

    '  vec3 BRONZE = vec3(0.735, 0.545, 0.330);',
    '  vec3 F0 = mix(vec3(0.045), BRONZE, metal);',
    '  vec3 F = F0 + (1.0 - F0) * pow(1.0 - vdh, 5.0);',
    '  vec3 CHAVE = vec3(1.0, 0.820, 0.560);',
    '  float luzQ = queda * sombra;',

    '  vec3 difusa = albedo * (1.0 - metal * 0.72) * ndl * luzQ * 2.90;',
    '  vec3 especular = (D * G * 0.25 / max(ndl * ndv, 1e-4)) * F * ndl * luzQ * 1.5;',

    '  vec3 amb = ambienteEm(reflect(-olho, N));',
    '  vec3 Fv = F0 + (1.0 - F0) * pow(1.0 - ndv, 5.0) * (1.0 - aspereza);',
    '  vec3 cor = difusa * CHAVE + especular * CHAVE;',
    '  cor += amb * Fv * mix(1.0, 0.18, aspereza) * oclusao;',
    '  cor += ambienteEm(N) * albedo * (1.0 - metal * 0.6) * 0.42 * oclusao;',

    '  vec3 paraFria = normalize(vec3(-luzXY * 0.75, luzZ * 0.9) - ponto);',
    '  cor += albedo * vec3(0.42, 0.56, 0.78) * max(dot(N, paraFria), 0.0) * 0.055;',

    /* o que esta mais longe do que o centro da peca perde-se no escuro: e o
       que faz a vista rasante ter fundo em vez de acabar num corte */
    '  cor *= exp(-max(tHit - distancia, 0.0) * 0.72);',

    /* uma curva de cinema em vez de um corte: o brilho passa muito acima do
       branco, e corta-lo a direito dava chapas brancas sem forma la dentro */
    '  cor = clamp((cor * (2.51 * cor + 0.03)) / (cor * (2.43 * cor + 0.59) + 0.14), 0.0, 1.0);',
    '  cor = pow(cor, vec3(1.0 / 2.2));',
    /* meio nivel de ruido: num escuro destes oito bits partem-se em aneis */
    '  cor += (baralha(gl_FragCoord.xy) - 0.5) * (1.4 / 255.0);',
    '  gl_FragColor = vec4(cor, 1.0);',
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
  /* um troco da viagem, entre a e b, que entra e sai devagar */
  function suaviza(x, a, b) {
    var k = prender((x - a) / (b - a), 0, 1);
    return k * k * (3 - 2 * k);
  }
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
     'giro', 'distancia', 'abertura', 'desvio', 'luzXY', 'luzZ', 'luzAlcance', 'graoForca',
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
    var NIVEIS = [[26, 12], [18, 8], [12, 5], [8, 0]];
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
         rato a mexer. O rato é um empurrão, não o motor.

         A viagem tem três tempos. Começa longe, com a peça inteira — é
         preciso vê-la uma vez para saber o que é. Depois a câmara desce e
         aproxima-se, e o relevo, que de frente era um desenho, levanta-se:
         as figuras tapam o que está atrás delas e fazem sombra à sua
         frente. No fim a peça deita-se quase de perfil, e vê-se o que ela
         nunca teve — a espessura, o aro a toda a volta e o relevo a
         recortar-se contra o escuro. A viagem não desanda: acaba noutro
         sítio, que é o que faz valer a pena percorrê-la. */
      var deitado = estreito.matches;
      var e1 = suaviza(p, 0.00, 0.36);
      var e2 = suaviza(p, 0.30, 0.70);
      var e3 = suaviza(p, 0.66, 1.00);
      var incl = (deitado ? 0.90 : 1.00)
               + e1 * (deitado ? 0.24 : 0.24)
               + e2 * (deitado ? 0.15 : 0.12)
               + e3 * (deitado ? 0.04 : 0.04)
               + Math.sin(t * 0.058) * 0.042
               + Math.sin(t * 0.0241 + 2.1) * 0.024
               - ratoY * 0.120;
      var guin = Math.sin(t * 0.039 + 1.3) * 0.130
               + Math.sin(t * 0.0146) * 0.060
               + (p - 0.5) * 0.30
               + ratoX * 0.170;
      /* Num ecrã ao alto a câmara recua, não se aproxima: a largura visível
         encolhe com o feitio do ecrã, e de perto o disco deixava de se ler
         como disco — era só bronze. */
      var dist = (deitado ? 2.45 : 1.32)
               - e1 * (deitado ? 0.55 : 0.56)
               + e2 * (deitado ? 0.15 : 0.12)
               + e3 * (deitado ? 0.45 : 0.38)
               + Math.sin(t * 0.0289 + 2.4) * 0.050;

      /* O desvio anda com a distância, e não em unidades do mundo: o que ele
         vale no ecrã é `desvio/distancia`, e preso ao mundo a peça fugia do
         enquadramento quando a câmara se aproximava. */
      var desvioX = (-0.075 + Math.sin(t * 0.0214 + 0.7) * 0.055) * dist;
      var desvioY = ((deitado ? -0.205 : -0.085) + Math.sin(t * 0.0174) * 0.042
                     + e2 * 0.075 + e3 * 0.005) * dist;

      gl.uniform2f(U.resolucao, largura, altura);
      gl.uniform1f(U.inclinacao, incl);
      gl.uniform1f(U.guinada, guin);
      /* a roda roda-o mesmo: mais de uma volta ao longo do curso, por cima
         da volta lenta que ele dá sozinho */
      gl.uniform1f(U.giro, -t * 0.0235 - p * 2.15);
      gl.uniform1f(U.distancia, dist);
      gl.uniform1f(U.abertura, deitado ? 0.62 : 0.52);
      gl.uniform2f(U.desvio, desvioX, desvioY);
      /* A luz anda à volta do centro do disco e não de um ponto fixo do
         espaço — o disco também se mexe, e com ela presa ao mundo havia
         voltas inteiras em que a poça caía ao lado dos lutadores.
         E anda também com a câmara, e não presa ao mundo: ao aproximar-se,
         uma luz a 1,0 do centro ficava *para lá* da peça e deixava-a toda em
         contraluz — que foi o que aconteceu à primeira. Por isso a posição e
         o alcance dela vão ambos em unidades de `dist`. */
      gl.uniform2f(U.luzXY,
        (desvioX / dist + Math.sin(t * 0.0514 + 0.4) * 0.46 + (temRato ? ratoX * 0.92 : 0)) * dist,
        (desvioY / dist - 0.13 + Math.sin(t * 0.0421 + 1.9) * 0.34 - (temRato ? ratoY * 0.74 : 0)) * dist);
      gl.uniform1f(U.luzZ, dist * (0.74 + Math.sin(t * 0.0259) * 0.10));
      gl.uniform1f(U.luzAlcance, dist * 0.95 + 0.22);
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
