"""Gera as imagens do fundo da aplicacao: a luz redonda, a vinheta e o grao.

Corre-se a mao, so quando se quer mudar o desenho:
    python ko-gym-mobile/assets/desenhos.py


Sao PNG porque o <Image> do React Native e nativo e ja esta provado dentro do
APK que abre. Um gradiente linear nunca faz uma mancha redonda sem bordo; uma
imagem faz.
"""
import math
import os
import random
from PIL import Image, ImageDraw, ImageFilter

# A pasta deste proprio ficheiro: as imagens ficam ao lado dele
DESTINO = os.path.dirname(os.path.abspath(__file__))


def luz(tamanho=512):
    """Mancha redonda de luz branca, a apagar-se ate zero na borda."""
    img = Image.new("RGBA", (tamanho, tamanho), (255, 255, 255, 0))
    px = img.load()
    meio = (tamanho - 1) / 2
    for y in range(tamanho):
        for x in range(tamanho):
            d = math.hypot(x - meio, y - meio) / meio
            if d >= 1:
                continue
            # Queda suave: comeca cheia no centro e chega a zero exatamente na
            # borda, para nao ficar nenhum risco a marcar o fim da imagem.
            a = (math.cos(d * math.pi) + 1) / 2
            px[x, y] = (255, 255, 255, int(round(255 * a * a)))
    return img


def vinheta(tamanho=512):
    """Escurece os cantos. Transparente no meio, preta nas pontas."""
    img = Image.new("RGBA", (tamanho, tamanho), (0, 0, 0, 0))
    px = img.load()
    meio = (tamanho - 1) / 2
    for y in range(tamanho):
        for x in range(tamanho):
            d = min(1.0, math.hypot(x - meio, y - meio) / meio)
            a = max(0.0, (d - 0.35) / 0.65) ** 1.8
            px[x, y] = (0, 0, 0, int(round(150 * a)))
    return img


def grao(tamanho=512):
    """Grao para o gradiente nao se partir em bandas visiveis.

    Repete-se em ecra inteiro, esticado: 512 pixeis esticados nao se veem
    onde o padrao recomeca.
    """
    random.seed(11)
    img = Image.new("RGBA", (tamanho, tamanho), (255, 255, 255, 0))
    px = img.load()
    for y in range(tamanho):
        for x in range(tamanho):
            px[x, y] = (255, 255, 255, random.randint(0, 255))
    return img


def particulas(largura=900, altura=1900):
    """Po de luz suspenso: pontos de branco sujo, de varios tamanhos.

    E o que enche o fundo sem lhe dar assunto. Os pontos tem tamanhos e
    opacidades muito diferentes de proposito: todos iguais leem-se como um
    padrao, e um padrao chama a atencao a si proprio.

    O feitio e o de um telemovel (900x1900) e nao um quadrado, para os pontos
    nao sairem ovais quando a imagem se estica no ecra.

    **Branco sujo**, nunca azul nem laranja: o laranja e da marca e fica para
    o que e para carregar; um fundo tingido rouba-lhe o destaque.
    """
    random.seed(7)
    COR = (237, 231, 221)   # branco sujo

    def camada(quantos, raio_min, raio_max, alfa_min, alfa_max, desfoque):
        img = Image.new("RGBA", (largura, altura), (255, 255, 255, 0))
        d = ImageDraw.Draw(img)
        for _ in range(quantos):
            x = random.uniform(0, largura)
            y = random.uniform(0, altura)
            r = random.uniform(raio_min, raio_max)
            a = random.randint(alfa_min, alfa_max)
            d.ellipse([x - r, y - r, x + r, y + r], fill=COR + (a,))
        return img.filter(ImageFilter.GaussianBlur(desfoque)) if desfoque else img

    fundo = Image.new("RGBA", (largura, altura), (255, 255, 255, 0))
    # Pontinhos miudos e nitidos, muitos; depois meios; depois meia duzia de
    # manchas grandes e muito desfocadas, que sao as que dao a sensacao de
    # haver alguma coisa mais perto do olho.
    for c in (
        camada(420, 0.6, 1.8, 25, 130, 0),
        camada(90, 2.0, 4.5, 18, 70, 1.2),
        camada(14, 10, 30, 8, 22, 9),
    ):
        fundo = Image.alpha_composite(fundo, c)
    return fundo


os.makedirs(DESTINO, exist_ok=True)
for nome, img in (("luz.png", luz()), ("vinheta.png", vinheta()), ("grao.png", grao()),
                  ("particulas.png", particulas())):
    caminho = os.path.join(DESTINO, nome)
    img.save(caminho, optimize=True)
    print(nome, os.path.getsize(caminho), "bytes")
