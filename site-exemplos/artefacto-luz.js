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
   pixel quando entra nele. Oito bissecções no fim acertam o ponto.

   E entra mesmo: a altura do mapa deixou de ser só o que *sobe* acima do
   campo. Guarda hoje a peça inteira, o fundo das incisões incluído — a
   legenda grega, o KO do meio, a goteira do aro —, e o raio desce lá
   dentro. Até agora o sombreador achatava tudo o que estivesse abaixo do
   campo: as incisões existiam na luz e não no corpo, e ao de perto
   notava-se que eram riscos pintados.

   São três mapas — a cor da peça, o relevo e a aspereza — e a luz é
   calculada aqui, a cada fotograma. É por isso que ela segue o rato: numa
   imagem já iluminada, o brilho está onde ficou e não há nada a fazer-lhe.

   É o mesmo método do site que ele apontou (uma peça iluminada em WebGL a
   cada fotograma), com duas diferenças: lá são 17 MB de texturas e um
   modelo 3D; aqui são 1,4 MB e nenhuma biblioteca.

   E há uma divisão de trabalho, que é o que permite esses 1,4 MB: o mapa
   guarda o que tem tamanho para caber nele — as figuras, a greca, as
   letras, as incisões — e tudo o que é mais miúdo do que um pixel do mapa
   desenha-se aqui. O torno, o grão da fundição, os riscos. Um mapa guarda o
   miúdo uma vez e depois estica-o, e a partir de certa distância já não há
   miúdo nenhum, só papa; desenhado, ele nasce com o tamanho que a câmara
   pedir, e por isso é que a peça aguenta que a câmara lhe chegue ao pé.

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
     7. as marcas do torno correm à volta do disco, e não ao acaso — e
        afinam-se com a distância da câmara, em vez de serem sempre as
        mesmas.

   Sem WebGL, com "reduzir movimento" ligado ou com poupança de dados, nada
   disto acontece e fica a fotografia — que continua a ser a mesma peça,
   iluminada uma vez em vez de a toda a hora. */

