# -*- coding: utf-8 -*-
"""
O artefacto: um disco de bronze com dois pugilistas, desenhado de raiz.

NAO produz uma fotografia iluminada. Produz os *mapas* da peca -- a cor, a
oclusao, o relevo -- e a luz e calculada no navegador, a cada fotograma,
por `artefacto-luz.js`. E por isso que ela segue o rato.

Uma imagem com a luz pintada por dentro nao reage a nada: o brilho esta
onde ficou. Separar as duas coisas e o que distingue uma ilustracao de uma
peca que esta mesmo ali.

Sai daqui:
  artefacto-cor.webp    RGB  = cor da peca x oclusao   (como o ColorAO)
  artefacto-rel.webp    RGB  = normal.x, normal.y, altura
  artefacto-rug.webp    RGB  = aspereza, metal, cavidade (como o RoughHeight)
  artefacto-1500.webp   a peca ja iluminada, para quem nao tem WebGL
  artefacto-820.webp    o mesmo, para ecras pequenos

Correr:  python artefacto.py          (acrescentar --png guarda o original)
Os seeds estao fixos: correr outra vez da exactamente os mesmos ficheiros.
"""
import math, os, random, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

random.seed(7); np.random.seed(7)

N = 4096                      # lado da tela de construcao
LADO = 4096                   # lado dos mapas que vao para o site.
LADO_PEQUENO = 2048           # o mesmo mapa, para os ecras estreitos.
# Tudo o que aqui esta escrito em pixeis nasceu numa tela de 2560 e um
# disco de 952. Mudar a tela sem mudar esses numeros nao da uma peca mais
# nitida: da outra peca -- com os borroes mais apertados, as picadas mais
# pequenas e os riscos mais finos *em relacao a ela propria*. Por isso o
# que se escreve aqui sao medidas da peca, e a escala converte-as.
ESC = N / 2560.0
MESC = LADO / 2048.0          # a mesma coisa, do lado do mapa
# Potencia de dois de proposito: o WebGL 1 so faz mipmaps em texturas assim,
# e sem mipmaps o lado longe do disco -- que a perspectiva comprime tres
# vezes -- cintila a cada volta.
R = 952.0 * ESC               # raio do disco
C = N / 2.0

AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.path.normpath(os.path.join(AQUI, '..', 'fotos'))

# --------------------------- utilitarios -------------------------------

def _caixa(a, r, eixo):
    """Media movel de raio r, com as bordas estendidas."""
    if r < 1:
        return a
    a = np.moveaxis(a, eixo, 0)
    pad = np.concatenate([np.repeat(a[:1], r + 1, 0), a, np.repeat(a[-1:], r, 0)], 0)
    s = np.cumsum(pad, axis=0, dtype=np.float64)
    out = (s[2 * r + 1:] - s[:-(2 * r + 1)]) / (2 * r + 1)
    return np.moveaxis(out.astype(np.float32), 0, eixo)

def borrar(a, raio):
    """Tres medias moveis aproximam uma gaussiana -- e o PIL nao borra
       imagens de virgula flutuante, que e o que aqui se usa."""
    a = np.asarray(a, dtype=np.float32)
    r = max(1, int(round(raio * 0.90)))
    for _ in range(3):
        a = _caixa(_caixa(a, r, 0), r, 1)
    return a

def borrar_ciclico(a, raio):
    """Borrao que da a volta -- o grao tem de encaixar consigo proprio."""
    n = a.shape[0]
    f = np.fft.fftfreq(n)
    k = np.sqrt(f[:, None] ** 2 + f[None, :] ** 2)
    g = np.exp(-2.0 * (math.pi * raio * k) ** 2)
    return np.real(np.fft.ifft2(np.fft.fft2(a) * g)).astype(np.float32)

def normalizar(a):
    return (a - a.mean()) / (a.std() + 1e-6)

def mascara(desenho_fn, escala=2, lado=None):
    """Desenha a preto-e-branco com PIL, em dobro, e devolve 0..1 suavizado."""
    lado = lado or N
    im = Image.new('L', (lado * escala, lado * escala), 0)
    desenho_fn(ImageDraw.Draw(im), escala)
    if escala != 1:
        im = im.resize((lado, lado), Image.LANCZOS)
    return np.asarray(im, dtype=np.float32) / 255.0

def encolher(a, lado):
    """De 2560 para 2048, que e uma razao de 5 para 4.

    Nao se faz por media de area. A media de area com uma razao destas
    apanha ora um pixel ora dois, e repete-se de quatro em quatro: os bordos
    saem com um xadrez de um pixel que nao se ve no mapa mas aparece todo na
    *derivada* dele -- e a derivada e o mapa de normais. Era o que punha as
    paredes do relevo aos dentes nas vistas rasantes, e levou muito tempo a
    encontrar porque no mapa, a vista, nao esta la nada.

    Com um filtro a serio cada pixel de saida pesa os de entrada como deve, e
    o xadrez nao nasce. Cuidado com o `clip`: ele existe para o `borrar`, que
    trabalha em alturas de 0 a 1; um raio em pixeis nao passa por aqui."""
    if lado == a.shape[0]:
        return np.asarray(a, dtype=np.float32)
    im = Image.fromarray(np.clip(a, -8, 8).astype(np.float32), mode='F')
    return np.asarray(im.resize((lado, lado), Image.LANCZOS), dtype=np.float32)

# --------------------------- a figura ----------------------------------
# Um corpo nasce de um esqueleto: pontos e ossos. Cada osso e um tronco que
# afina de uma ponta a outra. E assim que se desenha uma figura de vaso
# grego -- membros finos, musculo exagerado, tudo de perfil.

def osso(d, a, b, wa, wb, esc):
    ax, ay = a; bx, by = b
    dx, dy = bx - ax, by - ay
    L = math.hypot(dx, dy) or 1.0
    px, py = -dy / L, dx / L
    pts = [(ax + px * wa, ay + py * wa), (bx + px * wb, by + py * wb),
           (bx - px * wb, by - py * wb), (ax - px * wa, ay - py * wa)]
    d.polygon([(x * esc, y * esc) for x, y in pts], fill=255)
    d.ellipse([(ax - wa) * esc, (ay - wa) * esc, (ax + wa) * esc, (ay + wa) * esc], fill=255)
    d.ellipse([(bx - wb) * esc, (by - wb) * esc, (bx + wb) * esc, (by + wb) * esc], fill=255)

