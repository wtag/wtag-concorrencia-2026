#!/usr/bin/env python3
"""
Servidor local para conferir o deck no navegador.

    python3 servidor.py            # http://localhost:8765
    python3 servidor.py 9000       # outra porta
    PORT=9000 python3 servidor.py  # idem, pelo ambiente (é como o harness sobe)

Por que não `python3 -m http.server`: ele NÃO responde Range. Pedido de
"bytes=0-2048" devolve 200 com o arquivo inteiro em vez de 206 com o pedaço, e
o Safari se recusa a tocar vídeo servido assim — o player abre e fica preto,
sem erro no console. O Chrome tolera; o Safari não, e metade das conferências
deste deck é no Safari por causa do iPhone. Como cada videocase tem 24 MB, o
sintoma aparece justamente nos cases.

Também serve cada pedido numa thread própria: o http.server padrão é
single-thread e, enquanto empurra um vídeo, engasga todo o resto da página.
"""

import os
import re
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

AQUI = os.path.dirname(os.path.abspath(__file__))


class ComRange(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=AQUI, **kw)

    def send_head(self):
        faixa = self.headers.get('Range')
        if not faixa:
            return super().send_head()

        m = re.match(r'bytes=(\d*)-(\d*)\s*$', faixa)
        caminho = self.translate_path(self.path)
        if not m or not os.path.isfile(caminho):
            return super().send_head()

        tam = os.path.getsize(caminho)
        ini, fim = m.group(1), m.group(2)
        if ini == '':                                  # bytes=-N · sufixo
            n = int(fim or 0)
            ini, fim = max(0, tam - n), tam - 1
        else:
            ini = int(ini)
            fim = int(fim) if fim else tam - 1
        if ini >= tam:
            self.send_response(416)
            self.send_header('Content-Range', 'bytes */%d' % tam)
            self.end_headers()
            return None
        fim = min(fim, tam - 1)

        f = open(caminho, 'rb')
        f.seek(ini)
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(caminho))
        self.send_header('Content-Range', 'bytes %d-%d/%d' % (ini, fim, tam))
        self.send_header('Content-Length', str(fim - ini + 1))
        self.send_header('Accept-Ranges', 'bytes')
        self.end_headers()
        return _Pedaco(f, fim - ini + 1)

    def end_headers(self):
        # sem cache: o deck é conferido a cada edição, e o ?v=NN só cobre css/js
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Accept-Ranges', 'bytes')
        super().end_headers()

    def handle_one_request(self):
        """Quem recarrega a página no meio de um carregamento derruba dezenas de
        conexões de uma vez, e cada uma sobe um traceback de ConnectionResetError
        no terminal. Barulho, não erro: a resposta que ninguém mais espera pode
        ser abandonada em silêncio. Sem isto, uma apresentação que troca de slide
        depressa enche a tela de quem rodou o servidor."""
        try:
            SimpleHTTPRequestHandler.handle_one_request(self)
        except (ConnectionResetError, BrokenPipeError):
            self.close_connection = True

    def log_message(self, *a):
        pass


class _Pedaco:
    """Limita a leitura ao trecho pedido — o copyfile do handler lê até o EOF."""

    def __init__(self, f, restam):
        self.f, self.restam = f, restam

    def read(self, n=-1):
        if self.restam <= 0:
            return b''
        if n < 0 or n > self.restam:
            n = self.restam
        d = self.f.read(n)
        self.restam -= len(d)
        return d

    def close(self):
        self.f.close()


if __name__ == '__main__':
    # A porta vem do ambiente antes do argumento: quando o servidor sobe pelo
    # harness (.claude/launch.json com autoPort), quem escolhe a porta é ele, e
    # avisa por PORT. Porta fixa no comando dava conflito com o servidor de
    # outra conversa que ainda estivesse de pé em 8765.
    porta = int(os.environ.get('PORT') or (sys.argv[1] if len(sys.argv) > 1 else 8765))
    print('deck em http://localhost:%d  ·  Ctrl+C para parar' % porta)
    ThreadingHTTPServer(('127.0.0.1', porta), ComRange).serve_forever()
