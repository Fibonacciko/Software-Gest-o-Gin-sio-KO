# -*- coding: utf-8 -*-
"""
O artefacto: um disco de bronze com dois pugilistas em relevo.

Desenhado de raiz. Nada vem da internet: constroi-se um *mapa de alturas*
(que e alto, que e baixo), e depois ilumina-se esse mapa com uma luz
rasante, como se ilumina uma peca de museu. E dai que vem o relevo --
nao ha fotografia nenhuma por baixo.
"""
import math, random, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

random.seed(7); np.random.seed(7)

N = 2000                      # lado da tela
R = 930.0                     # raio do disco
C = N / 2.0

# --------------------------- utilitarios -------------------------------

def nova(v=0.0):
    return np.full((N, N), v, dtype=np.float32)

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

def mascara(desenho_fn, escala=1):
    """Desenha a preto-e-branco com PIL e devolve 0..1."""
    im = Image.new('L', (N * escala, N * escala), 0)
    d = ImageDraw.Draw(im)
    desenho_fn(d, escala)
    if escala != 1:
        im = im.resize((N, N), Image.LANCZOS)
    return np.asarray(im, dtype=np.float32) / 255.0

# --------------------------- a figura ----------------------------------
# Um corpo nasce de um esqueleto: pontos e ossos. Cada osso e um tronco
# que afina de uma ponta a outra. E assim que se desenha uma figura de
# vaso grego -- membros finos, musculo exagerado, tudo de perfil.

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

def figura(d, esc, ox, oy, h, virado, pose):
    """pose: juntas em coordenadas locais (x para a frente, y para cima,
       fracao da altura). virado = +1 olha para a direita, -1 esquerda."""
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

    # a cabeca de perfil: testa, nariz, queixo. Uma bola com um triangulo
    # a frente le-se como um bone -- o perfil e que faz dela uma cabeca.
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

# --------------------------- o meandro ---------------------------------

def tira_do_meandro(largura, altura, celulas):
    """Uma tira direita com a greca, para depois se enrolar no anel."""
    im = Image.new('L', (largura, altura), 0)
    d = ImageDraw.Draw(im)
    passo = largura / celulas
    u = altura / 8.0                 # a grelha da greca: 8 unidades de alto
    t = max(2, int(round(u)))        # espessura do traco
    g = passo / 8.0
    for i in range(celulas + 1):
        x0 = i * passo
        # espiral quadrada: entra, roda, sai
        pts = [(0, 7), (6.6, 7), (6.6, 1.4), (2.0, 1.4), (2.0, 4.6), (4.4, 4.6)]
        caminho = [(x0 + px * g, altura - py * u) for px, py in pts]
        d.line(caminho, fill=255, width=t, joint='curve')
        # o traco que liga uma celula a seguinte
        d.line([(x0, altura - 7 * u), (x0 - 1.4 * g, altura - 7 * u)], fill=255, width=t)
    return np.asarray(im, dtype=np.float32) / 255.0

def enrolar(tira, r_dentro, r_fora):
    """Mapeia a tira para um anel: o angulo e o x, o raio e o y."""
    yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
    dx, dy = xx - C, yy - C
    rr = np.hypot(dx, dy)
    th = (np.arctan2(dy, dx) + math.pi) / (2 * math.pi)        # 0..1
    u = (rr - r_dentro) / (r_fora - r_dentro)                   # 0..1
    H, W = tira.shape
    sx = np.clip((th * (W - 1)).astype(np.int32), 0, W - 1)
    sy = np.clip((u * (H - 1)).astype(np.int32), 0, H - 1)
    out = tira[sy, sx]
    out[(rr < r_dentro) | (rr > r_fora)] = 0.0
    return out

# --------------------------- o mapa de alturas -------------------------

yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
rr = np.hypot(xx - C, yy - C)
dentro = (rr <= R).astype(np.float32)

# corpo do disco: levemente bojudo ao centro, como um disco fundido
alt = dentro * (0.40 + 0.055 * np.clip(1 - (rr / R) ** 2, 0, 1))

# aro exterior
aro = ((rr > R * 0.885) & (rr < R * 0.985)).astype(np.float32)
alt += borrar(aro, 7) * 0.13