def disco(d, p, r, esc):
    d.ellipse([(p[0] - r) * esc, (p[1] - r) * esc, (p[0] + r) * esc, (p[1] + r) * esc], fill=255)

def oval(d, p, rx, ry, ang, esc):
    """Uma elipse inclinada -- um musculo nunca esta direito."""
    pts = []
    for i in range(36):
        t = i / 36.0 * 2 * math.pi
        x, y = rx * math.cos(t), ry * math.sin(t)
        pts.append(((p[0] + x * math.cos(ang) - y * math.sin(ang)) * esc,
                    (p[1] + x * math.sin(ang) + y * math.cos(ang)) * esc))
    d.polygon(pts, fill=255)

def figura(d, esc, ox, oy, h, virado, pose):
    """pose: juntas em coordenadas locais (x para a frente, y para cima,
       fraccao da altura). virado = +1 olha para a direita, -1 esquerda."""
    def P(k):
        x, y = pose[k]
        return (ox + virado * x * h, oy - y * h)
    w = lambda f: f * h

    # pernas (a de tras primeiro, para a da frente ficar por cima)
    osso(d, P('ancaT'), P('joelhoT'), w(.046), w(.030), esc)
    osso(d, P('joelhoT'), P('tornozeloT'), w(.030), w(.017), esc)
    osso(d, P('tornozeloT'), P('peT'), w(.019), w(.011), esc)
    osso(d, P('anca'), P('joelhoF'), w(.050), w(.032), esc)
    osso(d, P('joelhoF'), P('tornozeloF'), w(.032), w(.018), esc)
    osso(d, P('tornozeloF'), P('peF'), w(.020), w(.012), esc)

    # tronco: a cintura e o que separa um corpo de um saco
    osso(d, P('anca'), P('cintura'), w(.050), w(.043), esc)
    osso(d, P('cintura'), P('peito'), w(.043), w(.076), esc)
    osso(d, P('peito'), P('ombro'), w(.076), w(.062), esc)

    # braco de tras
    osso(d, P('ombroT'), P('cotoveloT'), w(.030), w(.023), esc)
    osso(d, P('cotoveloT'), P('pulsoT'), w(.023), w(.026), esc)
    disco(d, P('pulsoT'), w(.037), esc)

    # pescoco
    osso(d, P('ombro'), P('pescoco'), w(.027), w(.022), esc)

    # a cabeca de perfil: testa, nariz, queixo. Uma bola com um triangulo a
    # frente le-se como um bone -- o perfil e que faz dela uma cabeca.
    cx, cy = P('cabeca'); r = w(.058)
    d.ellipse([(cx - virado * .10 * r - .92 * r) * esc, (cy - 1.06 * r) * esc,
               (cx - virado * .10 * r + .92 * r) * esc, (cy + 1.06 * r) * esc], fill=255)
    perfil = [(.10, -1.02), (.68, -.40), (.99, .04), (.64, .24), (.84, .64), (.06, 1.02)]
    d.polygon([((cx + virado * px * r) * esc, (cy + py * r) * esc) for px, py in perfil], fill=255)
    # o cabelo atado na nuca
    disco(d, (cx - virado * .92 * r, cy - .16 * r), .44 * r, esc)

    # braco da frente, por cima de tudo
    osso(d, P('ombroF'), P('cotoveloF'), w(.032), w(.025), esc)
    osso(d, P('cotoveloF'), P('pulsoF'), w(.025), w(.027), esc)
    disco(d, P('pulsoF'), w(.039), esc)

POSE_A = {   # avanca: o braco da frente esticado
    'anca': (.000, .500), 'ancaT': (-.038, .496), 'cintura': (.006, .602),
    'peito': (.012, .700), 'ombro': (.018, .788), 'pescoco': (.026, .836),
    'cabeca': (.042, .900),
    'joelhoF': (.128, .268), 'tornozeloF': (.170, .048), 'peF': (.258, .026),
    'joelhoT': (-.146, .272), 'tornozeloT': (-.240, .050), 'peT': (-.158, .026),
    'ombroF': (.048, .778), 'cotoveloF': (.228, .748), 'pulsoF': (.408, .800),
    'ombroT': (-.016, .780), 'cotoveloT': (-.150, .694), 'pulsoT': (-.028, .836),
}
POSE_B = {   # recua: guarda alta, as duas maos a frente da cara
    'anca': (.000, .500), 'ancaT': (-.038, .496), 'cintura': (.002, .602),
    'peito': (.004, .700), 'ombro': (.006, .788), 'pescoco': (.010, .836),
    'cabeca': (.020, .900),
    'joelhoF': (.110, .270), 'tornozeloF': (.146, .048), 'peF': (.234, .026),
    'joelhoT': (-.158, .268), 'tornozeloT': (-.262, .048), 'peT': (-.180, .026),
    'ombroF': (.042, .778), 'cotoveloF': (.158, .688), 'pulsoF': (.146, .862),
    'ombroT': (-.028, .780), 'cotoveloT': (-.176, .726), 'pulsoT': (-.046, .874),
}

ALTURA = R * 0.80                  # altura das figuras
CHAO = C + R * 0.345               # a linha onde assentam os pes
ESQ, DIR = C - R * 0.250, C + R * 0.295
FIGURAS = ((ESQ, +1, POSE_A), (DIR, -1, POSE_B))

def ponto(ox, virado, pose, k, h=None):
    h = h or ALTURA
    x, y = pose[k]
    return (ox + virado * x * h, CHAO - y * h)

def entre(a, b, f):
    return (a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f)

def musculos_largos(d, esc):
    """Peito, coxa, gemeo, trapezio -- as massas grandes."""
    h = ALTURA
    for ox, v, pose in FIGURAS:
        P = lambda k: ponto(ox, v, pose, k)
        d_ = lambda a, b, f: entre(P(a), P(b), f)
        incl = 0.0 if v > 0 else math.pi
        oval(d, (P('peito')[0] + v * .030 * h, P('peito')[1] - .022 * h),
             .060 * h, .034 * h, incl + v * 0.22, esc)                 # peitoral
        oval(d, d_('anca', 'joelhoF', .42), .050 * h, .082 * h,
             math.atan2(P('joelhoF')[1] - P('anca')[1], P('joelhoF')[0] - P('anca')[0]) - math.pi / 2, esc)
        oval(d, d_('ancaT', 'joelhoT', .42), .042 * h, .074 * h,
             math.atan2(P('joelhoT')[1] - P('ancaT')[1], P('joelhoT')[0] - P('ancaT')[0]) - math.pi / 2, esc)
        oval(d, d_('joelhoF', 'tornozeloF', .34), .030 * h, .050 * h,
             math.atan2(P('tornozeloF')[1] - P('joelhoF')[1], P('tornozeloF')[0] - P('joelhoF')[0]) - math.pi / 2, esc)
        oval(d, (P('ombro')[0] - v * .018 * h, P('ombro')[1] - .004 * h),
             .048 * h, .026 * h, incl - v * 0.30, esc)                 # trapezio
        oval(d, d_('ombroF', 'cotoveloF', .40), .029 * h, .040 * h,
             math.atan2(P('cotoveloF')[1] - P('ombroF')[1], P('cotoveloF')[0] - P('ombroF')[0]) - math.pi / 2, esc)

