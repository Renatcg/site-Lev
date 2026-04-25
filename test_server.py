import os
import json
import urllib.request
from http.server import SimpleHTTPRequestHandler, HTTPServer

class MyHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # Intercepta a chamada da API que nosso frontend faz
        if self.path == '/api/session':
            self.handle_api_session()
        else:
            # Para outros arquivos (HTML, CSS, JS), serve como um site estático normal
            super().do_GET()

    def handle_api_session(self):
        api_key = os.environ.get('OPENAI_API_KEY')
        
        # Lê a chave do arquivo .env que você criou
        if not api_key and os.path.exists('.env'):
            with open('.env', 'r') as f:
                for line in f:
                    if line.startswith('OPENAI_API_KEY='):
                        api_key = line.split('=', 1)[1].strip()

        if not api_key or api_key == 'sk-sua-chave-aqui':
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"error": "OPENAI_API_KEY faltando ou invalida no .env"}')
            return

        url = "https://api.openai.com/v1/realtime/sessions"
        data = json.dumps({
            "model": "gpt-4o-realtime-preview-2024-12-17",
            "voice": "alloy",
            "instructions": "Você é a assistente de inteligência da Lev Incorporações. Fale de maneira executiva, luxuosa, direta e acolhedora. Seu papel é auxiliar incorporadores com informações sobre viabilidade técnica, arquitetura, jurídico e esteira de lançamento imobiliário."
        }).encode('utf-8')
        
        req = urllib.request.Request(url, data=data, headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }, method="POST")
        
        try:
            with urllib.request.urlopen(req) as response:
                result = response.read()
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(result)
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            error_msg = json.dumps({"error": str(e)}).encode('utf-8')
            self.wfile.write(error_msg)

port = 3000
print(f"===========================================================")
print(f" Servidor da Lev rodando!")
print(f" Acesse no seu navegador: http://localhost:{port}")
print(f" Aperte Ctrl+C neste terminal para desligar o servidor.")
print(f"===========================================================")
HTTPServer(('', port), MyHandler).serve_forever()
