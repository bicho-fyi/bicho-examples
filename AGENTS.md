# Bicho examples

Runnable SDK examples, not another SDK or a hosted collector. Read README.md and the relevant example before editing.

- Use the real SDK packages and their documented APIs. Keep examples small and explicit; add framework-specific integrations only for an actual request.
- Keep dependency versions and lockfiles aligned. Python currently installs from a pinned public Git commit because the SDK is not published to PyPI.
- Never commit credentials, capture admin tokens, or embed backend ingest secrets in a browser or distributed app. Do not log configuration values or raw transport errors.
- Send intentional errors only when the example is run or its browser button is pressed. Use dedicated test projects; no hosted writes during ordinary local checks.
- Preserve original application error handling. Await JavaScript/Rust delivery; PHP and Python reporting is synchronous. Do not install global handlers or queues implicitly.
- Distinguish delivery from stored evidence and native occurrence UIDs from collector event IDs. Do not claim unsupported source-map or Sentry feature compatibility.
- Run npm test, the Python example check, PHP syntax/configuration checks, and Rust fmt/clippy/build for affected paths. Keep sibling-dependent and headless integration probes under ignored _temp/.
- Keep scratch files, dependency directories and build outputs ignored. Commit or push only with task-specific "yolo" approval; publishing and visibility changes require separate permission.
- Preserve the full Apache-2.0 license and attribution. Keep code comment-free and documentation in plain English with descriptive links and inline code for identifiers.