def musculos_finos(d, esc):
    """Abdominais e deltoides -- as massas pequenas, que pedem outro borrao."""
    h = ALTURA
    for ox, v, pose in FIGURAS:
        P = lambda k: ponto(ox, v, pose, k)
        base = P('cintura')
        for i in range(4):                                             # a prancha
            y = base[1] + .012 * h - i * .036 * h
            x = base[0] + v * (.012 + i * .004) * h
            oval(d, (x, y), .030 * h, .013 * h, 0.0, esc)
        disco(d, (P('ombroF')[0], P('ombroF')[1] - .004 * h), .030 * h, esc)   # deltoide
        disco(d, (P('ombroT')[0], P('ombroT')[1] - .004 * h), .024 * h, esc)
        oval(d, entre(P('joelhoT'), P('tornozeloT'), .34), .024 * h, .040 * h,
             math.atan2(P('tornozeloT')[1] - P('joelhoT')[1], P('tornozeloT')[0] - P('joelhoT')[0]) - math.pi / 2, esc)

def incisoes(d, esc):
    """O que o artifice risca por cima do relevo depois de fundido. Um sulco
       le-se de longe melhor do que um volume: apanha luz de um lado e sombra
       do outro, e por isso nao desaparece quando a luz lhe bate de frente.

       Tudo aqui se desenha em coordenadas da peca e so o `risco` lhes aplica
       a escala. A primeira versao passava-as cruas ao PIL: a tela e desenhada
       em dobro, as incisoes caiam no canto dela, e la eram apagadas pela
       multiplicacao com a mascara das figuras. Nao davam erro nenhum -- so
       nunca chegavam a existir, e os corpos ficavam bolhas lisas."""
    h = ALTURA
    lw = max(2, int(0.0070 * h * esc))
    fino = max(2, int(0.0046 * h * esc))

    def risco(pontos, w):
        d.line([(x * esc, y * esc) for x, y in pontos], fill=255, width=w, joint='curve')

    for ox, v, pose in FIGURAS:
        P = lambda k: ponto(ox, v, pose, k)
        pei, cin, anc, cab = P('peito'), P('cintura'), P('anca'), P('cabeca')

        # o risco do peitoral, que desce do ombro e volta para dentro
        alto = (pei[0] + v * .052 * h, pei[1] - .018 * h)
        risco([P('ombroF'), alto], lw)
        risco([alto, (pei[0] - v * .018 * h, pei[1] + .018 * h)], lw)

        # a prancha: a linha do meio e as travessas
        risco([(cin[0] + v * .004 * h, cin[1] + .022 * h),
               (cin[0] + v * .022 * h, cin[1] - .110 * h)], fino)
        for i in range(3):
            y = cin[1] - .006 * h - i * .036 * h
            risco([(cin[0] - v * .018 * h, y), (cin[0] + v * .044 * h, y - .006 * h)], fino)

        # o V da virilha, que e o que diz que aquilo e um corpo de atleta
        baixo = (anc[0] + v * .006 * h, anc[1] + .024 * h)
        risco([(anc[0] + v * .052 * h, anc[1] - .034 * h), baixo], lw)
        risco([(anc[0] - v * .048 * h, anc[1] - .030 * h), baixo], lw)

        risco([anc, P('joelhoT')], lw)                     # separar as pernas
        joe = P('joelhoF')
        risco([(joe[0] - v * .024 * h, joe[1]),
               (joe[0] + v * .024 * h, joe[1] + .004 * h)], fino)      # a rotula

        # o cabelo: madeixas curtas da testa para a nuca
        r = .058 * h
        for i in range(5):
            risco([(cab[0] + v * (0.12 - 0.032 * i) * r, cab[1] - 0.84 * r + i * 0.30 * r),
                   (cab[0] - v * (0.84 + 0.05 * i) * r, cab[1] - 0.30 * r + i * 0.28 * r)], fino)

        # os himantes: as correias de couro enroladas na mao e no antebraco.
        # E o pormenor que diz que isto e pugilismo e nao luta.
        for k, ante in (('pulsoF', 'cotoveloF'), ('pulsoT', 'cotoveloT')):
            pu, co = P(k), P(ante)
            dx, dy = co[0] - pu[0], co[1] - pu[1]
            L = math.hypot(dx, dy) or 1.0
            ux, uy = dx / L, dy / L
            px, py = -uy, ux
            for j in range(6):
                sj = 0.02 + j * 0.105
                cxp, cyp = pu[0] + ux * L * sj, pu[1] + uy * L * sj
                e = (.040 - .004 * j) * h
                risco([(cxp + px * e - ux * .012 * h, cyp + py * e - uy * .012 * h),
                       (cxp - px * e + ux * .012 * h, cyp - py * e + uy * .012 * h)], fino)

def chao(d, esc):
    """Nas pecas gregas as figuras assentam sempre num risco de solo."""
    d.line([((C - R * 0.555) * esc, CHAO * esc), ((C + R * 0.555) * esc, CHAO * esc)],
           fill=255, width=int(0.011 * R * esc))

def cena(d, esc):
    for ox, v, pose in FIGURAS:
        figura(d, esc, ox, CHAO, ALTURA, v, pose)

# --------------------------- os aneis ----------------------------------

