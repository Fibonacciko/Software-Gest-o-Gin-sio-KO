# -*- coding: utf-8 -*-
"""Escolhe as fotografias do ginasio, encolhe-as e grava-as no site publico.

As originais tem 3 a 6 MB cada (ate 4592x3448). Num site isso e' uma pagina
que nunca acaba de carregar no telemovel. Grava duas larguras de cada uma:
1800 para o ecra grande e 900 para o telemovel.
"""
import io
import os
from PIL import Image, ImageOps

# ORIGEM: a pasta com as fotografias como vieram da maquina
# DESTINO: site-publico/fotos
ORIGEM = os.environ["ORIGEM"]
DESTINO = os.environ.get("DESTINO", "site-publico/fotos")

# numero da fotografia -> nome que ela passa a ter no site
ESCOLHIDAS = {
    35: "sala-vazia",        # os sacos com a luz a entrar, cor de sepia
    69: "ringue",            # o ringue de frente, BOXE / PORTUGAL na parede
    # 37: "sala-larga",        # a sala toda, sacos e ringue   <- escolhida mas nao usada na pagina
    30: "turma-flexoes",     # a turma a fazer flexoes, o treinador a ver
    45: "grupo",             # a fotografia de grupo, toda a gente
    31: "alongamentos",      # o circulo sentado no fim do treino
    33: "kickboxing",        # ela a dar o pontape, ele a segurar
    57: "sparring",          # dois a treinar, visto por entre as cordas
    59: "jiujitsu-criancas", # a turma de criancas de jiu-jitsu
    54: "jiujitsu",          # trabalho no chao
    # 70: "treinador-saco",    # o treinador a segurar o saco   <- escolhida mas nao usada na pagina
    56: "treinador-ensina",  # o treinador a explicar, de perto
    47: "aperto-de-mao",     # os dois sentados no ringue
    38: "nariz",             # ela a rir com o nariz a sangrar
    40: "a-rir-no-ringue",   # os dois deitados no ringue a rir
    49: "porta",             # o saco de velocidade, a fachada KNOCKOUT
    # 71: "veterano",          # o treinador mais velho no balao   <- escolhida mas nao usada na pagina
    # 50: "historia",          # a fotografia antiga, t-shirt BOXE KO   <- escolhida mas nao usada na pagina
    73: "sala-cheia",        # sparring com a sala a trabalhar a volta
}

LARGURAS = [1800, 900]

os.makedirs(DESTINO, exist_ok=True)
feitas = []
for numero, nome in sorted(ESCOLHIDAS.items()):
    caminho = None
    for extensao in (".jpg", ".png", ".webp"):
        tentativa = os.path.join(ORIGEM, f"{numero}{extensao}")
        if os.path.exists(tentativa):
            caminho = tentativa
            break
    if not caminho:
        print(f"   FALTA a {numero}")
        continue
    imagem = ImageOps.exif_transpose(Image.open(caminho)).convert("RGB")
    for largura in LARGURAS:
        if imagem.width <= largura:
            copia = imagem
        else:
            altura = round(imagem.height * largura / imagem.width)
            copia = imagem.resize((largura, altura), Image.LANCZOS)
        sufixo = "" if largura == LARGURAS[0] else f"-{largura}"
        saida = os.path.join(DESTINO, f"{nome}{sufixo}.jpg")
        copia.save(saida, "JPEG", quality=82, optimize=True, progressive=True)
    feitas.append((nome, imagem.width, imagem.height))

print(f"{len(feitas)} fotografias, em {len(LARGURAS)} larguras cada")
for nome, w, h in feitas:
    print(f"   {nome:22} {w}x{h}  ({'ao alto' if h > w else 'ao baixo'})")
