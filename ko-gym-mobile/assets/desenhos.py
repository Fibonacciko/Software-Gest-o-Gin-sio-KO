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
from PIL import Image

DESTINO = r"C:\GINASIO-KO\ko-gym-mobile\assets"


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


os.makedirs(DESTINO, exist_ok=True)
for nome, img in (("luz.png", luz()), ("vinheta.png", vinheta()), ("grao.png", grao())):
    caminho = os.path.join(DESTINO, nome)
    img.save(caminho, optimize=True)
    print(nome, os.path.getsize(caminho), "bytes")