def enrolar(tira, r_dentro, r_fora, repeticoes=1):
    """Mapeia uma tira direita para um anel: o angulo da o x, o raio da o y.
       Com amostragem bilinear -- a de vizinho mais proximo esfarrapa letras."""
    yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
    dx, dy = xx - C, yy - C
    rr = np.hypot(dx, dy)
    th = (np.arctan2(dy, dx) + math.pi) / (2 * math.pi)
    th = (th * repeticoes) % 1.0
    u = (rr - r_dentro) / (r_fora - r_dentro)
    H, W = tira.shape
    fx = np.clip(th * W, 0, W - 1.001)
    fy = np.clip(u * (H - 1), 0, H - 1.001)
    x0 = fx.astype(np.int32); y0 = fy.astype(np.int32)
    ax = fx - x0; ay = fy - y0
    x1 = (x0 + 1) % W; y1 = np.minimum(y0 + 1, H - 1)
    out = (tira[y0, x0] * (1 - ax) * (1 - ay) + tira[y0, x1] * ax * (1 - ay)
           + tira[y1, x0] * (1 - ax) * ay + tira[y1, x1] * ax * ay)
    out[(rr < r_dentro) | (rr > r_fora)] = 0.0
    return out.astype(np.float32)

def tira_do_meandro(largura, altura, celulas):
    """A greca: uma espiral quadrada que entra, roda e sai."""
    im = Image.new('L', (largura, altura), 0)
    d = ImageDraw.Draw(im)
    passo = largura / celulas
    u = altura / 8.0
    t = max(2, int(round(u * 1.05)))
    g = passo / 8.0
    for i in range(celulas + 1):
        x0 = i * passo
        pts = [(0, 7), (6.6, 7), (6.6, 1.4), (2.0, 1.4), (2.0, 4.6), (4.4, 4.6)]
        d.line([(x0 + px * g, altura - py * u) for px, py in pts],
               fill=255, width=t, joint='curve')
        d.line([(x0, altura - 7 * u), (x0 - 1.4 * g, altura - 7 * u)], fill=255, width=t)
    return np.asarray(im, dtype=np.float32) / 255.0

def fonte(tamanho):
    """Uma letra lapidar arcaica e monolinear -- sem serifas. Por isso uma
       grotesca assenta-lhe melhor do que uma romana."""
    for nome in ('arial.ttf', 'segoeui.ttf', 'tahoma.ttf', 'times.ttf',
                 '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'):
        caminho = nome if '/' in nome else 'C:/Windows/Fonts/' + nome
        try:
            f = ImageFont.truetype(caminho, tamanho)
            if f.getbbox('\u0393\u03a9')[2] > tamanho * 0.5:   # tem grego?
                return f
        except Exception:
            pass
    return ImageFont.load_default()

LEGENDA = '\u0393\u03a5\u039c\u039d\u0391\u03a3\u0399\u039f\u039d\u00b7' \
          '\u039a\u039f\u00b7\u039f\u039b\u0399\u03a3\u0399\u03a0\u03a9\u039d\u00b7' \
          '\u03a0\u03a5\u0393\u039c\u0391\u03a7\u0399\u0391\u00b7'
# GYMNASION . KO . OLISIPON . PYGMACHIA
# Olisipo era o nome antigo de Lisboa; pygmachia e o pugilismo. Tudo
# verdade -- uma inscricao inventada so com letras bonitas nao e nada.

def tira_da_legenda(largura, altura):
    im = Image.new('L', (largura, altura), 0)
    d = ImageDraw.Draw(im)
    f = fonte(int(altura * 0.66))
    texto = LEGENDA
    # repete-se ate dar a volta, com o espaco acertado para fechar certo
    larg_uma = d.textlength(texto, font=f)
    # Duas voltas e nao as que couberem: com tres, cada letra fica com 24
    # pixeis no mapa e le-se como rabisco. A legenda existe para ser lida.
    vezes = 2 if largura > larg_uma * 1.6 else max(1, int(round(largura / larg_uma)))
    passo = largura / vezes
    extra = (passo - larg_uma) / max(1, len(texto))
    for v in range(vezes):
        x = v * passo
        for ch in texto:
            d.text((x, altura * 0.5), ch, font=f, fill=255, anchor='lm')
            x += d.textlength(ch, font=f) + extra
    return np.asarray(im, dtype=np.float32) / 255.0

def tira_das_contas(largura, altura, contas):
    """Astragalo: contas e carreteis. O bordo classico, e o que mais brilha
       sob luz rasante -- sao dezenas de pequenas superficies curvas."""
    im = Image.new('L', (largura, altura), 0)
    d = ImageDraw.Draw(im)
    passo = largura / contas
    r = min(altura * 0.44, passo * 0.40)      # a conta nunca come o carretel
    for i in range(contas + 1):
        x = i * passo
        d.ellipse([x - r, altura * .5 - r, x + r, altura * .5 + r], fill=255)
        a, b = x + r * .88, x + passo - r * .88
        if b > a:
            d.rectangle([a, altura * .5 - r * .34, b, altura * .5 + r * .34], fill=190)
    return np.asarray(im, dtype=np.float32) / 255.0

# --------------------------- o mapa de alturas -------------------------

yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
rr = np.hypot(xx - C, yy - C)
ang = np.arctan2(yy - C, xx - C)
dentro = (rr <= R).astype(np.float32)

# corpo do disco: levemente bojudo ao centro, como um disco fundido a mao
alt = dentro * (0.40 + 0.050 * np.clip(1 - (rr / R) ** 2, 0, 1))

# o aro: um torulo redondo, nao um degrau. E a forma que apanha a luz toda
# a volta e diz "isto e uma peca", nao um recorte.
u_aro = np.clip((rr - R * 0.905) / (R * 0.082), 0, 1)
alt += dentro * np.sqrt(np.clip(1 - (2 * u_aro - 1) ** 2, 0, 1)) * 0.115
alt -= borrar(((rr > R * 0.880) & (rr < R * 0.908)).astype(np.float32), 6 * ESC) * 0.055  # a goteira

# a inscricao, incisa no rebaixo entre o aro e a greca
alt -= borrar(((rr > R * 0.790) & (rr < R * 0.884)).astype(np.float32), 7 * ESC) * 0.030
alt -= borrar(enrolar(tira_da_legenda(int(7200 * ESC), int(190 * ESC)),
                       R * 0.800, R * 0.874), 2.6 * ESC) * 0.105
# as barras que separam os painees da legenda
barras = ((np.abs(((ang + math.pi) / (2 * math.pi) * 36) % 1.0 - 0.5) > 0.470)
          & (rr > R * 0.792) & (rr < R * 0.882)).astype(np.float32)
alt += borrar(barras, 3 * ESC) * 0.045

