# Bicho examples

Small, runnable examples for sending intentional errors to your own [Bicho](https://bicho.fyi) installation. Each example uses a real SDK and sends only after you run it or press the browser form's button.

| Example | Integration | Runtime |
| --- | --- | --- |
| [Browser](browser/) | Bicho JavaScript SDK, manually caught exception | Modern browser; Node.js 24+ for npm installation |
| [Node.js](node/report.mjs) | Bicho JavaScript SDK, awaited delivery | Node.js 24+ |
| [PHP](php/report.php) | Bicho PHP SDK, synchronous delivery | PHP 8.2+, cURL, JSON, Composer |
| [Rust](rust/src/main.rs) | Bicho Rust SDK, awaited Tokio delivery | Rust 1.89+ and Cargo |
| [Python](python/report.py) | Bicho Python SDK, synchronous delivery | Python 3.11+ and Git |
| [Sentry on Node.js](sentry-node/report.mjs) | Existing Sentry SDK with a Bicho DSN | Node.js 24+ |

## Before running

[Deploy Bicho and register a project](https://bicho.fyi/docs/) first. Use a dedicated test project: these examples deliberately create real error reports, and Bicho has no public event-delete endpoint.

For native SDKs, use the generated `otlp.endpoint` and `otlp.headers['X-Bicho-Key']`. For Sentry, use the generated `sentry.dsn` instead. Do not point capture at bicho.fyi or use an admin token as an ingest credential.

Backend examples read configuration from the process environment; they do not load a `.env` file. Substitute your own project values:

```sh
export BICHO_ENDPOINT='https://your-bicho-worker.example/v1/logs'
export BICHO_PUBLIC_KEY='YOUR_PUBLIC_KEY'
```

The JavaScript SDK requires a public-key-only project, including on Node.js. Unset `BICHO_INGEST_SECRET` before running that example. The PHP, Rust, Python and Sentry backend examples can optionally use `BICHO_INGEST_SECRET` for a secret-enabled project. Never put that secret in browser code or commit credentials.

## Browser, Node.js and Sentry

From this repository's root:

```sh
npm ci
```

For the browser, start a loopback-only static server:

```sh
npm run browser
```

Open http://127.0.0.1:8000/browser/, enter your endpoint and public ingest key, and use the form to send an error. The SDK is served from the installed npm package, not a CDN. Configuration is not saved in cookies or browser storage. The server is for local development only; do not expose the repository directory publicly or place private files under its served root.

For native Node.js reporting:

```sh
unset BICHO_INGEST_SECRET
npm run node
```

For Sentry reporting:

```sh
export BICHO_SENTRY_DSN='YOUR_GENERATED_BICHO_DSN'
npm run sentry
```

The Sentry example uses `@sentry/node` 11.8.0 and manual error capture, with unsupported tracing and client reports disabled. It is not an example of replay, profiling, historical import or universal Sentry SDK compatibility. See [Documentation - Move from Sentry](https://bicho.fyi/docs/sentry/).

## PHP

```sh
composer install --working-dir=php --no-interaction --no-scripts --no-plugins
php php/report.php
```

The report blocks until acknowledgment or failure. See [Documentation - PHP SDK](https://bicho.fyi/docs/php/).

## Rust

```sh
cargo run --locked --manifest-path rust/Cargo.toml
```

The example captures an actual integer-parse failure and awaits reporting. It does not install a panic hook or fabricate a backtrace. See [Documentation - Rust SDK](https://bicho.fyi/docs/rust/).

## Python

```sh
python3.11 -m venv python/.venv
python/.venv/bin/python -m pip install -r python/requirements.txt
python/.venv/bin/python python/report.py
```

The Python SDK is not yet published to PyPI. `python/requirements.txt` installs it from a pinned commit of the public [Bicho Python repository](https://github.com/bicho-fyi/bicho-python); this requires Git. Sending is synchronous. The example is not an asyncio or framework integration.

## Verify the stored event

CLI examples print an occurrence UID or Sentry event ID after their delivery step. Native Bicho UIDs are not the collector's event lookup IDs. A successful Sentry flush also does not prove that the collector accepted every event.

Connect your investigation MCP client to your own installation, not the public documentation MCP. Then:

1. Select the project you registered.
2. Search its events using the `example` tag: `browser`, `node`, `php`, `rust`, `python` or `sentry-node`.
3. If searching issues, include all statuses so a previously resolved test issue is not hidden.
4. Read the returned event ID and check the exception, `environment: example`, and `release: bicho-examples@1.0.0`.

Repeat runs create new occurrences and may group into an existing issue. Failed reporting exits nonzero in the native backend examples; they do not replace an application's real exception handler or guarantee delivery. Review client diagnostics and collector responses if evidence is missing.

- [Documentation - MCP investigation](https://bicho.fyi/docs/mcp/)
- [Documentation - Troubleshoot missing events](https://bicho.fyi/docs/operations/#troubleshoot-missing-events)
- [Documentation - SDK privacy and credentials](https://bicho.fyi/docs/privacy/)

## Checks

With the npm dependencies installed, run the Node.js and Sentry loopback checks:

```sh
npm test
```

With the Python environment installed:

```sh
python/.venv/bin/python -I -W error tests/python_example_test.py
```

Check the Rust binary with `cargo fmt --manifest-path rust/Cargo.toml --check` and `cargo clippy --locked --manifest-path rust/Cargo.toml -- -D warnings`. These local checks do not send to a hosted Bicho instance. Browser capture and authenticated storage should also be verified against your own dedicated test project.

After installing the PHP dependencies and building Rust with `cargo build --locked --manifest-path rust/Cargo.toml`, run `python3 tests/native_backend_check.py` for both backend examples' loopback delivery and failure checks.

## License

Copyright 2026 [Alex Zappa](https://alex.zappa.dev/) ([FreshJuice](https://freshjuice.dev/)). Licensed under Apache-2.0. See [LICENSE](LICENSE).
