# Threat Model

## Assets

- Local source code.
- Secrets and credentials.
- Browser/session data.
- MCP server configuration.
- Agent tool descriptors and skills.
- CI/CD write permissions.

## Adversaries

- Malicious skill or MCP server publisher.
- Compromised package or tool descriptor.
- Prompt-injection author controlling an issue, document, webpage, or RAG source.
- Insider or accidental misconfiguration exposing broad tokens to tools.

## Primary Risks

- Tool poisoning through descriptions and examples.
- Hidden Unicode payloads that reviewers miss.
- Secret access combined with external network sinks.
- Shell or filesystem write tools without approval gates.
- Broad MCP tokens connected to untrusted agent contexts.
- Open-world network fetch/post tools without allowlists.

## Controls in v0.1

- ToolBOM/SkillBOM inventory.
- Capability inference.
- Cognitive lint.
- Unicode scan.
- Deterministic attack scenarios.
- Local policy gate.
- Evidence reports for PR review and CI.
