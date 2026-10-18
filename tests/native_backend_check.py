import http.server
import json
import os
from pathlib import Path
import subprocess
import threading

root = Path(__file__).resolve().parents[1]
received = []
response_status = 200
response_body = b'{}'

class Collector(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        received.append((self.path, dict(self.headers), json.loads(self.rfile.read(int(self.headers['Content-Length'])))))
        self.send_response(response_status)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(response_body)

    def log_message(self, format, *args):
        pass

for language, command in [('php', ['php', str(root / 'php/report.php')]), ('rust', [str(root / 'rust/target/debug/bicho-example-rust')])]:
    assert Path(command[-1]).is_file(), f'{language} runnable example is missing'
    server = http.server.HTTPServer(('127.0.0.1', 0), Collector)
    received = []
    response_status = 200
    response_body = b'{}'
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    env = {key: value for key, value in os.environ.items() if not key.startswith('BICHO_')}
    env['BICHO_ENDPOINT'] = f'http://127.0.0.1:{server.server_port}/v1/logs'
    missing = subprocess.run(command, env=env, capture_output=True, text=True)
    assert missing.returncode != 0 and missing.stdout == '' and 'BICHO_PUBLIC_KEY' in missing.stderr, missing
    assert received == []
    env['BICHO_PUBLIC_KEY'] = 'public-local-test'
    env['BICHO_INGEST_SECRET'] = 'backend-local-test'
    success = subprocess.run(command, env=env, capture_output=True, text=True)
    assert success.returncode == 0 and success.stderr == '', success
    assert len(received) == 1
    path, headers, payload = received[0]
    assert path == '/v1/logs'
    headers = {key.lower(): value for key, value in headers.items()}
    assert headers['x-bicho-key'] == env['BICHO_PUBLIC_KEY']
    assert headers['x-bicho-secret'] == env['BICHO_INGEST_SECRET']
    resource = payload['resourceLogs'][0]
    attrs = {entry['key']: next(iter(entry['value'].values())) for entry in resource['resource']['attributes']}
    assert attrs == {'service.name': f'bicho-example/{language}', 'deployment.environment.name': 'example', 'service.version': 'bicho-examples@1.0.0'}, attrs
    record = resource['scopeLogs'][0]['logRecords'][0]
    attrs = {entry['key']: next(iter(entry['value'].values())) for entry in record['attributes']}
    assert attrs['example'] == language
    assert attrs['log.record.uid'] == success.stdout.strip()
    assert attrs['sdk.version'] == '1.0.0'
    assert ('RuntimeException' if language == 'php' else 'ParseIntError') in attrs['exception.type']
    if language == 'rust':
        assert 'exception.stacktrace' not in attrs
    for status, body in [(401, b'{"secret":"backend-local-test"}'), (200, b'{"partialSuccess":{"rejectedLogRecords":"1"}}'), (200, b'invalid')]:
        response_status, response_body = status, body
        failure = subprocess.run(command, env=env, capture_output=True, text=True)
        assert failure.returncode != 0 and failure.stdout == '', failure
        assert 'Bicho delivery failed' in failure.stderr
        assert env['BICHO_PUBLIC_KEY'] not in failure.stderr and env['BICHO_INGEST_SECRET'] not in failure.stderr
    response_status, response_body = 200, b'{}'
    del env['BICHO_INGEST_SECRET']
    before = len(received)
    public = subprocess.run(command, env=env, capture_output=True, text=True)
    assert public.returncode == 0 and len(received) == before + 1, public
    assert not any(key.lower() == 'x-bicho-secret' for key in received[-1][1])
    before = len(received)
    env['BICHO_ENDPOINT'] = 'https://private:backend-local-test@example.test/v1/logs'
    invalid = subprocess.run(command, env=env, capture_output=True, text=True)
    assert invalid.returncode != 0 and invalid.stdout == '' and len(received) == before
    assert 'backend-local-test' not in invalid.stderr
    server.shutdown()
    server.server_close()
    print(f'{language}: missing config, valid ACK, metadata, native exception, secret/public auth, HTTP failure, partial ACK, invalid ACK, safe invalid config passed')
