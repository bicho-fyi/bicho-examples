from pathlib import Path
import http.server
import os
import subprocess
import sys
import threading
import unittest

ROOT = Path(__file__).resolve().parents[1]


class PythonExampleTests(unittest.TestCase):
    def run_example(self, **values):
        env = {key: value for key, value in os.environ.items() if not key.startswith('BICHO_')}
        env.update(values)
        return subprocess.run([sys.executable, '-I', str(ROOT / 'python/report.py')], env=env, text=True, capture_output=True, timeout=20)

    def test_requires_configuration(self):
        result = self.run_example()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Set BICHO_ENDPOINT and BICHO_PUBLIC_KEY', result.stderr)

    def test_reports_one_exception_with_backend_secret(self):
        requests = []
        class Handler(http.server.BaseHTTPRequestHandler):
            def do_POST(self):
                requests.append((self.path, dict(self.headers), self.rfile.read(int(self.headers['Content-Length']))))
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', '2')
                self.end_headers()
                self.wfile.write(b'{}')

            def log_message(self, format, *args):
                pass

        server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        thread = threading.Thread(target=server.serve_forever, kwargs={'poll_interval': 0.01}, daemon=True)
        thread.start()
        try:
            result = self.run_example(BICHO_ENDPOINT=f'http://127.0.0.1:{server.server_port}/v1/logs', BICHO_PUBLIC_KEY='example-key', BICHO_INGEST_SECRET='backend-fixture')
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertRegex(result.stdout.strip(), r'^[a-f0-9-]{36}$')
            self.assertEqual(len(requests), 1)
            self.assertEqual(requests[0][0], '/v1/logs')
            self.assertEqual(requests[0][1]['X-Bicho-Secret'], 'backend-fixture')
            self.assertNotIn('backend-fixture', result.stdout + result.stderr)
        finally:
            server.shutdown()
            server.server_close()
            thread.join()


if __name__ == '__main__':
    unittest.main()