# o astragalo entre a legenda e a greca
alt += borrar(enrolar(tira_das_contas(int(4800 * ESC), int(72 * ESC), 132),
                       R * 0.756, R * 0.792), 3 * ESC) * 0.080

# o anel da greca
alt += borrar(enrolar(tira_do_meandro(int(6400 * ESC), int(320 * ESC), 38),
                       R * 0.640, R * 0.744), 4 * ESC) * 0.115

# fio fino a separar o campo da greca
alt += borrar(((rr > R * 0.612) & (rr < R * 0.630)).astype(np.float32), 3.5 * ESC) * 0.070

# ---- as figuras ----
figs = mascara(cena)
figs = np.clip(figs + mascara(chao), 0, 1)

# o relevo: a silhueta borrada da forma, e uma segunda camada mais apertada
# por cima -- e isso que da volume em vez de um carimbo chato
# Os bordos sao firmes de proposito. Com a normal exagerada trinta e sete
# vezes um bordo mole lia-se na mesma; com a normal honesta, o que da o
# degrau e o degrau. Um relevo fundido tem o canto redondo, nao derretido.
relevo = np.clip(borrar(figs, 4.5 * ESC) * 1.45, 0, 1) ** 0.75
relevo = relevo * 0.5 + np.clip(borrar(figs, 1.6 * ESC) * 1.2, 0, 1) * 0.5
alt += relevo * 0.200 * dentro

# o musculo por cima do relevo, so onde ha corpo
mus = borrar(mascara(musculos_largos), 18 * ESC) * figs
alt += np.clip(mus * 1.80, 0, 1) * 0.034 * dentro
mus2 = borrar(mascara(musculos_finos), 7 * ESC) * figs
alt += np.clip(mus2 * 1.70, 0, 1) * 0.016 * dentro

# e as incisoes por cima do musculo
# Fundos: um sulco raso desaparece quando a luz lhe bate de frente, e e
# precisamente ai que o corpo precisa de se ler. Com 0,072 as figuras ficavam
# lisas de cada vez que a poca de luz lhes passava por cima.
alt -= borrar(mascara(incisoes) * np.clip(borrar(figs, 4 * ESC) * 1.6, 0, 1),
              1.6 * ESC) * 0.036

# a inscricao do centro: KO em letras gregas, incisa como a legenda
def letras(d, esc):
    f = fonte(int(R * 0.138 * esc))
    d.text((C * esc, (C - R * 0.470) * esc), '\u039a\u039f', font=f, fill=255, anchor='mm')
alt -= borrar(mascara(letras), 3 * ESC) * 0.085 * dentro

# --------------------------- o tempo -----------------------------------
# Sem desgaste isto e um logotipo. Com desgaste e uma peca que esteve dois
# mil e setecentos anos debaixo de terra.

ruido = np.random.rand(N, N).astype(np.float32)
grosso = normalizar(borrar(ruido, 30 * ESC))
medio = normalizar(borrar(ruido, 8 * ESC))

# A patina mancha a *cor* e nao a altura: um bronze manchado continua a ser
# uma superficie lisa. Confundir as duas da casca de arvore -- o relevo sai
# da *derivada* da altura, e a derivada amplifica tudo o que e miudo.
# A ondulacao da fundicao. Sobe-la mais do que isto parece boa ideia de
# frente e e um desastre de raspao: uma onda de um pixel de mapa faz o bordo
# de uma barra de relevo passear sete pixeis para o lado, e a parede dela sai
# aos dentes. O que se ve no campo de perto vem do sombreador, que a desenha
# tao fina quanto a camara pedir e nao mexe nos bordos.
alt += (grosso * 0.0035 + medio * 0.0012) * dentro

# ---- o torno -----------------------------------------------------------
# A peca foi voltada depois de sair do molde, e o metal guarda os aneis da
# ferramenta. Sao rasos -- o que se ve deles e a luz a correr ao longo, nao
# o sulco -- e sao o que faz o campo ler-se como metal trabalhado em vez de
# massa lisa. A ponta nao corta igual em todo o lado: a forca varia e a
# fase treme, senao sai um padrao, e um padrao chama a atencao a si proprio.
#
# Nao vao para o mapa, e foi medido: a sete pixeis de intervalo mexem na
# normal de cada pixel e o mapa sem perdas passava de 1,2 MB para 1,8 MB --
# meio megabyte para guardar uma coisa que e uma linha de conta. Vao para o
# sombreador, onde nao tem resolucao nenhuma a limita-los e se desenham a
# qualquer tamanho. Aqui ficam so para o retrato cozido, que nao sabe fazer
# contas nenhumas e tem de se parecer com a peca viva.
# Na greca e nas figuras vem mais fracos: o torno toca no que esta ao nivel
# do campo, nao no que foi fundido levantado.
treme = normalizar(borrar(np.random.rand(N, N).astype(np.float32), 55 * ESC))
ponta = np.clip(0.55 + 0.45 * normalizar(borrar(np.random.rand(N, N).astype(np.float32), 75 * ESC)), 0.12, 1.0)
PASSO_DO_TORNO = R * 0.0095                 # ~9 px aqui, ~7 no mapa
torno = (np.sin(rr / PASSO_DO_TORNO * 2 * math.pi + treme * 2.2)
         * ponta * (1.0 - 0.55 * np.clip(relevo, 0, 1)) * 0.0026 * dentro)

# mossas: concavidades onde o disco bateu em alguma coisa
im = Image.new('L', (N, N), 0); d = ImageDraw.Draw(im)
for _ in range(38):
    a = random.uniform(0, 2 * math.pi); q = R * math.sqrt(random.uniform(0, 1)) * 0.97
    x, y = C + q * math.cos(a), C + q * math.sin(a)
    s = random.uniform(10, 56) * ESC
    d.ellipse([x - s, y - s * random.uniform(.5, 1.2), x + s, y + s * random.uniform(.5, 1.2)], fill=255)
alt -= borrar(np.asarray(im, dtype=np.float32) / 255.0, 20 * ESC) * 0.013 * dentro

