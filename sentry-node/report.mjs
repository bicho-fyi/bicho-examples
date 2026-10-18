import * as Sentry from '@sentry/node';

const { BICHO_SENTRY_DSN, BICHO_INGEST_SECRET } = process.env;

try {
  if (!BICHO_SENTRY_DSN) throw new Error('Set BICHO_SENTRY_DSN before running this example.');
  const dsn = new URL(BICHO_SENTRY_DSN);
  if (!/^https?:\/\/[A-Za-z0-9_]+@[^/?#\s\\]+\/\d+$/.test(BICHO_SENTRY_DSN)
    || dsn.password || dsn.search || dsn.hash
    || dsn.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(dsn.hostname)) {
    throw new Error('Invalid Bicho DSN.');
  }
  Sentry.init({
    dsn: BICHO_SENTRY_DSN,
    debug: false,
    environment: 'example',
    release: 'bicho-examples@1.0.0',
    defaultIntegrations: false,
    integrations: [],
    tracesSampleRate: 0,
    sendClientReports: false,
    enableLogs: false,
    sendDefaultPii: false,
    transportOptions: {
      headers: BICHO_INGEST_SECRET ? { 'X-Bicho-Secret': BICHO_INGEST_SECRET } : {},
    },
  });
  let eventId;
  try {
    throw new Error('Bicho Sentry Node.js example');
  } catch (error) {
    eventId = Sentry.captureException(error, { tags: { example: 'sentry-node' } });
  }
  const flushed = await Sentry.flush(5000);
  const closed = await Sentry.close(5000);
  if (!eventId || !flushed || !closed) throw new Error('Bicho delivery failed.');
  console.log(eventId);
} catch {
  await Sentry.close(5000);
  console.error(BICHO_SENTRY_DSN
    ? 'Invalid Bicho DSN or delivery failure. Check your DSN and optional ingest secret.'
    : 'Set BICHO_SENTRY_DSN before running this example.');
  process.exitCode = 1;
}