# anel do meandro
tira = tira_do_meandro(5400, 300, 34)
alt += borrar(enrolar(tira, R * 0.745, R * 0.870), 5) * 0.115

# circulo fino a separar o campo do meandro
fio = ((rr > R * 0.718) & (rr < R * 0.735)).astype(np.float32)
alt += borrar(fio, 4) * 0.07

# as figuras
ALTURA = R * 0.84                  # altura das figuras
CHAO = C + R * 0.355               # a linha onde assentam os pes
ESQ, DIR = C - R * 0.255, C + R * 0.300

def cena(d, esc):
    figura(d, esc, ESQ, CHAO, ALTURA, +1, POSE_A)
    figura(d, esc, DIR, CHAO, ALTURA, -1, POSE_B)

figs = mascara(cena, escala=2)

def chao(d, esc):
    # a linha de solo: nas pecas gregas as figuras assentam sempre num risco
    d.line([((C - R * 0.56) * esc, CHAO * esc), ((C + R * 0.56) * esc, CHAO * esc)],
           fill=255, width=int(0.012 * R * esc))
figs = np.clip(figs + mascara(chao, escala=2), 0, 1)

# o relevo: a silhueta borrada da forma, e uma segunda camada mais
# apertada por cima -- e isso que da volume em vez de um carimbo chato
relevo = np.clip(borrar(figs, 9) * 1.45, 0, 1) ** 0.75
relevo = relevo * 0.5 + np.clip(borrar(figs, 3) * 1.2, 0, 1) * 0.5
alt += relevo * 0.205 * dentro

# incisoes: as linhas que o artifice risca por cima do relevo
def incisoes(d, esc):
    h, base = ALTURA, CHAO
    lw = max(1, int(0.013 * h * esc))
    for ox, vir, pose in ((ESQ, +1, POSE_A), (DIR, -1, POSE_B)):
        P = lambda k: ((ox + vir * pose[k][0] * h) * esc, (base - pose[k][1] * h) * esc)
        d.line([P('ombroF'), P('peito')], fill=255, width=lw)          # o peitoral
        d.line([P('anca'), P('joelhoT')], fill=255, width=lw)          # separar as pernas
        d.line([P('anca'), ((ox - vir * .055 * h) * esc,
                            (base - .505 * h) * esc)], fill=255, width=lw)
        for k in ('pulsoF', 'pulsoT'):                                  # as correias da mao
            cx, cy = P(k)
            for j in range(3):
                d.line([(cx - .036 * h * esc, cy - (.014 - j * .014) * h * esc),
                        (cx + .036 * h * esc, cy - (.022 - j * .014) * h * esc)],
                       fill=255, width=lw)
alt -= borrar(mascara(incisoes, escala=2) * figs, 3) * 0.075

# a inscricao: KO em letras gregas, como os vasos rotulam quem la esta
def letras(d, esc):
    try:
        f = ImageFont.truetype("C:/Windows/Fonts/georgia.ttf", int(R * 0.105 * esc))
    except Exception:
        f = ImageFont.load_default()
    d.text((C * esc, (C - R * 0.515) * esc), "\u039a\u039f", font=f, fill=255, anchor="mm")
alt += borrar(mascara(letras, escala=2), 4) * 0.085 * dentro

# --------------------------- o tempo -----------------------------------
# Sem desgaste isto e um logotipo. Com desgaste e uma peca que esteve
# dois mil e setecentos anos debaixo de terra.

ruido = np.random.rand(N, N).astype(np.float32)
grosso = borrar(ruido, 26); grosso = (grosso - grosso.mean()) / (grosso.std() + 1e-6)
medio = borrar(ruido, 7);   medio = (medio - medio.mean()) / (medio.std() + 1e-6)
fino = borrar(np.random.rand(N, N).astype(np.float32), 3.0)

# A patina mancha a *cor*, e nao a altura: um bronze manchado continua a
# ser uma superficie lisa. Confundir as duas dava casca de arvore.
alt += (grosso * 0.0022 + medio * 0.0005) * dentro
alt += (fino - fino.mean()) * 0.00035 * dentro          # porosidade do metal