# picadas da fundicao: bolhas de ar que vieram a superficie. So as graudas
# vao para o mapa -- as miudas sao grao, e o grao faz-se no sombreador: um
# mapa guarda-as uma vez e estica-as; o sombreador desenha-as a qualquer
# tamanho, e nao pesa byte nenhum.
im = Image.new('L', (N, N), 0); d = ImageDraw.Draw(im)
# Vem em ninhos, como vem no metal a serio: o ar nao se distribui por igual
# pelo molde. Espalhadas por igual liam-se como pintas de um padrao.
for _ in range(44):
    a = random.uniform(0, 2 * math.pi); q = R * math.sqrt(random.uniform(0, 1)) * 0.96
    nx0, ny0 = C + q * math.cos(a), C + q * math.sin(a)
    for _ in range(random.randint(4, 18)):
        x = nx0 + random.gauss(0, 46 * ESC); y = ny0 + random.gauss(0, 46 * ESC)
        if math.hypot(x - C, y - C) > R * 0.985:
            continue
        s = random.uniform(1.4, 5.6) * ESC
        d.ellipse([x - s, y - s, x + s, y + s], fill=255)
picadas = np.asarray(im, dtype=np.float32) / 255.0
alt -= borrar(picadas, 1.5 * ESC) * 0.042 * dentro

# riscos: a peca foi arrastada, pousada e limpa durante seculos. Sao finos --
# um pixel -- e por isso nao se veem de longe; de perto sao metade do que
# distingue uma peca que esteve no mundo de uma peca acabada de desenhar.
im = Image.new('L', (N, N), 0); d = ImageDraw.Draw(im)
for _ in range(74):
    a = random.uniform(0, 2 * math.pi)
    q = R * math.sqrt(random.uniform(0, 1)) * 0.95
    x, y = C + q * math.cos(a), C + q * math.sin(a)
    rumo = random.uniform(0, 2 * math.pi)
    comp = random.uniform(40, 320) * ESC
    pts = [(x, y)]
    passos = max(2, int(comp / (18 * ESC)))
    for _ in range(passos):
        rumo += random.uniform(-0.09, 0.09)     # um risco quase nao verga
        x += 18 * ESC * math.cos(rumo); y += 18 * ESC * math.sin(rumo)
        if math.hypot(x - C, y - C) > R * 0.97:
            break
        pts.append((x, y))
    if len(pts) > 1:
        d.line(pts, fill=random.randint(120, 255), width=max(1, int(round(ESC))),
               joint='curve')
alt -= borrar(np.asarray(im, dtype=np.float32) / 255.0, 0.9 * ESC) * 0.014 * dentro

# fendas: o metal fadigado racha, e a racha corre sem destino
im = Image.new('L', (N, N), 0); d = ImageDraw.Draw(im)
for _ in range(11):
    a = random.uniform(0, 2 * math.pi)
    x, y = C + R * random.uniform(.2, .95) * math.cos(a), C + R * random.uniform(.2, .95) * math.sin(a)
    rumo = random.uniform(0, 2 * math.pi)
    pts = [(x, y)]
    for _ in range(random.randint(14, 34)):
        rumo += random.uniform(-0.55, 0.55)
        passo = random.uniform(12, 34) * ESC
        x += passo * math.cos(rumo); y += passo * math.sin(rumo)
        if math.hypot(x - C, y - C) > R * 0.99:
            break
        pts.append((x, y))
    if len(pts) > 2:
        d.line(pts, fill=255, width=int(round(random.choice([1, 2, 2, 3]) * ESC)),
               joint='curve')
fendas = np.asarray(im, dtype=np.float32) / 255.0
# A fenda nao passa por cima do KO. Uma risca a atravessar duas letras le-se
# como um erro de quem desenhou, e nao como o tempo: o olho ve um O cortado
# e pensa que alguem se enganou.
longe_do_ko = np.clip((np.hypot(xx - C, yy - (C - R * 0.470)) - R * 0.150) / (R * 0.07), 0, 1)
alt -= borrar(fendas * longe_do_ko, 1.5 * ESC) * 0.085 * dentro

# o gito: o rebarbo por onde o bronze entrou no molde, limado mas nao a zero
im = Image.new('L', (N, N), 0); d = ImageDraw.Draw(im)
d.ellipse([C + R * .54, C - R * .80, C + R * .70, C - R * .70], fill=255)
alt += borrar(np.asarray(im, dtype=np.float32) / 255.0, 9 * ESC) * 0.045 * dentro

# o aro comido: a borda nao e um circulo perfeito, foi-se lascando
im = Image.new('L', (N, N), 0); d = ImageDraw.Draw(im)
# So mordem a borda: ficam de fora do raio e entram o que entrarem. Postas
# por dentro abriam buracos no meio da peca, que e uma coisa muito
# diferente de um aro gasto.
for _ in range(13):
    a = random.uniform(0, 2 * math.pi)
    s = random.uniform(9, 30) * ESC
    q = R + s * random.uniform(0.42, 0.95)
    x, y = C + q * math.cos(a), C + q * math.sin(a)
    pts = []
    for j in range(9):                      # uma lasca nao e um circulo
        t = j / 9.0 * 2 * math.pi
        e = s * random.uniform(0.55, 1.25)
        pts.append((x + e * math.cos(t), y + e * math.sin(t)))
    d.polygon(pts, fill=255)
lascas = np.asarray(im, dtype=np.float32) / 255.0

alt = np.clip(alt, 0.0, 1.2)

# --------------------------- os mapas ----------------------------------

alt_p = encolher(alt, LADO)
torno_p = encolher(torno, LADO)
lascas_p = encolher(lascas, LADO)
grosso_p = encolher(grosso, LADO)
medio_p = encolher(medio, LADO)
R_p = R * LADO / float(N)
# O raio nao passa pelo `encolher`: ele corta a -8..8, que e o que precisa
# para um mapa de alturas e e veneno para um raio em pixeis. Passou por la
# durante meses -- `rr_p` saia 8 em todo o lado, o recorte dava 1 em todo o
# lado, e as lascas do aro que se desenham mais acima nunca chegaram a
# aparecer em nada. Faz-se a conta na resolucao certa e acabou.
yy_p, xx_p = np.mgrid[0:LADO, 0:LADO].astype(np.float32)
rr_p = np.hypot(xx_p - LADO / 2.0, yy_p - LADO / 2.0)