(function () {
  'use strict';

  var MAPA_COR = 'fotos/artefacto-cor.webp';
  var MAPA_RUG = 'fotos/artefacto-rug.webp';
  /* O relevo tem dois tamanhos. No fim da viagem a câmara fica a pairar um
     décimo acima da superfície, e ali um texel do mapa de 2048 cobre dois
     pixéis do ecrã: tudo o que é bordo sai amolecido, por mais passos que a
     marcha dê. Com 4096 passa a haver mais mapa do que ecrã, e o limite
     deixa de ser ele.

     Num ecrã estreito fica o de sempre, e não é para poupar bytes: são 89
     MB de memória de vídeo contra 22, e no telemóvel a câmara nem chega
     perto — ali o que prende a peça é a largura. Os outros dois mapas ficam
     nos 2048 nos dois casos: a cor e a aspereza não têm bordos, e o que se
     ganhava neles não se via. */
  var GRANDE = false;
  function mapaDoRelevo() {
    return GRANDE ? 'fotos/artefacto-rel.webp' : 'fotos/artefacto-rel-2k.webp';
  }

  var VERTICE = [
    'attribute vec2 posicao;',
    'void main() { gl_Position = vec4(posicao, 0.0, 1.0); }'
  ].join('\n');

  var FRAGMENTO = [
    /* O mapa lido num nivel que nos escolhemos, e nao no que a placa
       adivinha. Dentro da marcha a placa nao tem como adivinhar: ela mede o
       detalhe pela diferenca entre pixeis vizinhos, e dois raios vizinhos a
       meio de uma marcha estao em sitios muito diferentes -- um ja bateu, o
       outro ainda vai a meio. O que ela media era essa diferenca, nao o
       tamanho do pixel, e nas vistas rasantes dava-lhe um nivel grosseiro:
       o relevo que o raio encontrava era uma papa, e as paredes saiam aos
       dentes. Com a extensao pedimos o nivel certo; sem ela fica como
       estava, que e o que ha em maquinas antigas. */
    '#extension GL_EXT_shader_texture_lod : enable',
    '#extension GL_OES_standard_derivatives : enable',
    '%PRECISAO%',
    '#ifdef GL_EXT_shader_texture_lod',
    '#define LER(m, uv, l) texture2DLodEXT(m, uv, l)',
    '#else',
    '#define LER(m, uv, l) texture2D(m, uv)',
    '#endif',

    'uniform vec2  resolucao;',
    'uniform sampler2D mapaCor;',
    'uniform sampler2D mapaRel;',
    'uniform sampler2D mapaRug;',
    'uniform float inclinacao, guinada, giro, distancia, abertura;',
    'uniform vec2  desvio, luzRumo, luzMira;',
    'uniform float luzRasar, luzPerto, graoForca;',
    'uniform float passosFundo, passosSombra, passosLonge;',

    /* A peca, em unidades do mapa. O raio sai do desenho: o disco ocupa
       74,4% do lado do mapa, qualquer que ele seja, e o mapa vai de -1 a 1. */
    'const float RAIO  = 0.7437;',
    'const float BISEL = 0.040;',
    'const float ESP   = 0.118;',
    '%MAPA%',

    /* O canal da altura, lido como o gerador o escreveu. Estes dois numeros
       sao impressos pelo `desenhos/artefacto.py` no fim de cada corrida, e tem
       de bater com os de la: mudar um e esquecer o outro nao da erro nenhum,
       da um relevo com a altura errada. */
    'const float H_CAMPO  = 0.3662;',
    'const float H_ESCALA = 0.03189;',
    'const float RELEVO = (1.0 - H_CAMPO) * H_ESCALA;   /* acima do campo */',
    'const float FUNDO  = H_CAMPO * H_ESCALA;           /* abaixo do campo */',

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

    /* O valor e a *inclinacao* do ruido, de uma vez. Antes a inclinacao fazia-se
       por diferencas -- tres ruidos e uma subtraccao -- e isso desenhava no
       campo um xadrez na diagonal, com o tamanho da celula do ruido. Era a
       coisa mais visivel da peca de perto, e nao era nada: era o reticulado do
       proprio ruido a aparecer na derivada. Vem agora pela conta certa. */
    'vec3 ruidoD(vec2 p) {',
    '  vec2 i = floor(p), f = fract(p);',
    '  vec2 u = f * f * (3.0 - 2.0 * f);',
    '  vec2 du = 6.0 * f * (1.0 - f);',
    '  float a = baralha(i);',
    '  float b = baralha(i + vec2(1.0, 0.0));',
    '  float c = baralha(i + vec2(0.0, 1.0));',
    '  float d = baralha(i + vec2(1.0, 1.0));',
    '  float k1 = b - a, k2 = c - a, k3 = a - b - c + d;',
    '  return vec3(a + k1 * u.x + k2 * u.y + k3 * u.x * u.y,',
    '              du.x * (k1 + k3 * u.y),',
    '              du.y * (k2 + k3 * u.x));',
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
      /* Subiu de 0,45% para 0,8% de ondulacao e de 2% para 3,2% de lasca:
         a meio por cento nao se via nada, e um disco de contorno exacto
         e a primeira coisa que denuncia uma peca desenhada. O contorno
         e o unico sitio onde a peca se ve em cheio contra o preto -- e
         e ai que ela tem de ser torta. */
    '  return RAIO * (1.0 - 0.0080 * m - 0.032 * lasca);',
    '}',

    'vec2 paraUV(vec2 q) { return vec2(q.x * 0.5 + 0.5, 0.5 - q.y * 0.5); }',

    /* O mapa lido com a fraccao suavizada. Entre quatro texels, a interpolacao
       normal e uma pirâmide: o valor e continuo mas a *inclinacao* salta na
       fronteira de cada texel, e de perto isso le-se como um losango em cada
       celula -- a peca ficava com uma rede por cima. Suavizar a fraccao antes
       de pedir o texel custa oito contas e deixa a superficie lisa de verdade.
       E uma so leitura: normal e altura vem no mesmo texel. */
    'vec3 relEm(vec2 uv, float lod) {',
    '  float tam = MAPA / exp2(lod);',
    '  vec2 p = uv * tam - 0.5;',
    '  vec2 i = floor(p), f = fract(p);',
    '  f = f * f * (3.0 - 2.0 * f);',
    '  return LER(mapaRel, (i + 0.5 + f) / tam, lod).rgb;',
    '}',

    /* ─── o torno ───
       A peca foi voltada depois de sair do molde. Os aneis da ferramenta sao a
       unica coisa que corre *a volta* do disco, e e por isso que se leem como
       fabrico e nao como sujidade. Sao rasos -- dois decimos de um pixel do
       mapa -- e o que se ve deles e a luz a correr ao longo, nao o sulco.
    
       Vivem aqui e nao no mapa, e foi medido: postos la, mexiam na normal de
       cada texel e o mapa sem perdas passava de 1,2 MB para 1,8 MB. Aqui sao
       tres contas, desenham-se a qualquer tamanho, e o raio entra-lhes mesmo --
       fazem parte do corpo e nao da pintura. */
    'const float TORNO_K = 897.0;',
    'const float TORNO_A = 0.000024;',
    /* A fase leva um desvio que anda com q: a peca nao ficou perfeitamente
       centrada no torno, e os aneis saem um pouco excentricos -- que e o
       que eles fazem a serio. Um seno so, e nao tres: isto e chamado a cada
       passo da marcha, e um seno a mais aqui sao duzentos por pixel. */
    'float torno(vec2 q, float r) {',
    '  return sin(r * TORNO_K + dot(q, vec2(7.3, 5.9)) * 0.30) * TORNO_A;',
    '}',
    'float tornoDeclive(vec2 q, float r) {',
    '  return cos(r * TORNO_K + dot(q, vec2(7.3, 5.9)) * 0.30) * TORNO_K * TORNO_A;',
    '}',

    /* Uma onda mais curta do que isto nao cabe num pixel do ecra: desenha-la na
       mesma nao acrescenta nada e poe a peca a formigar quando roda. */
    'float cabe(float onda, float porPixel) {',
    '  return clamp(onda / max(porPixel * 2.4, 1e-6) - 0.45, 0.0, 1.0);',
    '}',

    'float alturaEm(vec2 q, float lod) {',
    '  return (relEm(paraUV(q), lod).b - H_CAMPO) * H_ESCALA + torno(q, length(q));',
    '}',


    /* ─── o grao, os riscos e as picadas ───
       Tudo o que e mais miudo do que um texel do mapa mora aqui. E o que faz a
       diferenca de perto: um mapa guarda o grao uma vez e depois estica-o, e a
       partir de certa distancia ja nao ha grao nenhum, so papa. Desenhado,
       nasce com o tamanho que a camara pedir.
    
       Tres oitavas, cada uma com o seu reticulado rodado: o de uma tapa o da
       outra, e nenhum chega a ler-se como rede. */
    'vec2 onda(vec2 q, vec2 d, float k, float a, float f) {',
    '  return d * (cos(dot(q, d) * k + f) * a);',
    '}',
    /* A ondulacao de um bronze fundido, na escala em que ela se ve. Sao
       ondas somadas e nao ruido: o ruido vive num reticulado e a derivada
       dele apaga-se na fronteira de cada celula -- de perto isso desenhava
       uma rede na diagonal por cima da peca inteira, e era a coisa mais
       visivel que ela tinha. Seis ondas em direccoes que nao se repetem nao
       tem reticulado nenhum, e a inclinacao sai por conta. */
    'vec2 ondas(vec2 q, float porPixel) {',
    '  vec2 g = vec2(0.0);',
    '  float c1 = cabe(0.0480, porPixel);',
    '  if (c1 > 0.01) {',
    '    g += onda(q, vec2( 0.9135,  0.4068), 131.0, 0.017 * c1, 0.0);',
    '    g += onda(q, vec2(-0.2756,  0.9613), 167.0, 0.015 * c1, 1.7);',
    '    g += onda(q, vec2( 0.6691, -0.7431), 211.0, 0.013 * c1, 3.1);',
    '  }',
    '  float c2 = cabe(0.0145, porPixel);',
    '  if (c2 > 0.01) {',
    '    g += onda(q, vec2( 0.3090,  0.9511), 433.0, 0.017 * c2, 0.6);',
    '    g += onda(q, vec2(-0.8829,  0.4695), 541.0, 0.015 * c2, 2.4);',
    '    g += onda(q, vec2( 0.9816,  0.1908), 677.0, 0.012 * c2, 4.2);',
      /* Metade da forca desta fiada passou para aqui. Com os tres senos
         sozinhos, o campo lia-se como tecido: a esta luz via-se uma rede
         diagonal por cima do bronze, igual de um lado ao outro da peca,
         e nada no mundo e igual de um lado ao outro. O ruido nao tem
         direccao nenhuma -- e por isso nao tem trama. */
    '    vec3 nm = ruidoD(q * 126.0 + 63.5);',
    '    g += nm.yz * (0.042 * c2);',
    '  }',
      /* E uma terceira fiada, de comprimento de onda de meio milimetro na
         peca. Sem ela o campo, de perto, era sabao: tinha ondulacao e nao
         tinha pele. */
    '  float c3 = cabe(0.0052, porPixel);',
    '  if (c3 > 0.01) {',
    '    g += onda(q, vec2( 0.5878,  0.8090), 1213.0, 0.015 * c3, 2.0);',
    '    g += onda(q, vec2(-0.6947,  0.7193), 1511.0, 0.013 * c3, 5.1);',
    '    g += onda(q, vec2( 0.9945, -0.1045), 1759.0, 0.011 * c3, 0.9);',
      /* Tres ondas da mesma medida leem-se como um tecido: ha sempre uma
         direccao em que a trama bate certo. Metade da forca vem daqui, que
         nao tem direccao nenhuma. */
    '    vec3 nf = ruidoD(q * 302.0 + 17.1);',
    '    g += nf.yz * (0.030 * c3);',
    '  }',
      /* E uma quarta, de um decimo de milimetro, que so entra ao pe do
         fim da viagem. Ali o ecra inteiro cobre um palmo de bronze e a
         fiada anterior -- meio milimetro -- ja e uma onda larga: entre
         uma crista e a seguinte vao quinze pixeis de chapa lisa, e uma
         chapa lisa iluminada de lado le-se como cera. Isto nao sao
         ondas, e porosidade: bronze fundido tem bolhas, e sao elas que
         de perto dizem que aquilo saiu de um molde e nao de um ecra. */
    '  float c4 = cabe(0.0011, porPixel);',
    '  if (c4 > 0.01) {',
    '    vec3 n1 = ruidoD(q * 940.0 + 7.3);',
    '    vec3 n2 = ruidoD(q * 2130.0 + 29.7);',
    '    g += n1.yz * (0.046 * c4) + n2.yz * (0.028 * c4);',
    '  }',
    '  return g;',
    '}',
    /* O grao propriamente dito: mais miudo do que um texel do mapa, e por
       isso nao ha mapa que o guarde. Desenhado, nasce com o tamanho que a
       camara pedir. Nesta escala o reticulado do ruido ja e mais fino do
       que um pixel e nao se le. */
    'vec2 grao(vec2 q, float porPixel, float forca) {',
    '  vec2 g = ondas(q, porPixel);',
    '  float f3 = cabe(1.0 / 780.0, porPixel);',
    '  if (f3 > 0.01) {',
    '    vec2 r = vec2(q.x * 0.4536 + q.y * 0.8912, -q.x * 0.8912 + q.y * 0.4536);',
    '    vec3 n = ruidoD(r * 780.0 + 41.3);',
    '    g += vec2(n.y * 0.4536 - n.z * 0.8912, n.y * 0.8912 + n.z * 0.4536) * (0.055 * f3);',
    '  }',
    '  return g * forca;',
    '}',
    'vec2 riscos(vec2 q, float porPixel, float alto) {',
    '  float f = cabe(1.0 / 520.0, porPixel) * alto;',
    '  if (f < 0.01) return vec2(0.0);',
    '  vec2 e = vec2(0.9272, 0.3746);',
    '  vec2 s = vec2(dot(q, e), dot(q, vec2(-e.y, e.x)));',
    '  vec3 n = ruidoD(vec2(s.x * 22.0, s.y * 520.0));',
    '  float corta = smoothstep(0.62, 0.95, n.x);',
    '  vec2 d = vec2(n.y * 22.0, n.z * 520.0) * corta * 0.00024 * f;',
    '  return vec2(d.x * e.x - d.y * e.y, d.x * e.y + d.y * e.x);',
    '}',

    /* ─── o que a peca devolve a luz ─── */
    'vec3 ambienteEm(vec3 r) {',
    '  float h = clamp(r.y, -1.0, 1.0);',
    '  vec3 alto  = vec3(0.050, 0.066, 0.096);',
    '  vec3 linha = vec3(0.148, 0.140, 0.128);',
    '  vec3 chao  = vec3(0.014, 0.012, 0.011);',
    '  vec3 c = h > 0.0 ? mix(linha, alto, pow(h, 0.5)) : mix(linha, chao, pow(-h, 0.6));',
      /* A janela: uma mancha alta e apertada. E ela que poe um risco de luz a
         correr pelo metal quando a peca roda -- num ceu liso o metal nao tem
         nada para devolver, e e por isso que sem ela lia-se como gesso. */
    '  float j = max(dot(r, normalize(vec3(-0.52, 0.58, -0.30))), 0.0);',
    '  c += vec3(1.0, 0.94, 0.84) * pow(j, 17.0) * 0.98;',
      /* e uma segunda, fria e do outro lado, que da o contorno */
    '  float k = max(dot(r, normalize(vec3(0.74, 0.20, 0.44))), 0.0);',
    '  c += vec3(0.44, 0.58, 0.86) * pow(k, 6.0) * 0.16;',
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

      /* A luz nao vem de cima: vem de encostada, rasante ao plano da
         peca. A esta altura cada estria deita uma sombra do seu
         comprimento e cada aresta apanha um risco de luz. Um candeeiro
         ao alto ilumina a peca toda por igual, e uma peca iluminada por
         igual nao tem relevo nenhum.

         E nao e um foco. Nao esta pousada em sitio nenhum da peca: vem
         de uma *direccao*, de longe, e cai sobre a peca toda. Por isso
         nao ha mancha, nao ha contorno e nao ha um sitio onde a luz
         esteja -- o que se ve acender e so o que tem declive, esteja
         onde estiver: a parede de uma incisao, o bordo de uma figura, a
         aresta de uma fenda, a picada da fundicao.

         Houve duas versoes antes desta e as duas eram lanternas. A
         primeira dava a volta a peca a uma distancia fixa; a segunda
         pousava onde o rato apontava, com a poca a alargar e a perder o
         bordo. Qualquer poca da a mesma coisa, por larga e mansa que
         seja: um *sitio* iluminado, e la dentro a peca a ver-se como se
         veria em qualquer outro lado. O que foi pedido e o contrario --
         que a luz nao ande a escolher sitios e so apareca onde ha
         relevo.

         O que o rato manda e de *onde* ela vem (`luzRumo`) e quao
         rasante chega (`luzRasar`): e isso que decide em que parede de
         cada fenda e que ela aparece. Mexer o rato nao passeia mancha
         nenhuma -- apaga uma parede da fenda e acende a outra.

         Mora no `eixoU`/`eixoV`, que sao os eixos da peca *antes* do
         giro: presa ao `eixoT` a luz dava a volta agarrada ao disco e
         nada mudava enquanto ele roda. Assim ela fica onde esta e e a
         peca que lhe passa por baixo. */
    '  vec3 paraLuz = normalize(eixoU * luzRumo.x + eixoV * luzRumo.y'
                  + ' + cima * luzRasar);',

      /* E, alem dessa, a luz do rato. Nao e outra lanterna: e a mesma
         luz a ser *apanhada* onde ha o que apanhar. Do sitio do rato no
         ecra sai um raio como o de qualquer pixel, cruza-se com o plano
         da peca, e o ponto que der e por onde ela anda.

         O que a torna diferente de todas as pocas que ja aqui houve e
         nao ser o sitio a decidir se ha luz: e o pormenor. Onde a peca
         e lisa, esta luz nao existe -- nem debaixo do rato. Por isso
         nao ha mancha para se ver; o que se ve sao as arestas, os
         bordos, as incisoes, as fendas e as picadas a acenderem-se por
         onde ele passa, e a apagarem-se atras dele. */
    '  vec3 rc = normalize(vec3(luzMira * abertura, 1.0));',
    '  float dcc = dot(rc, cima);',
    '  float tcc = (abs(dcc) > 1e-4) ? dot(centro, cima) / dcc : 1.0;',
    '  float dAlvo = clamp(tcc, 0.05, 40.0);',
    '  vec3 alvo = rc * dAlvo - centro;',
    '  vec2 pl = vec2(dot(alvo, eixoU), dot(alvo, eixoV));',
    '  float plr = length(pl);',
    '  if (plr > RAIO * 1.35) pl *= RAIO * 1.35 / plr;',
    '  vec2 mira = vec2(pl.x * cg + pl.y * sg, -pl.x * sg + pl.y * cg);',

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
    '  float TOPO = RELEVO + TORNO_A + EMP_A + EMP_B;',
    '  float ts0 = -1e5, ts1 = 1e5;',
    '  if (abs(d.z) > 1e-6) {',
    '    float ta = (-ESP - o.z) / d.z, tb = (TOPO - o.z) / d.z;',
    '    ts0 = min(ta, tb); ts1 = max(ta, tb);',
    '  } else if (o.z < -ESP || o.z > TOPO) { discard; }',
    '  float t0 = max(max(tc0, ts0), 0.02);',
    '  float t1 = min(tc1, ts1);',
    '  if (t0 >= t1) discard;',

    /* Um texel do mapa mede 1/1024 da peca; o nivel certo e aquele em que
       um texel e um pixel do ecra. Mede-se a entrada da peca, que e onde a
       camara esta mais perto -- o resto do caminho afasta-se, e ali um
       nivel mais fino custa nitidez a ninguem. */
    /* O empeno e uma onda muito maior do que a peca: ao longo de uma
       marcha comporta-se como um plano inclinado, e vale a pena trata-lo
       assim. Sao quatro senos a cada passo, vezes sessenta e quatro passos,
       trocados por uma conta feita uma vez. O erro, ao fim de toda a
       travessia, e dois por cento da altura do relevo. */
    '  vec2 qe = (o + d * t0).xy;',
    '  float e0 = empeno(qe);',
    '  vec2 eG = empenoDeclive(qe);',
    '#define EMPENO(Q) (e0 + dot((Q) - qe, eG))',
    '#define TOPO(Q, L) (campo(length(Q)) + EMPENO(Q) + alturaEm((Q), (L)))',
    '  float tMeio = (t0 + min(t1, t0 + 0.6)) * 0.5;',
    '  float lodM = clamp(log2(max(tMeio * abertura * MAPA * 0.5 / resolucao.y, 1.0)), 0.0, 7.0);',
    '  int tipo = 0;',
    '  float tHit = -1.0;',
    '  bool bateu = false;',
    '  vec3 pe = o + d * t0;',
    '  if (pe.z <= TOPO(pe.xy, lodM) + 1e-5) {',
    '    bateu = true; tHit = t0;',
    '    tipo = (t0 <= tc0 + 1e-5) ? 1 : 2;',
    '  }',

      /* O relevo e uma paisagem, e o raio percorre-a. Enquanto vai acima do
         tecto da fatia salta -- nada lhe pode estar a frente -- e so dentro
         dela e que anda a passo miudo, ate bater na altura que o mapa der.
         Por isso um braco levantado tapa mesmo o que esta por tras dele, e as
         incisoes sao buracos onde o raio entra, e nao riscos pintados.
    
         O fundo das incisoes conta para a marcha tanto como o alto do relevo:
         ate ha pouco o sombreador achatava tudo o que estivesse abaixo do
         campo, e a legenda, o KO e a goteira so existiam na luz. */
    '  float tAnt = t0;',
    '  if (!bateu) {',
    '    float passoMin = max(0.00085 / max(passosFundo / 26.0, 0.45), 0.00055);',
    '    float fundoTodo = RELEVO + FUNDO;',
    '    float t = t0;',
    '    bool saiu = false;',
    '    for (int i = 0; i < 72; i++) {',
    '      if (t >= t1) { saiu = true; break; }',
    '      vec3 p = o + d * t;',
    '      float cz = campo(length(p.xy)) + EMPENO(p.xy);',
    '      if (p.z > cz + RELEVO + TORNO_A) {',
    '        tAnt = t;',
    '        t += max((p.z - cz - RELEVO - TORNO_A) / max(-d.z, 0.02) * 0.94, passoMin);',
    '        continue;',
    '      }',
    '      float zs = cz + alturaEm(p.xy, lodM);',
    '      if (p.z <= zs) { bateu = true; tHit = t; break; }',
          /* O passo mede-se pelo que falta descer ate ao chao que esta por
             baixo, e nao por uma fatia igual para todos: longe do relevo da
             passadas largas, em cima dele anda ao pixel. Um passo fixo chegava
             a vinte texels de cada vez numa vista rasante, e o relevo saia aos
             quadrados. */
    '      float folga = (p.z - zs) / fundoTodo;',
    '      tAnt = t;',
    '      t += clamp((p.z - zs) * 0.80 / max(-d.z, 0.025),',
    '                 passoMin, mix(passoMin * 1.5, 0.0120, clamp(folga, 0.0, 1.0)));',
    '    }',
      /* Ficar sem passos la dentro nao e nao ter batido. Numa vista quase
         de perfil o raio atravessa a peca quase paralelo a face: desce um
         pixel de altura por cada cem que anda de lado, e os passos acabam
         antes de ele chegar ao fim da fatia. Ate aqui isso era um
         `discard` -- o pixel ficava a ver o fundo da pagina --, e como
         uns pixeis acabavam os passos e os vizinhos nao, o bordo do
         relevo saia aos dentes, regulares como os de uma serra. Agora
         fica-se com o ponto onde se parou: a essa altura o passo ja e o
         minimo, e o erro e menos de um pixel. Sair da fatia pelo outro
         lado, esse sim, e nao ter batido. */
    '    if (!bateu && !saiu) { bateu = true; tHit = t; tAnt = max(tAnt, t - 0.0013); }',
      /* Oito bisseccoes entre o passo que passou e o anterior. Sem elas o
         passo fica onde calhou, e as bordas do relevo leem-se como degraus. */
    '    if (bateu) {',
    '      float lo = tAnt, hi = tHit;',
    '      for (int i = 0; i < 8; i++) {',
    '        float m = (lo + hi) * 0.5;',
    '        vec3 pm = o + d * m;',
    '        if (pm.z <= TOPO(pm.xy, lodM)) hi = m; else lo = m;',
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
      /* quanto da peca cabe num pixel do ecra, aqui. E isto que decide o que
         vale a pena desenhar: o que for mais fino nao se ve e formiga. */
    '  float porPixel = tHit * abertura * 2.0 / resolucao.y;',

    '  vec3 Nobj; vec3 albedo;',
    '  float aspereza = 0.6, metal = 0.4, cavidade = 0.5, oclusao = 1.0;',

    '  if (tipo == 0) {',
    '    vec3 rel = relEm(uv, lodM);',
    '    vec3 rug = texture2D(mapaRug, uv).rgb;',
    /* O mapa veio de uma peca muito mais baca do que a que se queria: a
       0,90 o campo nao devolve nada e le-se como barro cozido. Bronze
       enterrado nao e espelho, mas e metal -- devolve a janela toda. */
    '    aspereza = clamp(rug.r * 0.80 + 0.17, 0.20, 1.0);',
    '    metal = clamp(rug.g * 0.82, 0.04, 1.0);',
    '    cavidade = rug.b;',
    '    albedo = pow(texture2D(mapaCor, uv).rgb, vec3(2.2));',

        /* Onde a peca esta alta e onde esta funda, lido do proprio canal da
           altura. E o que faz o bronze ser bronze: o que se levanta rocou em
           tudo durante dois mil e setecentos anos e esta polido; o que esta no
           fundo nunca foi tocado e tem la o oxido. Um mapa de aspereza igual em
           toda a peca le-se como plastico pintado de castanho. */
    '    float acima = clamp((rel.b - H_CAMPO) / (1.0 - H_CAMPO), 0.0, 1.0);',
    '    float abaixo = clamp((H_CAMPO - rel.b) / H_CAMPO, 0.0, 1.0);',
    '    float manchas = ruido(q * 3.1 + 7.0) * 0.6 + ruido(q * 8.3 + 19.0) * 0.4;',
    '    float polido = smoothstep(0.22, 0.80, acima) * smoothstep(0.26, 0.74, manchas);',
    '    float funda = smoothstep(0.04, 0.42, abaixo);',
    '    albedo = mix(albedo, vec3(0.262, 0.208, 0.134), polido * 0.46);',
    '    albedo = mix(albedo, vec3(0.056, 0.070, 0.058), funda * 0.46);',
    '    aspereza = clamp(aspereza - polido * 0.15 + funda * 0.20, 0.20, 1.0);',
    '    metal = clamp(metal + polido * 0.22 - funda * 0.22, 0.04, 1.0);',
    '    oclusao = mix(1.0, 0.22, funda) * mix(0.55, 1.0, cavidade);',

        /* a normal do mapa vive nos eixos da textura: o v da textura desce e o y
           do objecto sobe, e por isso o y troca de sinal */
    '    vec2 nxy = vec2(rel.r * 2.0 - 1.0, -(rel.g * 2.0 - 1.0));',
    /* Tudo o que e miudo desenha-se em funcao de x e y, e numa parede quase
       a pique uma coluna inteira de pixeis cai no mesmo x e y: o grao
       esticava-se em riscas verticais e os bordos do relevo pareciam cartao
       rasgado. Nas paredes o miudo desliga-se -- elas sao poucas no ecra, e
       o que se ve nelas e o recorte, nao a superficie. */
    '    float plano = clamp(1.0 - length(nxy) * 1.7, 0.0, 1.0);',
    /* Mas nao a zero. Isto chega ao fundo aos trinta graus de declive,
       e dai para cima o miudo desligava-se por inteiro: a parede de uma
       figura ficava uma chapa lisa -- e e precisamente nela que a luz
       rasante bate. Era ai a cera de que ele se queixava: a peca tinha
       pele no campo, onde a luz mal lhe toca, e nao tinha nenhuma no
       flanco iluminado. Com um terco, o esticao vertical de que a nota
       acima fala fica a um terco tambem, e esse nunca se viu. */
    '    plano = mix(0.28, 1.0, plano);',
    '    nxy -= empenoDeclive(q);',
    '    nxy += dir * tornoDeclive(q, r) * cabe(0.0070, porPixel) * plano'
                  + ' * (1.0 - 0.75 * acima);',
    '    nxy += grao(q, porPixel, (0.6 + graoForca * 2.2) * plano);',
    '    nxy += riscos(q, porPixel, (0.25 + 0.75 * acima) * plano);',

        /* O desgaste de uma peca velha nao e uniforme: ha zonas comidas e zonas
           que se salvaram. Sem ele o bronze e todo igual, e um bronze todo igual
           le-se como material de computador. */
    '    float comido = ruido(q * 2.7 + 4.0) * 0.6 + ruido(q * 6.1 + 17.0) * 0.4;',
    '    comido = smoothstep(0.26, 0.86, comido);',
    '    albedo = mix(albedo, albedo * vec3(0.76, 0.68, 0.56), comido * 0.58);',
    '    albedo = mix(albedo, vec3(0.106, 0.098, 0.084), comido * 0.22);',
    '    aspereza = clamp(aspereza + comido * 0.24, 0.20, 1.0);',
    '    metal = metal * (1.0 - comido * 0.30);',
    /* A sujidade nao se espalha por igual. Ha zonas da peca que ficaram ao
       abrigo e ha zonas que apanharam tudo, e e isto -- mais do que o
       brilho -- que distingue uma peca desenterrada de uma peca desenhada:
       uma peca desenhada e igual em todo o lado, e nada no mundo e igual em
       todo o lado. Tres escalas de mancha, e o oxido carrega no que ja esta
       fundo, que e por onde ele pega. */
    '    float mancha = ruido(q * 1.7 + 2.0) * 0.52 + ruido(q * 4.3 + 9.0) * 0.31',
    '                 + ruido(q * 10.5 + 5.0) * 0.17;',
    '    float oxido = smoothstep(0.36, 0.80, mancha) * (0.48 + 0.52 * funda);',
      /* Era 0,034 / 0,052 / 0,042 -- quase preto. Isso escurecia o bronze
         em vez de o sujar: o que se via continuava a ser o mesmo ambar,
         so que mais escuro nuns sitios. A patina do bronze tem cor, e e
         ela que faz a peca deixar de ser de uma cor so. */
    '    albedo = mix(albedo, vec3(0.072, 0.098, 0.078), oxido * 0.74);',
    '    aspereza = clamp(aspereza + oxido * 0.30, 0.20, 1.0);',
    '    metal = metal * (1.0 - oxido * 0.55);',
    /* e, do outro lado, o que foi limpo pelo uso volta a ser ouro */
    '    float limpo = smoothstep(0.46, 0.16, mancha) * polido;',
    '    albedo = mix(albedo, vec3(0.302, 0.230, 0.124), limpo * 0.30);',
    '    aspereza = clamp(aspereza - limpo * 0.10, 0.20, 1.0);',
    /* E, no fim de tudo, uma volta atras no ouro. Uma cor cheia le-se
       como metal novo: um bronze desenterrado perdeu-lhe a saturacao e
       nunca mais a tem. Nao e cinzento -- e o mesmo bronze com menos
       verniz. */
    '    albedo = mix(albedo, vec3(dot(albedo, vec3(0.333))), 0.21) * 0.93;',
    /* As manchas de cima sao grandes -- tres, seis, dez voltas por peca.
       No fim da viagem o ecra inteiro cobre um palmo de bronze, e la
       dentro nenhuma delas chega a mudar: a peca fica de uma cor so, e
       uma cor so le-se como superficie pintada. Estas duas vivem a
       setenta e a duzentas voltas, e so entram quando a camara chega
       perto o bastante para as ver -- de longe seriam formigueiro. */
    '    float fino = ruido(q * 74.0 + 13.0) * 0.62 + ruido(q * 197.0 + 51.0) * 0.38;',
    '    float vemFino = cabe(0.0135, porPixel);',
    '    albedo *= 1.0 + (fino - 0.5) * 0.50 * vemFino;',
    '    aspereza = clamp(aspereza + (fino - 0.5) * 0.28 * vemFino, 0.20, 1.0);',
    '    metal = clamp(metal * (1.0 - (fino - 0.5) * 0.30 * vemFino), 0.04, 1.0);',

        /* O aro rolado. O mapa, esticado ali por cima do bisel, sai em papa e
           entra-lhe o halo que ficou do desenho -- por isso a cor passa a ser a
           do aro e nao a da textura. E e escuro: um bordo rolado e por onde a
           peca mais pega, e onde mais se gastou. */
    '    float bw = smoothstep(RAIO - BISEL, RAIO - BISEL * 0.12, r);',
    '    float nz0 = sqrt(max(1.0 - dot(nxy, nxy), 0.004));',
    '    if (bw > 0.001) {',
    '      float x = clamp(r - (RAIO - BISEL), 0.0, BISEL * 0.999);',
    '      float sa = x / BISEL;',
    '      vec3 nb = vec3(dir * sa, sqrt(max(1.0 - sa * sa, 0.004)));',
    '      nb.xy += grao(q, porPixel, 0.8) * 1.6;',
    '      Nobj = normalize(mix(vec3(nxy, nz0), nb, bw));',
    '      albedo = mix(albedo, vec3(0.118, 0.094, 0.062) * (0.75 + 0.5 * ruido(dir * 6.0)), bw * 0.85);',
    '      oclusao = mix(oclusao, 0.66, bw);',
    '      metal = mix(metal, 0.60, bw);',
    '      aspereza = mix(aspereza, 0.62, bw);',
    '    } else {',
    '      Nobj = normalize(vec3(nxy, nz0));',
    '    }',
    '  } else if (tipo == 1) {',
        /* O aro. E ele que faz a peca ter lado: sem isto, de perfil nao havia
           nada para ver. Nao leva mapa -- a parede de uma fundicao sao estrias a
           descer, desgaste a volta e patina no fundo, e isso faz-se por conta. */
    '    float h01 = clamp((P.z + ESP) / (ESP - BISEL), 0.0, 1.0);',
    '    vec3 tang = vec3(-dir.y, dir.x, 0.0);',
    '    vec3 vert = vec3(0.0, 0.0, 1.0);',
    '    float volta = atan(dir.y, dir.x);',
    '    vec3 g1 = ruidoD(vec2(volta * 26.0, P.z * 54.0));',
    '    vec3 g2 = ruidoD(vec2(volta * 96.0, P.z * 12.0));',
    '    float estria = g2.x - 0.5;',
    '    Nobj = normalize(vec3(dir, 0.0)',
    '                   + tang * (g1.y * 0.055 + g2.y * 0.085)',
    '                   + vert * (g1.z * 0.030 + g2.z * 0.012));',
    '    float patina = smoothstep(0.55, 0.0, h01) * (0.5 + 0.5 * ruido(dir * 9.0));',
    '    albedo = mix(vec3(0.160, 0.126, 0.082), vec3(0.068, 0.088, 0.074), patina * 0.7);',
    '    albedo *= 0.70 + 0.55 * ruido(dir * 5.0 + 31.0);',
    '    aspereza = clamp(0.70 - 0.24 * h01 + estria * 0.3, 0.16, 0.98);',
    '    metal = 0.52 * (1.0 - patina * 0.6) + 0.22 * h01;',
    '    cavidade = 0.6;',
    '    oclusao = mix(0.46, 1.08, h01);',
    '  } else {',
        /* O verso. Quase nunca se ve, e por isso nao leva trabalho nenhum: e o
           bronze bruto do molde, baco e escuro. Deixa-lo a faltar e que nao
           dava -- ficava um buraco por onde se via o outro lado. */
    '    vec3 g = ruidoD(q * 26.0);',
    '    Nobj = normalize(vec3(g.yz * 0.05, -1.0));',
    '    albedo = vec3(0.062, 0.050, 0.036) * (0.7 + 0.6 * ruido(q * 7.0));',
    '    aspereza = 0.88; metal = 0.30; cavidade = 0.5; oclusao = 0.42;',
    '  }',

    '  vec3 N = normalize(eixoT * Nobj.x + eixoB * Nobj.y + cima * Nobj.z);',
    /* Um brilho que nasce numa aresta de um pixel nao cabe nesse pixel: ele
       acende e apaga conforme a peca roda, e um campo cheio deles ferve. O
       remedio e alargar a aspereza onde a forma muda depressa -- onde a
       normal nao e a mesma no pixel do lado, o brilho passa a ser largo em
       vez de ser um ponto. */
    '#ifdef GL_OES_standard_derivatives',
    '  vec3 dNx = dFdx(N), dNy = dFdy(N);',
    '  aspereza = clamp(sqrt(aspereza * aspereza + max(dot(dNx, dNx), dot(dNy, dNy)) * 0.80), 0.17, 1.0);',
    '#endif',
    '  vec3 ponto = raio * tHit;',
      /* E aqui esta o pedido: a luz **so** aparece na parede de uma
         incisao, no bordo de uma figura, na aresta de uma fenda, na
         picada da fundicao. Quem a apanha e o declive; o campo liso
         fica no escuro, e fica no escuro *em toda a peca* -- nao ha
         sitio nenhum onde ele acenda.

         O chao desta conta era 0,26 e e ele que fazia a luz continuar
         a ler-se como um foco: um quarto da chave chegava ao campo
         liso, e um campo liso levemente aceso **e** a mancha da
         lanterna -- tem forma, tem bordo, e o relevo la dentro passa
         a ser o que se ve por estar iluminado em vez de ser o que
         ilumina. A zero, a unica coisa com luz na peca e o relevo, e o
         desenho desenha-se a si proprio. */
    '  float declive = clamp(1.0 - abs(Nobj.z), 0.0, 1.0);',
    '  float fendas = smoothstep(0.010, 0.145, declive);',

      /* O que e um *pormenor*, em numeros. Nao e o declive -- uma parede
         inteira tem declive do alto a baixo e nao e uma aresta. E a
         curvatura: quatro alturas a volta do ponto contra a altura do
         ponto. Da zero num campo liso e zero numa rampa, por mais
         inclinada que seja, e salta no sitio exacto onde a superficie
         *dobra* -- que e o bordo de uma figura, o canto de uma incisao,
         o labio de uma picada, as duas margens de uma fenda. Em valor
         absoluto, para apanhar tanto o que sobe como o que desce.

         O passo nunca e menor do que tres texels do mapa nem do que um
         pixel do ecra: mais curto do que isso, a conta mede o ruido da
         interpolacao em vez de medir a peca, e a peca formigava.

         So se pergunta onde a luz do rato chega: sao quatro leituras do
         mapa, e noventa por cento do ecra nao precisa delas. */
      /* O alcance mede-se no *ecra* e nao no mundo: e uma fraccao da
         altura do que se ve a profundidade do alvo. Preso ao mundo, de
         perto a luz do rato cobria tudo o que estava a vista -- a camara
         chega-se, o pedaco de peca no ecra encolhe, e um raio fixo passa
         a ser maior do que ele. Assim o rato manda sempre do mesmo
         tamanho, veja-se a peca de longe ou de perto. */
    '  float alcance = max(luzPerto * dAlvo * abertura * 2.0, 1e-4);',
    '  float perto = 1.0 / (1.0 + pow(length(q - mira) / alcance, 3.2));',
    '  float pormenor = 0.0;',
    '  if (tipo == 0 && perto > 0.030) {',
      /* Le-se o *mapa* e nao o `alturaEm`. O `alturaEm` traz o torno
         junto, que e um seno de novecentos ciclos, e a curvatura de um
         seno desses nao da arestas nenhumas: da um tracejado fino
         espalhado pela peca inteira. Foi visto a desenhar so este termo
         no ecra -- a peca saia as riscas e nao se via uma figura.

         E le-se a *inclinacao* e nao a altura, que e o que faz isto
         caber no orcamento. A curvatura pela altura obriga a quatro
         leituras a volta mais a do meio; a inclinacao ja vem gravada no
         mapa, nos dois primeiros canais, e a do proprio ponto ja foi
         lida la em cima para a normal. Sobram duas -- uma para cada
         lado -- e o quanto a inclinacao muda de um texel para o outro
         e exactamente a mesma coisa. Com cinco leituras, a travessia
         mais proxima caia de sessenta para trinta imagens por segundo;
         com duas nao se mexe.

         O `g` do mapa esta ao contrario do y do objecto, e o v da
         textura tambem -- as duas voltas anulam-se, e por isso as duas
         diferencas somam-se como estao. */
    '    float eps = max(4.0 / MAPA, porPixel * 0.9);',
    '    vec2 r0 = relEm(uv, lodM).rg;',
    '    float dx = relEm(paraUV(q + vec2(eps, 0.0)), lodM).r - r0.r;',
    '    float dy = relEm(paraUV(q + vec2(0.0, eps)), lodM).g - r0.g;',
    '    pormenor = smoothstep(0.020, 0.150, length(vec2(dx, dy))) * perto;',
    '  }',

      /* A sombra que o relevo faz sobre si proprio. Sem ela, uma figura
         levantada meio milimetro acima do campo nao escurece nada a sua
         frente, e a luz rasante deixa de querer dizer seja o que for. */
    '  float sombra = 1.0;',
    '  if (tipo == 0 && passosSombra >= 2.0) {',
    '    vec3 L = vec3(dot(paraLuz, eixoT), dot(paraLuz, eixoB), dot(paraLuz, cima));',
    '    if (L.z > 0.02) {',
    '      float sMax = (RELEVO + FUNDO) / max(L.z, 0.05);',
    '      float tapado = 0.0;',
    /* O primeiro passo e sorteado pixel a pixel. Com todos os raios a
       provar nos mesmos sitios, a parede sombreada saia as barras -- doze
       amostras a cinco texels de intervalo, e o bordo do relevo a ser
       apanhado ora por uma ora pela seguinte. Sorteado, o erro deixa de ter
       feitio e le-se como grao. */
    '      float jit = baralha(gl_FragCoord.xy * 1.37);',
      /* Duas marchas, e nao uma. Com a luz encostada, a sombra que uma
         figura levantada deita a sua frente e dez vezes mais comprida do
         que a altura dela: uma marcha so, esticada ate la, da passadas de
         quinze texels e perde pelo caminho tudo o que e fino -- que e
         precisamente o que esta luz existe para mostrar.

         A primeira anda ao pe do ponto, a passo de texel: e a que apanha
         a estria, o risco e a picada, e e ela que faz o veio aparecer. A
         segunda vai ate ao fim, a passadas largas, e e a que apanha o
         braco levantado a tapar o campo. */
    '      float sP = min(0.0085, sMax);',
    '      for (int i = 0; i < 18; i++) {',
    '        if (float(i) >= passosSombra) break;',
    '        float s = sP * (float(i) + jit) / passosSombra;',
    '        vec3 ps = P + L * s;',
    '        tapado = max(tapado, (TOPO(ps.xy, lodM) - ps.z) / RELEVO);',
    '      }',
    '      float longe = 0.0;',
    '      for (int i = 0; i < 12; i++) {',
    '        if (float(i) >= passosLonge) break;',
    '        float s = mix(sP, sMax, (float(i) + jit) / passosLonge);',
    '        vec3 ps = P + L * s;',
    '        longe += clamp((TOPO(ps.xy, lodM) - ps.z) / RELEVO, 0.0, 1.0);',
    '      }',
    '      tapado = max(tapado, longe / max(passosLonge, 1.0) * 1.5);',
    '      sombra = 1.0 - clamp(tapado * 3.0, 0.0, 0.88);',
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
      /* O Fresnel rasante e o que fazia a aresta acesa sair um tubo de
         creme. A conta de manual leva qualquer material a espelhar como
         um vidro quando a luz chega quase de lado -- e esta luz chega
         *sempre* quase de lado. Um bronze comido nao espelha assim: a
         rugosidade nao deixa, e por isso o tecto do Fresnel desce com a
         aspereza em vez de ir a um. E o que devolve a cor ao bordo que
         a luz levanta -- era branco, e o branco nao tem liga nenhuma
         com a peca. */
    '  vec3 F = F0 + (max(vec3(1.0 - aspereza), F0) - F0) * pow(1.0 - vdh, 5.0);',
      /* A chave era ambar -- 1,00 / 0,82 / 0,56 -- e isso punha verniz
         dourado na peca toda, aqui e nas pedras do fundo. A luz de quem
         examina uma peca e branca; o ouro ha de vir do bronze, e nao da
         lampada. */
    '  vec3 CHAVE = vec3(1.0, 0.893, 0.772);',
    '  float luzQ = sombra * fendas;',
      /* A luz do rato leva a sombra do relevo, como a outra -- um
         pormenor que esta atras de um braco levantado nao acende --,
         mas apanha a luz dos dois lados (`ndlW`, meia volta em vez de
         um quarto): uma aresta tem duas faces e, com o lambert seco,
         so uma delas acendia. O que o rato acende e o *pormenor*, e um
         pormenor sao as duas margens. */
    '  float faisca = sombra * pormenor;',
    '  float ndlW = max(dot(N, paraLuz) * 0.55 + 0.45, 0.0);',

    '  vec3 difusa = albedo * (1.0 - metal * 0.72)'
                  + ' * (ndl * luzQ * 1.34 + ndlW * faisca * 4.60);',
    '  vec3 especular = min(D * G * 0.25 / max(ndl * ndv, 0.009), 3.0)'
                  + ' * F * ndl * (luzQ * 0.70 + faisca * 1.80);',

    '  vec3 amb = ambienteEm(reflect(-olho, N));',
    '  vec3 Fv = F0 + (1.0 - F0) * pow(1.0 - ndv, 5.0) * (1.0 - aspereza);',
    '  vec3 cor = difusa * CHAVE + especular * CHAVE;',
    '  cor += amb * Fv * mix(1.0, 0.18, aspereza) * oclusao * 0.17;',
    '  cor += ambienteEm(N) * albedo * (1.0 - metal * 0.6) * 0.028 * oclusao;',

      /* o enchimento frio vem de cima e do lado contrario a chave, para
         a parede que fica as escuras nao ficar um buraco preto */
    '  vec3 paraFria = normalize(cima * 0.88 - paraLuz * 0.52);',
    '  cor += albedo * vec3(0.42, 0.56, 0.78) * max(dot(N, paraFria), 0.0) * 0.012;',

      /* o que esta mais longe do que o centro da peca perde-se no escuro:
         e o que faz a vista rasante ter fundo em vez de acabar num corte.
         Numa vista quase de perfil, o campo que fica alem do centro e uma
         faixa palida e sem textura nenhuma -- esta tao de lado que um
         pixel cobre meio centimetro de peca, e nessa escala ja nao ha
         grao que se desenhe. Mais vale escuro.

         Volta a medir-se a partir do *centro* da peca, e nao do sitio
         para onde o rato aponta: deixou de haver sitio nenhum para onde
         o rato aponte. E aliviou de 1,15 para 0,80, que era o travao da
         poca -- sem poca, 1,15 comia metade do relevo que agora acende. */
    '  cor *= exp(-max(tHit - distancia, 0.0) * 0.80);',

      /* uma curva de cinema em vez de um corte: o brilho passa muito acima do
         branco, e corta-lo a direito dava chapas brancas sem forma la dentro */
    '  cor = clamp((cor * (2.51 * cor + 0.03)) / (cor * (2.43 * cor + 0.59) + 0.14), 0.0, 1.0);',
    '  cor = pow(cor, vec3(1.0 / 2.2));',
      /* meio nivel de ruido: num escuro destes oito bits partem-se em aneis */
    '  cor += (baralha(gl_FragCoord.xy) - 0.5) * (1.4 / 255.0);',
    '  gl_FragColor = vec4(cor, 1.0);',
    '}',
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
      FRAGMENTO.replace('%PRECISAO%', 'precision ' + precisao + ' float;')
               .replace('%MAPA%', 'const float MAPA = ' + (GRANDE ? '4096.0' : '2048.0') + ';')));
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
     'giro', 'distancia', 'abertura', 'desvio', 'luzRumo', 'luzRasar',
     'luzMira', 'luzPerto', 'graoForca', 'passosFundo', 'passosSombra',
     'passosLonge']
      .forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    var largura = 0, altura = 0;
    /* Um tecto de pixeis: esta conta num ecrã 4K põe uma placa gráfica fraca
       a arrastar-se, e ninguém repara na diferença.

       Esteve em 2,6 milhões, para o ecrã dele — 1366 a 1,5 de densidade —
       ser desenhado na densidade dele em vez de 9% mais pequeno. Voltou:
       esses 9% custavam 20% do orçamento de cada fotograma, e agora que o
       mapa tem 4096 não é a contagem de pixéis que limita o que se vê. */
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
    /* [passos da marcha, passos da sombra perto, passos da sombra longe] */
    var NIVEIS = [[26, 10, 5], [20, 8, 4], [14, 6, 3], [9, 0, 0]];
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

         A peça enche o ecrã do princípio ao fim, e isso foi medido no
         site dele: em catorze passos da roda não há um fotograma em que o
         objecto não toque os quatro bordos. O nosso tinha o disco inteiro
         ao meio de um campo preto — ocupava seis décimos da altura e
         nenhuma fenda se via. A câmara chegou-se.

         A viagem tem três tempos. Começa com a peça inteira mas a
         transbordar, cortada em cima e em baixo: vê-se o que ela é, e vê-se
         grande. Depois a câmara desce até pairar por cima da superfície, a
         um décimo dela, e o relevo que de frente era um desenho levanta-se
         — as figuras tapam o que está atrás delas e fazem sombra à sua
         frente. No fim anda rente ao campo, onde se vêem as picadas da
         fundição, as fendas e os anéis do torno. A viagem não desanda:
         acaba noutro sítio, que é o que faz valer a pena percorrê-la. */
      var deitado = estreito.matches;
      var e1 = suaviza(p, 0.00, 0.36);
      var e2 = suaviza(p, 0.30, 0.70);
      var e3 = suaviza(p, 0.66, 1.00);
      /* Num ecrã ao alto a peça já transborda pelos lados — o que a prende
         ali é a largura, e por isso a câmara fica exactamente onde estava,
         estes números incluídos.

         No ecrã largo, a inclinação do fim desceu de 72 graus para 58. Com
         a luz encostada, um olhar quase de perfil mostra silhuetas: vê-se o
         que tapa o quê e não se vê superfície nenhuma. O relevo lê-se a
         cinquenta e tal, que é o ângulo em que a sombra de cada estria cai
         à vista de quem olha. E a câmara chegou-se mais: 0,82 ao princípio
         e 0,36 ao fim, contra 0,88 e 0,44. */
      var incl = (deitado ? 0.90 : 0.72)
               + e1 * (deitado ? 0.24 : 0.17)
               + e2 * (deitado ? 0.15 : 0.12)
               + e3 * (deitado ? 0.04 : 0.02)
               + Math.sin(t * 0.058) * 0.034
               + Math.sin(t * 0.0241 + 2.1) * 0.020
               - ratoY * 0.095;
      var guin = Math.sin(t * 0.039 + 1.3) * 0.130
               + Math.sin(t * 0.0146) * 0.060
               + (p - 0.5) * 0.30
               + ratoX * 0.170;
      var dist = (deitado ? 1.80 : 0.59)
               - e1 * (deitado ? 0.24 : 0.11)
               - e2 * (deitado ? 0.00 : 0.12)
               - e3 * (deitado ? -0.26 : 0.14)
               + Math.sin(t * 0.0289 + 2.4) * 0.022;

      /* O desvio anda com a distância, e não em unidades do mundo: o que ele
         vale no ecrã é `desvio/distancia`, e preso ao mundo a peça fugia do
         enquadramento quando a câmara se aproximava. */
      var desvioX = (-0.075 + Math.sin(t * 0.0214 + 0.7) * 0.048) * dist;
      var desvioY = ((deitado ? -0.205 : -0.030) + Math.sin(t * 0.0174) * 0.034
                     + e2 * (deitado ? 0.075 : 0.040)
                     + e3 * (deitado ? 0.005 : 0.210)) * dist;

      gl.uniform2f(U.resolucao, largura, altura);
      gl.uniform1f(U.inclinacao, incl);
      gl.uniform1f(U.guinada, guin);
      /* a roda roda-o mesmo: mais de uma volta ao longo do curso, por cima
         da volta lenta que ele dá sozinho */
      gl.uniform1f(U.giro, -t * 0.0235 - p * 3.30);
      gl.uniform1f(U.distancia, dist);
      /* O plano aumentou tres vezes, e sempre pelos dois lados ao mesmo
         tempo: a camara chegou-se (0,88 -> 0,82 -> 0,69 -> 0,59) e a
         objectiva fechou (0,52 -> 0,46 -> 0,42). Do principio ate aqui, a
         peca ocupa mais do dobro do ecra. O artefacto e o assunto da
         pagina; comecou por ocupar menos do que o texto ao lado dele.

         No telemovel a peca esta deitada e vista de longe, e por isso
         anda em numeros maiores -- 2,10 passou a 1,80. */
      gl.uniform1f(U.abertura, deitado ? 0.52 : 0.42);
      gl.uniform2f(U.desvio, desvioX, desvioY);
      /* O rato diz de **onde** a luz vem, e não onde ela cai. Não há onde
         ela cai: cai na peça toda, e só o relevo a apanha. Mexer o rato
         não passeia mancha nenhuma pela página — apaga uma parede de cada
         fenda e acende a outra, e o desenho da peça muda de feição sem
         que nada se acenda em volta dele.

         Ao pé do meio do ecrã o rumo não quer dizer nada — dois pixéis de
         um lado ou do outro mandavam a luz para o lado oposto —, e por
         isso ali manda a volta que ela dá sozinha; o rato só vai entrando
         à medida que se afasta do meio. */
      var rr = Math.hypot(ratoX, ratoY);
      var manda = temRato ? Math.min(rr / 0.26, 1) : 0;
      var vagar = t * 0.074 + Math.sin(t * 0.031) * 0.55;
      var rx = Math.cos(vagar) * (1 - manda) + (rr > 1e-4 ? ratoX / rr : 1) * manda;
      var ry = Math.sin(vagar) * (1 - manda) - (rr > 1e-4 ? ratoY / rr : 0) * manda;
      var rn = Math.hypot(rx, ry) || 1;
      gl.uniform2f(U.luzRumo, rx / rn, ry / rn);
      /* E quanto mais para fora vai o rato, mais rasante ela fica: ao meio
         está a dezassete graus, na borda a dez. Rasante, a mesma fenda
         deita uma sombra quase do dobro do comprimento — é a diferença
         entre ver a peça e ver o que ela tem escrito.

         Não desce mais do que isto. Chegou a ir aos nove graus e a
         essa altura a luz quase não entra em nada: com a chave presa
         ao declive, uma luz rasante de mais deixa de acender sequer as
         paredes, e o canto de cima do ecrã apagava a peça toda. */
      var rasar = temRato ? Math.min(rr, 1) : 0.42;
      gl.uniform1f(U.luzRasar,
                   (0.31 - 0.13 * rasar) * (1 + Math.sin(t * 0.0259) * 0.09));

      /* E depois há a luz do rato, que é outra coisa. A de cima vem de uma
         direcção e cai na peça toda; esta anda com o cursor e **só existe
         onde há pormenor** — a aresta, o bordo, a incisão, a fenda, a
         picada. No campo liso não existe, nem debaixo do rato, e por isso
         não há mancha nenhuma para se ver: o que se vê são os pormenores a
         acenderem-se por onde ele passa e a apagarem-se atrás dele.

         Sem rato, passeia sozinha — devagar e desencontrada, para quem
         chega à página ver os pormenores a acender e perceber que aquilo
         responde. É também o que acontece no telemóvel, onde não há rato. */
      var passeio = t * 0.058;
      var soloX = Math.cos(passeio) * 0.40 + Math.sin(t * 0.0231 + 1.2) * 0.18;
      var soloY = Math.sin(passeio * 0.82 + 0.6) * 0.26 + Math.sin(t * 0.0193) * 0.10
               - (deitado ? 0.34 : 0);
      gl.uniform2f(U.luzMira,
                   (temRato ? ratoX : soloX) * (largura / altura),
                   temRato ? -ratoY : soloY);
      /* O alcance anda com a distância a que o rato aponta, e não é um
         número do mundo: apontar para o alto do ecrã — que é a parte da
         peça que está longe — dava um alcance que a perspectiva encolhia a
         nada. */
      gl.uniform1f(U.luzPerto, deitado ? 0.40 : 0.55);
      gl.uniform1f(U.graoForca, deitado ? 0.08 : 0.12);
      gl.uniform1f(U.passosFundo, NIVEIS[nivel][0]);
      gl.uniform1f(U.passosSombra, NIVEIS[nivel][1]);
      gl.uniform1f(U.passosLonge, NIVEIS[nivel][2]);

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
      gl.activeTexture(gl.TEXTURE1); textura(gl, rel, false);
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

    GRANDE = window.matchMedia('(min-width: 761px)').matches;
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
    Promise.all([carregar(MAPA_COR), carregar(mapaDoRelevo()), carregar(MAPA_RUG)])
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
