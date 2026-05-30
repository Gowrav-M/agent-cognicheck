# Changelog

## 0.2.0

- Added `evidence` to emit normalized `agent.trust.evidence.v1` cognitive/tool attack evidence for Agent Trust Center.
- Added a shared Agent Trust Suite diagram to the README.
- Added trust evidence normalization tests.

## 0.1.1

- Fixed clean-install `npx agent-cognicheck demo` by resolving bundled examples from the installed package path instead of the caller's current working directory.
- Made pathless `discover`, `bom`, `lint`, `unicode-scan`, `attack`, `policy check`, and `report` use bundled examples by default.
- Added a regression test for running the demo from a folder without local examples.

## 0.1.0

- Initial public release.
- Added local-first TypeScript CLI package `agent-cognicheck`.
- Added ToolBOM discovery for MCP descriptors, MCP configs, and agent skills.
- Added cognitive lint rules for tool poisoning, exfiltration language, weak schemas, overprivileged MCP tokens, and broad capability surfaces.
- Added hidden Unicode and bidirectional control detection.
- Added deterministic attack harness with prompt-injection, source-to-sink exfiltration, Unicode, shell, and open-world network scenarios.
- Added policy gate and JSON/Markdown/HTML report artifacts.
- Added examples, docs, tests, and GitHub Actions CI.
