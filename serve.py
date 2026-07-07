import http.server, socketserver, os
ROOT = "/Users/carloslara/Documents/woy/WOY PROJECT/MENU/WOY-APP"
os.chdir(ROOT)
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)
    def log_message(self, *a):
        pass
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("127.0.0.1", 4599), H) as httpd:
    print("WOY serving on http://127.0.0.1:4599")
    httpd.serve_forever()
