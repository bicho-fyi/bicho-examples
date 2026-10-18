import { createClient } from '@bicho-fyi/javascript';

const { BICHO_ENDPOINT, BICHO_PUBLIC_KEY, BICHO_INGEST_SECRET } = process.env;

try {
  if (BICHO_INGEST_SECRET !== undefined) {
    throw new Error('BICHO_INGEST_SECRET is unsupported by the JavaScript SDK. Use a public-key-only project.');
  }
  if (!BICHO_ENDPOINT || !BICHO_PUBLIC_KEY) {
    throw new Error('Set BICHO_ENDPOINT and BICHO_PUBLIC_KEY before running this example.');
  }
  const client = createClient({
    endpoint: BICHO_ENDPOINT,
    key: BICHO_PUBLIC_KEY,
    serviceName: 'bicho-example/node',
    environment: 'example',
    release: 'bicho-examples@1.0.0',
    autoCapture: false,
  });
  let uid;
  try {
    throw new Error('Bicho Node.js example');
  } catch (error) {
    uid = client.captureException(error, { tags: { example: 'node' } });
  }
  const delivered = await client.close(5000);
  if (!uid || !delivered) throw new Error('Bicho delivery failed or the error was dropped.');
  console.log(uid);
} catch (error) {
  console.error(error instanceof Error && /^(Set BICHO_|BICHO_INGEST_SECRET is unsupported|Bicho delivery failed)/.test(error.message)
    ? error.message
    : 'Invalid Bicho configuration or delivery failure. Check the endpoint and public key.');
  process.exitCode = 1;
}
