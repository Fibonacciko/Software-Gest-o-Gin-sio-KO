"""Enviar email. Existe para a recuperacao do PIN do socio.

**Nenhuma dependencia nova**: o `smtplib` e o `email.message` sao da
biblioteca padrao do Python. Um fornecedor de email transaccional (Resend,
Brevo, Mailgun) daria melhor entrega, mas obrigava a conta, chave e dominio
verificado para o que sao meia duzia de mensagens por mes.

**Nao configurado, nao envia -- e diz que nao enviou**, em vez de rebentar.
E o estado em que o servidor fica ate alguem por as credenciais no
`backend/.env`, e nessa altura a aplicacao manda o socio ao balcao, que e o
caminho que ja existia e continua a existir.

No `.env`:

    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=587
    SMTP_USER=ginasioko@gmail.com
    SMTP_PASSWORD=<a senha de aplicacao, nao a do email>
    SMTP_DE=ginasioko@gmail.com        # opcional, por omissao o SMTP_USER
    SMTP_NOME=Ginasio KO               # opcional, o nome que aparece ao socio

**O envio corre numa linha de execucao a parte** (`asyncio.to_thread`): o
`smtplib` espera pela rede, e sem isso prendia o servidor inteiro enquanto
o Gmail nao respondesse.

**As mensagens do registo nao levam acentos nem emoji.** A consola do
Windows e cp1252 e um caracter acima do 255 levanta `UnicodeEncodeError` --
isso ja matou o arranque do backend uma vez. O **corpo do email** leva
acentos a vontade: vai em UTF-8 e nunca passa pela consola.
"""
import asyncio
import logging
import os
import smtplib
from email.message import EmailMessage
from typing import Optional

logger = logging.getLogger(__name__)

SEGUNDOS_DE_ESPERA = 15  # um servidor de email morto nao pode prender o pedido


def _porta() -> int:
    """A porta do `.env`, ou a de sempre.

    Um `SMTP_PORT` mal escrito nao pode rebentar o pedido do socio: ele
    pediu para recuperar o PIN, nao tem culpa do ficheiro de configuracao, e
    um 500 nao lhe diz para onde ir. Mal escrita, vale a de sempre, e quem
    enviar nao conseguira -- e ai a aplicacao manda-o ao balcao, com todas
    as palavras.
    """
    try:
        return int((os.environ.get("SMTP_PORT") or "587").strip() or 587)
    except ValueError:
        logger.error("SMTP_PORT mal escrito no .env; vou pela 587")
        return 587


def _config() -> dict:
    return {
        "host": (os.environ.get("SMTP_HOST") or "").strip(),
        "porta": _porta(),
        "utilizador": (os.environ.get("SMTP_USER") or "").strip(),
        "senha": os.environ.get("SMTP_PASSWORD") or "",
        "de": (os.environ.get("SMTP_DE") or os.environ.get("SMTP_USER") or "").strip(),
        "nome": (os.environ.get("SMTP_NOME") or "Ginasio KO").strip(),
    }


def correio_configurado() -> bool:
    """Ha credenciais para enviar email?

    Le-se a cada chamada, e nao uma vez ao arrancar, para bastar reiniciar o
    contentor depois de mexer no `.env`.
    """
    c = _config()
    return bool(c["host"] and c["utilizador"] and c["senha"] and c["de"])


def esconder_email(endereco: Optional[str]) -> str:
    """`fabio@gmail.com` -> `f***@gmail.com`.

    O socio precisa de saber **qual** das caixas de correio dele foi, para
    ir ver. Nao precisa de a ver escrita por inteiro num ecra que outra
    pessoa pode estar a espreitar -- e quem nao for ele nao fica a saber o
    endereco.
    """
    endereco = (endereco or "").strip()
    if "@" not in endereco:
        return ""
    local, _, dominio = endereco.partition("@")
    return f"{local[0]}***@{dominio}" if local else f"***@{dominio}"


def _enviar_agora(para: str, assunto: str, texto: str) -> bool:
    c = _config()
    mensagem = EmailMessage()
    mensagem["From"] = f"{c['nome']} <{c['de']}>"
    mensagem["To"] = para
    mensagem["Subject"] = assunto
    mensagem.set_content(texto)

    try:
        if c["porta"] == 465:
            with smtplib.SMTP_SSL(c["host"], c["porta"], timeout=SEGUNDOS_DE_ESPERA) as s:
                s.login(c["utilizador"], c["senha"])
                s.send_message(mensagem)
        else:
            with smtplib.SMTP(c["host"], c["porta"], timeout=SEGUNDOS_DE_ESPERA) as s:
                s.starttls()
                s.login(c["utilizador"], c["senha"])
                s.send_message(mensagem)
        return True
    except Exception as e:
        # Sem acentos: isto vai para a consola, que em Windows e cp1252.
        logger.error("Nao foi possivel enviar o email: %s", type(e).__name__)
        return False


async def enviar_email(para: str, assunto: str, texto: str) -> bool:
    """Envia, e diz se conseguiu. Nunca levanta."""
    if not correio_configurado():
        logger.warning("Email pedido sem SMTP configurado no .env")
        return False
    if not (para or "").strip():
        return False
    return await asyncio.to_thread(_enviar_agora, para.strip(), assunto, texto)