# mossas: concavidades onde o disco bateu em alguma coisa
im = Image.new('L', (N, N), 0); d = ImageDraw.Draw(im)
for _ in range(34):
    a = random.uniform(0, 2 * math.pi); q = R * math.sqrt(random.uniform(0, 1)) * 0.97
    x, y = C + q * math.cos(a), C + q * math.sin(a)
    s = random.uniform(10, 54)
    d.ellipse([x - s, y - s * random.uniform(.5, 1.2), x + s, y + s * random.uniform(.5, 1.2)], fill=255)
mossas = np.asarray(im, dtype=np.float32) / 255.0
alt -= borrar(mossas, 20) * 0.013 * dentro

# o aro comido: a borda nao e um circulo perfeito, foi-se lascando
im = Image.new('L', (N, N), 0); d = ImageDraw.Draw(im)
for _ in range(26):
    a = random.uniform(0, 2 * math.pi)
    q = R * random.uniform(0.975, 1.02)
    x, y = C + q * math.cos(a), C + q * math.sin(a)
    s = random.uniform(14, 62)
    d.ellipse([x - s, y - s, x + s, y + s], fill=255)
lascas = np.asarray(im, dtype=np.float32) / 255.0

alt = np.clip(alt, 0, 1.2)

# --------------------------- a luz -------------------------------------
# Luz rasante de cima-esquerda: e a que levanta o relevo. De frente,
# achatava tudo.

ESC_Z = 2600.0
gy, gx = np.gradient(alt.astype(np.float32))
nx, ny, nz = -gx * ESC_Z, -gy * ESC_Z, np.ones_like(alt)
ln = np.sqrt(nx * nx + ny * ny + nz * nz) + 1e-6
nx, ny, nz = nx / ln, ny / ln, nz / ln

L = np.array([-0.62, -0.60, 0.50]); L /= np.linalg.norm(L)
V = np.array([0.0, 0.0, 1.0])
H = (L + V); H /= np.linalg.norm(H)

dif = np.clip(nx * L[0] + ny * L[1] + nz * L[2], 0, 1)
esp = np.clip(nx * H[0] + ny * H[1] + nz * H[2], 0, 1) ** 58

# oclusao: o que esta em baixo recebe menos luz do ceu
oc = np.clip(borrar(alt, 30) * 1.25, 0, 1.2)
oc = np.clip(0.45 + 0.70 * (alt * 0.6 + oc * 0.4), 0, 1.25)

# cor da peca: bronze escuro, com patina mais verde no fundo das reentrancias
baixo = np.clip(1.0 - (alt - 0.36) / 0.30, 0, 1)
bronze = np.stack([
    0.455 - 0.150 * baixo,
    0.390 - 0.055 * baixo,
    0.300 + 0.010 * baixo,
], axis=-1).astype(np.float32)
patina = np.clip((grosso * 0.5 + 0.5), 0, 1)
verde = np.array([0.215, 0.275, 0.248], dtype=np.float32)
m = (patina * baixo * 0.38)[..., None]
bronze = bronze * (1 - m) + verde * m

AMBIENTE = np.array([0.175, 0.185, 0.205], dtype=np.float32)   # luz do ceu, fria
CHAVE = np.array([1.00, 0.845, 0.600], dtype=np.float32)       # a luz, quente
cor = bronze * (AMBIENTE + CHAVE * dif[..., None] * 0.92) * oc[..., None]
cor += (CHAVE * 0.50) * esp[..., None]

# --------------------------- recortar ----------------------------------
alfa = np.clip((R - rr) / 2.2, 0, 1)
alfa = np.clip(alfa - lascas * 0.95, 0, 1)
alfa = np.clip(borrar(alfa, 1.2), 0, 1)

rgb = (np.clip(cor, 0, 1) ** (1 / 1.12) * 255).astype(np.uint8)
out = np.dstack([rgb, (alfa * 255).astype(np.uint8)])
peca = Image.fromarray(out, 'RGBA')
# O PNG de 2000 e o original, e pesa 2,4 MB -- nao vai para o Git: os seeds
# estao fixos, e correr isto outra vez da exactamente o mesmo ficheiro.
if '--png' in sys.argv:
    peca.save('artefacto.png')
for lado in (1500, 820):
    peca.resize((lado, lado), Image.LANCZOS).save('artefacto-%d.webp' % lado,
                                                  quality=86, method=6)
print('artefacto', N, 'alt', round(float(alt.min()), 3), round(float(alt.max()), 3))