# ---- a altura, e as normais que saem dela -------------------------------
# A altura guarda-se *inteira*, e nao a partir de um nivel qualquer: o que
# ha no disco vai de ALT0 a ALT1, e e isso que ocupa os 256 degraus do
# canal. Antes guardava-se `alt/1.2` e o sombreador so lia de 0,302 a 0,602:
# sobravam dois tercos da gama para nada, o relevo ficava com 64 degraus --
# que de perto se veem como socalcos -- e tudo o que era *mais fundo do que
# o campo* (a legenda, o KO, a goteira, as picadas) era achatado ate ao
# campo. As incisoes existiam so na luz, e nao no corpo da peca.
ALT0, ALT1 = 0.280, 0.700
ALT_CAMPO = 0.4338                 # a moda: o plano onde assenta o relevo
# Quanto vale uma unidade de `alt` em unidades da peca (o raio e 0,7437).
# Sai desta conta: o alto do relevo fica a 0,0200 acima do campo.
POR_UNIDADE = 0.0200 / (0.6972 - ALT_CAMPO)
alt_p = np.clip(alt_p, ALT0, ALT1)
# fora do disco fica o campo, para a derivada nao ver um penhasco no aro
alt_p = np.where(rr_p <= R_p + 2.0 * MESC, alt_p, ALT_CAMPO)
altura8 = np.clip((alt_p - ALT0) / (ALT1 - ALT0), 0, 1)

# as normais: e a derivada da altura que faz o relevo, e a escala e a
# verdadeira -- um pixel do mapa mede `1/R_p * 0,7437` da peca.
# Estiveram trinta e sete vezes exageradas desde o principio: a luz dizia
# que o campo era um terreno acidentado e o corpo dizia que era plano, e as
# duas coisas nunca batiam certo. O campo de um disco fundido *e* plano; o
# que ha nele para ver sao marcas miudas de mais para caberem num mapa, e
# essas desenham-se no sombreador, onde nao tem resolucao nenhuma a limita-las.
PIXEL = (0.7437 / R_p)             # quanto mede um pixel do mapa, na peca
ESC_Z = POR_UNIDADE / PIXEL
gy, gx = np.gradient(alt_p.astype(np.float32))
nx, ny, nz = -gx * ESC_Z, -gy * ESC_Z, np.ones_like(alt_p)
ln = np.sqrt(nx * nx + ny * ny + nz * nz) + 1e-6
nx, ny, nz = nx / ln, ny / ln, nz / ln

# oclusao: o que esta em baixo recebe menos luz do ceu. E o que da a peca o
# ar de suja e funda em vez de impressa.
longe = borrar(alt_p, 26 * MESC)
perto = borrar(alt_p, 7 * MESC)
oc = np.clip(0.30 + 1.05 * (alt_p * 0.34 + perto * 0.36 + longe * 0.30) - 0.16, 0.06, 1.0)
oc = oc ** 1.25

# a cor da peca: bronze escuro, patina verde no fundo das reentrancias.
# Nunca sai daqui luz nenhuma -- so a cor propria do metal.
baixo = np.clip(1.0 - (alt_p - 0.355) / 0.300, 0, 1)
# O bronze estava cinzento -- 0,25 / 0,20 / 0,13 e um castanho sem sangue, e
# com ele a peca lia-se como barro cozido. Um bronze de dois mil e setecentos
# anos e escuro, mas e quente: o vermelho vale o triplo do azul. A cor nao
# vem do brilho, vem daqui.
bronze = np.stack([0.300 - 0.112 * baixo,
                   0.202 - 0.058 * baixo,
                   0.098 + 0.004 * baixo], axis=-1).astype(np.float32)
patina = np.clip(grosso_p * 0.5 + 0.5, 0, 1)
verde = np.array([0.104, 0.142, 0.122], dtype=np.float32)
m = (patina * baixo * 0.44)[..., None]
bronze = bronze * (1 - m) + verde * m
# o metal gasto nos pontos altos volta a aparecer, mais claro e mais limpo
gasto = np.clip((alt_p - 0.56) / 0.16, 0, 1) * np.clip(medio_p * 0.4 + 0.6, 0, 1)
bronze = bronze * (1 - gasto[..., None] * 0.55) + \
         np.array([0.640, 0.472, 0.240], dtype=np.float32) * (gasto[..., None] * 0.55)

cor_ao = np.clip(bronze * oc[..., None], 0, 1)

# o recorte
# O recorte so serve o retrato cozido: no navegador a silhueta vem do
# proprio corpo (`raioEm`, no sombreador), que tambem leva mordidas e tem de
# concordar com o aro e com o verso. Dois recortes diferentes -- um aqui e
# outro la -- abriam buracos por onde se via o outro lado.
alfa = np.clip((R_p - rr_p) / (1.8 * MESC), 0, 1)
alfa = np.clip(alfa - lascas_p * 0.95, 0, 1)
alfa = np.clip(borrar(alfa, 1.0 * MESC), 0, 1)

def guardar(nome, arr, modo, **kw):
    Image.fromarray(arr, modo).save(os.path.join(SAIDA, nome), **kw)

def mirrar(arr, lado):
    """Um mapa de 8 bits, mais pequeno. LANCZOS pela mesma razao de
       sempre: uma media de area nesta razao poe um xadrez de um pixel
       nos bordos, invisivel no mapa e inteiro na derivada dele."""
    if arr.shape[0] == lado:
        return arr
    im = Image.fromarray(arr, 'RGB' if arr.ndim == 3 else 'L')
    return np.asarray(im.resize((lado, lado), Image.LANCZOS))

guardar('artefacto-cor.webp',
        mirrar((cor_ao ** (1 / 2.2) * 255).astype(np.uint8), LADO_PEQUENO), 'RGB',
        quality=88, method=6)

# --------------------------- a aspereza --------------------------------
# E este mapa que distingue metal de gesso, e nao a forma. O bronze gasto nos
# pontos altos e polido e devolve um reflexo apertado; a patina do fundo das
# reentrancias e baca e nao devolve nada. Sem isto o brilho e igual em toda a
# peca, e uma peca com brilho igual em todo o lado le-se como plastico.

aspereza = 0.90 - 0.44 * gasto - 0.16 * np.clip((alt_p - 0.50) / 0.20, 0, 1)
aspereza += np.clip(medio_p, -2, 2) * 0.035
aspereza = np.clip(aspereza, 0.16, 0.98)

# quanto daquilo ainda e metal a vista: a patina e um oxido, nao e metal
metal = np.clip(0.30 + 0.62 * gasto + 0.30 * np.clip((alt_p - 0.52) / 0.18, 0, 1)
                - 0.34 * np.clip(patina * baixo, 0, 1), 0.06, 1.0)

# cavidade: o fundo estreito de um sulco nao ve o ceu. E o passa-alto da
# altura, e e o que faz as incisoes nao desaparecerem a luz de frente.
cav = np.clip(0.5 + (alt_p - borrar(alt_p, 9 * MESC)) * 7.0, 0, 1)

guardar('artefacto-rug.webp', mirrar(np.dstack([
    (aspereza * 255).astype(np.uint8),
    (metal * 255).astype(np.uint8),
    (cav * 255).astype(np.uint8),
]), LADO_PEQUENO), 'RGB', quality=76, method=6)
# Aqui as perdas nao custam: uma aspereza 2% ao lado nao se ve, e sao 120 KB
# menos. No mapa de relevo seria o contrario -- la, um erro vira ondulacao
# na luz, que e exactamente o que esse mapa existe para evitar.

# nx, ny, altura. Sem perdas: um mapa de normais comprimido com perdas da
# ondulacao na luz, que e exactamente o que ele existe para evitar.
# As normais vao agora em degraus de 1 e nao de 3 -- quatro vezes mais finas
# e, ainda assim, menos ficheiro do que antes: com a escala honesta o campo
# fica todo no mesmo valor e comprime-se sozinho. Guardar a altura em vez
# delas continua a nao servir: a normal e a *derivada* da altura, e derivar
# um numero de 8 bits amplifica cada degrau ate uma encosta inteira.
# O quarto canal saiu -- o recorte vem do corpo, no sombreador.
def degraus(v, passo=1):
    return (np.round(np.clip((v * 0.5 + 0.5) * 255, 0, 255) / passo) * passo).clip(0, 255).astype(np.uint8)

rel = np.dstack([degraus(nx), degraus(ny), (altura8 * 255).astype(np.uint8)])
guardar('artefacto-rel.webp', rel, 'RGB', lossless=True, quality=100, method=6)

# E o mesmo mapa pequeno, para os ecras estreitos. Nao se encolhe o mapa
# ja feito: encolhe-se a *altura* e refazem-se as normais a escala dela.
# Encolher normais e fazer a media de direccoes, e a media de duas
# encostas opostas e um chao -- a parede do relevo desaparecia.
if LADO_PEQUENO != LADO:
    alt_q = np.asarray(Image.fromarray(alt_p, mode='F')
                       .resize((LADO_PEQUENO, LADO_PEQUENO), Image.LANCZOS),
                       dtype=np.float32)
    esc_q = POR_UNIDADE / (0.7437 / (R * LADO_PEQUENO / float(N)))
    gyq, gxq = np.gradient(alt_q)
    qx, qy, qz = -gxq * esc_q, -gyq * esc_q, np.ones_like(alt_q)
    lq = np.sqrt(qx * qx + qy * qy + qz * qz) + 1e-6
    guardar('artefacto-rel-2k.webp', np.dstack([
        degraus(qx / lq), degraus(qy / lq),
        (np.clip((alt_q - ALT0) / (ALT1 - ALT0), 0, 1) * 255).astype(np.uint8),
    ]), 'RGB', lossless=True, quality=100, method=6)

# --------------------------- o retrato cozido --------------------------
# Para quem nao tem WebGL. A mesma peca, com uma luz fixa -- e com a mesma
# conta que o navegador faz, para nao haver duas pecas diferentes.

# O torno entra aqui e so aqui: na peca viva ele desenha-se a cada
# fotograma, e o retrato tem de se parecer com ela.
gy_t, gx_t = np.gradient((alt_p + torno_p).astype(np.float32))
nx, ny, nz = -gx_t * ESC_Z, -gy_t * ESC_Z, np.ones_like(alt_p)
ln = np.sqrt(nx * nx + ny * ny + nz * nz) + 1e-6
nx, ny, nz = nx / ln, ny / ln, nz / ln

L = np.array([-0.60, -0.62, 0.505]); L /= np.linalg.norm(L)
V = np.array([0.0, 0.0, 1.0])
H = (L + V); H /= np.linalg.norm(H)
dif = np.clip(nx * L[0] + ny * L[1] + nz * L[2], 0, 1)
aspereza = np.clip(0.72 - 0.34 * np.clip((alt_p - 0.50) / 0.22, 0, 1), 0.2, 1.0)
brilho = np.clip(nx * H[0] + ny * H[1] + nz * H[2], 0, 1) ** (2.0 / (aspereza ** 4 + 1e-3))
AMBIENTE = np.array([0.105, 0.120, 0.142], dtype=np.float32)
CHAVE = np.array([1.00, 0.840, 0.595], dtype=np.float32)
cor = cor_ao * (AMBIENTE + CHAVE * dif[..., None] * 0.86)
cor += (CHAVE * 0.22) * (brilho * oc)[..., None]
rgb = (np.clip(cor, 0, 1) ** (1 / 2.2) * 255).astype(np.uint8)
peca = Image.fromarray(np.dstack([rgb, (alfa * 255).astype(np.uint8)]), 'RGBA')
if '--png' in sys.argv:
    peca.save(os.path.join(SAIDA, 'artefacto.png'))
for lado in (1500, 820):
    peca.resize((lado, lado), Image.LANCZOS).save(
        os.path.join(SAIDA, 'artefacto-%d.webp' % lado), quality=86, method=6)

for n in ('artefacto-cor.webp', 'artefacto-rel.webp', 'artefacto-rug.webp',
          'artefacto-1500.webp', 'artefacto-820.webp'):
    print('%-22s %7d bytes' % (n, os.path.getsize(os.path.join(SAIDA, n))))
print('alt %.3f .. %.3f   oclusao %.3f .. %.3f' %
      (float(alt_p.min()), float(alt_p.max()), float(oc.min()), float(oc.max())))
# Estes dois numeros tem de bater com os do `artefacto-luz.js`: sao eles que
# dizem ao sombreador o que o canal da altura quer dizer. Mudar um aqui e
# esquecer o de la nao da erro nenhum -- da um relevo com a altura errada.
print('--- para o artefacto-luz.js ---')
print('const float H_CAMPO  = %.4f;   // o canal da altura ao nivel do campo'
      % ((ALT_CAMPO - ALT0) / (ALT1 - ALT0)))
print('const float H_ESCALA = %.5f;  // de canal para unidades da peca'
      % ((ALT1 - ALT0) * POR_UNIDADE))
print('relevo acima do campo %.4f   fundo abaixo do campo %.4f'
      % ((ALT1 - ALT_CAMPO) * POR_UNIDADE, (ALT_CAMPO - ALT0) * POR_UNIDADE))
